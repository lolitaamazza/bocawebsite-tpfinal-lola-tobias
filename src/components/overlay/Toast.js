import { useVestuario } from '../../store/vestuario'
/** Aviso corto ("Enlace copiado") centrado abajo */
export function Toast() {
  const msg = useVestuario((s) => s.toast)
  return (
    <div
      role="status"
      className={`pointer-events-none absolute bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full border border-white/15 bg-fondo/80 px-4 py-2 font-mono text-[11px] tracking-[0.16em] uppercase backdrop-blur transition-opacity duration-300 ${msg ? 'opacity-100' : 'opacity-0'}`}
    >
      {msg}
    </div>
  )
}
