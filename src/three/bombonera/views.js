import { HX, HZ, OUTER, spotSeat } from './layout'

/**
 * Cámaras de la Bombonera, todas puras ({ pos: [x, y, z], target: [x, y, z] }):
 *  - vista aérea que gira despacio alrededor del estadio
 *  - vuelta de entrada que baja en espiral hasta la vista aérea
 *  - el punto de vista de una butaca
 *  - el vuelo en arco de una pose a otra
 * El componente las copia a la cámara de three.
 */
export const EYE = 1.2 // altura de los ojos sobre el escalón, sentado
export const ORBIT_SPEED = 0.035 // rad/s de la vista aérea
export const INTRO_TURN = 1.25 * Math.PI // lo que gira la vuelta de entrada
const ELEVATION = (36 * Math.PI) / 180
const AERIAL = { theta: 0.45, dist: 230, target: [0, 4, -4], shift: 22 }
const HALF_WIDTH = HX + OUTER + 6 // medio ancho del estadio con aire

const lerp = (a, b, t) => a + (b - a) * t
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]

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

/** Punto de vista desde una butaca: los ojos sobre el escalón, mirando hacia la cancha */
export function seatPose(seat) {
  const pos = [seat.x, seat.y + EYE, seat.z]
  // mira hacia el centro, corrido hacia el lado de la butaca: el arco cercano no se pierde
  const target = [seat.x * 0.3, 0, Math.max(-HZ * 0.4, Math.min(HZ * 0.4, seat.z * 0.15))]
  return { pos, target }
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
