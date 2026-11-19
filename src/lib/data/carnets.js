import { FieldValue } from 'firebase-admin/firestore'
import { getDb } from '../firebase/firestore.js'

/**
 * Carnet de hincha: UN documento por usuario en `carnets/{uid}`.
 * El id es el uid de la sesión, así que no hay consulta posible a datos de otro:
 * cada operación toca solo el documento del usuario que llama (y además se guarda
 * `userId`, como en las otras colecciones, para las reglas y por las dudas).
 * Todo pasa por el servidor con Firebase Admin; las reglas cierran el acceso directo.
 */
export const CARNETS = 'carnets'

const iso = (ts) => ts?.toDate?.().toISOString() ?? null

/** Solo estos campos se leen y escriben */
const pick = (d) => ({
  nombre: String(d.nombre ?? ''),
  apodo: String(d.apodo ?? ''),
  desde: Number(d.desde ?? 0),
  ubicacion: String(d.ubicacion ?? ''),
  idolo: String(d.idolo ?? ''),
})

function docOf(userId) {
  // Un id vacío o con "/" apuntaría a otra ruta de Firestore: se corta acá
  if (typeof userId !== 'string' || !userId || userId.includes('/')) throw new Error('Usuario inválido.')
  return getDb().collection(CARNETS).doc(userId)
}

export const carnets = {
  /** El carnet del usuario o null */
  async get(userId) {
    const snap = await docOf(userId).get()
    if (!snap.exists) return null
    const data = snap.data()
    if (data.userId !== userId) return null
    return { id: snap.id, userId, ...pick(data), createdAt: iso(data.createdAt), updatedAt: iso(data.updatedAt) }
  },

  /**
   * Alta o modificación (en una transacción: si dos guardados se cruzan, no se pisa el
   * alta). `data` tiene que venir validado por parseCarnet.
   * @returns {Promise<{ created: boolean }>}
   */
  async save(userId, data) {
    const ref = docOf(userId)
    return getDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      const now = FieldValue.serverTimestamp()
      if (snap.exists) {
        tx.update(ref, { ...pick(data), userId, updatedAt: now })
        return { created: false }
      }
      tx.set(ref, { ...pick(data), userId, createdAt: now, updatedAt: now })
      return { created: true }
    })
  },

  /** Baja. Devuelve si había algo para borrar. */
  async remove(userId) {
    const ref = docOf(userId)
    return getDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists) return false
      tx.delete(ref)
      return true
    })
  },
}
