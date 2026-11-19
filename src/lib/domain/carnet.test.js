import { describe, expect, it } from 'vitest'
import {
  APODO_MAX,
  CARNET_DEFAULTS,
  CARNET_FIELDS,
  DESDE_MIN,
  FRASES,
  IDOLOS,
  NOMBRE_MAX,
  SOCIO_PREVIEW,
  UBICACIONES,
  cardModel,
  carnetFileName,
  carnetFromForm,
  carnetPath,
  currentYear,
  draftFromSearchParams,
  draftQuery,
  formatFecha,
  fraseFor,
  idoloLabel,
  initials,
  loginHref,
  luhnDigit,
  luhnValid,
  parseCarnet,
  sameCarnet,
  socioNumber,
  typeApodo,
  typeDesde,
  typeNombre,
  ubicacionLabel,
  valuesOf,
} from './carnet'

const YEAR = 2026
const valid = (over = {}) => ({ nombre: 'Juan Román', apodo: 'El Toto', desde: '1981', ubicacion: 'popular', idolo: 'riquelme', ...over })
const parse = (over) => parseCarnet(valid(over), { year: YEAR })

describe('parseCarnet', () => {
  it('acepta un carnet válido, limpia y convierte el año a número', () => {
    const r = parseCarnet({ nombre: '  Juan   Román ', apodo: ' El Toto ', desde: ' 1981 ', ubicacion: 'popular', idolo: 'riquelme' }, { year: YEAR })
    expect(r.errors).toEqual({})
    expect(r.data).toEqual({ nombre: 'Juan Román', apodo: 'El Toto', desde: 1981, ubicacion: 'popular', idolo: 'riquelme' })
  })

  it('devuelve solo los cinco campos del carnet, aunque lleguen otros (foto, userId, fechas)', () => {
    const r = parseCarnet({ ...valid(), foto: 'blob:x', userId: 'otro', createdAt: 'hoy', socio: '1' }, { year: YEAR })
    expect(Object.keys(r.data).sort()).toEqual([...CARNET_FIELDS].sort())
  })

  describe('nombre', () => {
    it('es obligatorio', () => {
      expect(parse({ nombre: '' }).errors.nombre).toBe('Poné tu nombre.')
      expect(parse({ nombre: '   ' }).errors.nombre).toBe('Poné tu nombre.')
      expect(parse({ nombre: undefined }).errors.nombre).toBe('Poné tu nombre.')
    })

    it('pide al menos 2 letras (los signos solos no cuentan)', () => {
      expect(parse({ nombre: 'J' }).errors.nombre).toMatch(/al menos 2 letras/)
      expect(parse({ nombre: '--' }).errors.nombre).toMatch(/al menos 2 letras/)
      expect(parse({ nombre: "J'" }).errors.nombre).toMatch(/al menos 2 letras/)
      expect(parse({ nombre: 'Jo' }).errors.nombre).toBeUndefined()
    })

    it('admite hasta 40 caracteres y rechaza 41', () => {
      expect(parse({ nombre: 'a'.repeat(NOMBRE_MAX) }).errors.nombre).toBeUndefined()
      expect(parse({ nombre: 'a'.repeat(NOMBRE_MAX + 1) }).errors.nombre).toBe('Hasta 40 caracteres.')
    })

    it('no recorta en silencio en el servidor: un nombre largo vuelve con error', () => {
      const r = parse({ nombre: 'x'.repeat(500) })
      expect(r.data).toBeNull()
      expect(r.values.nombre).toHaveLength(500)
    })

    it('saca números, símbolos, emojis y HTML; deja tildes, ñ, apóstrofes y guiones', () => {
      expect(parse({ nombre: '<b>Tobías</b> 10 😀 #1' }).values.nombre).toBe('bTobíasb')
      expect(parse({ nombre: "Ñandú D'Alessandro-Pérez" }).data.nombre).toBe("Ñandú D'Alessandro-Pérez")
      expect(parse({ nombre: 'José O’Higgins' }).data.nombre).toBe('José O’Higgins')
    })

    it('junta espacios, tabs y saltos de línea en uno solo', () => {
      expect(parse({ nombre: 'Juan\t\n  Román   Riquelme' }).data.nombre).toBe('Juan Román Riquelme')
      expect(parse({ nombre: 'Juan 😀 Román' }).data.nombre).toBe('Juan Román')
    })

    it('normaliza a NFC: una tilde combinada cuenta como una letra', () => {
      const r = parse({ nombre: 'José' })
      expect(r.data.nombre).toBe('José')
      expect(r.data.nombre).toHaveLength(4)
    })

    it('saca caracteres invisibles y de control (bidi, ancho cero)', () => {
      expect(parse({ nombre: 'Ju‮an​ Ro\u0000mán' }).data.nombre).toBe('Juan Román')
    })

    it('acepta letras de otros alfabetos', () => {
      expect(parse({ nombre: 'Дмитрий' }).data.nombre).toBe('Дмитрий')
    })
  })

  describe('apodo', () => {
    it('es opcional', () => {
      expect(parse({ apodo: '' }).data.apodo).toBe('')
      expect(parse({ apodo: undefined }).data.apodo).toBe('')
    })

    it('admite hasta 24 caracteres y rechaza 25', () => {
      expect(parse({ apodo: 'a'.repeat(APODO_MAX) }).errors.apodo).toBeUndefined()
      expect(parse({ apodo: 'a'.repeat(APODO_MAX + 1) }).errors.apodo).toBe('Hasta 24 caracteres.')
    })

    it('admite números (el 10) pero no signos sueltos', () => {
      expect(parse({ apodo: 'El 10' }).data.apodo).toBe('El 10')
      expect(parse({ apodo: '...' }).errors.apodo).toBe('Usá letras o números.')
      expect(parse({ apodo: '"Toto"' }).data.apodo).toBe('Toto')
    })
  })

  describe('hincha desde', () => {
    it('va de 1905 al año actual, inclusive', () => {
      expect(parse({ desde: String(DESDE_MIN) }).data.desde).toBe(1905)
      expect(parse({ desde: String(YEAR) }).data.desde).toBe(YEAR)
      expect(parse({ desde: '1904' }).errors.desde).toBe(`Entre 1905 y ${YEAR}.`)
      expect(parse({ desde: String(YEAR + 1) }).errors.desde).toBe(`Entre 1905 y ${YEAR}.`)
    })

    it('el tope sale del año que se le pasa (no del reloj del test)', () => {
      expect(parseCarnet(valid({ desde: '2030' }), { year: 2030 }).data.desde).toBe(2030)
      expect(parseCarnet(valid({ desde: '2030' }), { year: 2029 }).errors.desde).toMatch(/2029/)
    })

    it('es obligatorio y tiene que ser un año de cuatro cifras', () => {
      expect(parse({ desde: '' }).errors.desde).toBe('Contanos desde qué año sos hincha.')
      for (const bad of ['19', '01981', '1981.0', '1e3', 'abcd', '19 81', '-1981', '١٩٨١']) {
        expect(parse({ desde: bad }).errors.desde, bad).toBe('Poné un año de cuatro cifras.')
      }
    })

    it('acepta el año como número', () => {
      expect(parse({ desde: 1981 }).data.desde).toBe(1981)
    })
  })

  describe('opciones', () => {
    it('acepta cada ubicación y cada ídolo de la lista', () => {
      for (const { key } of UBICACIONES) expect(parse({ ubicacion: key }).errors.ubicacion).toBeUndefined()
      for (const { key } of IDOLOS) expect(parse({ idolo: key }).errors.idolo).toBeUndefined()
    })

    it('rechaza claves fuera de la lista, el rótulo en vez de la clave y claves del prototipo', () => {
      for (const bad of ['', 'tribuna', 'Popular / La 12', 'constructor', '__proto__', 'toString']) {
        expect(parse({ ubicacion: bad }).errors.ubicacion, bad).toBe('Elegí desde dónde lo mirás.')
      }
      for (const bad of ['', 'francescoli', 'Riquelme', 'constructor', '__proto__']) {
        expect(parse({ idolo: bad }).errors.idolo, bad).toBe('Elegí tu ídolo.')
      }
    })

    it('las claves no se repiten', () => {
      expect(new Set(UBICACIONES.map((u) => u.key)).size).toBe(UBICACIONES.length)
      expect(new Set(IDOLOS.map((i) => i.key)).size).toBe(IDOLOS.length)
    })
  })

  it('valores que no son texto cuentan como vacíos (un File no se cuela como "[object File]")', () => {
    const r = parseCarnet({ nombre: new File(['x'], 'foto.png'), apodo: { a: 1 }, desde: ['1981'], ubicacion: null, idolo: 7 }, { year: YEAR })
    expect(r.values).toEqual({ nombre: '', apodo: '', desde: '', ubicacion: '', idolo: '7' })
    expect(Object.keys(r.errors).sort()).toEqual(['desde', 'idolo', 'nombre', 'ubicacion'])
  })

  it('sin input no explota', () => {
    expect(parseCarnet(undefined, { year: YEAR }).data).toBeNull()
  })

  it('los valores por defecto del editor solo necesitan nombre y año para ser válidos', () => {
    const r = parseCarnet(CARNET_DEFAULTS, { year: YEAR })
    expect(Object.keys(r.errors).sort()).toEqual(['desde', 'nombre'])
  })
})

