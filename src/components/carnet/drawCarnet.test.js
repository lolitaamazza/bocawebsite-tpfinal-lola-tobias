import { beforeAll, describe, expect, it } from 'vitest'
import { cardModel } from '@/lib/domain/carnet'
import { BACK, CARD, FRONT, coverRect } from './cardArt'
import { LEGAL_BACK, LEGAL_FRONT, MATRIX_LABEL, drawBack, drawFront, renderCard } from './drawCarnet'

/**
 * Canvas de mentira que anota lo que se dibuja. No mira píxeles: verifica que cada
 * cara escriba lo que tiene que escribir, dentro del carnet, y que no se rompa.
 */
function fakeContext() {
  const state = { font: '10px sans-serif' }
  const log = { texts: [], images: [], transforms: [], calls: [] }
  const gradient = () => ({ addColorStop() {} })
  const own = {
    log,
    measureText: (t) => {
      const px = Number(/(\d+(?:\.\d+)?)px/.exec(state.font)?.[1] ?? 10)
      return { width: Array.from(t).length * px * 0.5 }
    },
    fillText: (t, x, y, maxWidth) => log.texts.push({ t, x, y, maxWidth, font: state.font, align: state.textAlign ?? 'left' }),
    drawImage: (...args) => log.images.push(args),
    setTransform: (...args) => log.transforms.push(args),
    createLinearGradient: gradient,
    createRadialGradient: gradient,
  }
  return new Proxy(own, {
    get(target, prop) {
      if (prop in target) return target[prop]
      if (prop in state) return state[prop]
      return (...args) => log.calls.push([prop, args])
    },
    set(_, prop, value) {
      state[prop] = value
      return true
    },
    has(target, prop) {
      return prop in target || prop in state
    },
  })
}

const sizeOf = (font) => Number(/(\d+(?:\.\d+)?)px/.exec(font)[1])

beforeAll(() => {
  globalThis.Path2D ??= class {
    constructor(d) {
      this.d = d
    }
  }
})

const values = { nombre: 'Juan Román', apodo: 'El Toto', desde: '1981', ubicacion: 'popular', idolo: 'riquelme' }
const model = cardModel(values, { uid: 'abc123', createdAt: '2026-11-18T15:00:00Z' })
const crest = { width: 842, height: 1000 }

describe('frente', () => {
  it('escribe club, nombre, apodo, socio, año y la aclaración de tributo', () => {
    const ctx = fakeContext()
    drawFront(ctx, model, { crest })
    const texts = ctx.log.texts.map((x) => x.t)
    for (const t of ['CLUB ATLÉTICO', 'BOCA JUNIORS', 'CARNET DE HINCHA', 'JUAN ROMÁN', '«El Toto»', 'N.º DE SOCIO', model.socio, 'HINCHA DESDE', '1981', LEGAL_FRONT]) {
      expect(texts, t).toContain(t)
    }
  })

  it('todo el texto empieza dentro del carnet y ninguno pasa su caja', () => {
    const ctx = fakeContext()
    drawFront(ctx, model, { crest })
    for (const { t, x, y, maxWidth, align } of ctx.log.texts) {
      expect(y, t).toBeGreaterThan(0)
      expect(y, t).toBeLessThanOrEqual(CARD.h)
      expect(x, t).toBeGreaterThanOrEqual(0)
      if (align === 'left' && maxWidth) expect(x + maxWidth, t).toBeLessThanOrEqual(CARD.w)
    }
  })

  it('un nombre de 40 letras achica el cuerpo y se limita al ancho de su caja', () => {
    const long = cardModel({ ...values, nombre: 'Maximiliano Bartolomé Fernández Quiroga' }, { uid: 'abc' })
    const ctx = fakeContext()
    drawFront(ctx, long, {})
    const name = ctx.log.texts.find((x) => x.t === long.nombre)
    expect(sizeOf(name.font)).toBeLessThan(FRONT.name.max)
    expect(sizeOf(name.font)).toBeGreaterThanOrEqual(FRONT.name.min)
    expect(name.maxWidth).toBe(FRONT.name.w)
  })

  it('sin foto dibuja las iniciales; sin escudo no llama a drawImage', () => {
    const ctx = fakeContext()
    drawFront(ctx, model, {})
    expect(ctx.log.texts.map((x) => x.t)).toContain('JR')
    expect(ctx.log.images).toHaveLength(0)
  })

  it('con foto la recorta "cover" dentro de su caja y no dibuja iniciales', () => {
    const photo = { naturalWidth: 4000, naturalHeight: 3000 }
    const ctx = fakeContext()
    drawFront(ctx, model, { photo, crest })
    const call = ctx.log.images.find((args) => args[0] === photo)
    const { x, y, w, h } = FRONT.photo
    const crop = coverRect(4000, 3000, w, h)
    expect(call.slice(1)).toEqual([crop.sx, crop.sy, crop.sw, crop.sh, x, y, w, h])
    expect(ctx.log.texts.map((t) => t.t)).not.toContain('JR')
  })

  it('una foto rota (sin medidas) cae en las iniciales sin romperse', () => {
    const ctx = fakeContext()
    drawFront(ctx, model, { photo: { naturalWidth: 0, naturalHeight: 0 } })
    expect(ctx.log.texts.map((x) => x.t)).toContain('JR')
  })

  it('anónimo: muestra PREVIEW y el marcador del nombre', () => {
    const ctx = fakeContext()
    drawFront(ctx, cardModel({}, {}), {})
    const texts = ctx.log.texts.map((x) => x.t)
    expect(texts).toContain('PREVIEW')
    expect(texts).toContain('TU NOMBRE')
  })
})

