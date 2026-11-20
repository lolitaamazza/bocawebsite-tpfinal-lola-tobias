'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { Component, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { zoneAt } from '@/three/bombonera/layout'
import { LOOK, buildStadium } from '@/three/bombonera/stadium'
import {
  AERIAL_THETA,
  ORBIT_SPEED,
  aerialPose,
  flight,
  fovFor,
  introPose,
  seatLookPose,
  sectionOverviewPose,
  topDownPose,
  tunnelPose,
  tunnelToAerialPose,
} from '@/three/bombonera/views'

const TUNNEL_FLY = 3.8 // s del vuelo cinemático desde el túnel hasta el mapa cenital 3D
const FLY = 1.9 // s del vuelo entre mapa, sector y butaca

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
 * La Bombonera en 3D con coreografía de ticketing de 4 etapas (inspirada en el Reel):
 *  - 'tunnel': primera persona dentro del túnel de jugadores mirando al césped
 *  - 'aerial': vista cenital / aérea del estadio con resaltado 3D de secciones en hover
 *  - 'section': acercamiento frontal a las filas, suites y cenefas LED con precios
 *  - 'seat': vista POV desde la butaca con respaldos en primer plano y giro hacia el Jumbotron
 */
export default function StadiumCanvas({
  seat,
  viewMode,
  topDown = true,
  lookMode = 'pitch',
  activeSectionId = null,
  active = true,
  reduced = false,
  onPick,
  onHover,
  onLost,
}) {
  const resolvedMode = viewMode ?? (seat ? 'seat' : 'aerial')
  return (
    <Guard onError={onLost}>
      <Canvas
        className="!absolute inset-0 outline-none"
        style={{ touchAction: 'pan-y' }}
        aria-hidden="true"
        frameloop={active ? (reduced ? 'demand' : 'always') : 'never'}
        dpr={[1, 1.75]}
        camera={{ fov: 44, near: 0.15, far: 4000, position: [0, 3.2, -48] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = LOOK.exposure
          scene.background = new THREE.Color(LOOK.background)
        }}
      >
        <Stadium
          seat={seat}
          viewMode={resolvedMode}
          topDown={topDown}
          lookMode={lookMode}
          activeSectionId={activeSectionId}
          active={active}
          reduced={reduced}
          onPick={onPick}
          onHover={onHover}
          onLost={onLost}
        />
      </Canvas>
    </Guard>
  )
}

