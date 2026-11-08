import { useEffect } from 'react'
import { useVestuario } from '../store/vestuario'
/**
 * Le dice al riel qué parte de la pantalla queda libre para la remera en primer
 * plano: a la izquierda de la ficha en apaisado, entre la cabecera y la ficha en vertical.
 */
export function useStageRect(rig, card) {
  const selected = useVestuario((s) => s.selected)
  const more = useVestuario((s) => s.more)
  useEffect(() => {
    if (!rig) return
    const update = () => {
      const header = document.querySelector('header')
      const footer = document.querySelector('footer')
      const el = card.current
      if (!header || !footer || !el) return
      const w = innerWidth
      const h = innerHeight
      const top = (header.getBoundingClientRect().bottom - parseFloat(getComputedStyle(header).paddingBottom) + 6) / h
      rig.stageRect = matchMedia('(orientation: landscape)').matches
        ? { x0: 0, y0: top, x1: el.offsetLeft / w, y1: (footer.offsetTop + 28) / h, tuck: 0 }
        : { x0: 0, y0: top, x1: 1, y1: el.offsetTop / h, tuck: 0.2 }
    }
    const raf = requestAnimationFrame(update)
    addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('resize', update)
    }
  }, [rig, card, selected, more])
}
