import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { room } from '../../config/site'
import { goldGeometry, plinthGeometry } from './geometry'
import { TROPHIES } from './profiles'

/** La vitrina en la misma clave que el vestuario: noche azul, laca negra y luz cálida */
export const LOOK = {
  background: '#05080f',
  exposure: 1.05,
  environment: 0.95,
  gold: '#e3a945',
  silver: '#dce5f2',
  ember: '#ff9a3c', // emisivo del estante encendido
  night: '#0a1636', // el fondo se ve azul aunque la luz sea cálida
  lacquer: '#06080d',
  velvet: '#081127',
  glass: '#d4e3f6',
  glassEdge: '#a8dcd2',
  floor: '#05080f',
  lamp: 5, // foco cálido de cada estante (cd)
  glow: 0.2, // brillo de la tira sobre el fondo
}
const SIDE = 0.05 // espesor de los laterales
const FADE = 7 // velocidad del encendido y el atenuado (1/s)
const SPIN = 0.35 // giro de las copas con asas (rad/s)
const GOLDEN = 2.399963 // ángulo áureo: cada copa arranca girada distinto

const metalMaterial = (kind = 'gold') =>
  new THREE.MeshPhysicalMaterial({
    color: kind === 'silver' ? LOOK.silver : LOOK.gold,
    metalness: 1,
    roughness: kind === 'silver' ? 0.18 : 0.24,
    clearcoat: 0.65,
    clearcoatRoughness: 0.08,
    emissive: LOOK.ember,
    emissiveIntensity: 0,
    envMapIntensity: LOOK.environment,
  })

const plinthMaterial = (color = LOOK.lacquer) =>
  new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.26,
    clearcoat: 0.9,
    clearcoatRoughness: 0.08,
    envMapIntensity: 0.3,
  })

/** Degradé cálido que baja desde la tira de luz sobre el terciopelo (como en el vestuario) */
function glowTexture() {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 256
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, 256)
  const [a, b, d] = room.glow
  g.addColorStop(0, `rgba(${a.join(',')},0.9)`)
  g.addColorStop(0.3, `rgba(${b.join(',')},0.32)`)
  g.addColorStop(1, `rgba(${d.join(',')},0)`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 4, 256)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Sombra de contacto: mancha radial bajo cada copa (más barato que sombras reales) */
function shadowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(0,0,0,0.62)')
  g.addColorStop(0.45, 'rgba(0,0,0,0.3)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

/**
 * Entorno para los reflejos: RoomEnvironment de three más una tira cálida
 * arriba y adelante, así el oro refleja la misma luz que el vestuario.
 * Devuelve el render target: quien lo usa lo libera con dispose().
 */
export function warmEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = new RoomEnvironment()
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshLambertMaterial({ color: 0x000000, emissive: 0xffb25a, emissiveIntensity: 36 }),
  )
  strip.position.set(0, 18.5, 9)
  strip.scale.set(16, 0.15, 1.2)
  env.add(strip)
  const target = pmrem.fromScene(env, 0.04)
  env.dispose() // libera también la tira (recorre todas las mallas)
  pmrem.dispose()
  return target
}

/**
 * Pone la vitrina en la escena con su entorno cálido. unmount() la saca y libera todo.
 * El entorno va material por material y no en scene.environment: con
 * scene.environment three pisa el envMapIntensity de cada material con
 * scene.environmentIntensity, y acá cada uno necesita el suyo (el oro brilla,
 * el fondo no, y el estante atenuado refleja menos).
 */
export function mountCabinet(scene, renderer, cab) {
  const env = warmEnvironment(renderer)
  const world = buildCabinet(cab)
  world.group.traverse((o) => {
    for (const m of o.material ? [].concat(o.material) : []) if (m.isMeshStandardMaterial) m.envMap = env.texture
  })
  scene.add(world.group)
  return {
    world,
    unmount() {
      scene.remove(world.group)
      world.dispose()
      env.dispose()
    },
  }
}

/**
 * Arma la vitrina a partir de cabinetLayout(): mueble laqueado, fondo de
 * terciopelo, estantes de vidrio con tira de luz, y las copas (un InstancedMesh
 * por tipo para el oro y otro para las bases). Devuelve:
 *  - group: lo que se agrega a la escena
 *  - setHighlight(i | null): enciende un estante y atenúa los demás
 *  - update(dt, t, animate): giro de las copas con asas, barrido de las luces y fundidos
 *  - pick(ray): qué estante cae bajo un rayo (o null)
 *  - dispose(): libera geometrías, materiales y texturas
 */
