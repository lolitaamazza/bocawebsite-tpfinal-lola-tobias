import { HX, HZ, OUTER, ROOF, TUNNEL, spotSeat } from './layout'

/**
 * Cámaras de la Bombonera, todas puras ({ pos: [x, y, z], target: [x, y, z] }):
 *  - túnel de salida de los jugadores (primera persona hacia el césped)
 *  - vuelo cinemático del túnel a la cancha y ascenso a vista cenital/aérea
 *  - vista cenital arquitectónica (mapa 3D de ticketing) y vista aérea oblicua
 *  - acercamiento frontal a un sector/bandeja para elegir fila y butaca
 *  - el punto de vista (POV) desde la butaca hacia la cancha o la pantalla LED
 *  - el vuelo en arco de una pose a otra
 * El componente las copia a la cámara de three.
 */
export const EYE = 1.2 // altura de los ojos sobre el escalón, sentado
export const ORBIT_SPEED = 0.035 // rad/s de la vista aérea
export const INTRO_TURN = 1.25 * Math.PI // lo que gira la vuelta de entrada
const ELEVATION = (36 * Math.PI) / 180
const TOPDOWN_ELEVATION = (68 * Math.PI) / 180
const AERIAL = { theta: 0.45, dist: 230, target: [0, 4, -4], shift: 22 }
const HALF_WIDTH = HX + OUTER + 6 // medio ancho del estadio con aire

const lerp = (a, b, t) => a + (b - a) * t
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
const smooth = (t) => t * t * (3 - 2 * t)

/** Campo visual vertical según el aspecto: en vertical se abre para que entre la cancha */
export function fovFor(aspect) {
  if (aspect < 0.8) return 62
  if (aspect < 1.2) return 54
  return 44
}

/** Distancia de la vista aérea para que entre el estadio a lo ancho */
export function aerialDistance(aspect) {
  const t = Math.tan((fovFor(aspect) * Math.PI) / 360) * aspect
  return Math.max(AERIAL.dist, HALF_WIDTH / t)
}

/** Centro de la vista aérea: en pantalla ancha se corre a la derecha de cámara, así el estadio queda a la izquierda de la lista */
function aerialTarget(aspect, theta) {
  const s = aspect >= 1.2 ? AERIAL.shift : 0
  const [x, y, z] = AERIAL.target
  return [x + Math.cos(theta) * s, y, z - Math.sin(theta) * s]
}

/** Vista aérea con giro theta (0 = desde el lateral curvo, mirando a los palcos) */
export function aerialPose(aspect, theta = AERIAL.theta) {
  const dist = aerialDistance(aspect)
  const h = dist * Math.cos(ELEVATION)
  const target = aerialTarget(aspect, theta)
  return {
    pos: [target[0] + Math.sin(theta) * h, dist * Math.sin(ELEVATION), target[2] + Math.cos(theta) * h],
    target,
  }
}
export const AERIAL_THETA = AERIAL.theta

/**
 * Vista cenital 3D de ticketing (estilo Reel: planta arquitectónica sobre fondo
 * negro con el anillo cálido de palcos y las 3 bandejas en encuadre simétrico).
 */
export function topDownPose(aspect, theta = 0.08) {
  const dist = aerialDistance(aspect) * 0.94
  const h = dist * Math.cos(TOPDOWN_ELEVATION)
  const shift = aspect >= 1.25 ? 14 : 0
  const target = [Math.cos(theta) * shift, 2, -2 - Math.sin(theta) * shift]
  return {
    pos: [target[0] + Math.sin(theta) * h, dist * Math.sin(TOPDOWN_ELEVATION), target[2] + Math.cos(theta) * h],
    target,
  }
}

/**
 * Cámara dentro del túnel de jugadores mirando hacia la cancha iluminada.
 * u = 0 en el fondo del túnel ("ELEGÍ TU UBICACIÓN"), u = 1 en el umbral del campo.
 */
export function tunnelPose(u = 0) {
  const z = lerp(TUNNEL.z1 + 4.2, TUNNEL.z0 + 1.5, Math.min(1, Math.max(0, u)))
  const y = lerp(1.68, 1.85, u)
  return {
    pos: [0, y, z],
    target: [0, 3.4, HZ * 0.72],
  }
}

/**
 * Vuelo cinemático desde el túnel hacia la cancha y ascenso al mapa 3D (estilo Reel):
 *  - 0.00..0.36: avanza por el túnel y sale al césped recorriendo las bandas LED
 *  - 0.36..1.00: gira y asciende hasta la vista cenital/aérea del estadio completo
 */
export function tunnelToAerialPose(u, aspect, topDown = true) {
  const end = topDown ? topDownPose(aspect, 0.08) : aerialPose(aspect, AERIAL.theta)
  if (u <= 0.36) {
    const t = smooth(u / 0.36)
    const start = tunnelPose(0)
    const fieldPos = [lerp(0, -14, t), lerp(start.pos[1], 3.8, t * t), lerp(start.pos[2], -6, t)]
    const fieldTarget = [lerp(0, 16, t), lerp(3.4, 5.2, t), lerp(HZ * 0.72, HZ * 0.35, t)]
    return { pos: fieldPos, target: fieldTarget }
  }
  const t = smooth((u - 0.36) / 0.64)
  const midPos = [-14, 3.8, -6]
  const midTarget = [16, 5.2, HZ * 0.35]
  const arc = Math.sin(t * Math.PI) * 24
  return {
    pos: [
      lerp(midPos[0], end.pos[0], t) + Math.sin(t * Math.PI) * 18,
      lerp(midPos[1], end.pos[1], t) + arc,
      lerp(midPos[2], end.pos[2], t),
    ],
    target: lerp3(midTarget, end.target, t),
  }
}

