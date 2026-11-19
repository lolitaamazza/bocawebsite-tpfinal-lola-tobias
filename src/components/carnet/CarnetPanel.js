'use client'

import { useRef, useState, useSyncExternalStore } from 'react'
import { ghostButton, primaryButton } from '@/components/account/PageHead'
import { Icon } from '@/components/ui/Icon'
import { site } from '@/config/site'
import { CarnetCard } from './CarnetCard'
import { canShareFiles, carnetBlob, downloadBlob, shareBlob, useFontsReady, useLoadedImage } from './exportCarnet'

const noSubscribe = () => () => {}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14" />
    </svg>
  )
}

/**
 * Carnet + acciones (dar vuelta, PNG, compartir). Lo usan el editor público y "Mi carnet".
 * `beforeExport` deja que el editor valide antes de generar la imagen.
 */
export function CarnetPanel({ model, photoUrl = null, fileName, shareText, beforeExport }) {
  const [flipped, setFlipped] = useState(false)
  const [busy, setBusy] = useState(null)
  const [notice, setNotice] = useState(null)
  const fontsReady = useFontsReady()
  const crest = useLoadedImage(site.crest.src)
  const photo = useLoadedImage(photoUrl)
  // Web Share con archivos: solo existe en el navegador (en el servidor, no)
  const canShare = useSyncExternalStore(noSubscribe, canShareFiles, () => false)
  const ready = useRef({ key: null, blob: null })

  // La imagen se reutiliza mientras el diseño no cambie (así el segundo toque de Compartir es inmediato)
  const key = JSON.stringify([model, photoUrl, Boolean(photo.img)])
  async function blob() {
    if (ready.current.key === key) return ready.current.blob
    const b = await carnetBlob(model, { crest: crest.img, photo: photo.img })
    ready.current = { key, blob: b }
    return b
  }

  // Cada aviso queda atado al diseño que lo produjo: si cambiás algo, desaparece
  const say = (tone, text) => setNotice({ tone, text, key })

  async function run(kind, task) {
    if (beforeExport && !beforeExport()) {
      say('error', 'Completá los campos marcados para sacar tu carnet.')
      return
    }
    setBusy(kind)
    setNotice(null)
    try {
      await task()
    } catch (e) {
      say('error', e?.message || 'No pudimos generar la imagen.')
    } finally {
      setBusy(null)
    }
  }

  const download = () =>
    run('download', async () => {
      downloadBlob(await blob(), fileName)
      say('ok', `Descargado: ${fileName}`)
    })

  const share = () =>
    run('share', async () => {
      const result = await shareBlob(await blob(), fileName, shareText)
      if (result === 'blocked') say('ok', 'La imagen está lista: tocá Compartir otra vez.')
      if (result === 'unsupported') say('error', 'Tu navegador no comparte imágenes: descargala y compartila desde tu galería.')
    })

  const shown = photoUrl && photo.error ? { tone: 'error', text: 'No pudimos leer esa foto. Probá con un JPG o PNG.' } : notice?.key === key ? notice : null

  return (
    <div>
      <CarnetCard model={model} crest={crest.img} photo={photo.img} fontsReady={fontsReady} flipped={flipped} onFlip={() => setFlipped((f) => !f)} />
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button type="button" aria-pressed={flipped} onClick={() => setFlipped((f) => !f)} className={ghostButton}>
          <span aria-hidden="true">↺</span>
          {flipped ? 'Ver frente' : 'Ver dorso'}
        </button>
        <button type="button" onClick={download} disabled={!!busy} className={`${primaryButton} disabled:opacity-60`}>
          <DownloadIcon />
          {busy === 'download' ? 'Generando…' : 'Descargar PNG'}
        </button>
        {canShare ? (
          <button type="button" onClick={share} disabled={!!busy} className={`${ghostButton} disabled:opacity-60`}>
            <Icon name="share" />
            {busy === 'share' ? 'Preparando…' : 'Compartir'}
          </button>
        ) : null}
      </div>
      <p aria-live="polite" className={`mt-3 min-h-5 text-sm ${shown?.tone === 'error' ? 'text-red-300' : 'text-oro'}`}>
        {shown?.text ?? ''}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-claro/45">
        El código del dorso es un patrón decorativo: no es un QR. El carnet es un tributo no oficial y no sirve como credencial de socio ni para entrar a la cancha.
      </p>
    </div>
  )
}
