#!/usr/bin/env node
// Smoke del ABM contra el Firestore real (mismo código que usan las Server Actions).
// Prueba alta, lectura, listado, modificación y baja de las dos entidades, y que un
// usuario NO pueda leer, editar ni borrar lo de otro. Limpia todo al final.
// Uso: npm run smoke   (necesita las variables FIREBASE_* de Admin en .env.local)
import { readFileSync } from 'node:fs'
import { jerseys } from '../src/lib/data/jerseys.js'
import { lineups } from '../src/lib/data/lineups.js'
import { NotFoundError } from '../src/lib/data/ownedCollection.js'
import { parseJersey } from '../src/lib/domain/jerseys.js'
import { parseLineup } from '../src/lib/domain/lineups.js'

const squad = JSON.parse(readFileSync(new URL('../src/data/squad.json', import.meta.url), 'utf8'))
const stamp = Date.now()
const A = `smoke-a-${stamp}`
const B = `smoke-b-${stamp}`
let failed = 0
const created = []

function check(label, ok) {
  console.log(`${ok ? '✓' : '✗'} ${label}`)
  if (!ok) failed++
}
async function rejectsNotFound(label, fn) {
  try {
    await fn()
    check(label, false)
  } catch (e) {
    check(label, e instanceof NotFoundError)
  }
}

async function crud(name, repo, valid, changed, field) {
  console.log(`\n${name}`)
  const id = await repo.create(A, valid)
  created.push([repo, id])
  check('alta', typeof id === 'string')
  check('lectura del dueño', (await repo.get(A, id))?.[field] === valid[field])
  check('listado del dueño', (await repo.list(A)).some((x) => x.id === id))
  check('otro usuario no la lee', (await repo.get(B, id)) === null)
  check('otro usuario no la lista', !(await repo.list(B)).some((x) => x.id === id))
  await rejectsNotFound('otro usuario no la edita', () => repo.update(B, id, changed))
  await rejectsNotFound('otro usuario no la borra', () => repo.remove(B, id))
  await repo.update(A, id, changed)
  check('modificación', (await repo.get(A, id))?.[field] === changed[field])
  await repo.remove(A, id)
  created.pop()
  check('baja', (await repo.get(A, id)) === null)
}

try {
  const jersey = parseJersey({ name: 'smoke', number: '10', size: 'M', note: 'prueba' }).data
  const jersey2 = parseJersey({ name: 'smoke dos', number: '5', size: 'L', note: '' }).data
  await crud('Mis remeras', jerseys, jersey, jersey2, 'name')

  const keeper = squad.find((p) => p.pos === 'ARQ')
  const field = squad.filter((p) => p.pos !== 'ARQ')
  const xi = (name) =>
    parseLineup({ name, formation: '4-3-3', slots: [keeper.dorsal, ...field.slice(0, 10).map((p) => p.dorsal)], captain: field[0].dorsal }, squad).data
  await crud('Mi XI ideal', lineups, xi('Smoke XI'), xi('Smoke XI editado'), 'name')
} catch (e) {
  console.error('\nError inesperado:', e.message)
  failed++
} finally {
  for (const [repo, id] of created) await repo.remove(A, id).catch(() => {})
}

console.log(failed ? `\n${failed} chequeo(s) fallaron` : '\nABM OK contra Firestore')
process.exit(failed ? 1 : 0)
