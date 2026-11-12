'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { useSession } from '@/context/SessionContext'
import { Icon } from '../ui/Icon'
import { currentNavPage, navigationLinks } from './siteNavigation'

/** Navegación compartida. El panel usa enlaces normales y conserva el orden de tabulación. */
export function SiteMenu({ align = 'start', className = '' }) {
  const pathname = usePathname() ?? '/'
  const user = useSession()
  const navId = useId()
  const root = useRef(null)
  const trigger = useRef(null)
  const [openedOn, setOpenedOn] = useState(null)
  const open = openedOn !== null && openedOn === pathname

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event) => {
      if (!root.current?.contains(event.target)) setOpenedOn(null)
    }
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setOpenedOn(null)
      trigger.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open])

  return (
    <div
      ref={root}
      className={`pointer-events-auto relative z-40 w-fit shrink-0 text-claro ${className}`}
      onBlur={(event) => {
        if (open && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpenedOn(null)
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <button
        ref={trigger}
        type="button"
        aria-label="Menú de navegación"
        aria-expanded={open}
        aria-controls={navId}
        onClick={() => setOpenedOn(open ? null : pathname)}
        className="group inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-oro/35 bg-fondo px-3 text-oro hover:border-oro hover:bg-noche focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oro"
      >
        <Icon name={open ? 'close' : 'menu'} className="size-5" />
        <span className="hidden font-mono text-[10px] tracking-[0.13em] uppercase lg:inline">Menú</span>
      </button>
      <nav
        id={navId}
        aria-label="Navegación principal"
        data-lenis-prevent
        hidden={!open}
        className={`absolute top-full mt-2 max-h-[calc(100dvh-5rem)] w-[min(18rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-xl border border-oro/35 bg-fondo p-1.5 shadow-2xl shadow-black/70 ${align === 'end' ? 'right-0' : 'left-0'}`}
      >
        <ul className="m-0 list-none p-0">
          {navigationLinks(Boolean(user)).map(({ href, label, private: gated }, i, links) => {
            const current = currentNavPage(pathname, href)
            const startsAccount = gated && !links[i - 1]?.private
            return (
              <li key={href} className={startsAccount ? 'mt-1.5 border-t border-white/15 pt-1.5' : undefined}>
                <Link
                  href={href}
                  aria-current={current}
                  prefetch={gated ? false : undefined}
                  onClick={() => {
                    setOpenedOn(null)
                    trigger.current?.focus()
                  }}
                  className={`flex min-h-11 items-center justify-between rounded-md px-3 font-sans text-sm font-medium tracking-normal normal-case focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-oro ${current ? 'bg-oro/10 text-oro' : 'text-claro/90 hover:bg-white/10 hover:text-oro'}`}
                >
                  {label}
                  {current && <span className="size-1.5 rounded-full bg-oro" aria-hidden="true" />}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
