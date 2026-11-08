import * as THREE from 'three'
import { fonts } from '../config/site'
import { loadBrand } from './kit/brand'
import { kit } from './kit/kitSpec'
import { paintBase, paintJersey } from './kit/paintKit'
import { createHangerGeometry, createHookGeometry, createShirtGeometry } from './model/shirtModel'

/** El modelo es un poco chico para el vestuario: se cuelga a esta escala */
export const SHIRT_SCALE = 1.1

/**
 * Modelo de la remera: el GLB de /public/models (remera + percha + gancho).
 * Si no está o falla, se usa la remera generada por código (mismo layout UV)
 * para que el vestuario nunca quede vacío.
 */
const GLB_URL = process.env.NEXT_PUBLIC_SHIRT_GLB || '/models/camiseta.glb'

async function loadGlbModel(url) {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
  const gltf = await new GLTFLoader().loadAsync(url)
  gltf.scene.updateMatrixWorld(true)
  const pick = (prefix) => {
    let mesh
    gltf.scene.traverse((o) => {
      if (!mesh && o.isMesh && o.name.startsWith(prefix)) mesh = o
    })
    if (!mesh) throw new Error(`Falta "${prefix}" en ${url}`)
    return mesh.geometry.clone().applyMatrix4(mesh.matrixWorld)
  }
  return { shirt: pick('camiseta'), hanger: pick('percha'), hook: pick('gancho') }
}

function proceduralModel() {
  return { shirt: createShirtGeometry(), hanger: createHangerGeometry(), hook: createHookGeometry() }
}

/**
 * Todo lo que la escena necesita antes de arrancar: geometrías, logos y
 * tipografías listas para pintar. Se carga una vez y se comparte.
 */
export async function loadSceneAssets(onProgress) {
  let done = 0
  const tick = (p) =>
    p.then((v) => {
      done += 1
      onProgress?.(done / 3)
      return v
    })
  const [model, brand] = await Promise.all([
    tick(
      loadGlbModel(GLB_URL).catch((e) => {
        console.warn(`No se pudo cargar ${GLB_URL}, uso la remera generada por código.`, e)
        return proceduralModel()
      }),
    ),
    tick(loadBrand(kit.colors)),
    tick(
      Promise.all([
        document.fonts.load(`${fonts.letteringWeight} 64px "${fonts.lettering}"`, 'ÁÉÍÓÚÑ0123456789'),
        document.fonts.load(`400 64px "${fonts.tag}"`, '0123456789'),
      ]),
    ),
  ])
  model.shirt.computeBoundingBox()
  const box = model.shirt.boundingBox
  return {
    ...model,
    brand,
    size: { width: (box.max.x - box.min.x) * SHIRT_SCALE, bottom: box.min.y * SHIRT_SCALE },
  }
}

/** Bases pintadas por resolución: la remera lisa se pinta una vez por `k` */
const bases = new Map()

export function jerseyTexture(assets, player, k, anisotropy) {
  let base = bases.get(k)
  if (!base) {
    base = paintBase(assets.brand, k)
    bases.set(k, base)
  }
  const canvas = paintJersey(base, player.shirt, player.estampado ?? String(player.dorsal), k)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.flipY = false
  tex.anisotropy = anisotropy
  return tex
}
