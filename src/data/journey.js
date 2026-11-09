import fotos from './journey-fotos.json'

/**
 * Journey 2000–2026: un hito por año, del bicampeonato del mundo al plantel de
 * hoy. Títulos y años según la tabla de Honours de Wikipedia ("Boca Juniors",
 * consultada el 2026-11-09); finales y rivales, de las ediciones de cada copa.
 * Fotos reales de Wikimedia Commons (scripts/fetch_historia.py): cuando la foto
 * no es de ese año, el epígrafe lo dice.
 */
const hitos = [
  {
    year: '2000',
    month: 'Noviembre',
    text: 'En Tokio, Boca le gana 2–1 al Real Madrid con dos goles de Palermo y es campeón del mundo. En junio había ganado la Libertadores ante Palmeiras.',
  },
  {
    year: '2001',
    month: 'Junio',
    text: 'Bicampeón de América: la Libertadores se gana otra vez, ahora por penales ante Cruz Azul.',
  },
  {
    year: '2003',
    month: 'Diciembre',
    text: 'Libertadores ante Santos en julio y, en diciembre, la tercera Intercontinental: por penales ante el Milan, en Yokohama.',
  },
  { year: '2004', month: 'Diciembre', text: 'Llega la primera Copa Sudamericana, en la final ante Bolívar.' },
  {
    year: '2005',
    month: 'Diciembre',
    text: 'Bicampeón de la Sudamericana ante Pumas, el mismo año de la Recopa y del Apertura.',
  },
  { year: '2006', month: 'Junio', text: 'Campeón del Clausura con Alfio Basile en el banco. Ese año suma otra Recopa.' },
  { year: '2007', month: 'Junio', text: 'Con Riquelme de vuelta, Boca gana su sexta Libertadores en la final ante Grêmio.' },
  { year: '2008', month: 'Diciembre', text: 'Recopa ante Arsenal y el Apertura 2008, definido en un triangular final.' },
  { year: '2011', month: 'Diciembre', text: 'Apertura 2011 invicto, con Julio César Falcioni como entrenador.' },
  { year: '2012', month: 'Agosto', text: 'Copa Argentina en la final ante Racing, jugada en San Juan.' },
  { year: '2015', month: 'Noviembre', text: 'Vuelve Tevez y llega el doblete: campeonato local y Copa Argentina.' },
  {
    year: '2018',
    month: 'Diciembre',
    text: 'Bicampeón local (2016–17 y 2017–18) y finalista de la Libertadores más larga, jugada en Madrid ante River.',
  },
  {
    year: '2020',
    month: 'Marzo',
    text: 'Campeón de la Superliga 2019–20 en la última fecha. Meses después suma la Copa de la Liga y la Copa Argentina.',
  },
  { year: '2022', month: 'Octubre', text: 'Liga Profesional 2022 y Copa de la Liga: doble corona en el mismo año.' },
  { year: '2023', month: 'Noviembre', text: 'Vuelve a una final de Libertadores, en el Maracaná ante Fluminense.' },
  { year: '2025', month: 'Junio', text: 'Boca juega el Mundial de Clubes en Estados Unidos.' },
  {
    year: '2026',
    month: 'Hoy',
    text: 'Campeón de la Liga 2026. El plantel que cuelga en el vestuario sigue escribiendo la historia.',
  },
]

export const journey = hitos.map((h) => ({ ...h, foto: fotos[h.year] ?? null }))

/** Todos los años del recorrido, con y sin hito (la columna izquierda los lista a todos) */
export const journeyYears = Array.from({ length: 27 }, (_, i) => String(2000 + i))
