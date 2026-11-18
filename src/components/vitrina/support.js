import { useSyncExternalStore } from 'react'

const never = () => () => {}
let webgl2 = null

/** ¿Hay WebGL2? (three ya no dibuja con WebGL1). Se prueba una vez y se libera el contexto. */
function probeWebGL2() {
  if (webgl2 === null) {
    try {
      const gl = document.createElement('canvas').getContext('webgl2')
      webgl2 = Boolean(gl)
      gl?.getExtension('WEBGL_lose_context')?.loseContext()
    } catch {
      webgl2 = false
    }
  }
  return webgl2
}

/** true / false en el cliente; null en el servidor (todavía no se sabe) */
export const useWebGL2 = () => useSyncExternalStore(never, probeWebGL2, () => null)

/** Media query viva (cambia si el usuario rota la pantalla o cambia la preferencia) */
export function useMedia(query) {
  return useSyncExternalStore(
    (onChange) => {
      const m = matchMedia(query)
      m.addEventListener('change', onChange)
      return () => m.removeEventListener('change', onChange)
    },
    () => matchMedia(query).matches,
    () => false,
  )
}

export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)')
