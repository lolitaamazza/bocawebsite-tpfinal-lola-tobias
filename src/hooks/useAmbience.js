import { useEffect, useRef } from 'react'
import { Ambience } from '../audio/ambience'
import { useVestuario } from '../store/vestuario'
import { frameBus } from '../three/frameBus'
const KEY = 'vestuario-sonido'
/**
 * Conecta el sonido con el estado: clinc al cambiar de remera, soplido al abrir/cerrar,
 * roce con la velocidad del riel. La preferencia se recuerda en localStorage.
 */
export function useAmbience() {
  const audio = useRef(new Ambience())
  const sound = useVestuario((s) => s.sound)
  // Preferencia guardada: se aplica en el primer gesto (los navegadores no dejan sonar antes)
  useEffect(() => {
    let wanted = false
    try {
      wanted = localStorage.getItem(KEY) === '1'
    } catch {
      /* modo privado */
    }
    const first = () => {
      if (wanted && !useVestuario.getState().sound) useVestuario.getState().setSound(true)
      else if (audio.current.enabled) audio.current.unlock()
      removeEventListener('pointerup', first)
      removeEventListener('keydown', first)
    }
    addEventListener('pointerup', first)
    addEventListener('keydown', first)
    return () => {
      removeEventListener('pointerup', first)
      removeEventListener('keydown', first)
    }
  }, [])
  useEffect(() => {
    audio.current.setEnabled(sound, true)
    try {
      localStorage.setItem(KEY, sound ? '1' : '0')
    } catch {
      /* modo privado */
    }
  }, [sound])
  useEffect(() => {
    const a = audio.current
    const unsub = useVestuario.subscribe((s, prev) => {
      if (s.hover !== prev.hover && s.hover) a.tick()
      if (s.selected !== prev.selected) {
        if (s.selected) a.open()
        else if (prev.selected) a.close()
      }
    })
    const unbus = frameBus.subscribe((f) => a.slide(f.speed))
    return () => {
      unsub()
      unbus()
    }
  }, [])
}
