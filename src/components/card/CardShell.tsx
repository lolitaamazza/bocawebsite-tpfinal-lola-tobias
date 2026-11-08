import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { forwardRef, useRef, type ReactNode, type TouchEvent } from 'react'
import { IconButton } from '../ui/IconButton'

interface Props {
  open: boolean
  onClose: () => void
  /** Toque en el asa (móvil): ampliar/reducir */
  onGrip?: () => void
  /** Gestos en móvil: arriba amplía, abajo cierra, costados cambian de jugador */
  onSwipe?: (dir: 'up' | 'down' | 'left' | 'right') => void
  children: ReactNode
}

/**
 * Contenedor de la ficha: hoja inferior en vertical, panel lateral en apaisado.
 * La entrada y salida las anima GSAP (sube + aparece / baja + se va).
 */
export const CardShell = forwardRef<HTMLElement, Props>(function CardShell({ open, onClose, onGrip, onSwipe, children }, ref) {
  const local = useRef<HTMLElement | null>(null)
  const touch = useRef<{ x: number; y: number } | null>(null)

  useGSAP(
    () => {
      const el = local.current
      if (!el) return
      if (open) {
        gsap.set(el, { visibility: 'visible' })
        gsap.fromTo(el, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' })
        gsap.fromTo(el.querySelectorAll('[data-card-item]'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.035, delay: 0.08, ease: 'power2.out' })
      } else {
        gsap.to(el, { opacity: 0, y: 24, duration: 0.35, ease: 'power2.in', onComplete: () => void gsap.set(el, { visibility: 'hidden' }) })
      }
    },
    { dependencies: [open] },
  )

  const start = (e: TouchEvent) => {
    touch.current = (e.target as HTMLElement).closest('input, a, button, label') ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const end = (e: TouchEvent) => {
    if (!touch.current || !onSwipe) return
    const dx = e.changedTouches[0].clientX - touch.current.x
    const dy = e.changedTouches[0].clientY - touch.current.y
    touch.current = null
    if (dy < -50 && -dy > Math.abs(dx) * 1.5) onSwipe('up')
    else if (dy > 70 && dy > Math.abs(dx) * 1.5) onSwipe('down')
    else if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx < 0 ? 'left' : 'right')
  }

  return (
    <aside
      ref={(el) => {
        local.current = el
        if (typeof ref === 'function') ref(el)
        else if (ref) ref.current = el
      }}
      aria-live="polite"
      inert={!open}
      onTouchStart={start}
      onTouchEnd={end}
      className="invisible absolute inset-x-2 bottom-[calc(2.75rem+env(safe-area-inset-bottom))] z-30 rounded-2xl border border-white/15 bg-fondo/60 px-4 pt-2.5 pb-4 opacity-0 shadow-2xl shadow-black/60 backdrop-blur-xl landscape:inset-x-auto landscape:top-1/2 landscape:right-[6vw] landscape:bottom-auto landscape:max-h-[calc(100dvh-7rem)] landscape:w-[min(390px,40vw)] landscape:-translate-y-1/2 landscape:overflow-y-auto landscape:overscroll-contain landscape:bg-white/[0.07] landscape:p-6"
    >
      <div className="mx-auto -mt-2.5 w-24 cursor-pointer pt-2.5 pb-2 landscape:hidden" onClick={onGrip}>
        <div className="mx-auto h-1 w-10 rounded-full bg-white/25" />
      </div>
      <IconButton
        icon="close"
        label="Cerrar"
        onClick={onClose}
        className="absolute top-3 right-3 z-10 bg-fondo/40 landscape:top-5 landscape:right-5 landscape:h-8 landscape:w-8"
      />
      {children}
    </aside>
  )
})
