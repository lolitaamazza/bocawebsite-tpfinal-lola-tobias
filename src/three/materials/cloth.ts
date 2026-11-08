import * as THREE from 'three'

/**
 * Material de tela con tres deformaciones en el vertex shader:
 *  - ondulado suave por brisa (uAmp)
 *  - torsión del bajo cuando la remera gira rápido (uTwist)
 *  - doblez del bajo cuando la percha se balancea (uBend)
 * Los hombros quedan fijos (apoyados en la percha) y el peso crece hacia el bajo.
 * Las caras traseras se pintan del color del forro.
 */

export interface ClothUniforms {
  uTime: { value: number }
  uPhase: { value: number }
  uAmp: { value: number }
  uTwist: { value: number }
  uBend: { value: THREE.Vector2 }
  uLining: { value: THREE.Color }
}

const common = /* glsl */ `
uniform float uTime;
uniform float uPhase;
uniform float uAmp;
uniform float uTwist;
uniform vec2 uBend;

// 0 en los hombros, 1 en el bajo. Las mangas cuelgan a medias.
float clothWeight(vec3 p) {
  float body = smoothstep(-0.12, -0.74, p.y);
  float sleeve = 0.55 * smoothstep(0.16, 0.27, abs(p.x)) * smoothstep(-0.12, -0.25, p.y);
  return max(body, sleeve);
}

// x: desplazamiento; yz: derivadas en x e y para corregir la normal
vec3 clothRipple(vec3 p) {
  float a = uTime * 1.1 + p.x * 7.0 + p.y * 8.0 + uPhase;
  float b = uTime * 1.7 + p.x * 15.0 - p.y * 6.0 + uPhase * 1.9;
  float c = uTime * 0.5 + p.y * 3.0 + uPhase * 0.7;
  float gust = 0.6 + 0.4 * sin(uTime * 0.29 + uPhase * 2.1);
  float h = 0.5 * sin(a) + 0.3 * sin(b) + sin(c);
  vec2 d = vec2(3.5 * cos(a) + 4.5 * cos(b), 4.0 * cos(a) - 1.8 * cos(b) + 3.0 * cos(c));
  return vec3(h, d) * gust;
}

vec2 clothRotate(vec2 xz, float ang) {
  float co = cos(ang), si = sin(ang);
  return vec2(co * xz.x + si * xz.y, -si * xz.x + co * xz.y);
}
`

const normalChunk = /* glsl */ `
float clothNW = clothWeight(position);
objectNormal.xy -= objectNormal.z * uAmp * clothNW * clothRipple(position).yz;
objectNormal.xz = clothRotate(objectNormal.xz, uTwist * clothNW);
objectNormal = normalize(objectNormal);
`

const vertexChunk = /* glsl */ `
float clothW = clothWeight(position);
transformed.z += uAmp * clothW * clothRipple(position).x;
transformed.xz += uBend * clothW * clothW;
transformed.xz = clothRotate(transformed.xz, uTwist * clothW);
`

function inject(shader: THREE.WebGLProgramParametersWithUniforms, uniforms: ClothUniforms) {
  Object.assign(shader.uniforms, uniforms)
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${common}`)
    .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n${normalChunk}`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>\n${vertexChunk}`)
}

export function createClothMaterial(opts: {
  map: THREE.Texture
  normalMap: THREE.Texture
  time: { value: number }
  phase: number
  lining: string
}) {
  const uniforms: ClothUniforms = {
    uTime: opts.time,
    uPhase: { value: opts.phase },
    uAmp: { value: 0 },
    uTwist: { value: 0 },
    uBend: { value: new THREE.Vector2() },
    uLining: { value: new THREE.Color(opts.lining) },
  }
  const material = new THREE.MeshPhysicalMaterial({
    map: opts.map,
    normalMap: opts.normalMap,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughness: 0.7,
    sheen: 0.22,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color('#aebcff'),
    vertexColors: true,
    side: THREE.DoubleSide,
  })
  material.onBeforeCompile = (shader) => {
    inject(shader, uniforms)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uLining;')
      .replace('#include <map_fragment>', '#include <map_fragment>\nif (!gl_FrontFacing) diffuseColor.rgb = uLining;')
  }
  // Sombra que acompaña la deformación
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide })
  depth.onBeforeCompile = (shader) => inject(shader, uniforms)
  return { material, depth, uniforms }
}
