import * as THREE from 'three'
import { clamp, damp, lerp } from '../engine/math'
import {
  centredSlot,
  layoutRail,
  neighbourPush,
  pickSlot,
  railBounds,
  scrollTo,
  stepSlot,
  type GroupSpan,
} from '../engine/rail'
import { stagePose, type StageRect } from '../engine/stage'
import { clothBend, clothTwist, settleSwing, stepSwing } from '../engine/swing'
import type { Player, PosKey } from '../types'
import type { SceneAssets } from './assets'
import { frameBus } from './frameBus'
import { Jersey, REST_YAW, type JerseyShared } from './Jersey'
import { RAIL_Y } from './room'

/** Cámara en reposo y punto de partida de la intro */
export const CAMERA_HOME = new THREE.Vector3(0, 1.3, 3.5)
export const CAMERA_FROM = new THREE.Vector3(1.3, 1.1, 1.5)
const LOOK_FROM = new THREE.Vector3(0.2, 1.45, 0)
export const FOV = 32

export interface RigOptions {
  mobile: boolean
  touch: boolean
  reduced: boolean
  /** Resoluciones de textura: liviana, al pasar el puntero, en primer plano */
  k: { low: number; hover: number; stage: number }
}

export interface RigCallbacks {
  onHover(id: string | null): void
  onSelect(id: string | null): void
}

interface Pointer {
  x: number
  y: number
  inside: boolean
  down: boolean
  moved: number
  startX: number
  startY: number
  lastX: number
  lastT: number
  touch: boolean
}

/**
 * El riel completo: reparte las perchas, recibe el puntero y la rueda, anima
 * cada remera hacia su objetivo (reposo, hover, primer plano) y mueve la cámara.
 * No sabe nada de React: la UI le habla con select()/setFilter()/step().
 */
export class RailRig {
  readonly items: Jersey[] = []
  readonly custom: Jersey
  readonly rail = new THREE.Group()
  /** Progreso de la intro (0..1), lo anima GSAP desde afuera */
  readonly intro = { p: 0 }

  stageRect: StageRect = { x0: 0.02, y0: 0.12, x1: 0.55, y1: 0.88, tuck: 0 }
  kbd = false

  private groups: GroupSpan[] = []
  private bounds = { min: 0, max: 0 }
  private scroll = 0
  private scrollTarget = 0
  private scrollVel = 0
  private railSpeed = 0
  private userYaw = 0
  private yawVel = 0
  private stageSince = 0
  private time = 0
  private hover: Jersey | null = null
  private selected: Jersey | null = null
  private dragging = false
  private parallax = { x: 0, y: 0 }
  private sharp: Jersey[] = []
  private sharpTimer = 0
  private tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
  private raycaster = new THREE.Raycaster()
  private tmp = new THREE.Vector3()
  private pointer: Pointer = { x: 0, y: 0, inside: false, down: false, moved: 0, startX: 0, startY: 0, lastX: 0, lastT: 0, touch: false }
  private unbind: () => void = () => {}

  constructor(
    players: Player[],
    customPlayer: Player,
    private assets: SceneAssets,
    private shared: JerseyShared,
    private camera: THREE.PerspectiveCamera,
    private canvas: HTMLCanvasElement,
    private dim: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>,
    private opts: RigOptions,
    private cb: RigCallbacks,
  ) {
    players.forEach((p, i) => this.add(new Jersey(p, i, shared, true, opts.reduced)))
    this.custom = this.add(new Jersey(customPlayer, players.length, shared, false, opts.reduced))
    this.custom.slot.active = false
    this.custom.scale = 1e-4
    this.layout()
    for (const it of this.items) {
      it.x = it.slot.restX
      it.prevWorldX = it.x
    }
    this.camera.position.copy(CAMERA_FROM)
    this.resize()
    this.scroll = this.scrollTarget = this.bounds.min
    this.unbind = this.bind()
  }

  private add(j: Jersey) {
    this.items.push(j)
    this.rail.add(j.pivot)
    return j
  }

  get ready() {
    return this.intro.p >= 1
  }

  // ───────────────────────── API para la UI ─────────────────────────

  setFilter(pos: PosKey | null) {
    for (const it of this.items) it.slot.active = it !== this.custom && (!pos || it.player.pos === pos)
    this.layout()
    this.scrollTarget = this.bounds.min
    this.scrollVel = 0
    this.setHover(null)
  }

  /** Abre la ficha de un jugador ('custom' = personalizador) o cierra con null */
  select(id: string | null) {
    const next = id ? (this.items.find((it) => it.player.id === id && (it.slot.active || it === this.custom)) ?? null) : null
    if (next === this.selected) return
    this.selected = next
    this.userYaw = 0
    this.yawVel = 0
    if (next) {
      this.sharpen(next, this.opts.k.stage)
      this.stageSince = this.time
      if (next !== this.custom) this.scrollTarget = scrollTo(next.slot, this.bounds)
      this.scrollVel = 0
      this.setHover(null)
    }
    this.canvas.style.cursor = next ? 'grab' : ''
  }

