'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Dibuja la entrada física de La Bombonera en un canvas de alta resolución
 * para descargarla como PNG conmemorativo.
 */
function renderTicketToCanvas(ticket) {
  const c = document.createElement('canvas')
  c.width = 1400
  c.height = 560
  const ctx = c.getContext('2d')

  // Fondo nocturno azul xeneize profundo
  const bg = ctx.createLinearGradient(0, 0, c.width, c.height)
  bg.addColorStop(0, '#060c1f')
  bg.addColorStop(0.65, '#0d1e4a')
  bg.addColorStop(1, '#070e24')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, c.width, c.height)

  // Franja de oro central característica de Boca
  const gold = ctx.createLinearGradient(0, 210, c.width, 350)
  gold.addColorStop(0, '#d99b38')
  gold.addColorStop(0.5, '#f0c057')
  gold.addColorStop(1, '#c98a2c')
  ctx.fillStyle = gold
  ctx.fillRect(0, 224, 1020, 104)

  // Borde exterior dorado
  ctx.strokeStyle = 'rgba(240,192,87,0.55)'
  ctx.lineWidth = 4
  ctx.strokeRect(18, 18, c.width - 36, c.height - 36)

  // Línea troquelada del talón (x = 1020)
  ctx.save()
  ctx.strokeStyle = 'rgba(240,192,87,0.45)'
  ctx.setLineDash([12, 10])
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(1020, 20)
  ctx.lineTo(1020, c.height - 20)
  ctx.stroke()
  ctx.restore()

  // Encabezado
  ctx.fillStyle = '#f0c057'
  ctx.font = '700 20px "JetBrains Mono", monospace'
  ctx.fillText('CLUB ATLÉTICO BOCA JUNIORS  ·  ESTADIO ALBERTO J. ARMANDO', 56, 72)

  ctx.fillStyle = '#f4f6fc'
  ctx.font = '900 72px "Anton", "Arial Narrow", sans-serif'
  ctx.fillText('LA BOMBONERA · TICKET 3D', 56, 158)

  ctx.fillStyle = '#9fb2dc'
  ctx.font = '600 22px "JetBrains Mono", monospace'
  ctx.fillText('BRANDSEN 805 · LA BOCA · BUENOS AIRES · NOCHE DE COPA 21:00 HS', 56, 198)

  // Sobre la franja de oro: ubicación principal
  ctx.fillStyle = '#050a18'
  ctx.font = '900 44px "Anton", "Arial Narrow", sans-serif'
  ctx.fillText((ticket.label || 'PLATEA PREFERENCIAL').toUpperCase(), 56, 282)

  ctx.font = '800 24px "JetBrains Mono", monospace'
  ctx.fillText(ticket.sectionCode || 'L2 · BAJA', 720, 280)

  // Datos inferiores: Puerta, Fila, Butaca, Precio
  const fields = [
    ['ACCESO / PUERTA', ticket.gate || 'Puerta 7 · Brandsen 805', 56],
    ['FILA / NIVEL', `FILA ${String(ticket.rowNumber || 4).padStart(2, '0')}`, 470],
    ['BUTACA / PALCO', `ASIENTO ${String(ticket.seatNumber || 14).padStart(2, '0')}`, 670],
    ['VALOR', ticket.priceLabel || '$85.000', 870],
  ]
  for (const [k, v, x] of fields) {
    ctx.fillStyle = 'rgba(240,192,87,0.75)'
    ctx.font = '700 16px "JetBrains Mono", monospace'
    ctx.fillText(k, x, 396)
    ctx.fillStyle = '#ffffff'
    ctx.font = '800 30px "Archivo Variable", sans-serif'
    ctx.fillText(v, x, 438)
  }

  ctx.fillStyle = 'rgba(241,237,227,0.55)'
  ctx.font = '600 16px "JetBrains Mono", monospace'
  ctx.fillText(`CÓDIGO VERIFICADO · CABJ-1940-${String(ticket.rowNumber || 4).padStart(2, '0')}${String(ticket.seatNumber || 14).padStart(2, '0')}`, 56, 505)

  // Talón derecho
  ctx.fillStyle = '#f0c057'
  ctx.font = '700 18px "JetBrains Mono", monospace'
  ctx.fillText('TALÓN DE CONTROL', 1064, 72)

  ctx.fillStyle = '#ffffff'
  ctx.font = '900 40px "Anton", "Arial Narrow", sans-serif'
  ctx.fillText(ticket.sectionCode || 'SEC L2', 1064, 134)

  ctx.fillStyle = '#c8d6f5'
  ctx.font = '700 22px "JetBrains Mono", monospace'
  ctx.fillText(`FILA ${String(ticket.rowNumber || 4).padStart(2, '0')} · ASIENTO ${String(ticket.seatNumber || 14).padStart(2, '0')}`, 1064, 180)

  ctx.fillStyle = '#f0c057'
  ctx.font = '900 38px "Anton", "Arial Narrow", sans-serif'
  ctx.fillText(ticket.priceLabel || '$85.000', 1064, 240)

  // Código de barras estilizado en el talón
  ctx.fillStyle = '#f4f6fc'
  for (let i = 0; i < 42; i++) {
    const w = (i * 7) % 3 === 0 ? 5 : 2
    ctx.fillRect(1064 + i * 7, 300, w, 145)
  }
  ctx.fillStyle = '#9fb2dc'
  ctx.font = '600 16px "JetBrains Mono", monospace'
  ctx.fillText('CABJ · 1905 · 1940 · BOCA', 1064, 480)

  return c
}

