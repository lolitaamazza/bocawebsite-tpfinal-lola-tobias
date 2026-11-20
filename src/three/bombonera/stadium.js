import * as THREE from 'three'
import {
  AISLE_FRACTIONS,
  FLAT,
  HX,
  HZ,
  OUTER,
  PALCO_RAIL,
  PITCH,
  ROOF,
  SEAT,
  TIERS,
  TUNNEL,
  ZONES,
  alongCurve,
  curveLength,
  palcoFloor,
  palcoFront,
  pathSamples,
  seatLayout,
  sectionById,
} from './layout'
import { pitchTexture } from './pitchTexture'

/**
 * Estética nocturna arquitectónica (inspirada en el Reel de ticketing 3D y
 * adaptada a La Bombonera): fondo negro profundo para el mapa cenital, butacas
 * azul rey satinadas, anillo cálido terracota/oro en palcos y suites, y cintas
 * LED tipográficas con precios por bandeja.
 */
export const LOOK = {
  background: '#03050a',
  exposure: 1.12,
  zenith: '#02040a',
  horizon: '#101d3f',
  haze: '#2b1f30',
  concrete: '#182032',
  concreteDark: '#0c101b',
  azul: '#193788',
  azulVivo: '#2452cc',
  oro: '#f0c057',
  oroHondo: '#d69840',
  terracota: '#b86838',
  camel: '#cf8852',
  apron: '#17381c',
  ground: '#03050a',
  flood: '#eef3ff',
  warm: '#ffb668',
}

/** Color de las butacas por bandeja: azul rey en baja y platea, camel/oro cálido en suites/palcos, azul profundo en alta */
const TIER_COLORS = {
  baja: '#2554d4',
  media: '#d9934c',
  alta: '#1c3e9c',
  platea: '#2554d4',
  palcos: '#d48a4e',
}

/** Azar con semilla: la misma tribuna en cada carga */
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Barre un perfil (puntos [d, y] con el rol de cada tramo) a lo largo de un
 * camino de muestras { x, z, nx, nz }: cada tramo del perfil es una cinta.
 */
