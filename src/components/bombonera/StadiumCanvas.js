'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { Component, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { zoneAt } from '@/three/bombonera/layout'
import { LOOK, buildStadium } from '@/three/bombonera/stadium'
import { AERIAL_THETA, ORBIT_SPEED, aerialPose, flight, fovFor, introPose, seatPose } from '@/three/bombonera/views'

const INTRO = 7 // s de la vuelta de entrada
const FLY = 2.2 // s del vuelo a una ubicación

/** Si el lienzo no se puede crear o se rompe, la página vuelve al plano */
class Guard extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error('Bombonera 3D: no se pudo dibujar, queda el plano.', error)
    this.props.onError?.()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

/**
 * La Bombonera en 3D. `seat`: butaca desde la que se mira (null = vista
 * aérea). `active`: dibuja (si no, frameloop "never"). `reduced`: sin vuelta
 * de entrada ni vuelos: cortes directos, y solo redibuja cuando algo cambia.
 */
export default function StadiumCanvas({ seat, active, reduced, onPick, onHover, onLost }) {
  return (
    <Guard onError={onLost}>
      <Canvas
        className="!absolute inset-0 outline-none"
        style={{ touchAction: 'pan-y' }}
        aria-hidden="true"
        frameloop={active ? (reduced ? 'demand' : 'always') : 'never'}
        dpr={[1, 1.75]}
        camera={{ fov: 44, near: 0.3, far: 4000, position: [0, 300, 300] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = LOOK.exposure
          scene.background = new THREE.Color(LOOK.background)
        }}
      >
        <Stadium seat={seat} active={active} reduced={reduced} onPick={onPick} onHover={onHover} onLost={onLost} />
      </Canvas>
    </Guard>
  )
}

