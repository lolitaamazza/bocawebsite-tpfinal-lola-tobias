'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Fallback } from '../components/layout/Fallback'
import { Footer } from '../components/layout/Footer'
import { Loader } from '../components/layout/Loader'
import { Caption } from '../components/overlay/Caption'
import { GroupLabels } from '../components/overlay/GroupLabels'
import { Toast } from '../components/overlay/Toast'
import { Stage } from '../components/three/Stage'
import { playerById } from '../data'
import { useAmbience } from '../hooks/useAmbience'
import { useKeyboard } from '../hooks/useKeyboard'
import { useRouteSync } from '../hooks/useRouteSync'
import { useStageRect } from '../hooks/useStageRect'
import { useVestuario } from '../store/vestuario'
import { loadSceneAssets } from '../three/assets'
import { CardContainer } from './CardContainer'
import { HeaderContainer } from './HeaderContainer'
const isMobile = () => innerWidth < 820 || matchMedia('(pointer: coarse)').matches
const hasWebGL = () => {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}
/**
 * Pantalla del vestuario. Carga los assets, monta la escena y orquesta la UI
 * alrededor: cabecera, rótulos, epígrafe, ficha, pie, telón y rutas.
 */
export function VestuarioContainer() {
  const root = useRef(null)
  const card = useRef(null)
  const [assets, setAssets] = useState(null)
  const [rig, setRig] = useState(null)
  const [webgl] = useState(hasWebGL)
  const [loadError, setLoadError] = useState(null)
  const error = webgl ? loadError : 'Tu navegador no tiene WebGL, así que te mostramos el plantel en lista.'
  const [mobile] = useState(isMobile)
  const phase = useVestuario((s) => s.phase)
  const progress = useVestuario((s) => s.progress)
  const sound = useVestuario((s) => s.sound)
  const selected = useVestuario((s) => s.selected)
  useEffect(() => {
    if (!webgl) {
      useVestuario.getState().setPhase('error')
      return
    }
    let alive = true
    loadSceneAssets((p) => useVestuario.getState().setProgress(p * 0.8))
      .then((a) => alive && setAssets(a))
      .catch((e) => {
        console.error(e)
        if (!alive) return
        setLoadError('No pudimos cargar el vestuario 3D.')
        useVestuario.getState().setPhase('error')
      })
    return () => {
      alive = false
    }
  }, [webgl])
  /** Abre una ficha. Si el filtro activo esconde a ese jugador, se quita el filtro. */
  const openSelection = useCallback(
    (sel) => {
      const s = useVestuario.getState()
      const p = sel && sel !== 'custom' ? playerById(sel) : null
      if (p && s.filter && s.filter !== p.pos) s.setFilter(null)
      if (sel) rig?.onSkipIntro?.()
      s.select(sel)
    },
    [rig],
  )
  const customize = useCallback(
    (from) => {
      const s = useVestuario.getState()
      if (from && !s.custom.number) s.setCustom({ number: String(from.dorsal) })
      openSelection('custom')
    },
    [openSelection],
  )
  useRouteSync(openSelection)
  useKeyboard(rig)
  useStageRect(rig, card)
  useAmbience()
  // Nombre/número del personalizador → remera 3D (con un respiro para no repintar por tecla)
  useEffect(() => {
    if (!rig) return
    let t = 0
    const apply = () => {
      const c = useVestuario.getState().custom
      rig.restampCustom(c.name.trim() || 'TU NOMBRE', c.number || '12')
    }
    apply()
    const unsub = useVestuario.subscribe((s, prev) => {
      if (s.custom.name === prev.custom.name && s.custom.number === prev.custom.number) return
      clearTimeout(t)
      t = window.setTimeout(apply, 110)
    })
    return () => {
      clearTimeout(t)
      unsub()
    }
  }, [rig])
  // Cuando termina la intro aparece la UI
  useGSAP(
    () => {
      if (phase !== 'ready') return
      gsap.to('[data-reveal]', { opacity: 1, duration: 1, stagger: 0.12, ease: 'power2.out' })
    },
    { dependencies: [phase], scope: root },
  )
  const onRig = useCallback((r) => {
    setRig(r)
    if (r) useVestuario.getState().setProgress(1)
  }, [])
  const touch = typeof matchMedia !== 'undefined' && matchMedia('(hover: none)').matches
  return (
    <main
      ref={root}
      // Enfocar un input dentro de la ficha hace que el navegador desplace el contenedor: se fija en 0
      onScroll={(e) => e.currentTarget.scrollTo(0, 0)}
      className="grain fixed inset-0 overflow-hidden select-none"
    >
      {assets ? <Stage assets={assets} mobile={mobile} onRig={onRig} /> : null}
      {/* viñeta */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_85%_at_50%_45%,transparent_55%,rgba(2,4,10,0.82)_100%)]" />

      <HeaderContainer openSelection={openSelection} onCustomize={() => customize()} />
      <div data-reveal className="opacity-0">
        <GroupLabels />
      </div>
      <Caption />
      <CardContainer ref={card} rig={rig} onCustomize={customize} />
      <Toast />
      <Footer
        hint={touch ? 'Deslizá el riel · Tocá para abrir' : 'Arrastrá el riel · Clic para abrir'}
        hintVisible={phase === 'ready' && !selected}
        sound={sound}
        onSound={() => useVestuario.getState().setSound(!sound)}
        onCustomize={() => customize()}
      />
      {error ? <Fallback reason={error} /> : <Loader progress={progress} done={phase === 'intro' || phase === 'ready'} />}
    </main>
  )
}
