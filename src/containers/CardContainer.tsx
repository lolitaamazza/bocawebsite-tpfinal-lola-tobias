import { forwardRef, useEffect, useRef } from 'react'
import { CardShell } from '../components/card/CardShell'
import { Customizer } from '../components/card/Customizer'
import { PlayerCard } from '../components/card/PlayerCard'
import { site } from '../config/site'
import { playerById, squad, statsFor } from '../data'
import { selectionToPath } from '../engine/route'
import { cleanName, cleanNumber } from '../engine/text'
import { useShare } from '../hooks/useShare'
import { useVestuario } from '../store/vestuario'
import type { Player } from '../types'
import type { RailRig } from '../three/RailRig'

interface Props {
  rig: RailRig | null
  onCustomize: (from?: Player) => void
}

/**
 * La ficha conectada: decide si muestra al jugador o el personalizador y
 * maneja compartir, anterior/siguiente y los gestos de la hoja en móvil.
 */
export const CardContainer = forwardRef<HTMLElement, Props>(function CardContainer({ rig, onCustomize }, ref) {
  const selected = useVestuario((s) => s.selected)
  const more = useVestuario((s) => s.more)
  const custom = useVestuario((s) => s.custom)
  const { select, setMore, setCustom } = useVestuario.getState()
  const share = useShare()
  const nameInput = useRef<HTMLInputElement>(null)

  // Lo último mostrado queda en pantalla mientras la ficha se va, para que no parpadee
  const shown = useRef<string | null>(null)
  if (selected) shown.current = selected
  const view = shown.current
  const player = view && view !== 'custom' ? playerById(view) : null

  useEffect(() => {
    if (selected === 'custom' && !matchMedia('(hover: none)').matches) {
      const t = setTimeout(() => nameInput.current?.focus(), 350)
      return () => clearTimeout(t)
    }
  }, [selected])

  const swipe = (dir: 'up' | 'down' | 'left' | 'right') => {
    const isCustom = selected === 'custom'
    if (dir === 'up' && !isCustom) setMore(true)
    else if (dir === 'down') {
      if (more) setMore(false)
      else select(null)
    } else if (!isCustom && (dir === 'left' || dir === 'right')) rig?.step(dir === 'left' ? 1 : -1)
  }

  return (
    <CardShell ref={ref} open={!!selected} onClose={() => select(null)} onGrip={() => selected !== 'custom' && setMore(!more)} onSwipe={swipe}>
      {view === 'custom' ? (
        <Customizer
          ref={nameInput}
          value={custom}
          onChange={(c) =>
            setCustom({
              ...c,
              ...(c.name !== undefined ? { name: cleanName(c.name) } : {}),
              ...(c.number !== undefined ? { number: cleanNumber(c.number) } : {}),
            })
          }
          onShare={() =>
            share(location.origin + selectionToPath('custom', squad, { nombre: custom.name.trim(), dorsal: custom.number }), `Mirá cómo queda mi camiseta ${site.of}`)
          }
        />
      ) : player ? (
        <PlayerCard
          player={player}
          stats={statsFor(player)}
          more={more}
          onMore={() => setMore(!more)}
          onCustomize={() => onCustomize(player)}
          onShare={() => share(location.origin + selectionToPath(player.id, squad), `${player.nombre} ${player.apellido}, dorsal ${player.dorsal} ${site.of}`)}
          onPrev={() => rig?.step(-1)}
          onNext={() => rig?.step(1)}
        />
      ) : null}
    </CardShell>
  )
})