function sweep(samples, profile, colorOf) {
  const segs = profile.length - 1
  const quads = segs * (samples.length - 1)
  const pos = new Float32Array(quads * 18)
  const col = new Float32Array(quads * 18)
  let o = 0
  const put = (s, d, y, c) => {
    pos[o] = s.x + s.nx * d
    pos[o + 1] = y
    pos[o + 2] = s.z + s.nz * d
    col[o] = c.r
    col[o + 1] = c.g
    col[o + 2] = c.b
    o += 3
  }
  for (let j = 0; j < segs; j++) {
    const [d0, y0] = profile[j].p
    const [d1, y1] = profile[j + 1].p
    const c = colorOf(profile[j].role)
    for (let i = 0; i < samples.length - 1; i++) {
      const a = samples[i]
      const b = samples[i + 1]
      put(a, d0, y0, c)
      put(b, d0, y0, c)
      put(b, d1, y1, c)
      put(a, d0, y0, c)
      put(b, d1, y1, c)
      put(a, d1, y1, c)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.computeVertexNormals()
  return g
}

/**
 * Cinta con coordenadas UV orientadas hacia la cancha para envolver cenefas LED
 * con tipografía legible de izquierda a derecha desde el interior del estadio.
 */
function sweepRibbonUV(samples, d, y0, y1, repeats = 6) {
  const n = samples.length - 1
  const pos = new Float32Array(n * 18)
  const uv = new Float32Array(n * 12)
  let total = 0
  const dists = [0]
  for (let i = 0; i < n; i++) {
    const a = samples[i]
    const b = samples[i + 1]
    total += Math.hypot(b.x + b.nx * d - (a.x + a.nx * d), b.z + b.nz * d - (a.z + a.nz * d))
    dists.push(total)
  }
  let po = 0
  let uo = 0
  const put = (s, y, u, v) => {
    pos[po++] = s.x + s.nx * d
    pos[po++] = y
    pos[po++] = s.z + s.nz * d
    uv[uo++] = u
    uv[uo++] = v
  }
  for (let i = 0; i < n; i++) {
    const a = samples[i]
    const b = samples[i + 1]
    // Invertimos U porque mirando desde la cancha hacia la tribuna, la izquierda es mayor índice de sample
    const u0 = (1 - dists[i] / Math.max(1, total)) * repeats
    const u1 = (1 - dists[i + 1] / Math.max(1, total)) * repeats
    put(a, y0, u0, 0)
    put(b, y0, u1, 0)
    put(b, y1, u1, 1)
    put(a, y0, u0, 0)
    put(b, y1, u1, 1)
    put(a, y1, u0, 1)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.computeVertexNormals()
  return g
}

/** Geometría de cinta 3D gruesa para el borde luminoso de selección de sector (estilo Reel) */
function buildOutlineRibbonGeometry(pts, halfWidth = 0.34) {
  if (!pts || pts.length < 3) return new THREE.BufferGeometry()
  let cx = 0
  let cy = 0
  let cz = 0
  for (const [x, y, z] of pts) {
    cx += x
    cy += y
    cz += z
  }
  cx /= pts.length
  cy /= pts.length
  cz /= pts.length

  const n = pts.length - 1
  const pos = new Float32Array(n * 18)
  let o = 0
  const expand = ([x, y, z], s) => {
    const dx = x - cx
    const dz = z - cz
    const len = Math.hypot(dx, dz) || 1
    return [x + (dx / len) * s, y + 0.22, z + (dz / len) * s]
  }
  const put = (p) => {
    pos[o++] = p[0]
    pos[o++] = p[1]
    pos[o++] = p[2]
  }
  for (let i = 0; i < n; i++) {
    const aIn = expand(pts[i], -halfWidth * 0.4)
    const aOut = expand(pts[i], halfWidth)
    const bIn = expand(pts[i + 1], -halfWidth * 0.4)
    const bOut = expand(pts[i + 1], halfWidth)
    put(aIn)
    put(bIn)
    put(bOut)
    put(aIn)
    put(bOut)
    put(aOut)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}

/** Perfil escalonado: baranda, escalones y fondo. */
function stepProfile(t, { first }) {
  const pts = [
    { p: [t.d0, first ? 0 : t.y0 - t.lip], role: 'lip' },
    { p: [t.d0, t.y0], role: 'tread' },
  ]
  for (let k = 0; k < t.rows; k++) {
    const d = t.d0 + (k + 1) * t.tread
    const y = t.y0 + k * t.riser
    if (k < t.rows - 1) {
      pts.push({ p: [d, y], role: 'riser' }, { p: [d, y + t.riser], role: 'tread' })
    } else pts.push({ p: [d, y], role: 'back' })
  }
  if (first) pts.push({ p: [t.dEnd, 0], role: 'back' })
  else pts.push({ p: [t.dEnd, t.top - 2], role: 'soffit' }, { p: [t.d0, t.y0 - t.lip], role: 'soffit' })
  return pts
}

/**
 * Butaca 3D esculpida para las 30.000+ instancias: asiento con espesor,
 * respaldo ergonómico inclinado y laterales.
 */
function seatGeometry() {
  const w = SEAT * 0.43
  const v = []
  const idx = []
  const box = (x0, y0, z0, x1, y1, z1) => {
    const base = v.length / 3
    v.push(
      x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1,
      x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0,
      x0, y1, z1, x1, y1, z1, x1, y1, z0, x0, y1, z0,
      x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1,
      x1, y0, z1, x1, y0, z0, x1, y1, z0, x1, y1, z1,
      x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0,
    )
    for (let f = 0; f < 6; f++) {
      const o = base + f * 4
      idx.push(o, o + 1, o + 2, o, o + 2, o + 3)
    }
  }
  box(-w, 0.36, -0.17, w, 0.44, 0.19)
  box(-w, 0.44, -0.22, w, 0.9, -0.13)
  box(-w * 0.9, 0.9, -0.23, w * 0.9, 0.96, -0.14)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** Silueta redondeada con bisel suave para los sillones VIP en primer plano del POV */
function roundedBackrestGeometry(width = 0.46, height = 0.56, depth = 0.08, radius = 0.085) {
  const shape = new THREE.Shape()
  const hw = width / 2
  const r = Math.min(radius, hw * 0.45, height * 0.35)
  shape.moveTo(-hw + r, 0)
  shape.lineTo(hw - r, 0)
  shape.quadraticCurveTo(hw, 0, hw, r)
  shape.lineTo(hw * 0.96, height - r)
  shape.quadraticCurveTo(hw * 0.96, height, hw * 0.96 - r, height)
  shape.lineTo(-hw * 0.96 + r, height)
  shape.quadraticCurveTo(-hw * 0.96, height, -hw * 0.96, height - r)
  shape.lineTo(-hw, r)
  shape.quadraticCurveTo(-hw, 0, -hw + r, 0)

  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.024,
    bevelThickness: 0.024,
  })
  g.center()
  return g
}

const HERO_BACK_GEO = roundedBackrestGeometry(0.46, 0.54, 0.075, 0.09)
const HERO_INNER_GEO = roundedBackrestGeometry(0.38, 0.44, 0.04, 0.065)

/**
 * Sillón VIP de alta definición para el primer plano (POV desde la butaca,
 * idéntico a los tres respaldos redondeados camel/azul del Reel).
 */
function buildHeroChairGroup(cushionMat, frameMat, plaqueMat) {
  const chair = new THREE.Group()
  // Asiento acolchado
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.11, 0.44), cushionMat)
  seat.position.set(0, 0.42, 0.03)
  // Respaldo redondeado con bisel suave e inclinación ergonómica
  const backrest = new THREE.Mesh(HERO_BACK_GEO, cushionMat)
  backrest.position.set(0, 0.72, -0.18)
  backrest.rotation.x = -0.11
  // Paño interior con costura en la espalda del sillón
  const innerPanel = new THREE.Mesh(HERO_INNER_GEO, cushionMat)
  innerPanel.position.set(0, 0.71, -0.21)
  innerPanel.rotation.x = -0.11
  // Apoyabrazos laterales inclinados (como los sillones del Reel)
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.055, 0.42), frameMat)
    arm.position.set(s * 0.27, 0.58, 0.01)
    arm.rotation.x = 0.06
    const sideFin = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.42, 0.14), cushionMat)
    sideFin.position.set(s * 0.265, 0.52, -0.1)
    sideFin.rotation.x = -0.08
    chair.add(arm, sideFin)
  }
  // Cápsula oscura e insignia dorada en la base trasera del respaldo (igual al Reel)
  const badgeBase = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.055, 0.02), frameMat)
  badgeBase.position.set(0, 0.51, -0.238)
  badgeBase.rotation.x = -0.11
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.032, 0.024), plaqueMat)
  plaque.position.set(0.06, 0.51, -0.24)
  plaque.rotation.x = -0.11
  chair.add(seat, backrest, innerPanel, badgeBase, plaque)
  return chair
}

/** Textura tipográfica para las cenefas LED perimetrales y frentes de bandeja */
function fasciaTexture(text, { bg = '#151b29', fg = '#eef2fa', accent = '#f0c057' } = {}) {
  const c = document.createElement('canvas')
  c.width = 2048
  c.height = 128
  const ctx = c.getContext('2d')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.fillStyle = 'rgba(255,255,255,0.16)'
  ctx.fillRect(0, 0, c.width, 4)
  ctx.fillStyle = accent
  ctx.fillRect(0, c.height - 6, c.width, 6)

  ctx.font = '800 46px "Archivo Variable", "Arial Narrow", sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = fg
  const full = `${text}     •     ${text}`
  ctx.fillText(full, 36, c.height / 2 + 2)

  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.ClampToEdgeWrapping
  return t
}

