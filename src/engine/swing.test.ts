import { describe, expect, it } from 'vitest'
import { damp, easeInOutCubic } from './math'
import { SWING_LIMIT, clothBend, clothTwist, createSwing, settleSwing, stepSwing } from './swing'

describe('damp', () => {
  it('no depende del framerate: 2 pasos de dt/2 ≈ 1 paso de dt', () => {
    const one = damp(0, 1, 9, 0.1)
    const two = damp(damp(0, 1, 9, 0.05), 1, 9, 0.05)
    expect(two).toBeCloseTo(one, 10)
  })
})

describe('easeInOutCubic', () => {
  it('arranca en 0, pasa por 0.5 en la mitad y termina en 1', () => {
    expect(easeInOutCubic(0)).toBe(0)
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5)
    expect(easeInOutCubic(1)).toBe(1)
  })
})

describe('stepSwing', () => {
  it('una aceleración del riel hace balancear la percha', () => {
    const s = createSwing(1.2)
    for (let i = 0; i < 6; i++) stepSwing(s, 40, 1.2, i / 60, 0, 1 / 60)
    expect(Math.abs(s.swing)).toBeGreaterThan(0.005)
  })

  it('nunca pasa el límite, ni con aceleraciones absurdas', () => {
    const s = createSwing(0)
    for (let i = 0; i < 600; i++) stepSwing(s, i % 2 ? 1e6 : -1e6, 0, i / 60, 1, 1 / 60)
    expect(Math.abs(s.swing)).toBeLessThanOrEqual(SWING_LIMIT)
    expect(Number.isFinite(s.lagYaw)).toBe(true)
  })

  it('torsión y doblez quedan acotados', () => {
    const s = createSwing(0)
    s.lagYaw = 10
    s.lagSwing = 10
    expect(Math.abs(clothTwist(s, 0))).toBeLessThanOrEqual(0.7)
    expect(Math.abs(clothBend(s))).toBeLessThanOrEqual(0.35 * 0.7 + 1e-9)
  })
})

describe('settleSwing', () => {
  it('la remera en primer plano se queda quieta', () => {
    const s = createSwing(0, 0.4)
    for (let i = 0; i < 240; i++) settleSwing(s, 0, 1 / 60, false)
    expect(Math.abs(s.swing)).toBeLessThan(1e-3)
  })

  it('con movimiento reducido el retraso se copia sin oscilar', () => {
    const s = createSwing(0)
    settleSwing(s, 2, 1 / 60, true)
    expect(s.lagYaw).toBe(2)
  })
})
