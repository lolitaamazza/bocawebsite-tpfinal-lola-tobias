import { useEffect } from 'react'
import { stageRectFor } from '../engine/stage'
import { useVestuario } from '../store/vestuario'
/**
 * Le dice al riel qué parte de la pantalla queda libre para la remera en primer plano.
 * `card.current` es el elemento a medir, o un objeto con `target()` que lo devuelve:
 * el hueco del perfil (data-stage-slot) o la ficha del personalizador.
 */
export function useStageRect(rig, card) {
  const selected = useVestuario((s) => s.selected)
  const more = useVestuario((s) => s.more)
  useEffect(() => {
    if (!rig) return
    const target = () => {
      const c = card.current
      return typeof c?.target === 'function' ? c.target() : c
    }
    const update = () => {
      const header = document.querySelector('header')
      const footer = document.querySelector('footer')
      const el = target()
      if (!header || !footer || !el) return
      const top = header.getBoundingClientRect().bottom - parseFloat(getComputedStyle(header).paddingBottom) + 6
      const isSlot = el.hasAttribute('data-stage-slot')
      const rect = stageRectFor({
        w: innerWidth,
        h: innerHeight,
        landscape: matchMedia('(orientation: landscape)').matches,
        top,
        footerTop: footer.offsetTop,
        card: isSlot ? null : { left: el.offsetLeft, top: el.offsetTop },
        slot: isSlot ? el.getBoundingClientRect() : null,
      })
      if (rect) rig.stageRect = rect
    }
    const raf = requestAnimationFrame(update)
    addEventListener('resize', update)
    // El hueco cambia de tamaño sin resize de ventana (fuentes, "Más datos", contenido)
    const el = target()
    const ro = el && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    ro?.observe(el)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('resize', update)
      ro?.disconnect()
    }
  }, [rig, card, selected, more])
}
