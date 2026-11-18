/**
 * Números del perfil del jugador. Todo sale de stats.json y squad.json: no se
 * inventa nada (no hay altura, peso, títulos ni partidos por fecha).
 */

/** Partidos que jugó el equipo: el máximo de convocatorias del plantel (proxy determinístico) */
export function teamMatches(stats) {
  const players = Object.values(stats?.players ?? {})
  return players.reduce((m, s) => Math.max(m, Number.isFinite(s?.conv) ? s.conv : 0), 0)
}

/** a/b acotado a 0..1; 0 si b no es positivo o algo no es número */
export function ratio(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) return 0
  return Math.min(1, Math.max(0, a / b))
}

const pct = (r) => Math.round(r * 100)

/**
 * Lo que muestra el perfil. Sin estadísticas, los números van en null
 * (la UI pone "–") y los anillos en 0.
 */
export function profileMetrics(player, s, matches) {
  const keeper = player.pos === 'ARQ'
  const has = !!s
  const cap = Math.max(0, matches) * 90
  const val = (k) => (has && Number.isFinite(s[k]) ? s[k] : null)
  return {
    hasStats: has,
    keeper,
    minutes: val('min'),
    played: val('pj'),
    starts: val('tit'),
    goals: val('goles'),
    assists: val('asist'),
    yellow: val('ta'),
    red: val('tr'),
    called: val('conv'),
    /** Tercer número del torneo: goles para los de campo, convocatorias para los arqueros */
    third: keeper ? { key: 'conv', label: 'Convocado', value: val('conv') } : { key: 'goles', label: 'Goles', value: val('goles') },
    age: Number.isFinite(player.edad) ? player.edad : null,
    contract: player.contrato ?? null,
    teamMatches: matches,
    minutesCap: cap,
    /** Porcentajes enteros 0..100, o null sin datos */
    starterRate: has ? pct(ratio(s.tit, s.pj)) : null,
    minutesShare: has ? pct(ratio(s.min, cap)) : null,
  }
}
