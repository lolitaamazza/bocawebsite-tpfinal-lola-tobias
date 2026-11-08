import { Icon } from './Icon'
/** Botón redondo de solo ícono, con borde fino. `label` va al lector de pantalla. */
export function IconButton({ icon, label, size = 'md', className = '', ...rest }) {
  const box = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`pointer-events-auto grid shrink-0 place-items-center rounded-full border border-white/15 text-claro/75 transition-colors hover:border-white/50 hover:text-claro disabled:opacity-30 ${box} ${className}`}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  )
}
