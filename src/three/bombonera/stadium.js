import * as THREE from 'three'
import { FLAT, HX, HZ, OUTER, PALCO_RAIL, PITCH, ROOF, SEAT, TIERS, ZONES, alongCurve, curveLength, palcoFloor, palcoFront, pathSamples, seatLayout } from './layout'
import { pitchTexture } from './pitchTexture'

/** La noche en La Boca: cielo azul profundo, luz fría de los reflectores y calor en los palcos */
export const LOOK = {
  background: '#03060e',
  exposure: 1.05,
  zenith: '#02040b',
  horizon: '#16264f',
  haze: '#3b2a3c', // resplandor de la ciudad sobre el horizonte
  concrete: '#1a2134',
  concreteDark: '#0f1422',
  azul: '#1d3c8f',
  azulVivo: '#2b4fc4',
  oro: '#f0c057',
  oroHondo: '#d9a63c',
  apron: '#24552a',
  ground: '#04060c',
  flood: '#e6eeff',
  warm: '#ffb866',
}
/** Color de cada bandeja: azul, oro, azul. Las butacas de la recta van en azul. */
const TIER_COLORS = { baja: LOOK.azulVivo, media: LOOK.oro, alta: LOOK.azulVivo, platea: LOOK.azulVivo, palcos: LOOK.oroHondo }

/** Azar con semilla: la misma tribuna en cada carga */
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Barre un perfil (puntos [d, y] con el rol de cada tramo) a lo largo de un
 * camino de muestras { x, z, nx, nz }: cada tramo del perfil es una cinta. Sin
 * índices, así cada cara tiene su normal y los escalones quedan con aristas.
 */
function sweep(samples, profile, colorOf) {
  const segs = profile.length - 1
  const quads = segs * (samples.length - 1)
  const pos = new Float32Array(quads * 18)
  const col = new Float32Array(quads * 18)
  let o = 0
  const put = (s, d, y, c) => {
    pos[o] = s.x + s.nx * d
    pos[o + 1] = y
    pos[o + 2] = s.z + s.nz * d
    col[o] = c.r
    col[o + 1] = c.g
    col[o + 2] = c.b
    o += 3
  }
  for (let j = 0; j < segs; j++) {
    const [d0, y0] = profile[j].p
    const [d1, y1] = profile[j + 1].p
    const c = colorOf(profile[j].role)
    for (let i = 0; i < samples.length - 1; i++) {
      const a = samples[i]
      const b = samples[i + 1]
      put(a, d0, y0, c)
      put(b, d0, y0, c)
      put(b, d1, y1, c)
      put(a, d0, y0, c)
      put(b, d1, y1, c)
      put(a, d1, y1, c)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.computeVertexNormals()
  return g
}

/** Perfil escalonado: baranda, escalones y fondo. `under` cierra por abajo (voladiza) o baja al piso. */
function stepProfile(t, { first }) {
  const pts = [
    { p: [t.d0, first ? 0 : t.y0 - t.lip], role: 'lip' },
    { p: [t.d0, t.y0], role: 'tread' },
  ]
  for (let k = 0; k < t.rows; k++) {
    const d = t.d0 + (k + 1) * t.tread
    const y = t.y0 + k * t.riser
    if (k < t.rows - 1) {
      pts.push({ p: [d, y], role: 'riser' }, { p: [d, y + t.riser], role: 'tread' })
    } else pts.push({ p: [d, y], role: 'back' })
  }
  if (first) pts.push({ p: [t.dEnd, 0], role: 'back' })
  else pts.push({ p: [t.dEnd, t.top - 2], role: 'soffit' }, { p: [t.d0, t.y0 - t.lip], role: 'soffit' })
  return pts
}

/** Butaca: asiento y respaldo (dos cuadriláteros), el frente hacia +z */
function seatGeometry() {
  const w = SEAT * 0.42
  const v = [
    // asiento
    -w, 0.42, 0.18, w, 0.42, 0.18, w, 0.42, -0.16, -w, 0.42, -0.16,
    // respaldo
    -w, 0.42, -0.18, w, 0.42, -0.18, w, 0.86, -0.22, -w, 0.86, -0.22,
  ]
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3))
  g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7])
  g.computeVertexNormals()
  return g
}