function Stadium({
  seat,
  viewMode,
  topDown,
  lookMode,
  activeSectionId,
  active,
  reduced,
  onPick,
  onHover,
  onLost,
}) {
  const { gl, scene, camera, invalidate } = useThree()
  const world = useRef(null)
  const clock = useRef(0)
  const hoveredSecRef = useRef(null)
  const activeSecRef = useRef(activeSectionId)
  const lookDrag = useRef({ yaw: 0, pitch: 0 })

  const cam = useRef({
    mode: viewMode === 'tunnel' ? 'tunnel' : reduced ? viewMode : 'intro',
    theta: topDown ? 0.08 : AERIAL_THETA,
    u: 0,
    from: null,
    dest: viewMode,
    seat: seat ?? null,
    topDown,
    lookMode,
  })
  const pose = useRef({ pos: [0, 1.7, -48], target: [0, 3.2, 20] })
  const tween = useRef(null)
  const calls = useRef({ onPick, onHover, onLost })

  useEffect(() => {
    calls.current = { onPick, onHover, onLost }
  }, [onPick, onHover, onLost])

  useEffect(() => {
    activeSecRef.current = activeSectionId
    if (!hoveredSecRef.current) {
      world.current?.setHoverSection?.(activeSectionId)
    }
  }, [activeSectionId])

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

      // Si hay balizas de butacas individuales visibles en modo 'section', priorizarlas
      const visibleBeacons = w.seatBeacons.filter((b) => b.parent?.visible && b.parent?.parent?.visible)
      if (visibleBeacons.length) {
        const bHit = ray.intersectObjects(visibleBeacons, false)[0]
        if (bHit?.object?.userData?.seat) {
          const fs = bHit.object.userData.seat
          const sec = bHit.object.userData.section
          return {
            zone: fs.zone,
            name: sec?.name ?? fs.sectionCode,
            sectionId: fs.sectionId,
            sectionCode: fs.sectionCode,
            sectionName: sec?.name ?? fs.sectionCode,
            shortName: sec?.shortName ?? fs.sectionCode,
            badge: sec?.badge ?? 'BUTACA',
            price: fs.price,
            priceLabel: fs.priceLabel,
            available: sec?.available ?? 8,
            gate: fs.gate,
            rowNumber: fs.rowNumber,
            seatNumber: fs.seatNumber,
            section: sec,
            seat: fs,
            fromSeatBeacon: true,
            clientX: x - r.left,
            clientY: y - r.top,
          }
        }
      }

      const hit = ray.intersectObjects(w.pickables, false)[0]
      if (!hit) return null
      const z = zoneAt(hit.point.x, hit.point.y, hit.point.z)
      if (!z) return null
      return {
        ...z,
        clientX: x - r.left,
        clientY: y - r.top,
      }
    }

    let pending = null
    let frame = 0
    let hoveredKey = null
    let dragging = false
    let down = null

    const move = (e) => {
      if (down && (cam.current.mode === 'seat' || cam.current.dest === 'seat')) {
        const dx = e.clientX - down[0]
        const dy = e.clientY - down[1]
        if (Math.hypot(dx, dy) > 6) {
          dragging = true
          lookDrag.current.yaw = Math.max(-0.85, Math.min(0.85, -dx * 0.0035))
          lookDrag.current.pitch = Math.max(-0.35, Math.min(0.55, dy * 0.0028))
          canvas.style.cursor = 'grabbing'
          if (reduced) invalidate()
          return
        }
      }
      if (e.pointerType !== 'mouse') return
      pending = [e.clientX, e.clientY]
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        if (!pending) return
        const z = pickAt(pending[0], pending[1])
        const secId = z?.sectionId ?? null
        hoveredSecRef.current = secId
        w.setHoverSection(secId || activeSecRef.current)
        canvas.style.cursor = z ? 'pointer' : cam.current.mode === 'seat' ? 'grab' : ''
        const nextKey = z ? `${z.sectionId}:${z.rowNumber}:${z.seatNumber}:${Math.round(z.clientX / 6)}:${Math.round(z.clientY / 6)}` : null
        if (nextKey !== hoveredKey) {
          hoveredKey = nextKey
          calls.current.onHover?.(z)
        }
      })
    }

    const leave = () => {
      pending = null
      down = null
      dragging = false
      canvas.style.cursor = ''
      hoveredSecRef.current = null
      w.setHoverSection(activeSecRef.current)
      if (hoveredKey !== null) {
        hoveredKey = null
        calls.current.onHover?.(null)
      }
    }

    const press = (e) => {
      down = [e.clientX, e.clientY]
      dragging = false
    }

    const release = (e) => {
      if (!down) return
      const dist = Math.hypot(e.clientX - down[0], e.clientY - down[1])
      down = null
      if (dragging || dist > 8) {
        dragging = false
        canvas.style.cursor = cam.current.mode === 'seat' ? 'grab' : ''
        return
      }
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
  }, [gl, scene, camera, reduced, invalidate])

  // Sincronización de cambios de etapa (tunnel | aerial | section | seat) y ubicación
  useEffect(() => {
    const c = cam.current
    c.topDown = topDown
    c.lookMode = lookMode
    lookDrag.current = { yaw: 0, pitch: 0 }

    const dest = viewMode || (seat ? 'seat' : 'aerial')
    world.current?.setFocusSeat?.(seat, dest)

    // Si estamos recién arrancando en intro (sin túnel) y no hay asiento
    if (c.mode === 'intro' && dest === 'aerial' && !seat && c.seat === null) {
      if (reduced) {
        c.mode = 'aerial'
        invalidate()
        return
      }
      c.u = 0
      tween.current?.kill()
      tween.current = gsap.to(c, {
        u: 1,
        duration: 3.2,
        ease: 'power2.inOut',
        onComplete: () => {
          c.mode = 'aerial'
          c.theta = topDown ? 0.08 : AERIAL_THETA
        },
      })
      return
    }

    // Si salimos del túnel hacia el mapa cenital 3D, ejecutamos el vuelo cinemático por la cancha
    if (c.mode === 'tunnel' && dest === 'aerial' && !reduced) {
      tween.current?.kill()
      c.mode = 'tunnel-fly'
      c.dest = 'aerial'
      c.seat = null
      c.u = 0
      tween.current = gsap.to(c, {
        u: 1,
        duration: TUNNEL_FLY,
        ease: 'power2.inOut',
        onComplete: () => {
          c.mode = 'aerial'
          c.theta = topDown ? 0.08 : AERIAL_THETA
        },
      })
      return
    }

    if (c.mode === dest && c.seat === seat) {
      if (reduced) invalidate()
      return
    }

    tween.current?.kill()
    c.seat = seat
    c.dest = dest
    if (reduced) {
      c.mode = dest
      invalidate()
      return
    }
    c.from = { pos: [...pose.current.pos], target: [...pose.current.target] }
    c.mode = 'fly'
    c.u = 0
    tween.current = gsap.to(c, {
      u: 1,
      duration: FLY,
      ease: 'power3.inOut',
      onComplete: () => {
        c.mode = dest
        world.current?.setFocusSeat?.(c.seat, dest)
      },
    })
  }, [seat, viewMode, topDown, lookMode, reduced, invalidate])

  useEffect(() => () => tween.current?.kill(), [])

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
    const view = state.camera
    if (view.fov !== fov) {
      view.fov = fov
      view.updateProjectionMatrix()
    }
    const c = cam.current
    const p = pose.current

    const resolveTargetPose = (mode) => {
      if (mode === 'tunnel') return tunnelPose(0.18 + Math.sin(t * 0.45) * 0.06)
      if (mode === 'section' && c.seat) return sectionOverviewPose(c.seat)
      if (mode === 'seat' && c.seat) {
        return seatLookPose(c.seat, c.lookMode, lookDrag.current.yaw, lookDrag.current.pitch)
      }
      return c.topDown ? topDownPose(aspect, c.theta) : aerialPose(aspect, c.theta)
    }

    let next
    if (c.mode === 'intro') {
      next = c.topDown ? tunnelToAerialPose(0.36 + c.u * 0.64, aspect, true) : introPose(c.u, aspect)
    } else if (c.mode === 'tunnel') {
      next = resolveTargetPose('tunnel')
    } else if (c.mode === 'tunnel-fly') {
      next = tunnelToAerialPose(c.u, aspect, c.topDown)
    } else if (c.mode === 'aerial') {
      if (!reduced) c.theta += step * (c.topDown ? ORBIT_SPEED * 0.35 : ORBIT_SPEED)
      next = resolveTargetPose('aerial')
    } else if (c.mode === 'fly') {
      next = flight(c.from, resolveTargetPose(c.dest), c.u)
    } else {
      next = resolveTargetPose(c.mode)
    }

    p.pos = next.pos
    p.target = next.target
    const sway = (c.mode === 'seat' || c.mode === 'section') && !reduced ? 1 : 0
    view.position.set(
      p.pos[0] + Math.sin(t * 0.42) * 0.06 * sway,
      p.pos[1] + Math.sin(t * 0.65) * 0.035 * sway,
      p.pos[2],
    )
    view.lookAt(p.target[0], p.target[1], p.target[2])
    w.update(t, state.size.height * state.viewport.dpr, view.position.y)
  })

  return null
}