function Stadium({ seat, active, reduced, onPick, onHover, onLost }) {
  const { gl, scene, camera, invalidate } = useThree()
  const world = useRef(null)
  // reloj propio: el de R3F vuelve a 0 cada vez que se pausa el lienzo
  const clock = useRef(0)
  /*
   * Estado de la cámara. mode: intro | aerial | fly | seat.
   * Las poses se calculan en cada cuadro con el aspecto vigente.
   */
  const cam = useRef({ mode: reduced ? 'aerial' : 'intro', theta: AERIAL_THETA, u: 0, from: null, dest: null, seat: null })
  const pose = useRef({ pos: [0, 0, 0], target: [0, 0, 0] })
  const tween = useRef(null)
  const calls = useRef({ onPick, onHover, onLost })
  useEffect(() => {
    calls.current = { onPick, onHover, onLost }
  }, [onPick, onHover, onLost])

  // Armado, punteros y liberación
  useEffect(() => {
    const w = buildStadium(gl)
    scene.add(w.group)
    world.current = w

    const canvas = gl.domElement
    const ray = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const pickAt = (x, y) => {
      const r = canvas.getBoundingClientRect()
      if (!r.width || !r.height) return null
      ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      const hit = ray.intersectObjects(w.pickables, false)[0]
      return hit ? zoneAt(hit.point.x, hit.point.y, hit.point.z) : null
    }
    // el mouse muestra qué tribuna hay abajo (un rayo por cuadro como mucho)
    let pending = null
    let frame = 0
    let hovered = null
    const move = (e) => {
      if (e.pointerType !== 'mouse') return
      pending = [e.clientX, e.clientY]
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        if (!pending) return
        const z = pickAt(pending[0], pending[1])
        const name = z?.name ?? null
        canvas.style.cursor = z ? 'pointer' : ''
        if (name !== hovered) calls.current.onHover?.((hovered = name))
      })
    }
    const leave = () => {
      pending = null
      canvas.style.cursor = ''
      if (hovered !== null) calls.current.onHover?.((hovered = null))
    }
    // un toque o un clic en la tribuna te sienta ahí (si no fue un arrastre)
    let down = null
    const press = (e) => {
      down = [e.clientX, e.clientY]
    }
    const release = (e) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8) return
      down = null
      const z = pickAt(e.clientX, e.clientY)
      if (z) calls.current.onPick?.(z)
    }
    const lost = (e) => {
      e.preventDefault()
      calls.current.onLost?.()
    }
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerleave', leave)
    canvas.addEventListener('pointerdown', press)
    canvas.addEventListener('pointerup', release)
    canvas.addEventListener('webglcontextlost', lost)
    return () => {
      cancelAnimationFrame(frame)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerleave', leave)
      canvas.removeEventListener('pointerdown', press)
      canvas.removeEventListener('pointerup', release)
      canvas.removeEventListener('webglcontextlost', lost)
      scene.remove(w.group)
      w.dispose()
      world.current = null
    }
  }, [gl, scene, camera])

  // Vuelta de entrada (solo con movimiento)
  useEffect(() => {
    const c = cam.current
    if (reduced) {
      if (c.mode === 'intro') c.mode = 'aerial'
      return
    }
    if (c.mode !== 'intro') return
    c.u = 0
    tween.current = gsap.to(c, {
      u: 1,
      duration: INTRO,
      ease: 'power2.inOut',
      onComplete: () => {
        c.mode = 'aerial'
        c.theta = AERIAL_THETA
      },
    })
    return () => tween.current?.kill()
  }, [reduced])

  // Cambio de ubicación: vuelo en arco (o corte directo con movimiento reducido)
  useEffect(() => {
    const c = cam.current
    const dest = seat ? 'seat' : 'aerial'
    if (c.mode === dest && c.seat === seat) return
    if (c.mode === 'intro' && !seat) return
    tween.current?.kill()
    c.seat = seat
    if (reduced) {
      c.mode = dest
      invalidate()
      return
    }
    c.from = { pos: [...pose.current.pos], target: [...pose.current.target] }
    c.dest = dest
    c.mode = 'fly'
    c.u = 0
    tween.current = gsap.to(c, {
      u: 1,
      duration: FLY,
      ease: 'power3.inOut',
      onComplete: () => {
        c.mode = dest
      },
    })
  }, [seat, reduced, invalidate])

  useEffect(() => () => tween.current?.kill(), [])

  // al volver a pantalla en modo "demand" hay que pedir un cuadro
  useEffect(() => {
    if (active) invalidate()
  }, [active, invalidate])

  useFrame((state, dt) => {
    const w = world.current
    if (!w) return
    const step = Math.min(dt, 0.1)
    const t = (clock.current += reduced ? 0 : step)
    const aspect = state.size.width / Math.max(1, state.size.height)
    const fov = fovFor(aspect)
    const view = state.camera // la cámara se mueve desde el cuadro, no desde el render
    if (view.fov !== fov) {
      view.fov = fov
      view.updateProjectionMatrix()
    }
    const c = cam.current
    const p = pose.current
    const target = () => (c.dest === 'seat' || c.mode === 'seat' ? seatPose(c.seat) : aerialPose(aspect, c.theta))
    let next
    if (c.mode === 'intro') next = introPose(c.u, aspect)
    else if (c.mode === 'aerial') {
      if (!reduced) c.theta += step * ORBIT_SPEED
      next = aerialPose(aspect, c.theta)
    } else if (c.mode === 'fly') next = flight(c.from, target(), c.u)
    else next = seatPose(c.seat)
    p.pos = next.pos
    p.target = next.target
    // sentado, la cabeza se mueve apenas
    const sway = c.mode === 'seat' && !reduced ? 1 : 0
    view.position.set(p.pos[0] + Math.sin(t * 0.4) * 0.08 * sway, p.pos[1] + Math.sin(t * 0.63) * 0.04 * sway, p.pos[2])
    view.lookAt(p.target[0], p.target[1], p.target[2])
    w.update(t, state.size.height * state.viewport.dpr)
  })

  return null
}
