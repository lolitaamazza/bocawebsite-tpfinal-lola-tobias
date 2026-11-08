#!/usr/bin/env node
// Usuario de prueba para la corrección + datos de ejemplo. Idempotente: si el usuario
// existe, le reemplaza las remeras y los XI por los de ejemplo.
// Uso: npm run seed   (necesita las variables FIREBASE_* de Admin en .env.local)
import { readFileSync } from 'node:fs'
import { getAuth } from 'firebase-admin/auth'
import { getAdminApp } from '../src/lib/firebase/admin.js'
import { jerseys } from '../src/lib/data/jerseys.js'
import { lineups } from '../src/lib/data/lineups.js'
import { parseJersey } from '../src/lib/domain/jerseys.js'
import { parseLineup } from '../src/lib/domain/lineups.js'

// Cuenta de prueba documentada en el README (es solo para corregir el TP)
export const TEST_USER = { email: 'prueba@vestuario-boca.test', password: 'DaleBoca2026', displayName: 'Hincha de prueba' }

const squad = JSON.parse(readFileSync(new URL('../src/data/squad.json', import.meta.url), 'utf8'))
const auth = getAuth(getAdminApp())

async function ensureUser() {
  try {
    const u = await auth.getUserByEmail(TEST_USER.email)
    await auth.updateUser(u.uid, { password: TEST_USER.password, displayName: TEST_USER.displayName })
    return u.uid
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e
    return (await auth.createUser({ ...TEST_USER, emailVerified: true })).uid
  }
}

const must = (r, what) => {
  if (!r.data) throw new Error(`Dato de ejemplo inválido (${what}): ${JSON.stringify(r.errors)}`)
  return r.data
}

const uid = await ensureUser()
for (const j of await jerseys.list(uid)) await jerseys.remove(uid, j.id)
for (const l of await lineups.list(uid)) await lineups.remove(uid, l.id)

const sampleJerseys = [
  { name: 'RIQUELME', number: '10', size: 'L', note: 'La del 2000, para el viejo.' },
  { name: 'PALERMO', number: '9', size: 'M', note: '' },
  { name: 'TOBIAS', number: '17', size: 'M', note: 'La mía.' },
]
for (const j of sampleJerseys) await jerseys.create(uid, must(parseJersey(j), j.name))

const byPos = (pos) => squad.filter((p) => p.pos === pos).map((p) => p.dorsal)
const [arq] = byPos('ARQ')
const def = byPos('DEF')
const med = byPos('MED')
const del = byPos('DEL')
const paredes = squad.find((p) => p.capitan)?.dorsal ?? med[0]
const xi = { name: 'El de la Bombonera llena', formation: '4-3-3', slots: [arq, ...def.slice(0, 4), paredes, ...med.filter((d) => d !== paredes).slice(0, 2), ...del.slice(0, 3)], captain: paredes }
await lineups.create(uid, must(parseLineup(xi, squad), xi.name))

console.log(`Usuario de prueba listo: ${TEST_USER.email} (uid ${uid}) con ${sampleJerseys.length} remeras y 1 XI.`)
process.exit(0)