describe('limpieza mientras se escribe', () => {
  it('deja el espacio del final para seguir tipeando y corta en el máximo', () => {
    expect(typeNombre('Juan ')).toBe('Juan ')
    expect(typeNombre('  Juan')).toBe('Juan')
    expect(typeNombre('a'.repeat(60))).toHaveLength(NOMBRE_MAX)
    expect(typeApodo('b'.repeat(60))).toHaveLength(APODO_MAX)
  })

  it('corta por letras, no por unidades UTF-16', () => {
    expect(Array.from(typeNombre('ñ'.repeat(50)))).toHaveLength(NOMBRE_MAX)
  })

  it('el año queda en cuatro dígitos', () => {
    expect(typeDesde('19a8-1x5')).toBe('1981')
  })
})

describe('carnetFromForm', () => {
  it('toma solo los campos del carnet: la foto (sin name) y otros campos no pasan', () => {
    const fd = new FormData()
    for (const [k, v] of Object.entries(valid())) fd.set(k, v)
    fd.set('foto', new File(['bytes'], 'yo.jpg', { type: 'image/jpeg' }))
    fd.set('userId', 'otro-usuario')
    fd.set('$ACTION_ID_abc', '')
    const picked = carnetFromForm(fd)
    expect(Object.keys(picked).sort()).toEqual([...CARNET_FIELDS].sort())
    expect(parseCarnet(picked, { year: YEAR }).data).toEqual({ ...valid(), desde: 1981 })
  })
})

