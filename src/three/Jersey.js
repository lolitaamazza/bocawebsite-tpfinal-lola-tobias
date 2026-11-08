import * as THREE from 'three'
import { createSwing } from '../engine/swing'
import { SHIRT_SCALE, jerseyTexture } from './assets'
import { kit } from './kit/kitSpec'
import { createClothMaterial } from './materials/cloth'
import { RAIL_Y } from './room'
import { createTag } from './tag'
/** Giro de reposo: las remeras cuelgan de costado, mostrando un poco de espalda */
export const REST_YAW = 1.2
/**
 * Una percha del riel: remera + percha + gancho + chapita. Guarda su estado de
 * animación; el RailRig decide los objetivos y esto solo los aplica.
 */
export class Jersey {
  player
  shared
  pivot = new THREE.Group()
  turn = new THREE.Group()
  hook
  mesh
  cloth
  slot
  phase
  swing
  x = 0
  y = 0
  z = 0
  yaw = REST_YAW
  scale = 1
  hookYaw = Math.PI / 2
  prevWorldX = 0
  prevVel = 0
  lowRes
  hiRes
  hiK = 0
  constructor(player, index, shared, withTag = true, reduced = false) {
    this.player = player
    this.shared = shared
    const { assets } = shared
    this.phase = (index * 2.399) % (Math.PI * 2)
    this.slot = { pos: player.pos, active: true, restX: 0 }
    this.lowRes = jerseyTexture(assets, player, shared.lowK, shared.anisotropy)
    const { material, depth, uniforms } = createClothMaterial({
      map: this.lowRes,
      normalMap: shared.knit,
      time: shared.time,
      phase: this.phase,
      lining: kit.colors.lining,
    })
    uniforms.uAmp.value = reduced ? 0 : 0.009
    this.cloth = uniforms
    this.mesh = new THREE.Mesh(assets.shirt, material)
    this.mesh.customDepthMaterial = depth
    this.mesh.castShadow = this.mesh.receiveShadow = true
    const hanger = new THREE.Mesh(assets.hanger, shared.hangerMaterial)
    hanger.receiveShadow = true
    this.hook = new THREE.Mesh(assets.hook, shared.hookMaterial)
    this.hook.castShadow = true
    this.hook.scale.setScalar(SHIRT_SCALE)
    this.hook.rotation.y = Math.PI / 2
    this.turn.scale.setScalar(SHIRT_SCALE)
    this.turn.add(this.mesh, hanger)
    this.pivot.position.y = RAIL_Y
    this.pivot.add(this.turn, this.hook)
    if (withTag) {
      const tag = createTag(player)
      tag.scale.setScalar(SHIRT_SCALE)
      tag.position.multiplyScalar(SHIRT_SCALE)
      this.pivot.add(tag)
    }
    this.swing = createSwing(REST_YAW, reduced ? 0 : 0.2 * Math.sin(index * 1.3 + 0.6))
  }
  /** Sube la resolución de la textura (hover, ficha). `k` 1 = 1600 px de ancho. */
  sharpen(k) {
    if (this.hiK >= k) return
    this.hiRes?.dispose()
    this.hiRes = jerseyTexture(this.shared.assets, this.player, k, this.shared.anisotropy)
    this.hiK = k
    this.mesh.material.map = this.hiRes
  }
  /** Vuelve a la textura liviana y libera la grande */
  soften() {
    if (!this.hiRes) return
    this.mesh.material.map = this.lowRes
    this.hiRes.dispose()
    this.hiRes = undefined
    this.hiK = 0
  }
  /** Repinta con otro nombre/número (personalizador) */
  restamp(shirt, estampado) {
    this.player = { ...this.player, shirt, estampado }
    this.lowRes.dispose()
    this.lowRes = jerseyTexture(this.shared.assets, this.player, this.shared.lowK, this.shared.anisotropy)
    if (this.hiRes) {
      const k = this.hiK
      this.hiRes.dispose()
      this.hiRes = jerseyTexture(this.shared.assets, this.player, k, this.shared.anisotropy)
    }
    this.mesh.material.map = this.hiRes ?? this.lowRes
  }
  dispose() {
    this.lowRes.dispose()
    this.hiRes?.dispose()
    this.mesh.material.dispose()
  }
}
