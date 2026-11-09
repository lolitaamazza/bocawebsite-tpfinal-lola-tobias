import fotos from './logros-fotos.json'

/**
 * Vitrina de logros. Números y años del palmarés de Boca según Wikipedia
 * ("Boca Juniors", sección Honours, consultada el 2026-11-09). Fotos reales de
 * Wikimedia Commons (scripts/fetch_historia.py).
 */
const base = [
  {
    id: 'libertadores',
    count: 6,
    title: 'Copas Libertadores',
    years: ['1977', '1978', '2000', '2001', '2003', '2007'],
    text: 'La primera llegó en 1977 ante Cruzeiro y la última en 2007. Seis veces campeón de América.',
  },
  {
    id: 'intercontinental',
    count: 3,
    title: 'Copas Intercontinentales',
    years: ['1977', '2000', '2003'],
    text: 'Campeón del mundo ante Borussia Mönchengladbach, Real Madrid y Milan.',
  },
  {
    id: 'liga',
    count: 36,
    title: 'Títulos de Primera División',
    years: ['1919', '2026'],
    range: true,
    text: 'Del primer campeonato en 1919 a la Liga 2026: más de un siglo dando vueltas olímpicas.',
  },
  {
    id: 'sudamericana',
    count: 2,
    title: 'Copas Sudamericanas',
    years: ['2004', '2005'],
    text: 'Dos al hilo, con los años grabados en la base del trofeo.',
  },
  {
    id: 'internacionales',
    count: 22,
    title: 'Títulos internacionales',
    years: ['1919', '2008'],
    range: true,
    text: 'Libertadores, Intercontinentales, Sudamericanas, cuatro Recopas, la Supercopa, la Copa de Oro y la Copa Master, entre otros.',
  },
  {
    id: 'copa-argentina',
    count: 4,
    title: 'Copas Argentina',
    years: ['1969', '2012', '2015', '2020'],
    text: 'La primera, en la edición inaugural de 1969; la más reciente, en la de 2019–20.',
  },
]

export const logros = base.map((l) => ({ ...l, foto: fotos[l.id] ?? null }))
