'use client'

import { useCallback } from 'react'
import { AccountLink } from '../components/account/AccountLink'
import { Header } from '../components/layout/Header'
import { SearchPanel } from '../components/search/SearchPanel'
import { Pill } from '../components/ui/Pill'
import { positions } from '../config/site'
import { squad } from '../data'
import { useVestuario } from '../store/vestuario'
/** Cabecera conectada: filtros por línea (con conteo) y buscador */
export function HeaderContainer({ openSelection, onCustomize }) {
  const filter = useVestuario((s) => s.filter)
  const selected = useVestuario((s) => s.selected)
  const searchOpen = useVestuario((s) => s.searchOpen)
  const setSearchOpen = useVestuario((s) => s.setSearchOpen)
  const pick = useCallback(
    (p) => {
      setSearchOpen(false)
      openSelection(p.id)
    },
    [openSelection, setSearchOpen],
  )
  const choose = (pos) => {
    const s = useVestuario.getState()
    s.select(null)
    s.setFilter(pos)
  }
  const filters = (
    <>
      <Pill pressed={filter === null} onClick={() => choose(null)}>
        Todos <span className="opacity-50 md:hidden xl:inline">{squad.length}</span>
      </Pill>
      {positions.map((p) => (
        <Pill key={p.key} pressed={filter === p.key} onClick={() => choose(p.key)} title={p.label}>
          <span className="md:hidden">{p.label}</span>
          <span className="hidden md:inline">{p.short}</span>
          <span className="opacity-50 md:hidden xl:inline">{squad.filter((s) => s.pos === p.key).length}</span>
        </Pill>
      ))}
    </>
  )
  return (
    <Header
      search={<SearchPanel open={searchOpen} onOpenChange={setSearchOpen} onPick={pick} />}
      filters={filters}
      account={<AccountLink />}
      hideFiltersOnMobile={!!selected}
      onCustomize={onCustomize}
    />
  )
}
