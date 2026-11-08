import { useEffect } from 'react'
import { useVestuario } from '../store/vestuario'
import type { RailRig } from '../three/RailRig'

/**
 * Teclado: ← → recorren, Enter abre, Escape cierra, "/" abre el buscador.
 * Cualquier tecla durante la intro la acelera.
 */
export function useKeyboard(rig: RailRig | null) {
  useEffect(() => {
    if (!rig) return
    const onKey = (e: KeyboardEvent) => {
      const s = useVestuario.getState()
      if (!rig.ready) return rig.onSkipIntro?.()
      const inInput = (e.target as HTMLElement).closest?.('input, textarea')
      if (inInput) {
        if (e.key === 'Escape') s.select(null)
        return
      }
      if (e.key === '/' && !s.searchOpen) {
        e.preventDefault()
        s.setSearchOpen(true)
      } else if (e.key === 'Escape') s.select(null)
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        rig.kbd = true
        rig.step(e.key === 'ArrowRight' ? 1 : -1)
      } else if (e.key === 'Enter' && document.activeElement?.tagName !== 'BUTTON') rig.openHovered()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [rig])
}
