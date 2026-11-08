import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { room } from '../../config/site'
import { squad } from '../../data'
import { useVestuario } from '../../store/vestuario'
import type { Player } from '../../types'
import type { SceneAssets } from '../../three/assets'
import { createKnitNormal } from '../../three/textures/knit'
import { buildProps, buildRoom } from '../../three/room'
import { RailRig, clampDt } from '../../three/RailRig'

const INTRO_SECONDS = 3.6

/** Remera del personalizador: arranca con el texto de ejemplo del original */
export const CUSTOM_PLAYER: Player = {
  ...squad[squad.length - 1],
  id: 'custom',
  shirt: 'TU NOMBRE',
  dorsal: 12,
  pos: 'DEL',
  capitan: false,
}

interface Props {
  assets: SceneAssets
  mobile: boolean
  onRig: (rig: RailRig | null) => void
}

/**
 * Arma el vestuario y el riel una sola vez y los conecta con el store:
 * filtro y selección bajan al riel; hover y clics suben al store.
 */
export function Scene({ assets, mobile, onRig }: Props) {
  const { gl, scene, camera } = useThree()
  const rigRef = useRef<RailRig | null>(null)

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const touch = matchMedia('(hover: none)').matches
    const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
    const { dim, group } = buildRoom(scene, anisotropy, mobile)
    const props = buildProps(scene)
    const store = useVestuario.getState()
    const rig = new RailRig(
      squad,
      CUSTOM_PLAYER,
      assets,
      {
        assets,
        knit: createKnitNormal(),
        time: { value: 0 },
        hangerMaterial: new THREE.MeshPhysicalMaterial({ color: room.hanger, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.35 }),
        hookMaterial: new THREE.MeshStandardMaterial({ color: room.rail, roughness: 0.25, metalness: 1 }),
        anisotropy,
        lowK: mobile ? 0.5 : 0.64,
      },
      camera as THREE.PerspectiveCamera,
      gl.domElement,
      dim,
      { mobile, touch, reduced, k: { low: mobile ? 0.5 : 0.64, hover: mobile ? 1 : 1.3, stage: mobile ? 1.5 : 2 } },
      {
        onHover: (id) => useVestuario.getState().setHover(id),
        onSelect: (id) => useVestuario.getState().select(id),
      },
    )
    scene.add(rig.rail)
    rigRef.current = rig

    // Intro: la cámara entra al vestuario. Cualquier toque la acelera.
    store.setPhase('intro')
    const intro = gsap.to(rig.intro, {
      p: 1,
      duration: reduced ? 0.01 : INTRO_SECONDS,
      ease: 'power2.inOut',
      onComplete: () => useVestuario.getState().setPhase('ready'),
    })
    // Igual que el original: saltear = recorrer lo que falta a 2.2 "intros por segundo"
    rig.onSkipIntro = () => intro.timeScale(Math.max(intro.timeScale(), 2.2 * INTRO_SECONDS))
    onRig(rig)

    // Estado → riel
    let last = useVestuario.getState()
    rig.setFilter(last.filter)
    const unsub = useVestuario.subscribe((s) => {
      if (s.filter !== last.filter) rig.setFilter(s.filter)
      if (s.selected !== last.selected) rig.select(s.selected)
      last = s
    })
    const ro = new ResizeObserver(() => rig.resize())
    ro.observe(gl.domElement)

    return () => {
      unsub()
      ro.disconnect()
      intro.kill()
      onRig(null)
      rig.dispose()
      scene.remove(rig.rail, group, props)
      rigRef.current = null
    }
  }, [assets, camera, gl, scene, mobile, onRig])

  useFrame((_, delta) => {
    rigRef.current?.tick(clampDt(delta))
  })

  return null
}