describe('socioNumber', () => {
  it('es estable para el mismo uid', () => {
    expect(socioNumber('abc123')).toBe(socioNumber('abc123'))
  })

  it('tiene formato "NNN NNN NNN-D" con verificador de Luhn válido', () => {
    for (const uid of ['a', 'abc123', 'Xy9ZkLmN0pQrStUvWx12', 'smoke-a-1']) {
      const n = socioNumber(uid)
      expect(n).toMatch(/^\d{3} \d{3} \d{3}-\d$/)
      expect(luhnValid(n)).toBe(true)
    }
  })

  it('uids distintos dan números distintos (muestra de 2000)', () => {
    const nums = new Set(Array.from({ length: 2000 }, (_, i) => socioNumber(`uid-${i}`)))
    expect(nums.size).toBe(2000)
  })

  it('sin uid es PREVIEW', () => {
    for (const uid of [null, undefined, '', 42]) expect(socioNumber(uid)).toBe(SOCIO_PREVIEW)
  })
})

describe('Luhn', () => {
  it('cumple el ejemplo clásico 7992739871 → 3', () => {
    expect(luhnDigit('7992739871')).toBe('3')
    expect(luhnValid('79927398713')).toBe(true)
    expect(luhnValid('79927398710')).toBe(false)
  })
})

