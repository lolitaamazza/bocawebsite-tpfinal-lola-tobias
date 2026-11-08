import { create } from 'zustand'
import { site } from '../config/site'
import type { PosKey, Selection } from '../types'

export type Phase = 'loading' | 'intro' | 'ready' | 'error'

export interface CustomShirt {
  name: string
  number: string
  size: string
}

interface VestuarioState {
  phase: Phase
  progress: number
  filter: PosKey | null
  hover: string | null
  selected: Selection
  /** Ficha ampliada (datos extra) */
  more: boolean
  searchOpen: boolean
  custom: CustomShirt
  sound: boolean
  toast: string | null

  setPhase: (p: Phase) => void
  setProgress: (p: number) => void
  setFilter: (f: PosKey | null) => void
  setHover: (id: string | null) => void
  select: (sel: Selection) => void
  setMore: (v: boolean) => void
  setSearchOpen: (v: boolean) => void
  setCustom: (c: Partial<CustomShirt>) => void
  setSound: (v: boolean) => void
  showToast: (msg: string) => void
}

let toastTimer = 0

/** Estado de la UI. La escena 3D lo lee con getState() por frame, sin re-renders. */
export const useVestuario = create<VestuarioState>((set) => ({
  phase: 'loading',
  progress: 0,
  filter: null,
  hover: null,
  selected: null,
  more: false,
  searchOpen: false,
  custom: { name: '', number: '', size: site.store.defaultSize },
  sound: false,
  toast: null,

  setPhase: (phase) => set({ phase }),
  setProgress: (progress) => set({ progress }),
  setFilter: (filter) => set({ filter }),
  setHover: (hover) => set({ hover }),
  select: (selected) => set((s) => (s.selected === selected ? s : { selected, more: selected ? s.more : false })),
  setMore: (more) => set({ more }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setCustom: (c) => set((s) => ({ custom: { ...s.custom, ...c } })),
  setSound: (sound) => set({ sound }),
  showToast: (toast) => {
    set({ toast })
    clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => set({ toast: null }), 1800)
  },
}))
