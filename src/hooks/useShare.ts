import { useCallback } from 'react'
import { useVestuario } from '../store/vestuario'

/** Comparte con la hoja nativa si existe; si no, copia el enlace y avisa. */
export function useShare() {
  return useCallback(async (url: string, text: string) => {
    const toast = useVestuario.getState().showToast
    try {
      if (navigator.share) await navigator.share({ title: document.title, text, url })
      else {
        await navigator.clipboard.writeText(url)
        toast('Enlace copiado')
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast('No se pudo compartir')
    }
  }, [])
}
