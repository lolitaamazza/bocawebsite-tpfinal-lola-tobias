import { site } from '../../config/site.js'
import { logros } from '../../data/logros.js'
import squad from '../../data/squad.json'
import stats from '../../data/stats.json'
import { preguntasCuradas } from '../../data/trivia-preguntas.js'
import { buildBank } from '../../lib/domain/trivia.js'
import { piezas } from '../museo/piezas.js'

/**
 * Banco de preguntas de la trivia, armado una vez por proceso a partir de los
 * datos del repo (palmarés, archivo de camisetas, plantel, estadísticas) más las
 * curadas. Lo usan solo las Server Actions: las respuestas no salen del servidor.
 * Imports relativos a propósito: el smoke lo carga con Node sin el alias `@/`.
 */
export const bank = buildBank({ logros, piezas, squad, stats, curated: preguntasCuradas, season: site.season })