describe('dorso', () => {
  it('escribe estadísticas, frase, firma y aclara que el patrón no es un QR', () => {
    const ctx = fakeContext()
    drawBack(ctx, model, { crest })
    const texts = ctx.log.texts.map((x) => x.t)
    for (const t of ['SOCIO DESDE', '18 NOV 2026', 'UBICACIÓN', 'POPULAR / LA 12', 'ÍDOLO', 'JUAN ROMÁN RIQUELME', `“${model.frase}”`, 'Juan Román', 'FIRMA DEL HINCHA', ...MATRIX_LABEL, LEGAL_BACK, `N.º ${model.socio}`]) {
      expect(texts, t).toContain(t)
    }
  })

  it('el aviso legal entra en una línea dentro del carnet', () => {
    const ctx = fakeContext()
    drawBack(ctx, model, {})
    const legal = ctx.log.texts.find((x) => x.t === LEGAL_BACK)
    expect(legal.maxWidth).toBe(BACK.legal.w)
    expect(legal.x + legal.maxWidth).toBeLessThanOrEqual(CARD.w)
  })

  it('sin nombre no firma', () => {
    const ctx = fakeContext()
    drawBack(ctx, cardModel({}, {}), {})
    expect(ctx.log.texts.map((x) => x.t)).not.toContain('')
  })
})

describe('renderCard', () => {
  it('ajusta el canvas a 1712 × 1080 y escala el dibujo ×2', () => {
    const ctx = fakeContext()
    const canvas = { width: 300, height: 150, getContext: () => ctx }
    expect(renderCard(canvas, 'front', model, {})).toBe(true)
    expect([canvas.width, canvas.height]).toEqual([1712, 1080])
    expect(ctx.log.transforms.at(-1)).toEqual([2, 0, 0, 2, 0, 0])
  })

  it('elige la cara', () => {
    const front = fakeContext()
    const back = fakeContext()
    renderCard({ width: 0, height: 0, getContext: () => front }, 'front', model, {})
    renderCard({ width: 0, height: 0, getContext: () => back }, 'back', model, {})
    expect(front.log.texts.map((x) => x.t)).toContain('HINCHA DESDE')
    expect(back.log.texts.map((x) => x.t)).toContain('SOCIO DESDE')
  })

  it('sin contexto 2D devuelve false', () => {
    expect(renderCard({ width: 0, height: 0, getContext: () => null }, 'front', model, {})).toBe(false)
  })
})
