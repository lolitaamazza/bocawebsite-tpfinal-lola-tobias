const listeners = new Set()
export const frameBus = {
  emit(f) {
    for (const l of listeners) l(f)
  },
  subscribe(l) {
    listeners.add(l)
    return () => void listeners.delete(l)
  },
}