export function buildCabinet(cab) {
  const group = new THREE.Group()
  group.name = 'vitrina'
  const textures = [glowTexture(), shadowTexture()]
  const [glowMap, shadowMap] = textures
  const W = cab.width
  const D = cab.depth
  const H = cab.height
  const floorTop = cab.base - cab.glass

  // El entorno es un cuarto blanco y luminoso: ideal para el oro, pero lava todo lo
  // demás. Cada material oscuro lo toma en su justa medida (envMapIntensity).
  const lacquer = new THREE.MeshPhysicalMaterial({
    color: LOOK.lacquer,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: 0.3,
  })
  const frame = new THREE.MeshPhysicalMaterial({
    color: room.trim,
    roughness: 0.4,
    clearcoat: 0.7,
    clearcoatRoughness: 0.15,
    envMapIntensity: 0.3,
  })
  // fondo mate azul noche (con sheen el terciopelo se lavaba a lila bajo la luz cálida)
  const velvet = new THREE.MeshStandardMaterial({
    color: LOOK.velvet,
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0.08,
    emissive: LOOK.night,
    emissiveIntensity: 0.7,
  })
  const glass = new THREE.MeshPhysicalMaterial({
    color: LOOK.glass,
    roughness: 0.05,
    metalness: 0,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
    envMapIntensity: 0.5,
  })
  const edge = new THREE.MeshBasicMaterial({ color: LOOK.glassEdge, transparent: true, opacity: 0.2, depthWrite: false })
  const inlay = metalMaterial('gold')

  const add = (geometry, material, x, y, z) => {
    const m = new THREE.Mesh(geometry, material)
    m.position.set(x, y, z)
    group.add(m)
    return m
  }

  // mueble: fondo, laterales, cornisa y zócalo con filete dorado
  add(new THREE.PlaneGeometry(W, cab.ceiling - floorTop), velvet, 0, (cab.ceiling + floorTop) / 2, -D / 2)
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(SIDE, H, D + 0.04), frame, s * (W / 2 + SIDE / 2), H / 2, 0.02)
  add(new THREE.BoxGeometry(W + 2 * SIDE, H - cab.ceiling, D + 0.04), frame, 0, (cab.ceiling + H) / 2, 0.02)
  add(new THREE.BoxGeometry(W + 2 * SIDE, floorTop, D + 0.04), frame, 0, floorTop / 2, 0.02)
  add(new THREE.BoxGeometry(W * 0.92, 0.006, 0.004), inlay, 0, floorTop * 0.6, D / 2 + 0.042)
  const floor = add(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: LOOK.floor, roughness: 0.45, metalness: 0.2, envMapIntensity: 0.25 }),
    0,
    0,
    0,
  )
  floor.rotation.x = -Math.PI / 2

  // luz general: cielo cálido, llave desde arriba y adelante, relleno frío
  group.add(new THREE.HemisphereLight(room.hemisphere[0], room.hemisphere[1], 0.25))
  const key = new THREE.DirectionalLight(room.key, 1.2)
  key.position.set(2.5, H + 2, 6)
  key.target.position.set(0, H / 2, 0)
  group.add(key, key.target)
  const fill = new THREE.DirectionalLight(room.fill, 0.3)
  fill.position.set(-4, 2, 5)
  group.add(fill)

  const dummy = new THREE.Object3D()
  const shadows = []
  const rows = cab.shelves.map((sh, i) => {
    const trophy = TROPHIES[sh.type]
    const top = i === 0 ? cab.ceiling : cab.shelves[i - 1].y - cab.glass

    // vidrio con su canto, tira de luz arriba y el brillo que baja por el terciopelo
    const slab = add(new THREE.BoxGeometry(W, cab.glass, D - 0.01), glass, 0, sh.y - cab.glass / 2, -0.005)
    const rim = add(new THREE.BoxGeometry(W, cab.glass, 0.002), edge, 0, sh.y - cab.glass / 2, D / 2 - 0.009)
    slab.renderOrder = rim.renderOrder = 1
    const ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(...room.led), toneMapped: false })
    add(new THREE.BoxGeometry(W - 0.04, 0.008, 0.02), ledMat, 0, top - 0.004, D / 2 - 0.06)
    const glowMat = new THREE.MeshBasicMaterial({
      map: glowMap,
      transparent: true,
      opacity: LOOK.glow,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    add(new THREE.PlaneGeometry(W, sh.clear), glowMat, 0, sh.y + sh.clear / 2, -D / 2 + 0.003)
    // foco que baja sobre el vidrio: pileta de luz en el estante, el fondo de arriba queda en penumbra
    const lamp = new THREE.SpotLight(room.warm, LOOK.lamp, 2.6, 0.95, 0.85, 1.3)
    lamp.position.set(0, top - 0.05, D / 2 - 0.08)
    lamp.target.position.set(0, sh.y, -0.05)
    group.add(lamp, lamp.target)

    // gradas para las filas de atrás
    const rise = trophy.layout.rowRise ?? 0
    for (let r = 1; r < sh.tiers; r++) {
      const z = sh.positions.find((p) => p.row === r).z
      add(new THREE.BoxGeometry(W - 0.1, r * rise, trophy.layout.rowGap), lacquer, 0, sh.y + (r * rise) / 2, z)
    }

    // las copas: metal real (plata para Libertadores/Sudamericana/Copa Argentina, oro para Intercontinental/Liga)
    // y pedestal con el color de su madera caoba o mármol negro + chapitas metálicas
    const goldMat = metalMaterial(trophy.metal)
    const baseMat = trophy.plinthColor ? plinthMaterial(trophy.plinthColor) : lacquer
    const body = new THREE.InstancedMesh(goldGeometry(trophy), goldMat, sh.positions.length)
    const base = new THREE.InstancedMesh(plinthGeometry(trophy), [baseMat, goldMat], sh.positions.length)
    const baseColor = new THREE.Color(trophy.metal === 'silver' ? LOOK.silver : LOOK.gold)
    const phases = sh.positions.map((_, j) => j * GOLDEN + i)
    sh.positions.forEach((p, j) => {
      dummy.position.set(p.x, sh.y + p.y, p.z)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      base.setMatrixAt(j, dummy.matrix)
      dummy.rotation.y = phases[j]
      dummy.updateMatrix()
      body.setMatrixAt(j, dummy.matrix)
      shadows.push([p.x, sh.y + p.y + 0.0015, p.z, sh.metrics.footprint * 2.5])
    })
    // las copas giran sobre su eje: el volumen total no cambia, no hace falta recortar por cámara
    body.frustumCulled = base.frustumCulled = false
    group.add(body, base)

    const box = new THREE.Box3(new THREE.Vector3(-W / 2, sh.y - cab.glass, -D / 2), new THREE.Vector3(W / 2, top, D / 2 + 0.05))
    return { sh, body, goldMat, baseColor, ledMat, glowMat, lamp, box, phases, spin: Boolean(trophy.spin), lit: 0, dim: 0 }
  })

  const shadowMesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x000000, map: shadowMap, transparent: true, depthWrite: false }),
    shadows.length,
  )
  shadows.forEach(([x, y, z, s], j) => {
    dummy.position.set(x, y, z)
    dummy.rotation.set(0, 0, 0)
    dummy.scale.setScalar(s)
    dummy.updateMatrix()
    shadowMesh.setMatrixAt(j, dummy.matrix)
  })
  shadowMesh.renderOrder = 2
  shadowMesh.frustumCulled = false
  group.add(shadowMesh)
  dummy.scale.setScalar(1)

  const led = new THREE.Color(...room.led)
  let highlight = null

  /** Aplica el estado de un estante (lit: encendido, dim: atenuado) */
  const paint = (r) => {
    r.goldMat.color.copy(r.baseColor).multiplyScalar(1 - 0.5 * r.dim)
    r.goldMat.envMapIntensity = LOOK.environment * (1 - 0.45 * r.dim + 0.2 * r.lit)
    r.goldMat.emissiveIntensity = 0.06 * r.lit
    r.lamp.intensity = LOOK.lamp * (1 + 0.4 * r.lit - 0.55 * r.dim)
    r.ledMat.color.copy(led).multiplyScalar(1 + 0.5 * r.lit - 0.5 * r.dim)
    r.glowMat.opacity = LOOK.glow * (1 + 0.6 * r.lit - 0.5 * r.dim)
  }
  rows.forEach(paint)

  const hit = new THREE.Vector3()
  return {
    group,
    rows,
    setHighlight(i) {
      highlight = Number.isInteger(i) && i >= 0 && i < rows.length ? i : null
    },
    update(dt, t, animate) {
      const k = animate ? 1 - Math.exp(-FADE * Math.min(dt, 0.1)) : 1
      rows.forEach((r, i) => {
        const lit = highlight === i ? 1 : 0
        const dim = highlight !== null && highlight !== i ? 1 : 0
        r.lit += (lit - r.lit) * k
        r.dim += (dim - r.dim) * k
        paint(r)
        // la luz del estante barre despacio: los brillos corren por el oro
        r.lamp.position.x = r.lamp.target.position.x = animate ? Math.sin(t * 0.3 + i * 1.7) * W * 0.26 : 0
        if (!animate || !r.spin) return
        r.sh.positions.forEach((p, j) => {
          dummy.position.set(p.x, r.sh.y + p.y, p.z)
          dummy.rotation.set(0, r.phases[j] + t * SPIN, 0)
          dummy.updateMatrix()
          r.body.setMatrixAt(j, dummy.matrix)
        })
        r.body.instanceMatrix.needsUpdate = true
      })
    },
    pick(ray) {
      let best = null
      let bestD = Infinity
      rows.forEach((r, i) => {
        if (!ray.intersectBox(r.box, hit)) return
        const d = hit.distanceToSquared(ray.origin)
        if (d < bestD) {
          bestD = d
          best = i
        }
      })
      return best
    },
    dispose() {
      const geometries = new Set()
      const materials = new Set()
      group.traverse((o) => {
        if (o.geometry) geometries.add(o.geometry)
        if (o.material) for (const m of [].concat(o.material)) materials.add(m)
        if (o.isInstancedMesh || o.isLight) o.dispose()
      })
      geometries.forEach((g) => g.dispose())
      materials.forEach((m) => m.dispose())
      textures.forEach((t) => t.dispose())
      group.clear()
    },
  }
}