/** Mancha radial para el halo de los reflectores */
function dotTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.18, 'rgba(255,255,255,0.55)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`
const SKY_FRAG = /* glsl */ `
uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uHaze;
varying vec3 vDir;
void main() {
  float h = clamp(vDir.y, 0.0, 1.0);
  vec3 c = mix(uHorizon, uZenith, pow(h, 0.45));
  c = mix(c, uHaze, exp(-h * 18.0) * 0.55);
  gl_FragColor = vec4(c, 1.0);
}`

/* la gente: puntitos de colores que se esfuman pegados a la cámara (si no, tapan la vista desde la butaca) */
const CROWD_VERT = /* glsl */ `
uniform float uScale;
attribute vec3 color;
varying vec3 vColor;
varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float z = -mv.z;
  vA = smoothstep(3.0, 7.0, z);
  vColor = color;
  gl_PointSize = clamp(0.62 * uScale / z, 1.0, 16.0);
}`
const CROWD_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vA;
void main() {
  if (vA < 0.02 || length(gl_PointCoord - 0.5) > 0.5) discard;
  gl_FragColor = vec4(vColor, vA);
  #include <colorspace_fragment>
}`

/* luces de celulares en la tribuna: se prenden y apagan cada una a su ritmo */
const PHONE_VERT = /* glsl */ `
uniform float uTime; uniform float uScale;
attribute float phase;
varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float w = sin(uTime * (0.6 + fract(phase * 7.31) * 1.4) + phase * 6.2831);
  vA = smoothstep(0.35, 1.0, w) * smoothstep(4.0, 9.0, -mv.z);
  gl_PointSize = clamp(0.35 * uScale / -mv.z, 1.5, 10.0);
}`
const PHONE_FRAG = /* glsl */ `
varying float vA;
void main() {
  float r = length(gl_PointCoord - 0.5);
  if (r > 0.5 || vA < 0.01) discard;
  gl_FragColor = vec4(vec3(1.0, 0.96, 0.86) * vA * (1.0 - r * 1.7), 1.0);
}`

/**
 * Arma la Bombonera. Devuelve:
 *  - group: lo que va a la escena
 *  - pickables: las mallas de tribuna para el clic
 *  - update(t, viewportHeight): titileo de los celulares
 *  - dispose(): libera geometrías, materiales y texturas
 */
export function buildStadium(renderer) {
  const group = new THREE.Group()
  group.name = 'bombonera'
  const textures = []
  const pickables = []
  const color = (c) => new THREE.Color(c)
  const add = (mesh, pick = false) => {
    group.add(mesh)
    if (pick) pickables.push(mesh)
    return mesh
  }
  const lambert = (opts) => new THREE.MeshLambertMaterial(opts)

  /* ── cielo, estrellas, suelo y el barrio ── */
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1800, 32, 16),
    new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      uniforms: { uZenith: { value: color(LOOK.zenith) }, uHorizon: { value: color(LOOK.horizon) }, uHaze: { value: color(LOOK.haze) } },
      side: THREE.BackSide,
      depthWrite: false,
    }),
  )
  sky.renderOrder = -1
  add(sky)

  const rand = rng(1940)
  const starPos = []
  for (let i = 0; i < 700; i++) {
    const u = rand() * Math.PI * 2
    const v = 0.12 + rand() * 0.88
    const r = Math.sqrt(1 - v * v)
    starPos.push(Math.cos(u) * r * 1600, v * 1600, Math.sin(u) * r * 1600)
  }
  const stars = new THREE.BufferGeometry()
  stars.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3))
  add(new THREE.Points(stars, new THREE.PointsMaterial({ color: '#9fb2e0', size: 1.6, sizeAttenuation: false, depthWrite: false })))

  const ground = new THREE.Mesh(new THREE.CircleGeometry(1500, 48), lambert({ color: LOOK.ground }))
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.05
  add(ground)

  // casas bajas de colores alrededor, como en La Boca (apagadas por la noche)
  const PALETTE = ['#a33b2c', '#d2a23a', '#2e5e8c', '#3f7a4f', '#b8b0a0', '#7a4a8c']
  const houses = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), lambert({ color: '#ffffff' }), 340)
  const dummy = new THREE.Object3D()
  const tint = new THREE.Color()
  for (let i = 0, placed = 0; placed < houses.count && i < 5000; i++) {
    const a = rand() * Math.PI * 2
    const r = 190 + rand() * 330
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    if (Math.abs(x) < HX + OUTER + 18 && z > -HZ - FLAT.back - 18 && z < HZ + OUTER + 18) continue
    dummy.position.set(x, 0, z)
    dummy.rotation.set(0, Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + (rand() - 0.5) * 0.2, 0)
    dummy.scale.set(7 + rand() * 10, 4 + rand() * 9, 7 + rand() * 9)
    dummy.updateMatrix()
    houses.setMatrixAt(placed, dummy.matrix)
    houses.setColorAt(placed, tint.set(PALETTE[Math.floor(rand() * PALETTE.length)]).multiplyScalar(0.05 + rand() * 0.04))
    placed++
  }
  add(houses)

  /* ── el campo ── */
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(2 * HX + 2, 2 * HZ + 2), lambert({ color: LOOK.apron }))
  apron.rotation.x = -Math.PI / 2
  apron.position.y = -0.01
  add(apron)
  const pitchMap = pitchTexture(renderer)
  textures.push(pitchMap)
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(PITCH.length, PITCH.width), lambert({ map: pitchMap }))
  pitch.rotation.x = -Math.PI / 2
  add(pitch)

  const white = lambert({ color: '#f4f4ee', emissive: '#30343a' })
  const net = new THREE.MeshBasicMaterial({ color: '#dfe6f0', transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })
  for (const s of [-1, 1]) {
    const x = s * PITCH.length / 2
    const gw = PITCH.goalWidth
    const gh = PITCH.goalHeight
    for (const z of [-gw / 2, gw / 2]) {
      const post = add(new THREE.Mesh(new THREE.BoxGeometry(0.12, gh, 0.12), white))
      post.position.set(x, gh / 2, z)
    }
    const bar = add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, gw + 0.12), white))
    bar.position.set(x, gh, 0)
    const back = add(new THREE.Mesh(new THREE.PlaneGeometry(gw, gh * 1.05), net))
    back.rotation.y = Math.PI / 2
    back.position.set(x + s * 2, gh / 2, 0)
    const top = add(new THREE.Mesh(new THREE.PlaneGeometry(2, gw), net))
    top.rotation.x = -Math.PI / 2
    top.position.set(x + s, gh, 0)
  }

  /* ── la U: tres bandejas, coronamiento y pared exterior ── */
  const samples = pathSamples(1.5)
  const standMat = lambert({ vertexColors: true, side: THREE.DoubleSide })
  const roleColors = (tierId) => {
    const accent = color(TIER_COLORS[tierId])
    return {
      lip: accent.clone().multiplyScalar(0.85),
      tread: accent.clone().multiplyScalar(0.28),
      riser: color(LOOK.concreteDark),
      back: color(LOOK.concrete),
      soffit: color(LOOK.concreteDark).multiplyScalar(0.8),
      wall: color(LOOK.concrete),
      roof: color('#0b0f19'),
      facade: color(LOOK.azul).multiplyScalar(0.55),
    }
  }
  TIERS.forEach((t, i) => {
    const colors = roleColors(t.id)
    add(new THREE.Mesh(sweep(samples, stepProfile(t, { first: i === 0 }), (r) => colors[r]), standMat), true)
  })
  const top = TIERS.at(-1)
  const shellColors = roleColors('alta')
  add(
    new THREE.Mesh(
      sweep(
        samples,
        [
          { p: [top.dEnd, top.top], role: 'wall' },
          { p: [top.dEnd, ROOF], role: 'roof' },
          { p: [OUTER, ROOF], role: 'facade' },
          { p: [OUTER, 0], role: 'facade' },
        ],
        (r) => shellColors[r],
      ),
      standMat,
    ),
  )
  // las puntas de la U se cierran contra el edificio del lado recto
  const concrete = lambert({ color: LOOK.concrete })
  for (const s of [-1, 1]) {
    const wing = add(new THREE.Mesh(new THREE.BoxGeometry(OUTER, ROOF, FLAT.back), concrete))
    wing.position.set(s * (HX + OUTER / 2), ROOF / 2, -HZ - FLAT.back / 2)
  }

  /* ── el lado recto: platea, palcos apilados y techo ── */
  const flatPath = [
    { x: -HX, z: -HZ, nx: 0, nz: -1 },
    { x: HX, z: -HZ, nx: 0, nz: -1 },
  ]
  const P = FLAT.platea
  const plateaProfile = stepProfile({ ...P, dEnd: P.dEnd, top: P.top }, { first: true }).slice(0, -1)
  plateaProfile.push({ p: [P.dEnd, palcoFloor(0)], role: 'back' })
  const flatColors = roleColors('platea')
  add(new THREE.Mesh(sweep(flatPath, plateaProfile, (r) => flatColors[r]), standMat), true)

  const L = FLAT.palcos
  const span = 2 * HX
  const fascia = lambert({ color: LOOK.azul, emissive: '#0a1430' })
  const stripe = lambert({ color: LOOK.oroHondo, emissive: '#2a1a05' })
  const glass = new THREE.MeshLambertMaterial({ color: '#9fb7d8', transparent: true, opacity: 0.22, depthWrite: false, emissive: '#3b2a12' })
  const interior = new THREE.MeshBasicMaterial({ color: color(LOOK.warm).multiplyScalar(0.55) })
  const slabMat = lambert({ color: LOOK.concreteDark })
  const mullions = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 1, 0.2), slabMat, (L.perLevel + 1) * L.levels)
  let mi = 0
  for (let l = 0; l < L.levels; l++) {
    const y = palcoFloor(l)
    const front = palcoFront(l)
    const z = (d) => -HZ - d
    const slab = add(new THREE.Mesh(new THREE.BoxGeometry(span, 0.32, FLAT.back - front + 0.4), slabMat))
    slab.position.set(0, y - 0.16, z((front - 0.4 + FLAT.back) / 2))
    const band = add(new THREE.Mesh(new THREE.BoxGeometry(span, PALCO_RAIL, 0.26), fascia), true)
    band.position.set(0, y + PALCO_RAIL / 2, z(front))
    const line = add(new THREE.Mesh(new THREE.BoxGeometry(span, 0.1, 0.28), stripe))
    line.position.set(0, y + PALCO_RAIL - 0.12, z(front))
    const glassH = L.height - PALCO_RAIL - 0.35
    const pane = add(new THREE.Mesh(new THREE.PlaneGeometry(span, glassH), glass), true)
    pane.position.set(0, y + PALCO_RAIL + glassH / 2, z(front + 0.12))
    pane.renderOrder = 2
    const wall = add(new THREE.Mesh(new THREE.PlaneGeometry(span, L.height), interior))
    wall.position.set(0, y + L.height / 2, z(front + L.depth))
    for (let b = 0; b <= L.perLevel; b++) {
      dummy.position.set(-HX + b * L.width, y + PALCO_RAIL + (L.height - PALCO_RAIL) / 2, z(front + 0.1))
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(1, L.height - PALCO_RAIL, 1)
      dummy.updateMatrix()
      mullions.setMatrixAt(mi++, dummy.matrix)
    }
  }
  add(mullions)
  const roofSlab = add(new THREE.Mesh(new THREE.BoxGeometry(span, 0.6, FLAT.back - palcoFront(L.levels) + 0.6), slabMat))
  roofSlab.position.set(0, FLAT.roof + 0.3, -HZ - (palcoFront(L.levels) - 0.6 + FLAT.back) / 2)
  const backWall = add(new THREE.Mesh(new THREE.BoxGeometry(span, FLAT.roof + 0.6, 0.6), concrete))
  backWall.position.set(0, (FLAT.roof + 0.6) / 2, -HZ - FLAT.back)

  /* ── butacas ── */
  const seats = seatLayout()
  const seatMesh = new THREE.InstancedMesh(seatGeometry(), lambert({ side: THREE.DoubleSide }), seats.count)
  const crowd = []
  const crowdColor = []
  const phones = []
  const phase = []
  const fans = [color(LOOK.azulVivo), color(LOOK.oro), color('#f1ede3'), color('#141a2c'), color('#1d3c8f')]
  for (let i = 0; i < seats.count; i++) {
    const x = seats.positions[3 * i]
    const y = seats.positions[3 * i + 1]
    const z = seats.positions[3 * i + 2]
    dummy.position.set(x, y, z)
    dummy.rotation.set(0, seats.yaw[i], 0)
    dummy.scale.setScalar(1)
    dummy.updateMatrix()
    seatMesh.setMatrixAt(i, dummy.matrix)
    seatMesh.setColorAt(i, tint.set(TIER_COLORS[ZONES[seats.zone[i]].tier]).multiplyScalar(0.8 + rand() * 0.25))
    // gente: más o menos la mitad de las butacas, con camisetas de colores
    if (rand() < 0.52) {
      crowd.push(x, y + 0.95, z)
      const c = fans[Math.floor(rand() * fans.length)]
      crowdColor.push(c.r * 0.7, c.g * 0.7, c.b * 0.7)
      if (rand() < 0.045) {
        phones.push(x, y + 1.25, z)
        phase.push(rand())
      }
    }
  }
  add(seatMesh)
  const crowdGeo = new THREE.BufferGeometry()
  crowdGeo.setAttribute('position', new THREE.Float32BufferAttribute(crowd, 3))
  crowdGeo.setAttribute('color', new THREE.Float32BufferAttribute(crowdColor, 3))
  const halo = dotTexture()
  textures.push(halo)
  const crowdMat = new THREE.ShaderMaterial({
    vertexShader: CROWD_VERT,
    fragmentShader: CROWD_FRAG,
    uniforms: { uScale: { value: 400 } },
    transparent: true,
  })
  add(new THREE.Points(crowdGeo, crowdMat))
  const phoneGeo = new THREE.BufferGeometry()
  phoneGeo.setAttribute('position', new THREE.Float32BufferAttribute(phones, 3))
  phoneGeo.setAttribute('phase', new THREE.Float32BufferAttribute(phase, 1))
  const phoneMat = new THREE.ShaderMaterial({
    vertexShader: PHONE_VERT,
    fragmentShader: PHONE_FRAG,
    uniforms: { uTime: { value: 0 }, uScale: { value: 400 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  add(new THREE.Points(phoneGeo, phoneMat))

  /* ── reflectores en el coronamiento: paneles blancos y su halo ── */
  const lights = []
  const dRoof = top.dEnd + 0.6
  const nU = Math.floor(curveLength(dRoof) / 9)
  for (let i = 0; i < nU; i++) {
    const p = alongCurve(((i + 0.5) / nU) * curveLength(dRoof), dRoof)
    lights.push([p.x, ROOF + 1.4, p.z, Math.atan2(-p.nx, -p.nz)])
  }
  for (let x = -HX + 4; x <= HX - 4; x += 9) lights.push([x, FLAT.roof + 1.5, -HZ - palcoFront(L.levels) - 0.4, 0])
  const panels = new THREE.InstancedMesh(
    new THREE.BoxGeometry(5, 1.4, 0.4),
    new THREE.MeshBasicMaterial({ color: color(LOOK.flood).multiplyScalar(2.2), toneMapped: false }),
    lights.length,
  )
  const glowPos = []
  lights.forEach(([x, y, z, yaw], i) => {
    dummy.position.set(x, y, z)
    dummy.rotation.set(-0.35, yaw, 0, 'YXZ')
    dummy.updateMatrix()
    panels.setMatrixAt(i, dummy.matrix)
    glowPos.push(x, y, z)
  })
  add(panels)
  const glowGeo = new THREE.BufferGeometry()
  glowGeo.setAttribute('position', new THREE.Float32BufferAttribute(glowPos, 3))
  add(
    new THREE.Points(
      glowGeo,
      new THREE.PointsMaterial({
        size: 16,
        map: halo,
        color: color(LOOK.flood).multiplyScalar(0.55),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    ),
  )

  /* ── luz: cielo nocturno, reflectores fríos desde arriba y calor desde los palcos ── */
  group.add(new THREE.HemisphereLight('#7088c8', '#0a1a0e', 0.75))
  const key = new THREE.DirectionalLight(LOOK.flood, 2.2)
  key.position.set(30, 140, 70)
  const key2 = new THREE.DirectionalLight(LOOK.flood, 1.1)
  key2.position.set(-60, 120, -40)
  const warm = new THREE.DirectionalLight(LOOK.warm, 0.55)
  warm.position.set(0, 30, -120)
  group.add(key, key2, warm)

  return {
    group,
    pickables,
    update(t, viewportHeight) {
      phoneMat.uniforms.uTime.value = t
      phoneMat.uniforms.uScale.value = viewportHeight / 2
      crowdMat.uniforms.uScale.value = viewportHeight / 2
    },
    dispose() {
      const geometries = new Set()
      const materials = new Set()
      group.traverse((o) => {
        if (o.geometry) geometries.add(o.geometry)
        if (o.material) for (const m of [].concat(o.material)) materials.add(m)
        if (o.isInstancedMesh || o.isLight) o.dispose()
      })
      geometries.forEach((g) => g.dispose())
      materials.forEach((m) => m.dispose())
      textures.forEach((x) => x.dispose())
      group.clear()
    },
  }
}
