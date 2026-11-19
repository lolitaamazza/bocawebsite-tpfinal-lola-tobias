import fotos from './idolos-fotos.json'

/**
 * Salón de ídolos: diez leyendas de Boca, en orden de llegada al club.
 * Cada dato sale del artículo de Wikipedia en español que figura en `fuentes`
 * (consultados el 2026-11-18). Si un número no estaba en la fuente, no se puso.
 * Fotos libres de Wikimedia Commons (scripts/fetch_idolos.py); sin foto libre,
 * el ídolo queda con su tarjeta tipográfica.
 *
 * `etapas`: años de cada paso por Boca, [desde, hasta] (inclusive).
 */
const lista = [
  {
    slug: 'varallo',
    nombre: 'Francisco Varallo',
    apodo: 'Cañoncito',
    rol: 'Centrodelantero',
    etapas: [[1931, 1939]],
    frase: 'El goleador del primer Boca profesional. Su récord aguantó casi setenta años.',
    datos: [
      'Hizo 194 goles en 222 partidos oficiales: fue el máximo goleador de Boca en el profesionalismo hasta que lo superó Martín Palermo en 2008.',
      'Campeón de Primera con Boca en 1931, 1934 y 1935.',
      'Jugó el primer Mundial, Uruguay 1930: fue el más joven del torneo y el último sobreviviente de aquel Mundial.',
    ],
    fuentes: [{ label: 'Wikipedia · Francisco Varallo', url: 'https://es.wikipedia.org/wiki/Francisco_Varallo' }],
  },
  {
    slug: 'rattin',
    nombre: 'Antonio Rattín',
    apodo: 'El Rata',
    rol: 'Volante central',
    etapas: [[1956, 1970]],
    frase: 'Toda la carrera con una sola camiseta. En su época lo llamaban el Alma de Boca.',
    datos: [
      'Jugó toda su carrera en Boca: 382 partidos y 28 goles en catorce años.',
      'Campeón en 1962, 1964, 1965, 1969 y de la Copa Argentina 1969.',
      'Desde 2015 tiene su estatua en el Museo de la Pasión Boquense.',
    ],
    fuentes: [{ label: 'Wikipedia · Antonio Rattín', url: 'https://es.wikipedia.org/wiki/Antonio_Ratt%C3%ADn' }],
  },
  {
    slug: 'marzolini',
    nombre: 'Silvio Marzolini',
    apodo: null,
    rol: 'Lateral izquierdo',
    etapas: [[1960, 1972]],
    frase: 'Para El Gráfico, el mejor lateral izquierdo de la historia del fútbol argentino.',
    datos: [
      'Es el jugador de Boca con más Superclásicos disputados: 37.',
      'Ganó seis títulos en doce años con la azul y oro.',
      'Ya como técnico, fue campeón del Metropolitano 1981 dirigiendo a Maradona.',
    ],
    fuentes: [{ label: 'Wikipedia · Silvio Marzolini', url: 'https://es.wikipedia.org/wiki/Silvio_Marzolini' }],
  },
  {
    slug: 'rojas',
    nombre: 'Ángel Clemente Rojas',
    apodo: 'Rojitas',
    rol: 'Delantero',
    etapas: [[1963, 1971]],
    frase: 'Gambeta de potrero y cintura imposible: el ídolo de la Boca de los sesenta.',
    datos: [
      'Surgido de las inferiores, jugó 222 partidos y convirtió 80 goles en Boca.',
      'En 1964 le hizo dos goles al Real Madrid en la final de la Copa Mohamed V, en Marruecos.',
      'Desde 2014 tiene su estatua en el museo del club.',
    ],
    fuentes: [
      { label: 'Wikipedia · Ángel Clemente Rojas', url: 'https://es.wikipedia.org/wiki/%C3%81ngel_Clemente_Rojas' },
    ],
  },
  {
    slug: 'gatti',
    nombre: 'Hugo Gatti',
    apodo: 'El Loco',
    rol: 'Arquero',
    etapas: [[1976, 1988]],
    frase: 'Salía a jugar fuera del área cuando nadie lo hacía. Y atajó la primera Libertadores.',
    datos: [
      'En la final de la Libertadores 1977 le atajó el penal a Vanderley, capitán del Cruzeiro: la primera Copa de Boca.',
      'Con 548 partidos es el arquero con más presencias en la historia del club.',
      'Tiene el récord de partidos en la Primera División argentina: 765.',
    ],
    fuentes: [{ label: 'Wikipedia · Hugo Gatti', url: 'https://es.wikipedia.org/wiki/Hugo_Gatti' }],
  },
  {
    slug: 'maradona',
    nombre: 'Diego Armando Maradona',
    apodo: 'El Diez',
    rol: 'Enganche',
    etapas: [
      [1981, 1982],
      [1995, 1997],
    ],
    frase: 'Llegó en 1981, se fue a conquistar el mundo y volvió para despedirse en Boca.',
    datos: [
      'Con Boca ganó el Metropolitano 1981, su único título en el fútbol argentino.',
      'En el 3 a 0 a River de 1981 dejó en el piso a Fillol y Tarantini antes de convertir.',
      'Su último partido como profesional fue con Boca: el 2 a 1 a River en el Monumental, el 25 de octubre de 1997.',
    ],
    fuentes: [
      { label: 'Wikipedia · Diego Armando Maradona', url: 'https://es.wikipedia.org/wiki/Diego_Armando_Maradona' },
    ],
  },
  {
    slug: 'riquelme',
    nombre: 'Juan Román Riquelme',
    apodo: 'Román',
    rol: 'Enganche',
    etapas: [
      [1996, 2002],
      [2007, 2014],
    ],
    frase: 'El último diez clásico. Hoy preside el club que lo vio jugar.',
    datos: [
      'Campeón de América con Boca en 2000, 2001 y 2007, y del mundo en Tokio 2000.',
      'En la Libertadores 2007 fue el goleador del equipo e hizo tres goles en la final ante Grêmio.',
      'El 17 de diciembre de 2023 fue elegido presidente de Boca.',
    ],
    fuentes: [
      { label: 'Wikipedia · Juan Román Riquelme', url: 'https://es.wikipedia.org/wiki/Juan_Rom%C3%A1n_Riquelme' },
    ],
  },
  {
    slug: 'palermo',
    nombre: 'Martín Palermo',
    apodo: 'El Titán',
    rol: 'Centrodelantero',
    etapas: [
      [1997, 2000],
      [2004, 2011],
    ],
    frase: 'El goleador más grande de la historia de Boca, el que convertía hasta lo imposible.',
    datos: [
      'Máximo goleador histórico del club, con 236 goles.',
      'Le hizo los dos goles al Real Madrid en la final de la Intercontinental 2000.',
      'Hizo 20 goles en 19 partidos del Apertura 1998, récord en torneos cortos.',
    ],
    fuentes: [{ label: 'Wikipedia · Martín Palermo', url: 'https://es.wikipedia.org/wiki/Mart%C3%ADn_Palermo' }],
  },
  {
    slug: 'bianchi',
    nombre: 'Carlos Bianchi',
    apodo: 'El Virrey',
    rol: 'Director técnico',
    etapas: [
      [1998, 2001],
      [2003, 2004],
      [2013, 2014],
    ],
    frase: 'El entrenador de la era dorada. Con él, Boca fue tres veces campeón de América.',
    datos: [
      'Es el técnico más exitoso de la historia del club: nueve títulos.',
      'Ganó las Libertadores 2000, 2001 y 2003, y las Intercontinentales 2000 y 2003.',
      'En el plano local: Aperturas 1998, 2000 y 2003 y Clausura 1999.',
    ],
    fuentes: [{ label: 'Wikipedia · Carlos Bianchi', url: 'https://es.wikipedia.org/wiki/Carlos_Bianchi' }],
  },
  {
    slug: 'tevez',
    nombre: 'Carlos Tevez',
    apodo: 'Carlitos',
    rol: 'Delantero',
    etapas: [
      [2001, 2004],
      [2015, 2016],
      [2018, 2021],
    ],
    frase: 'El jugador del pueblo: de Fuerte Apache a campeón del mundo, y de vuelta a casa dos veces.',
    datos: [
      'En su primera etapa ganó el Apertura 2003, la Libertadores 2003 y la Intercontinental 2003 ante el Milan.',
      'Volvió en 2015 y ese año ganó el campeonato y la Copa Argentina.',
      'Se retiró en 2021 con 94 goles y 11 títulos en el club.',
    ],
    fuentes: [{ label: 'Wikipedia · Carlos Tevez', url: 'https://es.wikipedia.org/wiki/Carlos_Tevez' }],
  },
]

export const idolos = lista.map((i, n) => ({ ...i, numero: n + 1, foto: fotos[i.slug] ?? null }))

export const idoloBySlug = (slug) => idolos.find((i) => i.slug === slug) ?? null