describe('carnetFileName', () => {
  it('arma un nombre de archivo sin tildes ni símbolos', () => {
    expect(carnetFileName('Juan Román Riquelme')).toBe('carnet-boca-juan-roman-riquelme.png')
    expect(carnetFileName("  D'Alessandro / Ñandú  ")).toBe('carnet-boca-d-alessandro-nandu.png')
  })

  it('usa "hincha" si no queda nada y corta los largos', () => {
    expect(carnetFileName('')).toBe('carnet-boca-hincha.png')
    expect(carnetFileName('😀😀')).toBe('carnet-boca-hincha.png')
    expect(carnetFileName(undefined)).toBe('carnet-boca-hincha.png')
    expect(carnetFileName('a'.repeat(39) + ' bcd').length).toBeLessThanOrEqual('carnet-boca-.png'.length + 40)
    expect(carnetFileName('a'.repeat(39) + ' bcd')).not.toMatch(/-\.png$/)
  })
})

describe('fechas en hora argentina', () => {
  it('currentYear usa Buenos Aires, no la zona del servidor', () => {
    expect(currentYear(new Date('2026-12-31T23:30:00-03:00'))).toBe(2026)
    expect(currentYear(new Date('2027-01-01T02:00:00Z'))).toBe(2026) // 23 h del 31/12 en Argentina
    expect(currentYear(new Date('2027-01-01T03:00:00Z'))).toBe(2027)
  })

  it('formatFecha da "DD MES AAAA" y respeta el cambio de día en Argentina', () => {
    expect(formatFecha('2026-11-18T15:00:00Z')).toBe('18 NOV 2026')
    expect(formatFecha('2026-11-19T02:00:00Z')).toBe('18 NOV 2026')
    expect(formatFecha(new Date('2026-01-05T12:00:00Z'))).toBe('05 ENE 2026')
  })

  it('formatFecha devuelve null con fechas que no sirven', () => {
    for (const bad of [null, undefined, '', 'mañana', NaN]) expect(formatFecha(bad)).toBeNull()
  })
})

describe('borrador en la URL', () => {
  it('ida y vuelta: lo que se manda al login vuelve igual al editor', () => {
    const v = valid({ nombre: 'Juan Román', apodo: 'El 10' })
    const params = Object.fromEntries(new URLSearchParams(draftQuery(v)))
    expect(draftFromSearchParams(params)).toEqual(v)
  })

  it('omite campos vacíos y arma la ruta de vuelta', () => {
    expect(draftQuery({ nombre: 'Tobi', apodo: '  ' })).toBe('nombre=Tobi')
    expect(carnetPath({})).toBe('/carnet')
    expect(carnetPath({ nombre: 'Tobi' })).toBe('/carnet?nombre=Tobi')
  })

  it('el link al login es interno y vuelve a /carnet con el diseño', () => {
    const href = loginHref({ nombre: 'Juan Román', desde: '1981' })
    expect(href.startsWith('/login?next=')).toBe(true)
    const next = new URLSearchParams(href.split('?')[1]).get('next')
    expect(next).toBe('/carnet?nombre=Juan+Rom%C3%A1n&desde=1981')
    expect(next.startsWith('/') && !next.startsWith('//')).toBe(true)
  })

  it('ignora claves desconocidas y opciones inválidas, y limpia el texto', () => {
    expect(draftFromSearchParams({ foo: 'bar' })).toBeNull()
    expect(draftFromSearchParams({})).toBeNull()
    expect(draftFromSearchParams(null)).toBeNull()
    expect(draftFromSearchParams({ nombre: '<script>Tobi', ubicacion: 'vip', idolo: 'constructor', desde: '19x81' })).toEqual({ nombre: 'scriptTobi', desde: '1981' })
  })

  it('si un parámetro viene repetido usa el primero', () => {
    expect(draftFromSearchParams({ nombre: ['Ana', 'Beto'] })).toEqual({ nombre: 'Ana' })
  })
})

