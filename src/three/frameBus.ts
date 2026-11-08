import type { PosKey } from '../types'

/**
 * Lo que la escena le cuenta a la UI en cada frame: dónde dibujar los rótulos de
 * cada línea y el epígrafe de la remera señalada. Va por acá (y no por el store)
 * porque cambia 60 veces por segundo y los overlays lo aplican directo al DOM.
 */
export interface FrameState {
  groups: { pos: PosKey; x: number; y: number; visible: boolean }[]
  caption: { x: number; y: number } | null
  /** Hay una remera en primer plano */
  stage: boolean
  /** Velocidad del riel (m/s), para el roce del sonido */
  speed: number
}

type Listener = (f: FrameState) => void
const listeners = new Set<Listener>()

export const frameBus = {
  emit(f: FrameState) {
    for (const l of listeners) l(f)
  },
  subscribe(l: Listener) {
    listeners.add(l)
    return () => void listeners.delete(l)
  },
}
