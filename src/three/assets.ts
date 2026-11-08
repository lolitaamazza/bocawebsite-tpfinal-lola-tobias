import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { fonts } from '../config/site'
import { loadBrand, type BrandImages } from './kit/brand'
import { kit } from './kit/kitSpec'
import { paintBase, paintJersey } from './kit/paintKit'
import type { Player } from '../types'

/**
 * Todo lo que la escena necesita antes de arrancar: geometrías del modelo, logos
 * y tipografías listas para pintar. Se carga una vez y se comparte.
 */
export interface SceneAssets {
  shirt: THREE.BufferGeometry
  hanger: THREE.BufferGeometry
  hook: THREE.BufferGeometry
  brand: BrandImages
  /** Ancho de la remera con mangas y cuánto cuelga, ya escalados */
  size: { width: number; bottom: number }
}

/** El modelo es un poco chico para el vestuario: se cuelga a esta escala */
export const SHIRT_SCALE = 1.1

/** Modelo de la remera. Placeholder hasta tener uno propio: ver docs/MODELO-3D.md */
export const MODEL_URL = '/models/camiseta.glb'

export async function loadSceneAssets(onProgress?: (p: number) => void): Promise<SceneAssets> {
  let done = 0
  const tick = <T,>(p: Promise<T>) =>
    p.then((v) => {
      done += 1
      onProgress?.(done / 3)
      return v
    })
  const [gltf, brand] = await Promise.all([
    tick(new GLTFLoader().loadAsync(MODEL_URL)),
    tick(loadBrand(kit.colors)),
    tick(
      Promise.all([
        document.fonts.load(`${fonts.letteringWeight} 64px "${fonts.lettering}"`, 'ÁÉÍÓÚÑ0123456789'),
        document.fonts.load(`400 64px "${fonts.tag}"`, '0123456789'),
      ]),
    ),
  ])
  gltf.scene.updateMatrixWorld(true)
  const pick = (prefix: string) => {
    let mesh: THREE.Mesh | undefined
    gltf.scene.traverse((o) => {
      if (!mesh && (o as THREE.Mesh).isMesh && o.name.startsWith(prefix)) mesh = o as THREE.Mesh
    })
    if (!mesh) throw new Error(`Falta "${prefix}" en ${MODEL_URL}`)
    return mesh.geometry.clone().applyMatrix4(mesh.matrixWorld)
  }
  const shirt = pick('camiseta')
  shirt.computeBoundingBox()
  const box = shirt.boundingBox!
  return {
    shirt,
    hanger: pick('percha'),
    hook: pick('gancho'),
    brand,
    size: { width: (box.max.x - box.min.x) * SHIRT_SCALE, bottom: box.min.y * SHIRT_SCALE },
  }
}

/** Bases pintadas por resolución: la remera lisa se pinta una vez por `k` */
const bases = new Map<number, HTMLCanvasElement>()

export function jerseyTexture(assets: SceneAssets, player: Pick<Player, 'shirt' | 'dorsal' | 'estampado'>, k: number, anisotropy: number) {
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