  /** Flechas: siguiente/anterior. Con ficha abierta cambia de jugador; si no, mueve el hover. */
  step(dir: 1 | -1) {
    const from = this.selected ?? this.hover
    const slots = this.items.map((it) => it.slot)
    const i = stepSlot(slots, from ? this.items.indexOf(from) : -1, dir)
    if (i < 0) return
    const target = this.items[i]
    if (this.selected) this.cb.onSelect(target.player.id)
    else {
      this.setHover(target)
      this.scrollTarget = scrollTo(target.slot, this.bounds)
    }
  }

  openHovered() {
    if (this.hover) this.cb.onSelect(this.hover.player.id)
  }

  restampCustom(name: string, number: string) {
    this.custom.restamp(name, number)
  }

  dispose() {
    this.unbind()
    clearTimeout(this.sharpTimer)
    for (const it of this.items) it.dispose()
  }

  // ───────────────────────── geometría ─────────────────────────

  private layout() {
    this.groups = layoutRail(this.items.map((it) => it.slot))
    this.updateBounds()
  }

  private viewHalf(distance = CAMERA_HOME.z) {
    return this.tanHalf * distance * this.camera.aspect
  }

  private updateBounds() {
    this.bounds = railBounds(
      this.items.map((it) => it.slot),
      this.viewHalf(),
    )
  }

  /** Ajusta el FOV para que en vertical angosto entre al menos ±0.6 m de riel */
  resize() {
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    if (!w || !h) return
    this.camera.aspect = w / h
    this.tanHalf = Math.max(Math.tan(THREE.MathUtils.degToRad(FOV / 2)), 0.6 / (CAMERA_HOME.z * this.camera.aspect))
    this.camera.fov = THREE.MathUtils.radToDeg(Math.atan(this.tanHalf)) * 2
    this.camera.updateProjectionMatrix()
    this.updateBounds()
  }

  // ───────────────────────── puntero ─────────────────────────

  private setPointer(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect()
    this.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1
    this.pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1
  }

  /** Qué remera hay bajo el puntero: rayo contra el plano de las remeras */
  private pick(): Jersey | null {
    this.raycaster.setFromCamera(new THREE.Vector2(this.pointer.x, this.pointer.y), this.camera)
    const { origin, direction } = this.raycaster.ray
    if (Math.abs(direction.z) < 1e-5) return null
    const t = (0.1 - origin.z) / direction.z
    const x = origin.x + direction.x * t
    const y = origin.y + direction.y * t
    if (y > RAIL_Y + 0.06 || y < RAIL_Y + this.assets.size.bottom - 0.1) return null
    const i = pickSlot(
      this.items.map((it) => it.slot),
      x - this.rail.position.x,
    )
    return i >= 0 ? this.items[i] : null
  }

  private bind() {
    const c = this.canvas
    const p = this.pointer
    const skip = () => {
      if (!this.ready) this.onSkipIntro?.()
      return !this.ready
    }
    const down = (e: PointerEvent) => {
      if (skip()) return
      c.setPointerCapture(e.pointerId)
      Object.assign(p, {
        down: true,
        moved: 0,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastT: performance.now(),
        touch: e.pointerType !== 'mouse',
        inside: true,
      })
      this.setPointer(e)
      this.scrollVel = 0
      this.yawVel = 0
    }
    const move = (e: PointerEvent) => {
      p.inside = true
      this.kbd = false
      this.setPointer(e)
      if (!p.down) return
      const dx = e.clientX - p.lastX
      const now = performance.now()
      const dt = Math.max(1, now - p.lastT) / 1000
      p.moved = Math.max(p.moved, Math.hypot(e.clientX - p.startX, e.clientY - p.startY))
      if (p.moved > 6 && !this.dragging) {
        this.dragging = true
        c.style.cursor = 'grabbing'
        this.setHover(null)
      }
      if (this.dragging) {
        if (this.selected) {
          const d = dx * 0.011
          this.userYaw += d
          this.yawVel = d / dt
        } else {
          const perPx = (2 * this.viewHalf()) / c.clientWidth
          this.scrollTarget -= dx * perPx
          this.scrollVel = (-dx * perPx) / dt
        }
      }
      p.lastX = e.clientX
      p.lastT = now
    }
    const up = (e: PointerEvent) => {
      if (!p.down) return
      p.down = false
      const wasDrag = this.dragging
      this.dragging = false
      c.style.cursor = this.selected ? 'grab' : ''
      if (performance.now() - p.lastT > 80) {
        this.scrollVel = 0
        this.yawVel = 0
      }
      if (wasDrag || e.type === 'pointercancel') return
      if (this.selected) {
        // Tocar la remera la da vuelta; tocar afuera cierra la ficha
        this.raycaster.setFromCamera(new THREE.Vector2(p.x, p.y), this.camera)
        if (this.raycaster.intersectObject(this.selected.mesh).length) this.userYaw = Math.round(this.userYaw / Math.PI + 1) * Math.PI
        else this.cb.onSelect(null)
      } else {
        const hit = this.pick()
        if (hit) this.cb.onSelect(hit.player.id)
      }
      if (p.touch) p.inside = false
    }
    const leave = () => {
      p.inside = false
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      if (skip() || this.selected) return
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      this.scrollTarget += d * 0.0016
    }
    c.addEventListener('pointerdown', down)
    c.addEventListener('pointermove', move)
    c.addEventListener('pointerup', up)
    c.addEventListener('pointercancel', up)
    c.addEventListener('pointerleave', leave)
    c.addEventListener('wheel', wheel, { passive: false })
    return () => {
      c.removeEventListener('pointerdown', down)
      c.removeEventListener('pointermove', move)
      c.removeEventListener('pointerup', up)
      c.removeEventListener('pointercancel', up)
      c.removeEventListener('pointerleave', leave)
      c.removeEventListener('wheel', wheel)
    }
  }