/** Vuelta de entrada: u = 0 lejos y alto; u = 1 exactamente la vista aérea */
export function introPose(u, aspect) {
  const end = aerialPose(aspect, AERIAL.theta)
  const theta = AERIAL.theta - (1 - u) * INTRO_TURN
  const dist = aerialDistance(aspect) * lerp(1.9, 1, u)
  const el = lerp((58 * Math.PI) / 180, ELEVATION, u)
  const h = dist * Math.cos(el)
  // gira alrededor de un centro que se corre hasta el de la vista aérea: llega justo
  const target = lerp3([0, 0, 0], end.target, u)
  return {
    pos: [target[0] + Math.sin(theta) * h, dist * Math.sin(el), target[2] + Math.cos(theta) * h],
    target,
  }
}

/**
 * Vista frontal/diagonal cercana a un sector o bandeja (Stage 2 del Reel):
 * encuadra las filas de butacas, las cintas LED con precios ("DESDE $...") y
 * los palcos/suites iluminados para elegir fila y asiento antes de sentarse.
 */
export function sectionOverviewPose(seat) {
  const nx = seat.nx ?? 0
  const nz = seat.nz ?? -1
  // Vector tangente para darle un leve ángulo dramático sin perder frontalidad
  const tx = -nz
  const tz = nx
  const isPalco = seat.zone === 'recta-palcos' || seat.zone === 'recta-platea'
  const pullBack = isPalco ? 18 : 20
  const lift = isPalco ? 0.8 : -1.2
  return {
    pos: [
      seat.x - nx * pullBack + tx * 3.2,
      Math.max(3.2, seat.y + lift),
      seat.z - nz * pullBack + tz * 3.2,
    ],
    target: [
      seat.x + nx * 2.4,
      seat.y + (isPalco ? 0.6 : 1.1),
      seat.z + nz * 2.4,
    ],
  }
}

/** Punto de vista desde una butaca: los ojos sobre el escalón, mirando hacia la cancha */
export function seatPose(seat) {
  const pos = [seat.x, seat.y + EYE, seat.z]
  // mira hacia el centro, corrido hacia el lado de la butaca: el arco cercano no se pierde
  const target = [seat.x * 0.3, 0, Math.max(-HZ * 0.4, Math.min(HZ * 0.4, seat.z * 0.15))]
  return { pos, target }
}

/**
 * Punto de vista desde la butaca con soporte para mirar:
 *  - 'pitch': la cancha y los respaldos de las butacas delanteras (default)
 *  - 'jumbotron': hacia arriba al tablero LED colgante y las cerchas de reflectores
 *  - 'la12': hacia la cabecera de Casa Amarilla (La 12)
 *  - 'palcos': hacia la pared vertical de palcos del lado recto
 */
export function seatLookPose(seat, lookMode = 'pitch', yawOffset = 0, pitchOffset = 0) {
  const base = seatPose(seat)
  let target = [...base.target]
  if (lookMode === 'jumbotron') {
    target = [0, ROOF + 5.5, 0]
  } else if (lookMode === 'la12') {
    target = [-HX - 4, 14, 0]
  } else if (lookMode === 'palcos') {
    target = [0, 16, -HZ - 10]
  }
  if (yawOffset !== 0 || pitchOffset !== 0) {
    const dx = target[0] - base.pos[0]
    const dy = target[1] - base.pos[1]
    const dz = target[2] - base.pos[2]
    const dist = Math.hypot(dx, dz) || 1
    const yaw = Math.atan2(dx, dz) + yawOffset
    target[0] = base.pos[0] + Math.sin(yaw) * dist
    target[2] = base.pos[2] + Math.cos(yaw) * dist
    target[1] = base.pos[1] + dy + pitchOffset * dist * 0.55
  }
  return { pos: base.pos, target }
}

/** Pose de una ubicación de la lista */
export const ubicacionPose = (u) => seatPose(spotSeat(u))

/**
 * Vuelo de una pose a otra (u de 0 a 1, la curva de velocidad la pone GSAP):
 * la posición sube en arco a mitad de camino para no atravesar las tribunas.
 */
export function flight(from, to, u, out = { pos: [0, 0, 0], target: [0, 0, 0] }) {
  const span = Math.hypot(to.pos[0] - from.pos[0], to.pos[1] - from.pos[1], to.pos[2] - from.pos[2])
  const lift = Math.min(70, span * 0.35) * Math.sin(Math.PI * u)
  for (let i = 0; i < 3; i++) {
    out.pos[i] = lerp(from.pos[i], to.pos[i], u) + (i === 1 ? lift : 0)
    out.target[i] = lerp(from.target[i], to.target[i], u)
  }
  return out
}
