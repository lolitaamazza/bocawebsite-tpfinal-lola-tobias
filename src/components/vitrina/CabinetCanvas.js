'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Component, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { LOOK, mountCabinet } from '@/three/trophies/cabinet'
import { FOV, overview, prepareWalk, sampleWalk, walkKeys } from '@/three/trophies/rig'

/** Si el lienzo no se puede crear o se rompe, la Vitrina vuelve a las tarjetas con foto */
class Guard extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error('Vitrina 3D: no se pudo dibujar, quedan las tarjetas.', error)
    this.props.onError?.()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

/**
 * La vitrina 3D. `active`: dibuja (si no, frameloop "never": cero GPU fuera de
 * pantalla). `reduced`: plano fijo del mueble entero, sin giros ni cámara que
 * camina, y solo redibuja cuando algo cambia. `walk` es un ref { p, stops,
 * version } que escribe el ScrollTrigger de la Vitrina.
 */
export default function CabinetCanvas({ cabinet, active, reduced, highlight, walk, onHover, onTap, onLost }) {
  return (
    <Guard onError={onLost}>
      <Canvas
        className="!absolute inset-0 outline-none"
        style={{ touchAction: 'pan-y' }}
        aria-hidden="true"
        frameloop={active ? (reduced ? 'demand' : 'always') : 'never'}
        dpr={[1, 1.75]}
        camera={{ fov: FOV, near: 0.05, far: 80, position: [0, 2, 9] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = LOOK.exposure
          scene.background = new THREE.Color(LOOK.background)
        }}
      >
        <Cabinet
          cabinet={cabinet}
          active={active}
          reduced={reduced}
          highlight={highlight}
          walk={walk}
          onHover={onHover}
          onTap={onTap}
          onLost={onLost}
        />
      </Canvas>
    </Guard>
  )
}

function Cabinet({ cabinet, active, reduced, highlight, walk, onHover, onTap, onLost }) {
  const { gl, scene, camera, invalidate } = useThree()
  const width = useThree((s) => s.size.width)
  const height = useThree((s) => s.size.height)
  const world = useRef(null)
  const lit = useRef(highlight)
  // reloj propio: el de R3F vuelve a 0 cada vez que se pausa el lienzo y los giros saltarían
  const clock = useRef(0)
  const path = useRef({ key: '', walk: null, out: { pos: [0, 0, 0], target: [0, 0, 0] } })
  // los callbacks pueden cambiar en cada render: se leen por ref para no rearmar la escena
  const calls = useRef({ onHover, onTap, onLost })
  useEffect(() => {
    calls.current = { onHover, onTap, onLost }
  }, [onHover, onTap, onLost])

  // Armado, entorno y punteros. Todo se libera al desmontar.
  useEffect(() => {
    const { world: w, unmount } = mountCabinet(scene, gl, cabinet)
    w.setHighlight(lit.current)
    world.current = w

    // Posiciona la cámara y pre-compila shaders en el montaje para que el primer cuadro ya quede pintado
    const aspect = gl.domElement.clientWidth / Math.max(1, gl.domElement.clientHeight)
    if (reduced) {
      const o = overview(cabinet, { aspect })
      camera.position.set(...o.pos)
      camera.lookAt(...o.target)
    } else {
      const { stops, p } = walk.current
      const wPath = prepareWalk(walkKeys(cabinet, { aspect, stops }))
      const s = sampleWalk(wPath, p, path.current.out)
      camera.position.set(s.pos[0], s.pos[1], s.pos[2])
      camera.lookAt(s.target[0], s.target[1], s.target[2])
    }
    w.update(0, 0, false)
    gl.compile(scene, camera)
    invalidate()

    const canvas = gl.domElement
    const ray = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    let mouse = null
    let hovered = null
    const pickAt = (x, y) => {
      const r = canvas.getBoundingClientRect()
      if (!r.width || !r.height) return null
      ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      return w.pick(ray.ray)
    }
    const hover = (i) => {
      if (i === hovered) return
      hovered = i
      canvas.style.cursor = i === null ? '' : 'pointer'
      calls.current.onHover?.(i)
    }
    // el mouse ilumina al pasar; el dedo (y el clic) fijan o sueltan el estante
    const move = (e) => {
      if (e.pointerType !== 'mouse') return
      mouse = [e.clientX, e.clientY]
      hover(pickAt(e.clientX, e.clientY))
    }
    const leave = () => {
      mouse = null
      hover(null)
    }
    const click = (e) => calls.current.onTap?.(pickAt(e.clientX, e.clientY))
    const lost = () => calls.current.onLost?.()
    // la cámara se mueve con el scroll: con el mouse quieto también cambia el estante de abajo
    w.repick = () => mouse && hover(pickAt(mouse[0], mouse[1]))
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerleave', leave)
    canvas.addEventListener('click', click)
    canvas.addEventListener('webglcontextlost', lost)
    return () => {
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerleave', leave)
      canvas.removeEventListener('click', click)
      canvas.removeEventListener('webglcontextlost', lost)
      unmount()
      world.current = null
    }
  }, [gl, scene, camera, cabinet, invalidate, reduced, walk])

  useEffect(() => {
    lit.current = highlight
    world.current?.setHighlight(highlight)
    invalidate()
  }, [highlight, invalidate])

  // al volver a pantalla en modo "demand" hay que pedir un cuadro
  useEffect(() => {
    if (active) invalidate()
  }, [active, invalidate])

  // Movimiento reducido: plano general fijo, recalculado si cambia el tamaño
  useEffect(() => {
    if (!reduced) return
    const o = overview(cabinet, { aspect: width / Math.max(1, height) })
    camera.position.set(...o.pos)
    camera.lookAt(...o.target)
    invalidate()
  }, [reduced, width, height, cabinet, camera, invalidate])

  useFrame((state, dt) => {
    const w = world.current
    if (!w) return
    const t = (clock.current += Math.min(dt, 0.1))
    if (!reduced) {
      const aspect = state.size.width / Math.max(1, state.size.height)
      const { stops, version, p } = walk.current
      const cache = path.current
      const key = `${aspect.toFixed(3)}:${version}`
      if (cache.key !== key) {
        cache.key = key
        cache.walk = prepareWalk(walkKeys(cabinet, { aspect, stops }))
      }
      const s = sampleWalk(cache.walk, p, cache.out)
      // la cámara respira apenas, como si la sostuviera alguien
      camera.position.set(s.pos[0] + Math.sin(t * 0.31) * 0.03, s.pos[1] + Math.sin(t * 0.47) * 0.015, s.pos[2])
      camera.lookAt(s.target[0], s.target[1], s.target[2])
    }
    w.update(dt, t, !reduced)
    if (!reduced) w.repick()
  })

  return null
}
