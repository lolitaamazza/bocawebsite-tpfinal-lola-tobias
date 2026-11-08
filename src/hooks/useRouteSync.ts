import { useEffect, useRef } from 'react'
import { site } from '../config/site'
import { squad } from '../data'
import { customFromSearch, pathToSelection, selectionToPath } from '../engine/route'
import { cleanName, cleanNumber } from '../engine/text'
import { useVestuario } from '../store/vestuario'
import type { Selection } from '../types'

const baseTitle = `${site.siteName} · Plantel ${site.season}`

export function titleFor(sel: Selection) {
  if (sel === 'custom') return `Personalizá tu camiseta · ${site.name} ${site.season}`
  const p = sel ? squad.find((p) => p.id === sel) : null
  return p ? `${p.nombre} ${p.apellido} · Dorsal ${p.dorsal} · ${site.name} ${site.season}` : baseTitle
}

/**
 * La URL refleja lo que hay abierto (/dorsal/5/, /personaliza/?nombre=…) y el botón
 * "atrás" del navegador cierra/abre fichas. La ruta inicial se abre al terminar la intro.
 */
export function useRouteSync(openSelection: (sel: Selection) => void) {
  const applying = useRef(false)
  const phase = useVestuario((s) => s.phase)

  // Personalización que llega por URL
  useEffect(() => {
    const c = customFromSearch(location.search)
    if (c.nombre || c.dorsal) useVestuario.getState().setCustom({ name: cleanName(c.nombre), number: cleanNumber(c.dorsal) })
  }, [])

  // Al terminar la intro, abrir lo que pida la URL
  useEffect(() => {
    if (phase !== 'ready') return
    const sel = pathToSelection(location.pathname, squad)
    if (sel) {
      applying.current = true
      openSelection(sel)
      applying.current = false
    }
  }, [phase, openSelection])

  // Estado → URL y título
  useEffect(
    () =>
      useVestuario.subscribe((s, prev) => {
        const changedSel = s.selected !== prev.selected
        const changedCustom = s.selected === 'custom' && s.custom !== prev.custom
        if (!changedSel && !changedCustom) return
        document.title = titleFor(s.selected)
        if (applying.current) return
        const path = selectionToPath(s.selected, squad, { nombre: s.custom.name.trim(), dorsal: s.custom.number })
        if (location.pathname + location.search === path) return
        // Cambiar de un jugador a otro reemplaza; abrir desde el vestuario apila (atrás = cerrar)
        if ((prev.selected && s.selected) || changedCustom) history.replaceState(null, '', path)
        else history.pushState(null, '', path)
      }),
    [],
  )

  // URL → estado (atrás/adelante)
  useEffect(() => {
    const pop = () => {
      applying.current = true
      openSelection(pathToSelection(location.pathname, squad))
      applying.current = false
    }
    addEventListener('popstate', pop)
    return () => removeEventListener('popstate', pop)
  }, [openSelection])
}
