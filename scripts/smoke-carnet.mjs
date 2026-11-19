#!/usr/bin/env node
// Smoke del carnet de hincha contra el Firestore real (mismo código que usan las
// Server Actions), con el usuario de prueba del seed. Prueba alta, lectura,
// modificación y baja, que otro usuario no toque el carnet ajeno y que lo inválido
// no llegue a escribirse. Antes de tocar nada guarda el carnet que tuviera el
// usuario de prueba y al final lo deja exactamente como estaba.
// Uso: node --env-file=.env.local scripts/smoke-carnet.mjs
import { getAuth } from 'firebase-admin/auth'
import { getAdminApp } from '../src/lib/firebase/admin.js'
import { getDb } from '../src/lib/firebase/firestore.js'
import { CARNETS, carnets } from '../src/lib/data/carnets.js'
import { carnetFromForm, parseCarnet, socioNumber } from '../src/lib/domain/carnet.js'

// Cuenta de prueba documentada en el README (la crea `npm run seed`; no se importa
// seed.mjs porque al importarlo se ejecuta)
const TEST_EMAIL = 'prueba@vestuario-boca.test'
const OTHER = `smoke-carnet-otro-${Date.now()}`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let failed = 0
function check(label, ok) {
  console.log(`${ok ? '✓' : '✗'} ${label}`)
  if (!ok) failed++
}
async function rejects(label, fn, pattern) {
  try {
    await fn()
    check(label, false)
  } catch (e) {
    check(label, pattern.test(e.message))
  }
}

const must = (input) => {
  const r = parseCarnet(input)
  if (!r.data) throw new Error(`Dato de prueba inválido: ${JSON.stringify(r.errors)}`)
  return r.data
}

const uid = (await getAuth(getAdminApp()).getUserByEmail(TEST_EMAIL).catch(() => null))?.uid
if (!uid) {
  console.error(`No existe ${TEST_EMAIL}. Corré primero: npm run seed`)
  process.exit(1)
}

const ref = getDb().collection(CARNETS).doc(uid)
const before = await ref.get()
const snapshot = before.exists ? before.data() : null
console.log(`Usuario de prueba: ${TEST_EMAIL} · socio ${socioNumber(uid)}`)
console.log(`Snapshot previo: ${snapshot ? 'tenía carnet (se restaura al final)' : 'sin carnet'}\n`)

try {
  if (snapshot) await ref.delete()

  console.log('Validación')
  const fd = new FormData()
  for (const [k, v] of Object.entries({ nombre: 'X', apodo: '', desde: '1800', ubicacion: 'vip', idolo: 'nadie' })) fd.set(k, v)
  fd.set('foto', new File(['bytes'], 'yo.jpg', { type: 'image/jpeg' }))
  const bad = parseCarnet(carnetFromForm(fd))
  check('datos inválidos no producen nada para guardar', bad.data === null && Object.keys(bad.errors).length === 4)
  check('la foto del form no entra a los datos', !('foto' in carnetFromForm(fd)))
  check('nada se escribió', !(await ref.get()).exists)

  console.log('\nAlta')
  const v1 = must({ nombre: 'Smoke Carnet', apodo: 'El de Prueba', desde: '1998', ubicacion: 'popular', idolo: 'palermo' })
  const r1 = await carnets.save(uid, v1)
  check('alta (created: true)', r1.created === true)
  const c1 = await carnets.get(uid)
  check('lectura del dueño', c1?.nombre === v1.nombre && c1.desde === 1998 && c1.ubicacion === 'popular' && c1.idolo === 'palermo')
  check('id = uid y userId guardado', c1?.id === uid && c1.userId === uid)
  check('createdAt y updatedAt con fecha', Boolean(c1?.createdAt) && Boolean(c1?.updatedAt))
  const raw = (await ref.get()).data()
  check('en Firestore solo los campos del carnet', Object.keys(raw).sort().join() === 'apodo,createdAt,desde,idolo,nombre,ubicacion,updatedAt,userId')

  console.log('\nModificación')
  await sleep(40)
  const v2 = must({ nombre: 'Smoke Editado', apodo: '', desde: '2000', ubicacion: 'casa', idolo: 'riquelme' })
  const r2 = await carnets.save(uid, v2)
  check('modificación (created: false)', r2.created === false)
  const c2 = await carnets.get(uid)
  check('cambios guardados', c2?.nombre === 'Smoke Editado' && c2.apodo === '' && c2.desde === 2000 && c2.idolo === 'riquelme')
  check('el alta no cambia', c2?.createdAt === c1.createdAt)
  check('updatedAt avanza', c2?.updatedAt > c1.updatedAt)

  console.log('\nAislamiento')
  check('otro usuario no tiene carnet', (await carnets.get(OTHER)) === null)
  const r3 = await carnets.save(OTHER, must({ nombre: 'Otro Hincha', desde: '1990', ubicacion: 'palcos', idolo: 'tevez' }))
  check('el otro usuario crea el suyo', r3.created === true)
  const c3 = await carnets.get(uid)
  check('el carnet del dueño no cambió', c3?.nombre === 'Smoke Editado' && c3.updatedAt === c2.updatedAt)
  check('el otro lee solo el suyo', (await carnets.get(OTHER))?.nombre === 'Otro Hincha')
  check('el otro borra solo el suyo', (await carnets.remove(OTHER)) === true && (await carnets.get(uid))?.nombre === 'Smoke Editado')
  await rejects('uid vacío se rechaza', () => carnets.get(''), /Usuario inválido/)
  await rejects('uid con "/" se rechaza (no sale de la colección)', () => carnets.get(`${uid}/x`), /Usuario inválido/)

  console.log('\nBaja')
  check('baja (había carnet)', (await carnets.remove(uid)) === true)
  check('ya no está', (await carnets.get(uid)) === null)
  check('borrar de nuevo no falla y avisa que no había', (await carnets.remove(uid)) === false)

  console.log('\nNúmero de socio')
  check('estable y con formato', socioNumber(uid) === socioNumber(uid) && /^\d{3} \d{3} \d{3}-\d$/.test(socioNumber(uid)))
} catch (e) {
  console.error('\nError inesperado:', e.message)
  failed++
} finally {
  await getDb().collection(CARNETS).doc(OTHER).delete().catch(() => {})
  if (snapshot) await ref.set(snapshot)
  else await ref.delete().catch(() => {})
  const after = await ref.get()
  const restored = snapshot ? after.exists && JSON.stringify(after.data()) === JSON.stringify(snapshot) : !after.exists
  const otherGone = !(await getDb().collection(CARNETS).doc(OTHER).get()).exists
  console.log('\nLimpieza')
  check(snapshot ? 'carnet previo del usuario de prueba restaurado tal cual' : 'usuario de prueba sin carnet, como estaba', restored)
  check('documento del otro usuario borrado', otherGone)
}

console.log(failed ? `\n${failed} chequeo(s) fallaron` : '\nABM del carnet OK contra Firestore')
process.exit(failed ? 1 : 0)
