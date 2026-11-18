'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { CardShell } from '../components/card/CardShell'
import { Customizer } from '../components/card/Customizer'
import { SaveJerseyButton } from '../components/card/SaveJerseyButton'
import { PlayerProfile } from '../components/profile/PlayerProfile'
import { site } from '../config/site'
import { playerById, squad, stats, statsFor } from '../data'
import { profileMetrics, teamMatches } from '../engine/profile'
import { selectionToPath } from '../engine/route'
import { cleanName, cleanNumber } from '../engine/text'
import { useShare } from '../hooks/useShare'
import { useVestuario } from '../store/vestuario'

const matches = teamMatches(stats)
/**
 * La ficha conectada: perfil a pantalla completa para los jugadores y la hoja
 * del personalizador para 'custom'. Maneja compartir, anterior/siguiente y gestos.
 * El ref expone `target()`: lo que mide useStageRect (el hueco del perfil o la hoja).
 */
export const CardContainer = forwardRef(function CardContainer({ rig, onCustomize }, ref) {
  const selected = useVestuario((s) => s.selected)
  const more = useVestuario((s) => s.more)
  const custom = useVestuario((s) => s.custom)
  const { select, setMore, setCustom } = useVestuario.getState()
  const share = useShare()
  const nameInput = useRef(null)
  const slot = useRef(null)
  const shell = useRef(null)
  // El último jugador mostrado queda en pantalla mientras el perfil se va, para que no parpadee
  const shown = useRef(null)
  if (selected && selected !== 'custom') shown.current = selected
  const player = shown.current ? playerById(shown.current) : null
  const profileOpen = !!selected && selected !== 'custom'
  useImperativeHandle(
    ref,
    () => ({
      target: () => {
        const sel = useVestuario.getState().selected
        return sel && sel !== 'custom' ? slot.current : shell.current
      },
    }),
    [],
  )
  useEffect(() => {
    if (selected === 'custom' && !matchMedia('(hover: none)').matches) {
      const t = setTimeout(() => nameInput.current?.focus(), 350)
      return () => clearTimeout(t)
    }
  }, [selected])
  const swipePlayer = (dir) => {
    if (dir === 'up') setMore(true)
    else if (dir === 'down') {
      if (more) setMore(false)
      else select(null)
    } else if (dir === 'left' || dir === 'right') rig?.step(dir === 'left' ? 1 : -1)
  }
  return (
    <>
      <PlayerProfile
        ref={slot}
        open={profileOpen}
        player={player}
        metrics={player ? profileMetrics(player, statsFor(player), matches) : null}
        more={more}
        onMore={() => setMore(!more)}
        onClose={() => select(null)}
        onCustomize={() => player && onCustomize(player)}
        onShare={() =>
          player &&
          share(
            location.origin + selectionToPath(player.id, squad),
            `${player.nombre} ${player.apellido}, dorsal ${player.dorsal} ${site.of}`,
          )
        }
        onPrev={() => rig?.step(-1)}
        onNext={() => rig?.step(1)}
        onSwipe={swipePlayer}
      />
      <CardShell
        ref={shell}
        open={selected === 'custom'}
        onClose={() => select(null)}
        onSwipe={(dir) => dir === 'down' && select(null)}
      >
        <Customizer
          ref={nameInput}
          value={custom}
          saveSlot={<SaveJerseyButton custom={custom} />}
          onChange={(c) =>
            setCustom({
              ...c,
              ...(c.name !== undefined ? { name: cleanName(c.name) } : {}),
              ...(c.number !== undefined ? { number: cleanNumber(c.number) } : {}),
            })
          }
          onShare={() =>
            share(
              location.origin + selectionToPath('custom', squad, { nombre: custom.name.trim(), dorsal: custom.number }),
              `Mirá cómo queda mi camiseta ${site.of}`,
            )
          }
        />
      </CardShell>
    </>
  )
})