export function TicketModal({ open, ticket, onClose }) {
  const dialogRef = useRef(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 })
  const [downloaded, setDownloaded] = useState(false)

  // Abrir / cerrar con showModal() nativo
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  // Fallback obligatorio para navegadores sin soporte nativo de closedby="any"
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleClose = () => {
      dialog.returnValue = ''
      onClose?.()
    }
    dialog.addEventListener('close', handleClose)

    let cleanupFallback = null
    if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
      const onClick = (event) => {
        if (event.target !== dialog) return
        const rect = dialog.getBoundingClientRect()
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width
        if (isDialogContent) return
        dialog.close()
      }
      dialog.addEventListener('click', onClick)
      cleanupFallback = () => dialog.removeEventListener('click', onClick)
    }

    return () => {
      dialog.removeEventListener('close', handleClose)
      cleanupFallback?.()
    }
  }, [onClose])

  const handleDownload = () => {
    if (!ticket) return
    const canvas = renderTicketToCanvas(ticket)
    const link = document.createElement('a')
    link.download = `entrada-bombonera-${(ticket.sectionCode || 'boca').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 2600)
  }

  const rowStr = String(ticket?.rowNumber ?? 4).padStart(2, '0')
  const seatStr = String(ticket?.seatNumber ?? 14).padStart(2, '0')
  const serial = `CABJ-1940-${rowStr}${seatStr}`

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="ticket-dialog-title"
      className="m-auto w-[min(94vw,54rem)] rounded-3xl border border-oro/40 bg-[#050916]/95 p-0 text-claro shadow-[0_32px_90px_rgba(0,0,0,0.85)] backdrop:bg-black/75 backdrop:backdrop-blur-md"
    >
      <div className="p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="eyebrow text-oro">Reserva verificada en vista 3D</p>
            <h2 id="ticket-dialog-title" className="mt-1 font-display text-2xl tracking-wide uppercase sm:text-3xl">
              Tu Entrada · <span className="text-oro">La Bombonera</span>
            </h2>
          </div>
          <form method="dialog">
            <button
              type="submit"
              className="eyebrow min-h-10 rounded-full border border-white/20 px-4 text-claro/80 transition-colors hover:border-oro hover:text-oro focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-oro"
            >
              Cerrar
            </button>
          </form>
        </div>

        {/* Boleto físico interactivo con inclinación 3D sutil */}
        <div
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            const nx = (e.clientX - r.left) / r.width - 0.5
            const ny = (e.clientY - r.top) / r.height - 0.5
            setTilt({ rx: -ny * 7, ry: nx * 9 })
          }}
          onPointerLeave={() => setTilt({ rx: 0, ry: 0 })}
          style={{
            transform: `perspective(1100px) rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg)`,
            transition: 'transform 180ms ease-out',
          }}
          className="relative mt-6 overflow-hidden rounded-2xl border border-oro/50 bg-gradient-to-br from-[#08122c] via-[#102458] to-[#060c1d] shadow-[0_20px_50px_rgba(0,0,0,0.65)]"
        >
          {/* Brillo holográfico diagonal */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(65%_70%_at_30%_20%,rgba(240,192,87,0.16),transparent_70%)]"
          />

          <div className="grid lg:grid-cols-[1fr_15.5rem]">
            {/* Cuerpo principal del ticket */}
            <div className="relative p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-semibold tracking-[0.2em] text-oro uppercase">
                  Club Atlético Boca Juniors · Est. 1905
                </span>
                <span className="rounded-full border border-oro/40 bg-oro/15 px-3 py-0.5 font-mono text-[10px] font-bold tracking-[0.16em] text-oro uppercase">
                  {ticket?.badge || 'UBICACIÓN 3D'}
                </span>
              </div>

              <div className="mt-4">
                <p className="font-display text-3xl leading-none tracking-wide text-white uppercase sm:text-4xl">
                  {ticket?.label || 'Platea Preferencial'}
                </p>
                <p className="mt-1.5 font-mono text-xs tracking-[0.14em] text-claro/75 uppercase">
                  Estadio Alberto J. Armando · Brandsen 805 · La Boca
                </p>
              </div>

              {/* Franja de Oro Xeneize con Sector, Fila y Asiento */}
              <div className="-mx-5 my-5 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-[#d89b38] via-[#f0c057] to-[#d69836] px-5 py-3.5 text-[#050914] sm:-mx-7 sm:px-7">
                <div>
                  <p className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase opacity-75">Sector / Bloque</p>
                  <p className="font-display text-2xl leading-none uppercase">{ticket?.sectionCode || 'L2 · BAJA'}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase opacity-75">Fila / Nivel</p>
                    <p className="font-display text-2xl leading-none">{rowStr}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase opacity-75">Butaca</p>
                    <p className="font-display text-2xl leading-none">{seatStr}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase opacity-75">Valor</p>
                    <p className="font-display text-2xl leading-none">{ticket?.priceLabel || '$85.000'}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.18em] text-oro/75 uppercase">Puerta de ingreso</p>
                  <p className="mt-1 text-sm font-bold text-white">{ticket?.gate || 'Puerta 7 · Del Valle Iberlucea'}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-[0.18em] text-oro/75 uppercase">Partido / Función</p>
                  <p className="mt-1 text-sm font-bold text-white">Noche de Copa · 21:00 hs</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-[0.18em] text-oro/75 uppercase">Código de control</p>
                  <p className="mt-1 font-mono text-xs font-bold text-claro/90">{serial}</p>
                </div>
              </div>
            </div>

            {/* Talón troquelado derecho */}
            <div className="relative flex flex-col justify-between border-t border-dashed border-oro/40 bg-[#050b1c]/80 p-5 lg:border-t-0 lg:border-l">
              <div>
                <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-oro uppercase">Talón de Acceso</p>
                <p className="mt-2 font-display text-2xl leading-none text-white uppercase">{ticket?.sectionCode || 'SEC L2'}</p>
                <p className="mt-1 font-mono text-xs text-claro/80">
                  FILA {rowStr} · ASIENTO {seatStr}
                </p>
                <p className="mt-3 font-display text-2xl text-oro">{ticket?.priceLabel || '$85.000'}</p>
              </div>

              {/* Código de barras visual */}
              <div className="mt-5">
                <div
                  aria-hidden="true"
                  className="h-14 w-full rounded bg-white/95 p-2"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, #050914 0 3px, transparent 3px 6px, #050914 6px 8px, transparent 8px 13px, #050914 13px 17px, transparent 17px 20px)',
                  }}
                />
                <p className="mt-1.5 text-center font-mono text-[10px] tracking-[0.18em] text-claro/60">{serial}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones del modal */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-xs text-claro/65">
            Perspectiva 3D verificada desde las coordenadas reales de la maqueta.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              autoFocus
              onClick={handleDownload}
              className=" inline-flex min-h-11 items-center gap-2.5 rounded-full bg-oro px-6 font-mono text-xs font-bold tracking-[0.16em] text-fondo uppercase transition-transform hover:bg-[#f7cc69] active:scale-97 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-oro"
            >
              {downloaded ? 'Entrada descargada (PNG)' : 'Descargar entrada PNG'}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  )
}
