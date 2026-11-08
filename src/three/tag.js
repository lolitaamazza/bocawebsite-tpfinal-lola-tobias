import * as THREE from 'three'
import { fonts, room } from '../config/site'
const disc = new THREE.CylinderGeometry(0.023, 0.023, 0.0026, 36).rotateX(Math.PI / 2)
const ring = new THREE.TorusGeometry(0.0065, 0.0011, 6, 18)
const edge = new THREE.MeshStandardMaterial({ color: room.tag.edge, roughness: 0.35, metalness: 1 })
/** Chapita de bronce con el dorsal (o una "C" dorada para el capitán) que cuelga del gancho */
export function createTag(player) {
  const c = document.createElement('canvas')
  c.width = c.height = 160
  const ctx = c.getContext('2d')
  const [inner, outer] = player.capitan ? room.tag.captain : room.tag.face
  const g = ctx.createRadialGradient(62, 52, 8, 80, 80, 86)
  g.addColorStop(0, inner)
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 160, 160)
  ctx.strokeStyle = 'rgba(40,24,6,0.55)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(80, 80, 66, 0, Math.PI * 2)
  ctx.stroke()
  const label = player.capitan ? 'C' : String(player.dorsal)
  ctx.font = `${label.length > 1 ? 78 : 92}px "${fonts.tag}"`
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,240,200,0.5)'
  ctx.fillText(label, 80, 113)
  ctx.fillStyle = player.capitan ? room.tag.captainInk : room.tag.ink
  ctx.fillText(label, 80, 111)
  const map = new THREE.CanvasTexture(c)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 4
  map.center.set(0.5, 0.5)
  map.rotation = Math.PI / 2
  const face = new THREE.MeshStandardMaterial({
    map,
    roughness: player.capitan ? 0.3 : 0.42,
    metalness: player.capitan ? 0.2 : 0.9,
  })
  const coin = new THREE.Mesh(disc, [edge, face, face])
  coin.castShadow = true
  const loop = new THREE.Mesh(ring, edge)
  loop.position.y = 0.0245
  loop.rotation.y = Math.PI / 2
  const group = new THREE.Group()
  group.add(coin, loop)
  group.position.set(0.004, -0.066, 0.011)
  group.rotation.z = ((player.dorsal * 37) % 11) * 0.02 - 0.1
  return group
}
