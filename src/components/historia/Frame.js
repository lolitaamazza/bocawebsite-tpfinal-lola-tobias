import Image from 'next/image'

/**
 * Foto enmarcada (borde claro, como las de la referencia). Con `parallax` la
 * imagen es más ancha que el marco y se desliza mientras corre el recorrido.
 */
export function Frame({ src, alt, parallax = false, contain = false, zoom = 1, className = '', sizes = '50vw', priority = false }) {
  return (
    <div className={`relative overflow-hidden bg-[#efe9dc] p-[clamp(6px,0.7vw,10px)] shadow-2xl shadow-black/50 ${className}`}>
      <div className="relative h-full w-full overflow-hidden bg-noche">
        <div
          data-parallax={parallax ? '' : undefined}
          className={`absolute inset-y-0 ${parallax ? '-inset-x-[14%]' : 'inset-x-0'} will-change-transform`}
          style={zoom !== 1 ? { transform: `scale(${zoom})` } : undefined}
        >
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            className={contain ? 'object-contain p-[8%]' : 'object-cover'}
          />
        </div>
      </div>
    </div>
  )
}