describe('valuesOf / sameCarnet', () => {
  it('un carnet guardado vuelve al editor como strings', () => {
    expect(valuesOf({ nombre: 'Ana', apodo: '', desde: 1990, ubicacion: 'casa', idolo: 'roma', userId: 'x' })).toEqual({ nombre: 'Ana', apodo: '', desde: '1990', ubicacion: 'casa', idolo: 'roma' })
    expect(valuesOf(null)).toBeNull()
  })

  it('compara borradores ya limpios', () => {
    expect(sameCarnet(valid(), valid({ nombre: '  Juan  Román ' }))).toBe(true)
    expect(sameCarnet(valid(), { ...valid(), desde: 1981 })).toBe(true)
    expect(sameCarnet(valid(), valid({ idolo: 'palermo' }))).toBe(false)
    expect(sameCarnet(valid(), null)).toBe(false)
  })
})

describe('textos del carnet', () => {
  it('rótulos con respaldo para claves desconocidas', () => {
    expect(ubicacionLabel('popular')).toBe('Popular / La 12')
    expect(idoloLabel('rattin')).toBe('Antonio Rattín')
    expect(ubicacionLabel('nope')).toBe('—')
  })

  it('la frase es estable y sale de la lista', () => {
    expect(fraseFor('048 210 937-5')).toBe(fraseFor('048 210 937-5'))
    expect(FRASES).toContain(fraseFor('PREVIEW'))
  })

  it('iniciales de primera y última palabra', () => {
    expect(initials('Juan Román Riquelme')).toBe('JR')
    expect(initials('tobías')).toBe('T')
    expect(initials('ñandú ávila')).toBe('ÑÁ')
    expect(initials('')).toBe('?')
    expect(initials("D'Alessandro")).toBe('D')
  })
})

describe('cardModel', () => {
  it('arma el modelo del carnet en mayúsculas, con socio y fecha de alta', () => {
    const m = cardModel(valid(), { uid: 'abc123', createdAt: '2026-11-18T15:00:00Z' })
    expect(m).toMatchObject({
      nombre: 'JUAN ROMÁN',
      nombreVacio: false,
      apodo: 'El Toto',
      desde: '1981',
      ubicacion: 'POPULAR / LA 12',
      idolo: 'JUAN ROMÁN RIQUELME',
      socio: socioNumber('abc123'),
      socioDesde: '18 NOV 2026',
      iniciales: 'JR',
    })
    expect(m.ariaFront).toMatch(/JUAN ROMÁN/)
    expect(m.ariaBack).toMatch(/no es un QR/)
    expect(m.ariaBack).toMatch(/sin validez como credencial/)
  })

  it('sin datos muestra marcadores y PREVIEW, sin romperse', () => {
    const m = cardModel({}, { today: '2026-11-18T15:00:00Z' })
    expect(m).toMatchObject({ nombre: 'TU NOMBRE', nombreVacio: true, desde: '····', socio: SOCIO_PREVIEW, socioDesde: '18 NOV 2026', iniciales: '?' })
    expect(cardModel(undefined).socioDesde).toBe('—')
  })

  it('un año a medio escribir no aparece en el carnet', () => {
    expect(cardModel(valid({ desde: '19' })).desde).toBe('····')
  })

  it('la semilla del patrón cambia con el nombre y con el usuario', () => {
    const a = cardModel(valid(), { uid: 'u1' }).seed
    expect(cardModel(valid({ nombre: 'Otro' }), { uid: 'u1' }).seed).not.toBe(a)
    expect(cardModel(valid(), { uid: 'u2' }).seed).not.toBe(a)
    expect(cardModel(valid(), { uid: 'u1' }).seed).toBe(a)
  })
})
