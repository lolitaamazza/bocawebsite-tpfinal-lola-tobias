import { create } from 'zustand'
import { site } from '../config/site'
/** ms después de cambiar de vista en los que se ignoran los gestos de borde (inercia del trackpad) */
export const VIEW_COOLDOWN = 1200

let toastTimer = 0
/** Estado de la UI. La escena 3D lo lee con getState() por frame, sin re-renders. */
export const useVestuario = create((set) => ({
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
  /** Qué capa se ve: el vestuario 3D o la Historia (camisetas con fotos reales) */
  view: 'vestuario',
  /** El canvas deja de renderizar mientras la Historia lo tapa */
  stagePaused: false,
  /** Cuándo cambió la vista: se ignoran gestos de borde por un momento (inercia del trackpad) */
  viewChangedAt: 0,
  setPhase: (phase) => set({ phase }),
  setView: (view) => set((s) => (s.view === view ? s : { view, viewChangedAt: performance.now(), selected: view === 'historia' ? null : s.selected })),
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
