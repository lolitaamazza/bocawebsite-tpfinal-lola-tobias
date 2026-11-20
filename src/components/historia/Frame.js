import Image from 'next/image'

/**
 * Foto de archivo recortada como en un collage: borde rasgado (clip-path),
 * blanco y negro con trama de semitono, o en color si es la foto final.
 * Con `parallax` la imagen es más ancha que el recorte y se desliza mientras
 * corre el recorrido.
 */
export function Frame({ src, alt, clip, aspect = 1.4, color = false, parallax = false, sizes = '50vw', className = '' }) {
  return (
    <div
      data-color={color ? '' : undefined}
      className={`print-photo overflow-hidden bg-noche ${className}`}
      style={{ clipPath: clip, aspectRatio: aspect }}
    >
      <div
        data-parallax={parallax ? '' : undefined}
        className={`absolute inset-y-0 ${parallax ? '-inset-x-[12%]' : 'inset-x-0'} will-change-transform`}
      >
        <Image src={src} alt={alt} fill loading="eager" decoding="async" sizes={sizes} className="object-cover" />
      </div>
    </div>
  )
}