/** Textura arquitectónica para las paredes del túnel de jugadores (estilo Reel) */
function tunnelWallTexture(side = 'left') {
  const c = document.createElement('canvas')
  c.width = 2048
  c.height = 512
  const ctx = c.getContext('2d')

  // Pared superior azul marino mate
  ctx.fillStyle = '#0c1a3b'
  ctx.fillRect(0, 0, c.width, c.height)

  // Líneas doradas finas horizontales
  ctx.fillStyle = '#f0c057'
  ctx.fillRect(0, 26, c.width, 5)
  ctx.fillRect(0, 314, c.width, 6)
  ctx.fillStyle = 'rgba(240,192,87,0.4)'
  ctx.fillRect(0, 326, c.width, 2)

  // Paneles acolchados inferiores en azul intenso
  const padGrad = ctx.createLinearGradient(0, 330, 0, 512)
  padGrad.addColorStop(0, '#1e429c')
  padGrad.addColorStop(1, '#0e2254')
  ctx.fillStyle = padGrad
  ctx.fillRect(0, 330, c.width, 182)
  ctx.fillStyle = 'rgba(4,9,22,0.65)'
  for (let x = 0; x < c.width; x += 128) {
    ctx.fillRect(x, 330, 5, 182)
  }

  // Tipografía monumental blanca ubicada exactamente en el cono visual de la cámara del túnel
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'middle'
  if (side === 'left') {
    // En tunnelLeft (rotation.y = +PI/2): x=0..650 está hacia la cancha; x=680..1250 está junto a la cámara
    ctx.font = '800 56px "Anton", "Arial Narrow", sans-serif'
    ctx.fillText('1977    1978    2000    2003', 55, 132)
    ctx.fillStyle = '#f0c057'
    ctx.font = '700 24px "JetBrains Mono", monospace'
    ctx.fillText('CAMPEÓN DEL MUNDO  •  CAMPEÓN DE AMÉRICA', 55, 226)
    ctx.fillStyle = '#ffffff'
    ctx.font = '900 144px "Anton", "Arial Narrow", sans-serif'
    ctx.fillText('BOCA JUNIORS', 660, 162)
  } else {
    // En tunnelRight (rotation.y = -PI/2): x=800..1380 está junto a la cámara; x=1400..1990 está hacia la cancha
    ctx.font = '900 144px "Anton", "Arial Narrow", sans-serif'
    ctx.fillText('BOMBONERA', 820, 162)
    ctx.font = '800 56px "Anton", "Arial Narrow", sans-serif'
    ctx.fillText('2007    2003    2001    1978', 1430, 132)
    ctx.fillStyle = '#f0c057'
    ctx.font = '700 24px "JetBrains Mono", monospace'
    ctx.fillText('COPA LIBERTADORES  •  ESTADIO A. J. ARMANDO', 1430, 226)
  }

  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Textura para el tablero LED colgante / Jumbotron (vista hacia el techo del Reel) */
function scoreboardTexture() {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 512
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#060c1c'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.strokeStyle = '#f0c057'
  ctx.lineWidth = 8
  ctx.strokeRect(16, 16, c.width - 32, c.height - 32)

  ctx.fillStyle = '#f0c057'
  ctx.font = '700 28px "JetBrains Mono", monospace'
  ctx.textAlign = 'center'
  ctx.fillText('ESTADIO ALBERTO J. ARMANDO · LA BOCA', c.width / 2, 105)

  ctx.fillStyle = '#ffffff'
  ctx.font = '900 112px "Anton", "Arial Narrow", sans-serif'
  ctx.fillText('BOCA JUNIORS', c.width / 2, 255)

  ctx.fillStyle = '#b9c8ec'
  ctx.font = '700 34px "JetBrains Mono", monospace'
  ctx.fillText('ESTA NOCHE 21:00 HS  •  TICKETS 3D', c.width / 2, 375)

  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Mancha radial para el halo de los reflectores */
function dotTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.18, 'rgba(255,255,255,0.55)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`
const SKY_FRAG = /* glsl */ `
uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uHaze;
varying vec3 vDir;
void main() {
  float h = clamp(vDir.y, 0.0, 1.0);
  vec3 c = mix(uHorizon, uZenith, pow(h, 0.45));
  c = mix(c, uHaze, exp(-h * 18.0) * 0.55);
  gl_FragColor = vec4(c, 1.0);
}`

/* flashes sutiles en la tribuna alta */
const PHONE_VERT = /* glsl */ `
uniform float uTime; uniform float uScale;
attribute float phase;
varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float w = sin(uTime * (0.6 + fract(phase * 7.31) * 1.4) + phase * 6.2831);
  vA = smoothstep(0.45, 1.0, w) * smoothstep(8.0, 16.0, -mv.z);
  gl_PointSize = clamp(0.32 * uScale / -mv.z, 1.2, 8.0);
}`
const PHONE_FRAG = /* glsl */ `
varying float vA;
void main() {
  float r = length(gl_PointCoord - 0.5);
  if (r > 0.5 || vA < 0.01) discard;
  gl_FragColor = vec4(vec3(1.0, 0.96, 0.86) * vA * (1.0 - r * 1.7), 1.0);
}`

/**
 * Arma la Bombonera con el túnel de salida, suites cálidas, cenefas LED
 * tipográficas, resaltado 3D de secciones en hover y butacas hero en primer plano.
 */
export function buildStadium(renderer) {
  const group = new THREE.Group()
  group.name = 'bombonera'
  const textures = []
  const pickables = []
  const seatBeacons = []
  const color = (c) => new THREE.Color(c)
  const add = (mesh, pick = false) => {
    group.add(mesh)
    if (pick) pickables.push(mesh)
    return mesh
  }
  const std = (opts) => new THREE.MeshStandardMaterial({ roughness: 0.65, metalness: 0.08, ...opts })
  const lambert = (opts) => new THREE.MeshLambertMaterial(opts)

  /* ── cielo, estrellas, suelo y el barrio ── */
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1800, 32, 16),
    new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      uniforms: { uZenith: { value: color(LOOK.zenith) }, uHorizon: { value: color(LOOK.horizon) }, uHaze: { value: color(LOOK.haze) } },
      side: THREE.BackSide,
      depthWrite: false,
    }),
  )
  sky.renderOrder = -1
  add(sky)

  const rand = rng(1940)
  const starPos = []
  for (let i = 0; i < 650; i++) {
    const u = rand() * Math.PI * 2
    const v = 0.14 + rand() * 0.86
    const r = Math.sqrt(1 - v * v)
    starPos.push(Math.cos(u) * r * 1600, v * 1600, Math.sin(u) * r * 1600)
  }
  const stars = new THREE.BufferGeometry()
  stars.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3))
  add(new THREE.Points(stars, new THREE.PointsMaterial({ color: '#9fb2e0', size: 1.5, sizeAttenuation: false, depthWrite: false })))

  // Separación clara en Y entre suelo, perímetro (apron) y cancha para evitar z-fighting desde 240m
  const ground = new THREE.Mesh(new THREE.CircleGeometry(1500, 48), lambert({ color: LOOK.ground }))
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.55
  add(ground)

  const dummy = new THREE.Object3D()
  const tint = new THREE.Color()

  /* ── el campo y las cintas LED perimetrales ── */
  const apron = new THREE.Mesh(
    new THREE.PlaneGeometry(2 * HX + 2, 2 * HZ + 2),
    std({ color: LOOK.apron, roughness: 0.85, metalness: 0.02 }),
  )
  apron.rotation.x = -Math.PI / 2
  apron.position.y = -0.22
  add(apron)

  const pitchMap = pitchTexture(renderer)
  textures.push(pitchMap)
  const pitch = new THREE.Mesh(
    new THREE.PlaneGeometry(PITCH.length, PITCH.width),
    std({ map: pitchMap, roughness: 0.68, metalness: 0.04 }),
  )
  pitch.rotation.x = -Math.PI / 2
  add(pitch)

  // Arcos y redes
  const white = std({ color: '#f4f4ee', emissive: '#383d46', roughness: 0.3 })
  const net = new THREE.MeshBasicMaterial({ color: '#dfe6f0', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
  for (const s of [-1, 1]) {
    const x = (s * PITCH.length) / 2
    const gw = PITCH.goalWidth
    const gh = PITCH.goalHeight
    for (const z of [-gw / 2, gw / 2]) {
      const post = add(new THREE.Mesh(new THREE.BoxGeometry(0.12, gh, 0.12), white))
      post.position.set(x, gh / 2, z)
    }
    const bar = add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, gw + 0.12), white))
    bar.position.set(x, gh, 0)
    const back = add(new THREE.Mesh(new THREE.PlaneGeometry(gw, gh * 1.05), net))
    back.rotation.y = Math.PI / 2
    back.position.set(x + s * 2, gh / 2, 0)
    const topNet = add(new THREE.Mesh(new THREE.PlaneGeometry(2, gw), net))
    topNet.rotation.x = -Math.PI / 2
    topNet.position.set(x + s, gh, 0)
  }

  /* ── El Túnel de Salida a la Cancha (Intro del Reel, auto-iluminado para máxima nitidez) ── */
  const leftWallTex = tunnelWallTexture('left')
  const rightWallTex = tunnelWallTexture('right')
  textures.push(leftWallTex, rightWallTex)

  const tunnelLeft = add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(TUNNEL.length, TUNNEL.height),
      std({
        map: leftWallTex,
        emissiveMap: leftWallTex,
        emissive: color('#dce6ff'),
        emissiveIntensity: 0.78,
        roughness: 0.42,
        metalness: 0.08,
      }),
    ),
  )
  tunnelLeft.rotation.y = Math.PI / 2
  tunnelLeft.position.set(-TUNNEL.width / 2, TUNNEL.height / 2, (TUNNEL.z0 + TUNNEL.z1) / 2)

  const tunnelRight = add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(TUNNEL.length, TUNNEL.height),
      std({
        map: rightWallTex,
        emissiveMap: rightWallTex,
        emissive: color('#dce6ff'),
        emissiveIntensity: 0.78,
        roughness: 0.42,
        metalness: 0.08,
      }),
    ),
  )
  tunnelRight.rotation.y = -Math.PI / 2
  tunnelRight.position.set(TUNNEL.width / 2, TUNNEL.height / 2, (TUNNEL.z0 + TUNNEL.z1) / 2)

  // Piso gris pulido con reflejos especulares en el túnel
  const tunnelFloor = add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(TUNNEL.width, TUNNEL.length + 2),
      std({ color: '#242d3f', emissive: '#121826', roughness: 0.18, metalness: 0.25 }),
    ),
  )
  tunnelFloor.rotation.x = -Math.PI / 2
  tunnelFloor.position.set(0, 0.01, (TUNNEL.z0 + TUNNEL.z1) / 2 + 0.8)

  // Techo oscuro y tiras LED blancas transversales
  const tunnelCeiling = add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(TUNNEL.width, TUNNEL.length),
      std({ color: '#080d18', emissive: '#050811', roughness: 0.8 }),
    ),
  )
  tunnelCeiling.rotation.x = Math.PI / 2
  tunnelCeiling.position.set(0, TUNNEL.height, (TUNNEL.z0 + TUNNEL.z1) / 2)

  const ledStripMat = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false })
  const floorReflectionMat = new THREE.MeshBasicMaterial({
    color: '#c2d6ff',
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  })
  for (let i = 0; i < 6; i++) {
    const tz = TUNNEL.z1 + 2.2 + i * 2.7
    const strip = add(new THREE.Mesh(new THREE.BoxGeometry(TUNNEL.width * 0.78, 0.08, 0.16), ledStripMat))
    strip.position.set(0, TUNNEL.height - 0.04, tz)
    const refl = add(new THREE.Mesh(new THREE.PlaneGeometry(TUNNEL.width * 0.72, 0.65), floorReflectionMat))
    refl.rotation.x = -Math.PI / 2
    refl.position.set(0, 0.02, tz)
  }

  /* ── la U: tres bandejas, pasillos radiales, suites cálidas y cenefas LED ── */
  const samples = pathSamples(1.5)
  const standMat = std({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.72, metalness: 0.06 })
  const roleColors = (tierId) => {
    const isMedia = tierId === 'media'
    const accent = color(isMedia ? LOOK.terracota : TIER_COLORS[tierId])
    return {
      lip: color('#151c2c'),
      tread: isMedia ? color('#3b2519') : accent.clone().multiplyScalar(0.24),
      riser: isMedia ? color('#24160f') : color(LOOK.concreteDark),
      back: isMedia ? color('#7a4424') : color(LOOK.concrete),
      soffit: isMedia ? color('#2a1a12') : color(LOOK.concreteDark).multiplyScalar(0.85),
      wall: color(LOOK.concrete),
      roof: color('#0b0f19'),
      facade: color(LOOK.azul).multiplyScalar(0.55),
    }
  }
  TIERS.forEach((t, i) => {
    const colors = roleColors(t.id)
    add(new THREE.Mesh(sweep(samples, stepProfile(t, { first: i === 0 }), (r) => colors[r]), standMat), true)
  })

  // Cenefas LED tipográficas en el borde de la cancha y de cada bandeja (como en el Reel)
  const pitchFasciaTex = fasciaTexture('PLATEA BAJA  DESDE $85.000     •     LA BOMBONERA     •     POPULAR LA 12  DESDE $36.000', {
    bg: '#111726',
    fg: '#f2f5fc',
    accent: '#f0c057',
  })
  const mediaFasciaTex = fasciaTexture('BANDEJA MEDIA  DESDE $44.000     •     CLUB ATLÉTICO BOCA JUNIORS     •     SUITES & PLATEAS', {
    bg: '#1d2436',
    fg: '#ffffff',
    accent: '#d9934c',
  })
  const altaFasciaTex = fasciaTexture('BANDEJA ALTA  DESDE $28.000     •     ESTADIO ALBERTO J. ARMANDO     •     LA BOCA 1940', {
    bg: '#161d2e',
    fg: '#e4eaf7',
    accent: '#2554d4',
  })
  textures.push(pitchFasciaTex, mediaFasciaTex, altaFasciaTex)

  const fasciaMat = (tex) =>
    new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.DoubleSide,
    })

  // Cinta LED al pie de la Bandeja Baja
  add(new THREE.Mesh(sweepRibbonUV(samples, -0.06, 0.05, 1.18, 7), fasciaMat(pitchFasciaTex)))
  // Cinta LED frente de Bandeja Media
  add(new THREE.Mesh(sweepRibbonUV(samples, TIERS[1].d0 - 0.06, TIERS[1].y0 - TIERS[1].lip, TIERS[1].y0, 8), fasciaMat(mediaFasciaTex)))
  // Cinta LED frente de Bandeja Alta
  add(new THREE.Mesh(sweepRibbonUV(samples, TIERS[2].d0 - 0.06, TIERS[2].y0 - TIERS[2].lip, TIERS[2].y0, 9), fasciaMat(altaFasciaTex)))

  // Anillo cálido de Suites / Palcos en Bandeja Media (madera/terracota iluminada con tabiques, como en el Reel)
  const tMedia = TIERS[1]
  const suiteWallMat = std({ color: '#b56638', emissive: '#4d250e', roughness: 0.55 })
  const suiteGlowMat = new THREE.MeshBasicMaterial({ color: '#ffd096', toneMapped: false })
  add(new THREE.Mesh(sweepRibbonUV(samples, tMedia.dEnd - 0.12, tMedia.y0 + 1.5, tMedia.top + 2.1, 1), suiteWallMat))
  add(new THREE.Mesh(sweepRibbonUV(samples, tMedia.dEnd - 0.3, tMedia.top + 1.9, tMedia.top + 2.15, 1), suiteGlowMat))

  // Tabiques divisorios entre suites en la Bandeja Media
  const LMedia = curveLength((tMedia.d0 + tMedia.dEnd) / 2)
  const suitePartitions = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 3.2, tMedia.dEnd - tMedia.d0), suiteWallMat, 36)
  for (let i = 0; i < 36; i++) {
    const p = alongCurve(((i + 0.5) / 36) * LMedia, (tMedia.d0 + tMedia.dEnd) / 2)
    dummy.position.set(p.x, (tMedia.y0 + tMedia.top) / 2 + 0.8, p.z)
    dummy.rotation.set(0, Math.atan2(-p.nx, -p.nz), 0)
    dummy.scale.set(1, 1, 1)
    dummy.updateMatrix()
    suitePartitions.setMatrixAt(i, dummy.matrix)
  }
  add(suitePartitions)

  // Pasillos radiales entre los 9 bloques de la U
  const aisleMat = std({ color: '#27314a', emissive: '#0c1222', roughness: 0.7 })
  TIERS.forEach((t) => {
    const len = t.dEnd - t.d0
    const dy = t.top - t.y0
    const hyp = Math.hypot(len, dy)
    const tilt = Math.atan2(dy, len)
    const midD = (t.d0 + t.dEnd) / 2
    const L = curveLength(midD)
    AISLE_FRACTIONS.forEach((u) => {
      const p = alongCurve(u * L, midD)
      const ramp = add(new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.14, hyp), aisleMat))
      ramp.position.set(p.x, (t.y0 + t.top) / 2 + 0.25, p.z)
      ramp.rotation.order = 'YXZ'
      ramp.rotation.y = Math.atan2(-p.nx, -p.nz)
      ramp.rotation.x = tilt
    })
  })

  const top = TIERS.at(-1)
  const shellColors = roleColors('alta')
  add(
    new THREE.Mesh(
      sweep(
        samples,
        [
          { p: [top.dEnd, top.top], role: 'wall' },
          { p: [top.dEnd, ROOF], role: 'roof' },
          { p: [OUTER, ROOF], role: 'facade' },
          { p: [OUTER, 0], role: 'facade' },
        ],
        (r) => shellColors[r],
      ),
      standMat,
    ),
  )
  const concrete = std({ color: LOOK.concrete, roughness: 0.8 })
  for (const s of [-1, 1]) {
    const wing = add(new THREE.Mesh(new THREE.BoxGeometry(OUTER, ROOF, FLAT.back), concrete))
    wing.position.set(s * (HX + OUTER / 2), ROOF / 2, -HZ - FLAT.back / 2)
  }

  /* ── el lado recto: platea (con portal del túnel), palcos VIP cálidos y techo ── */
  const P = FLAT.platea
  const plateaProfile = stepProfile({ ...P, dEnd: P.dEnd, top: P.top }, { first: true }).slice(0, -1)
  plateaProfile.push({ p: [P.dEnd, palcoFloor(0)], role: 'back' })
  const flatColors = roleColors('platea')
  for (const seg of [
    [-HX, -TUNNEL.width / 2],
    [TUNNEL.width / 2, HX],
  ]) {
    const subPath = [
      { x: seg[0], z: -HZ, nx: 0, nz: -1 },
      { x: seg[1], z: -HZ, nx: 0, nz: -1 },
    ]
    add(new THREE.Mesh(sweep(subPath, plateaProfile, (r) => flatColors[r]), standMat), true)
  }
  const bridgePath = [
    { x: -TUNNEL.width / 2, z: -HZ, nx: 0, nz: -1 },
    { x: TUNNEL.width / 2, z: -HZ, nx: 0, nz: -1 },
  ]
  const bridgeProfile = [
    { p: [P.d0 + 7 * P.tread, TUNNEL.height], role: 'lip' },
    { p: [P.d0 + 7 * P.tread, P.y0 + 7 * P.riser], role: 'tread' },
    { p: [P.dEnd, P.top], role: 'tread' },
    { p: [P.dEnd, palcoFloor(0)], role: 'back' },
  ]
  add(new THREE.Mesh(sweep(bridgePath, bridgeProfile, (r) => flatColors[r]), standMat), true)

  // Palcos VIP ("La Caja de Bombones"): interior cálido en madera/terracota, tabiques y luz indirecta
  const L = FLAT.palcos
  const span = 2 * HX
  const palcoFasciaTex = fasciaTexture('PALCOS VIP LADO RECTO  DESDE $140.000     •     LA CAJA DE BOMBONES     •     BOCA JUNIORS', {
    bg: '#171e30',
    fg: '#f6f7fb',
    accent: '#f0c057',
  })
  textures.push(palcoFasciaTex)
  const palcoFasciaMat = fasciaMat(palcoFasciaTex)
  const stripe = std({ color: LOOK.oro, emissive: '#4a2e08', roughness: 0.35, metalness: 0.3 })
  const glass = new THREE.MeshStandardMaterial({
    color: '#c2d6f2',
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    roughness: 0.15,
    metalness: 0.2,
    emissive: '#3d2610',
  })
  const interior = std({ color: '#c4723e', emissive: '#6e3714', roughness: 0.55 })
  const slabMat = std({ color: LOOK.concreteDark, roughness: 0.75 })
  const partitionMat = std({ color: '#9c552a', emissive: '#3d1c08', roughness: 0.5 })
  const mullions = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.16, 1, L.depth),
    partitionMat,
    (L.perLevel + 1) * L.levels,
  )
  let mi = 0
  for (let l = 0; l < L.levels; l++) {
    const y = palcoFloor(l)
    const front = palcoFront(l)
    const z = (d) => -HZ - d
    const slab = add(new THREE.Mesh(new THREE.BoxGeometry(span, 0.32, FLAT.back - front + 0.4), slabMat))
    slab.position.set(0, y - 0.16, z((front - 0.4 + FLAT.back) / 2))

    const bandGeo = new THREE.BoxGeometry(span, PALCO_RAIL, 0.26)
    const band = add(new THREE.Mesh(bandGeo, l % 2 === 0 ? palcoFasciaMat : slabMat), true)
    band.position.set(0, y + PALCO_RAIL / 2, z(front))

    const line = add(new THREE.Mesh(new THREE.BoxGeometry(span, 0.09, 0.3), stripe))
    line.position.set(0, y + PALCO_RAIL - 0.08, z(front))

    const cove = add(new THREE.Mesh(new THREE.BoxGeometry(span * 0.98, 0.08, 0.22), suiteGlowMat))
    cove.position.set(0, y + L.height - 0.24, z(front + 1.15))

    const glassH = L.height - PALCO_RAIL - 0.35
    const pane = add(new THREE.Mesh(new THREE.PlaneGeometry(span, glassH), glass), true)
    pane.position.set(0, y + PALCO_RAIL + glassH / 2, z(front + 0.12))
    pane.renderOrder = 2

    const wall = add(new THREE.Mesh(new THREE.PlaneGeometry(span, L.height), interior))
    wall.position.set(0, y + L.height / 2, z(front + L.depth))

    for (let b = 0; b <= L.perLevel; b++) {
      dummy.position.set(-HX + b * L.width, y + PALCO_RAIL + (L.height - PALCO_RAIL) / 2, z(front + L.depth / 2))
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(1, L.height - PALCO_RAIL, 1)
      dummy.updateMatrix()
      mullions.setMatrixAt(mi++, dummy.matrix)
    }
  }
  add(mullions)
  const roofSlab = add(new THREE.Mesh(new THREE.BoxGeometry(span, 0.6, FLAT.back - palcoFront(L.levels) + 0.6), slabMat))
  roofSlab.position.set(0, FLAT.roof + 0.3, -HZ - (palcoFront(L.levels) - 0.6 + FLAT.back) / 2)
  // Dividimos la pared de fondo bajo el nivel de palcos para no cortar el túnel central
  const backWallTop = add(new THREE.Mesh(new THREE.BoxGeometry(span, FLAT.roof + 0.6 - TUNNEL.height, 0.6), concrete))
  backWallTop.position.set(0, TUNNEL.height + (FLAT.roof + 0.6 - TUNNEL.height) / 2, -HZ - FLAT.back)

  /* ── butacas 3D esculpidas ── */
  const seats = seatLayout()
  const seatMesh = new THREE.InstancedMesh(
    seatGeometry(),
    std({ side: THREE.DoubleSide, roughness: 0.36, metalness: 0.08 }),
    seats.count,
  )
  const phones = []
  const phase = []
  for (let i = 0; i < seats.count; i++) {
    const x = seats.positions[3 * i]
    const y = seats.positions[3 * i + 1]
    const z = seats.positions[3 * i + 2]
    const zInfo = ZONES[seats.zone[i]]
    const isSuite = zInfo.tier === 'palcos' || zInfo.tier === 'media'
    dummy.position.set(x, y, z)
    dummy.rotation.set(0, seats.yaw[i], 0)
    dummy.scale.set(isSuite ? 1.12 : 1, isSuite ? 1.08 : 1, isSuite ? 1.12 : 1)
    dummy.updateMatrix()
    seatMesh.setMatrixAt(i, dummy.matrix)
    seatMesh.setColorAt(i, tint.set(TIER_COLORS[zInfo.tier]).multiplyScalar(0.88 + rand() * 0.18))
    if (rand() < 0.015) {
      phones.push(x, y + 1.15, z)
      phase.push(rand())
    }
  }
  add(seatMesh)

  const halo = dotTexture()
  textures.push(halo)
  const phoneGeo = new THREE.BufferGeometry()
  phoneGeo.setAttribute('position', new THREE.Float32BufferAttribute(phones, 3))
  phoneGeo.setAttribute('phase', new THREE.Float32BufferAttribute(phase, 1))
  const phoneMat = new THREE.ShaderMaterial({
    vertexShader: PHONE_VERT,
    fragmentShader: PHONE_FRAG,
    uniforms: { uTime: { value: 0 }, uScale: { value: 400 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  add(new THREE.Points(phoneGeo, phoneMat))

  /* ── Cerchas blancas iluminadas y Tableros LED / Jumbotron ── */
  const trussMat = std({ color: '#cfd8eb', emissive: '#28334a', roughness: 0.4, metalness: 0.35 })
  const dRoof = top.dEnd + 0.6
  const nU = Math.floor(curveLength(dRoof) / 8)
  const lights = []
  for (let i = 0; i < nU; i++) {
    const p = alongCurve(((i + 0.5) / nU) * curveLength(dRoof), dRoof)
    const yaw = Math.atan2(-p.nx, -p.nz)
    lights.push([p.x, ROOF + 1.6, p.z, yaw])
    const beam = add(new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.7, 7.5), trussMat))
    beam.position.set(p.x - p.nx * 2.4, ROOF + 2.1, p.z - p.nz * 2.4)
    beam.rotation.y = yaw
  }
  for (let x = -HX + 4; x <= HX - 4; x += 9) {
    lights.push([x, FLAT.roof + 1.6, -HZ - palcoFront(L.levels) - 0.4, 0])
  }

  // Jumbotron central suspendido: visible desde las gradas/cancha, oculto en el mapa cenital (igual que en el Reel)
  const scoreTex = scoreboardTexture()
  textures.push(scoreTex)
  const scoreScreenMat = new THREE.MeshBasicMaterial({ map: scoreTex, toneMapped: false })
  const scoreFrameMat = std({ color: '#0c111d', roughness: 0.5, metalness: 0.4 })
  const jumbotron = new THREE.Group()
  jumbotron.position.set(0, ROOF + 5.5, 0)
  const coreBox = new THREE.Mesh(new THREE.BoxGeometry(15.6, 7.6, 10.6), scoreFrameMat)
  jumbotron.add(coreBox)
  for (const s of [-1, 1]) {
    const faceZ = new THREE.Mesh(new THREE.PlaneGeometry(15.2, 7.2), scoreScreenMat)
    faceZ.position.set(0, 0, s * 5.36)
    if (s < 0) faceZ.rotation.y = Math.PI
    const faceX = new THREE.Mesh(new THREE.PlaneGeometry(10.2, 7.2), scoreScreenMat)
    faceX.position.set(s * 7.86, 0, 0)
    faceX.rotation.y = (s * Math.PI) / 2
    jumbotron.add(faceZ, faceX)
  }
  add(jumbotron)

  const panels = new THREE.InstancedMesh(
    new THREE.BoxGeometry(5.2, 1.4, 0.4),
    new THREE.MeshBasicMaterial({ color: color(LOOK.flood).multiplyScalar(2.4), toneMapped: false }),
    lights.length,
  )
  const glowPos = []
  lights.forEach(([x, y, z, yaw], i) => {
    dummy.position.set(x, y, z)
    dummy.rotation.set(-0.35, yaw, 0, 'YXZ')
    dummy.updateMatrix()
    panels.setMatrixAt(i, dummy.matrix)
    glowPos.push(x, y, z)
  })
  add(panels)
  const glowGeo = new THREE.BufferGeometry()
  glowGeo.setAttribute('position', new THREE.Float32BufferAttribute(glowPos, 3))
  add(
    new THREE.Points(
      glowGeo,
      new THREE.PointsMaterial({
        size: 18,
        map: halo,
        color: color(LOOK.flood).multiplyScalar(0.58),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    ),
  )

  /* ── Borde 3D grueso luminoso para el sector en hover / seleccionado (estilo Reel) ── */
  const outlineGroup = new THREE.Group()
  outlineGroup.visible = false
  add(outlineGroup)

  const outlineCoreMat = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.96,
    depthTest: false,
    toneMapped: false,
  })
  const outlineCoreMesh = new THREE.Mesh(new THREE.BufferGeometry(), outlineCoreMat)
  outlineCoreMesh.renderOrder = 14
  outlineGroup.add(outlineCoreMesh)

  const outlineHaloMat = new THREE.MeshBasicMaterial({
    color: '#f0c057',
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.38,
    depthTest: false,
    toneMapped: false,
  })
  const outlineHaloMesh = new THREE.Mesh(new THREE.BufferGeometry(), outlineHaloMat)
  outlineHaloMesh.renderOrder = 13
  outlineGroup.add(outlineHaloMesh)

  let currentOutlineId = null
  const setHoverSection = (sectionId) => {
    if (sectionId === currentOutlineId) return
    currentOutlineId = sectionId
    const sec = sectionId ? sectionById(sectionId) : null
    if (!sec || !sec.outline3D?.length) {
      outlineGroup.visible = false
      return
    }
    outlineCoreMesh.geometry.dispose()
    outlineHaloMesh.geometry.dispose()
    outlineCoreMesh.geometry = buildOutlineRibbonGeometry(sec.outline3D, 0.34)
    outlineHaloMesh.geometry = buildOutlineRibbonGeometry(sec.outline3D, 0.85)
    outlineGroup.visible = true
  }

  /* ── Sillones VIP Hero redondeados en primer plano para el POV de butaca ── */
  const heroGroup = new THREE.Group()
  heroGroup.visible = false
  add(heroGroup)

  const heroCushionCamel = std({ color: '#c47945', roughness: 0.44, metalness: 0.05 })
  const heroCushionBlue = std({ color: '#2452cc', roughness: 0.38, metalness: 0.08 })
  const heroFrameMat = std({ color: '#141926', roughness: 0.4, metalness: 0.45 })
  const heroPlaqueMat = std({ color: '#f0c057', emissive: '#593d0b', roughness: 0.25, metalness: 0.6 })

  const heroChairs = []
  const chairOffsets = [
    { row: 0, col: -1 },
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: -1, col: -1 },
    { row: -1, col: 0 },
    { row: -1, col: 1 },
  ]
  for (const off of chairOffsets) {
    const chair = buildHeroChairGroup(heroCushionCamel, heroFrameMat, heroPlaqueMat)
    chair.userData = off
    heroGroup.add(chair)
    heroChairs.push(chair)
  }

  // Balizas interactivas para elegir butaca individual en la vista cercana de sector
  const beaconGroup = new THREE.Group()
  beaconGroup.visible = false
  add(beaconGroup)
  const beaconGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.12, 20)
  const beaconRingGeo = new THREE.RingGeometry(0.32, 0.44, 24)
  beaconRingGeo.rotateX(-Math.PI / 2)

  for (let i = 0; i < 12; i++) {
    const holder = new THREE.Group()
    const disc = new THREE.Mesh(
      beaconGeo,
      new THREE.MeshBasicMaterial({ color: '#f0c057', transparent: true, opacity: 0.88, toneMapped: false }),
    )
    disc.position.y = 1.04
    const ring = new THREE.Mesh(
      beaconRingGeo,
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, side: THREE.DoubleSide, toneMapped: false }),
    )
    ring.position.y = 1.11
    holder.add(disc)
    holder.add(ring)
    holder.visible = false
    beaconGroup.add(holder)
    seatBeacons.push(disc)
  }

  const setFocusSeat = (seat, mode = 'aerial') => {
    if (!seat || (mode !== 'seat' && mode !== 'section' && mode !== 'fly')) {
      heroGroup.visible = false
      beaconGroup.visible = false
      return
    }
    const nx = seat.nx ?? 0
    const nz = seat.nz ?? -1
    const yaw = Math.atan2(-nx, -nz)
    const tx = -nz
    const tz = nx
    const isWarm = seat.zone === 'recta-palcos' || seat.zone?.endsWith('-media')
    const cushionMat = isWarm ? heroCushionCamel : heroCushionBlue
    const spacing = isWarm ? 0.58 : 0.54

    heroGroup.visible = true
    // En POV ('seat') colocamos la fila de 3 respaldos redondeados a 1.08m delante de la lente (idéntico al Reel)
    const povShift = mode === 'seat' ? -1.08 : 0
    const povYShift = mode === 'seat' ? -0.34 : 0
    heroChairs.forEach((chair) => {
      chair.traverse((m) => {
        if (m.isMesh && (m.material === heroCushionCamel || m.material === heroCushionBlue)) {
          m.material = cushionMat
        }
      })
      const { row, col } = chair.userData
      const dStep = row * 0.78 + povShift
      const yStep = row * 0.42 + povYShift
      chair.position.set(
        seat.x + nx * dStep + tx * (col * spacing),
        seat.y + yStep,
        seat.z + nz * dStep + tz * (col * spacing),
      )
      chair.rotation.set(0, yaw, 0)
    })

    const sec = seat.sectionId ? sectionById(seat.sectionId) : null
    if ((mode === 'section' || mode === 'fly') && sec?.featuredSeats?.length) {
      beaconGroup.visible = true
      beaconGroup.children.forEach((holder, i) => {
        const fs = sec.featuredSeats[i]
        if (!fs) {
          holder.visible = false
          return
        }
        holder.visible = true
        holder.position.set(fs.x, fs.y, fs.z)
        const isSelected = Math.hypot(fs.x - seat.x, fs.y - seat.y, fs.z - seat.z) < 0.4
        const disc = holder.children[0]
        disc.userData.seat = fs
        disc.userData.section = sec
        disc.material.color.set(isSelected ? '#ffffff' : '#f0c057')
        holder.scale.setScalar(isSelected ? 1.28 : 1)
      })
    } else {
      beaconGroup.visible = false
    }
  }

  /* ── iluminación dramática de estadio nocturno + calor en suites ── */
  group.add(new THREE.HemisphereLight('#88a2e0', '#0a140c', 0.85))
  const key = new THREE.DirectionalLight(LOOK.flood, 2.35)
  key.position.set(30, 140, 70)
  const key2 = new THREE.DirectionalLight(LOOK.flood, 1.25)
  key2.position.set(-60, 120, -40)
  const warm = new THREE.DirectionalLight(LOOK.warm, 0.85)
  warm.position.set(0, 38, -110)
  group.add(key, key2, warm)

  return {
    group,
    pickables,
    seatBeacons,
    setHoverSection,
    setFocusSeat,
    update(t, viewportHeight, cameraY = 0) {
      phoneMat.uniforms.uTime.value = t
      phoneMat.uniforms.uScale.value = viewportHeight / 2
      // En el mapa cenital alto ocultamos el Jumbotron colgante para que la cancha se vea limpia como en el Reel
      jumbotron.visible = cameraY <= ROOF + 10
      if (beaconGroup.visible) {
        const pulse = 1 + Math.sin(t * 3.8) * 0.1
        beaconGroup.children.forEach((h) => {
          if (h.visible && h.children[1]) h.children[1].scale.setScalar(pulse)
        })
      }
    },
    dispose() {
      const geometries = new Set()
      const materials = new Set()
      group.traverse((o) => {
        if (o.geometry && o.geometry !== HERO_BACK_GEO && o.geometry !== HERO_INNER_GEO) geometries.add(o.geometry)
        if (o.material) for (const m of [].concat(o.material)) materials.add(m)
        if (o.isInstancedMesh || o.isLight) o.dispose()
      })
      geometries.forEach((g) => g.dispose())
      materials.forEach((m) => m.dispose())
      textures.forEach((x) => x.dispose())
      group.clear()
    },
  }
}
