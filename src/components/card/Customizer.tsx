import { forwardRef } from 'react'
import { site } from '../../config/site'
import { MAX_NAME, MAX_NUMBER } from '../../engine/text'
import type { CustomShirt } from '../../store/vestuario'
import { Icon } from '../ui/Icon'

interface Props {
  value: CustomShirt
  onChange: (c: Partial<CustomShirt>) => void
  onShare: () => void
}

/**
 * Personalizador: nombre y número se estampan en vivo en la remera 3D.
 * BocaShop no acepta estampado por URL, así que el botón lleva a la titular en la tienda.
 */
export const Customizer = forwardRef<HTMLInputElement, Props>(function Customizer({ value, onChange, onShare }, nameRef) {
  const ready = !!value.name.trim() && !!value.number
  return (
    <form onSubmit={(e) => e.preventDefault()} className="pr-10 landscape:pr-0">
      <p data-card-item className="eyebrow text-oro">Personalizador</p>
      <h2 data-card-item className="mt-1 font-display text-3xl leading-none uppercase landscape:text-4xl">
        Hacé la tuya
      </h2>

      <div data-card-item className="mt-4 grid grid-cols-[1fr_5.5rem] gap-2">
        <label className="block">
          <span className="eyebrow text-[9px] text-claro/50">Nombre</span>
          <input
            ref={nameRef}
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="TU NOMBRE"
            autoComplete="off"
            autoCapitalize="characters"
            enterKeyHint="next"
            className="mt-1 h-11 w-full rounded-lg border border-white/15 bg-white/5 px-3 font-dorsal text-lg tracking-[0.08em] uppercase outline-none placeholder:text-claro/30 focus:border-oro"
          />
        </label>
        <label className="block">
          <span className="eyebrow text-[9px] text-claro/50">Número</span>
          <input
            value={value.number}
            onChange={(e) => onChange({ number: e.target.value })}
            inputMode="numeric"
            placeholder="12"
            autoComplete="off"
            enterKeyHint="done"
            className="mt-1 h-11 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-center font-dorsal text-lg outline-none placeholder:text-claro/30 focus:border-oro"
          />
        </label>
      </div>
      <p data-card-item className="mt-1.5 font-mono text-[9px] tracking-[0.14em] text-claro/40 uppercase">
        Hasta {MAX_NAME} letras y {MAX_NUMBER} cifras, como en la tienda
      </p>

      <fieldset data-card-item className="mt-4">
        <legend className="eyebrow text-[9px] text-claro/50">Talle</legend>
        <div className="mt-1.5 grid grid-cols-5 gap-1.5">
          {site.store.sizes.map((size) => (
            <label key={size} className="cursor-pointer">
              <input type="radio" name="talle" value={size} checked={value.size === size} onChange={() => onChange({ size })} className="peer sr-only" />
              <span className="grid h-9 place-items-center rounded-lg border border-white/15 font-mono text-[11px] text-claro/70 transition-colors peer-checked:border-claro peer-checked:bg-claro peer-checked:text-fondo peer-focus-visible:border-oro hover:border-white/40">
                {size}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <a
        data-card-item
        href={site.store.product}
        target="_blank"
        rel="noopener"
        aria-disabled={!ready}
        onClick={(e) => !ready && e.preventDefault()}
        className="mt-4 flex h-11 items-center justify-center gap-2 rounded-full bg-oro font-mono text-[11px] font-semibold tracking-[0.16em] text-fondo uppercase shadow-lg shadow-black/40 transition-[filter,transform,opacity] hover:brightness-110 active:scale-[0.98] aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
      >
        <Icon name="cart" className="h-4 w-4" />
        Comprarla en BocaShop
      </a>
      <p data-card-item className="mt-2 text-[11px] leading-snug text-claro/50">
        Se abre {site.store.domain} con la titular. El estampado de {value.name.trim() || 'tu nombre'}
        {value.number ? ` y el ${value.number}` : ''} se elige ahí, talle {value.size}.
      </p>

      <div data-card-item className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
        <button type="button" onClick={onShare} className="eyebrow flex items-center gap-2 text-claro/70 hover:text-claro">
          <Icon name="share" className="h-3.5 w-3.5" />
          Compartir diseño
        </button>
        <a href={site.store.product} target="_blank" rel="noopener" className="eyebrow text-claro/70 underline decoration-white/30 underline-offset-4 hover:text-claro">
          Ver en la tienda
        </a>
      </div>
    </form>
  )
})