  /** Lo engancha la escena para acelerar la intro con el primer toque */
  onSkipIntro?: () => void

  // ───────────────────────── texturas ─────────────────────────

  /** Hasta 3 remeras en alta a la vez; la seleccionada nunca baja */
  private sharpen(it: Jersey, k: number) {
    it.sharpen(k)
    this.sharp = [it, ...this.sharp.filter((s) => s !== it)]
    for (const old of this.sharp.splice(3)) {
      if (old === this.selected) this.sharp.push(old)
      else old.soften()
    }
  }

  private setHover(it: Jersey | null) {
    if (it === this.hover) return
    this.hover = it
    clearTimeout(this.sharpTimer)
    if (it) this.sharpTimer = window.setTimeout(() => this.hover === it && this.sharpen(it, this.opts.k.hover), 140)
    if (!this.selected) this.canvas.style.cursor = it ? 'pointer' : ''
    this.cb.onHover(it?.player.id ?? null)
  }

  // ───────────────────────── frame ─────────────────────────

  tick(dt: number) {
    const t = (this.time += dt)
    this.shared.time.value = t
    const p = this.pointer
    const reduced = this.opts.reduced

    // Riel: inercia, rebote elástico en los bordes y suavizado
    if (!this.dragging && !this.selected) {
      this.scrollTarget += this.scrollVel * dt
      this.scrollVel *= Math.exp(-3.2 * dt)
    }
    const { min, max } = this.bounds
    const over = this.scrollTarget < min ? this.scrollTarget - min : this.scrollTarget > max ? this.scrollTarget - max : 0
    if (over && !this.dragging) {
      this.scrollTarget -= over * (1 - Math.exp(-9 * dt))
      this.scrollVel *= 0.8
    }
    const prevX = this.rail.position.x
    this.scroll = damp(this.scroll, this.scrollTarget - over * 0.6 * Number(this.dragging), 9, dt)
    this.rail.position.x = -this.scroll
    this.railSpeed = damp(this.railSpeed, (this.rail.position.x - prevX) / dt, 14, dt)

    // Cámara: intro (GSAP mueve intro.p) + paralaje con el puntero
    const s = this.intro.p
    const free = this.selected || reduced || !this.ready ? 0 : 1
    this.parallax.x = damp(this.parallax.x, p.inside ? p.x * 0.07 * free : 0, 3, dt)
    this.parallax.y = damp(this.parallax.y, p.inside ? p.y * 0.035 * free : 0, 3, dt)
    this.camera.position.set(
      lerp(CAMERA_FROM.x, this.parallax.x, s),
      lerp(CAMERA_FROM.y, CAMERA_HOME.y + this.parallax.y, s),
      lerp(CAMERA_FROM.z, CAMERA_HOME.z, s),
    )
    this.camera.lookAt(lerp(LOOK_FROM.x, this.parallax.x * 0.4, s), lerp(LOOK_FROM.y, CAMERA_HOME.y, s), 0)
    this.camera.updateMatrixWorld()

    // Hover: puntero en escritorio, la del centro en táctil
    if (!this.ready) this.setHover(null)
    else if (!this.selected && !this.dragging && p.inside && !p.touch) this.setHover(this.pick())
    else if (this.opts.touch && !this.selected && !this.kbd) {
      const i = centredSlot(
        this.items.map((it) => it.slot),
        -this.rail.position.x,
      )
      const c = i >= 0 ? this.items[i] : null
      this.setHover(c)
      if (c && !this.dragging && Math.abs(this.scrollVel) < 0.25)
        this.scrollTarget = damp(this.scrollTarget, scrollTo(c.slot, this.bounds), 5, dt)
    } else if (!p.inside && !this.selected && !p.touch && this.hover && !this.kbd) this.setHover(null)

    if (this.selected && !this.dragging) {
      this.userYaw += this.yawVel * dt
      this.yawVel *= Math.exp(-2.6 * dt)
    }

    const pose = stagePose({
      rect: this.stageRect,
      tanHalf: this.tanHalf,
      aspect: this.camera.aspect,
      cameraY: CAMERA_HOME.y,
      cameraZ: CAMERA_HOME.z,
      distance: 2.1,
      shirtWidth: this.assets.size.width,
      shirtDrop: -this.assets.size.bottom,
      railY: RAIL_Y,
    })
    const showcase = reduced ? 0 : Math.sin((t - this.stageSince) * 0.7) * 0.16
    const active = this.items.filter((it) => it.slot.active)
    const hoverAt = this.hover && !this.selected ? active.indexOf(this.hover) : -1

    for (const it of this.items) {
      let tx = it.slot.restX
      let ty = 0
      let tz = 0
      let yaw = REST_YAW
      let scale = it.slot.active ? 1 : 1e-4
      let speed = 7
      if (it === this.selected) {
        tx = pose.x - this.rail.position.x
        ty = pose.y
        tz = pose.z
        scale = pose.scale
        yaw = this.userYaw + showcase
        speed = 5.5
      } else if (hoverAt >= 0) {
        const offset = active.indexOf(it) - hoverAt
        if (offset === 0) {
          tz = 0.34
          yaw = 0
          scale = 1.07
          speed = 9
        } else if (it.slot.active) tx += neighbourPush(offset)
      }
      it.x = damp(it.x, tx, speed, dt)
      it.y = damp(it.y, ty, speed, dt)
      it.z = damp(it.z, tz, speed, dt)
      it.yaw = damp(it.yaw, yaw, it === this.selected ? 7 : speed, dt)
      it.scale = damp(it.scale, scale, 9, dt)

      const worldX = it.x + this.rail.position.x
      const vel = (worldX - it.prevWorldX) / dt
      const accel = (vel - it.prevVel) / dt
      it.prevWorldX = worldX
      it.prevVel = vel
      if (reduced || it === this.selected) settleSwing(it.swing, it.yaw, dt, reduced)
      else stepSwing(it.swing, accel, it.yaw, t, it.phase, dt)

      const bend = clothBend(it.swing)
      it.cloth.uTwist.value = reduced ? 0 : clothTwist(it.swing, it.yaw)
      it.cloth.uBend.value.set(Math.cos(it.yaw) * bend, Math.sin(it.yaw) * bend)
      it.pivot.visible = it.scale > 0.01
      it.pivot.position.set(it.x, RAIL_Y + it.y, it.z)
      it.pivot.rotation.z = it.swing.swing
      it.pivot.scale.setScalar(it.scale)
      it.turn.rotation.y = it.yaw
      it.hookYaw = damp(it.hookYaw, it === this.selected ? it.yaw : Math.PI / 2, 6, dt)
      it.hook.rotation.y = it.hookYaw
    }

    this.dim.material.opacity = damp(this.dim.material.opacity, this.selected ? 0.78 : 0, 6, dt)
    this.dim.visible = this.dim.material.opacity > 0.005
    frameBus.emit(this.frameState())
  }

  private project(x: number, y: number, z: number) {
    const v = this.tmp.set(x, y, z).project(this.camera)
    return { x: (v.x * 0.5 + 0.5) * this.canvas.clientWidth, y: (-v.y * 0.5 + 0.5) * this.canvas.clientHeight }
  }

  private frameState() {
    const w = this.canvas.clientWidth
    const railX = this.rail.position.x
    const groups = this.groups.map((g) => {
      const a = this.project(g.minX + railX - 0.06, RAIL_Y + 0.07, 0)
      const end = this.project(g.maxX + railX + 0.2, RAIL_Y, 0).x
      const x = Math.min(Math.max(a.x, 20), Math.max(end - 150, 20))
      return { pos: g.pos, x, y: a.y, visible: end > 60 && a.x < w - 40 }
    })
    const h = this.hover
    const caption =
      h && !this.selected ? this.project(h.x + railX, RAIL_Y + this.assets.size.bottom * h.scale - 0.07, h.z) : null
    return { groups, caption, stage: !!this.selected, speed: this.selected ? 0 : this.railSpeed }
  }
}

export const clampDt = (dt: number) => clamp(dt, 1 / 240, 1 / 20)
