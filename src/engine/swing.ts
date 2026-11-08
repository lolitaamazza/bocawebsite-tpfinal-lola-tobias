import { clamp } from './math'

/**
 * Péndulo de cada percha: la remera se balancea cuando el riel acelera y,
 * en reposo, una brisa suave la mantiene viva. Además guarda un "retraso" del
 * giro y del balanceo que el shader de tela usa para torcer y doblar el bajo.
 */
export interface SwingState {
  swing: number
  swingVel: number
  lagYaw: number
  lagYawVel: number
  lagSwing: number
  lagSwingVel: number
}

export const SWING_LIMIT = 0.55

export function createSwing(yaw: number, swing = 0): SwingState {
  return { swing, swingVel: 0, lagYaw: yaw, lagYawVel: 0, lagSwing: swing, lagSwingVel: 0 }
}

/** Brisa: dos senos desfasados por percha para que no se muevan todas igual */
export const breeze = (time: number, phase: number) => 0.5 * Math.sin(time * 0.7 + phase) + 0.3 * Math.sin(time * 1.31 + phase * 2.1)

/**
 * Integra un paso. `accel` es la aceleración horizontal de la percha en el mundo
 * (m/s²) y `yaw` el giro objetivo de la remera.
 */
export function stepSwing(s: SwingState, accel: number, yaw: number, time: number, phase: number, dt: number) {
  const a = clamp(accel, -60, 60)
  s.swingVel += (-34 * s.swing - 3.4 * s.swingVel + a * 0.085 + breeze(time, phase)) * dt
  s.swing = clamp(s.swing + s.swingVel * dt, -SWING_LIMIT, SWING_LIMIT)
  followLag(s, yaw, dt)
}

/** La remera no se balancea (seleccionada o movimiento reducido): vuelve a 0 */
export function settleSwing(s: SwingState, yaw: number, dt: number, reduced: boolean) {
  s.swing += (0 - s.swing) * (1 - Math.exp(-8 * dt))
  s.swingVel = 0
  if (reduced) {
    s.lagYaw = yaw
    s.lagSwing = s.swing
    s.lagYawVel = s.lagSwingVel = 0
  } else followLag(s, yaw, dt)
}

function followLag(s: SwingState, yaw: number, dt: number) {
  s.lagYawVel += ((yaw - s.lagYaw) * 70 - s.lagYawVel * 8) * dt
  s.lagYaw += s.lagYawVel * dt
  s.lagSwingVel += ((s.swing - s.lagSwing) * 55 - s.lagSwingVel * 6) * dt
  s.lagSwing += s.lagSwingVel * dt
}

/** Torsión del bajo de la tela (rad) a partir del retraso del giro */
export const clothTwist = (s: SwingState, yaw: number) => clamp(s.lagYaw - yaw, -0.7, 0.7)

/** Doblez del bajo (m) a partir del retraso del balanceo */
export const clothBend = (s: SwingState) => clamp(s.lagSwing - s.swing, -0.35, 0.35) * 0.7
