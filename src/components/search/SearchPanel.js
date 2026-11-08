'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { portraitUrl, squad } from '../../data'
import { searchPlayers } from '../../engine/text'
import { IconButton } from '../ui/IconButton'
/**
 * Lupa + panel de búsqueda por nombre o dorsal. Móvil: pantalla completa.
 * Escritorio: desplegable bajo la lupa. Flechas, Enter y Escape funcionan.
 */
export function SearchPanel({ open, onOpenChange, onPick }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef(null)
  const panel = useRef(null)
  const results = useMemo(() => searchPlayers(squad, query), [query])
  const current = Math.min(active, Math.max(0, results.length - 1))
  // Cada vez que se abre arranca vacío (se ajusta en el render, no en un efecto)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setQuery('')
      setActive(0)
    }
  }
  useEffect(() => {
    if (!open) return
    input.current?.focus()
    const outside = (e) => {
      if (!e.target.closest('[data-search]')) onOpenChange(false)
    }
    addEventListener('pointerdown', outside)
    return () => removeEventListener('pointerdown', outside)
  }, [open, onOpenChange])
  useEffect(() => {
    panel.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [current])
  const key = (e) => {
    e.stopPropagation()
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const n = Math.max(1, results.length)
      setActive((current + (e.key === 'ArrowDown' ? 1 : -1) + n) % n)
    } else if (e.key === 'Enter' && results[current]) onPick(results[current])
    else if (e.key === 'Escape') onOpenChange(false)
  }
  return (
    <div data-search className="contents md:relative md:block">
      <IconButton
        icon="search"
        label="Buscar jugador"
        aria-expanded={open}
        aria-controls="search-panel"
        onClick={() => onOpenChange(!open)}
        className="md:h-[30px] md:w-[30px]"
      />
      <div
        id="search-panel"
        ref={panel}
        hidden={!open}
        className="fixed inset-0 z-50 flex flex-col bg-fondo/[0.97] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-4 backdrop-blur-xl md:absolute md:inset-auto md:top-full md:right-0 md:mt-2 md:block md:w-64 md:rounded-xl md:border md:border-white/15 md:p-2 md:shadow-2xl md:shadow-black/70"
      >
        <div className="flex items-center gap-2">
          <input
            ref={input}
            type="search"
            role="combobox"
            aria-controls="search-results"
            aria-expanded="true"
            aria-label="Buscar por nombre o dorsal"
            placeholder="Nombre o dorsal"
            autoComplete="off"
            autoCapitalize="off"
            enterKeyHint="go"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={key}
            className="h-12 w-full min-w-0 rounded-xl border border-white/15 bg-white/5 px-4 text-base outline-none select-text placeholder:text-claro/40 focus:border-oro md:h-auto md:rounded-lg md:px-3 md:py-2 md:text-sm"
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="eyebrow h-12 shrink-0 px-2 text-[11px] text-claro/70 md:hidden"
          >
            Cerrar
          </button>
        </div>
        <ul
          id="search-results"
          role="listbox"
          className="mt-2 min-h-0 flex-1 overflow-auto overscroll-contain md:mt-1.5 md:max-h-[52vh]"
        >
          {results.map((p, i) => (
            <li
              key={p.id}
              role="option"
              aria-selected={i === current}
              onClick={() => onPick(p)}
              onPointerEnter={() => setActive(i)}
              className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/10 aria-selected:bg-white/10 md:rounded-lg md:px-2.5 md:py-1.5"
            >
              <Image
                src={portraitUrl(p)}
                alt=""
                width={88}
                height={114}
                className="h-11 w-11 shrink-0 rounded-full bg-white/10 object-cover object-top md:h-8 md:w-8"
              />
              <span className="w-8 text-right font-display text-2xl leading-none text-oro md:w-7 md:text-lg">{p.dorsal}</span>
              <span className="min-w-0 flex-1 truncate text-base font-semibold md:text-sm">
                {p.nombre} {p.apellido}
              </span>
              <span className="font-mono text-[10px] tracking-[0.16em] text-claro/50 uppercase md:text-[9px]">{p.pos}</span>
            </li>
          ))}
          {!results.length ? (
            <li className="px-2.5 py-3 text-base text-claro/50 md:py-2 md:text-sm">Nadie con ese nombre o dorsal</li>
          ) : null}
        </ul>
      </div>
    </div>
  )
}
