#!/usr/bin/env node
// Pasa la clave de la cuenta de servicio de Firebase (el JSON que baja la consola)
// a .env.local como FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY.
// No imprime la clave. Uso: node scripts/env-from-service-account.mjs ~/Downloads/<archivo>.json
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const file = process.argv[2]
if (!file || !existsSync(file)) {
  console.error('Pasá la ruta al JSON de la cuenta de servicio.')
  process.exit(1)
}
const key = JSON.parse(readFileSync(file, 'utf8'))
if (!key.project_id || !key.client_email || !key.private_key) {
  console.error('Ese JSON no parece una clave de cuenta de servicio.')
  process.exit(1)
}
const envPath = resolve(import.meta.dirname, '..', '.env.local')
const lines = existsSync(envPath) ? readFileSync(envPath, 'utf8').split('\n') : []
const keep = lines.filter((l) => l && !/^FIREBASE_(PROJECT_ID|CLIENT_EMAIL|PRIVATE_KEY)=/.test(l))
keep.push(
  `FIREBASE_PROJECT_ID=${key.project_id}`,
  `FIREBASE_CLIENT_EMAIL=${key.client_email}`,
  `FIREBASE_PRIVATE_KEY="${key.private_key.replace(/\n/g, '\\n')}"`,
)
writeFileSync(envPath, keep.join('\n') + '\n')
console.log(`Listo: .env.local con la cuenta de servicio de ${key.project_id}. Ya podés borrar el JSON de Descargas.`)
