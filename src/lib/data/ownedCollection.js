import { FieldValue } from 'firebase-admin/firestore'
import { getDb } from '../firebase/firestore.js'

/**
 * Colección de Firestore donde cada documento tiene dueño (`userId`).
 * Todas las lecturas y escrituras pasan por acá, en el servidor, con el uid de la
 * sesión: un usuario nunca puede leer ni tocar documentos de otro, aunque adivine
 * el id. Las reglas de Firestore además cierran el acceso directo desde el cliente.
 */
export class NotFoundError extends Error {
  constructor() {
    super('No existe o no es tuyo.')
    this.name = 'NotFoundError'
  }
}

const iso = (ts) => ts?.toDate?.().toISOString() ?? null

export function ownedCollection(name, pick) {
  const col = () => getDb().collection(name)

  const serialize = (doc) => {
    const data = doc.data()
    return { id: doc.id, userId: data.userId, ...pick(data), createdAt: iso(data.createdAt), updatedAt: iso(data.updatedAt) }
  }

  /** Doc del usuario o NotFoundError (mismo error si no existe o si es de otro: no se filtra nada) */
  async function owned(userId, id) {
    if (!id || typeof id !== 'string') throw new NotFoundError()
    const ref = col().doc(id)
    const snap = await ref.get()
    if (!snap.exists || snap.data().userId !== userId) throw new NotFoundError()
    return { ref, snap }
  }

  return {
    async list(userId) {
      const snap = await col().where('userId', '==', userId).get()
      return snap.docs.map(serialize).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    },
    async get(userId, id) {
      try {
        return serialize((await owned(userId, id)).snap)
      } catch (e) {
        if (e instanceof NotFoundError) return null
        throw e
      }
    },
    async create(userId, data) {
      const now = FieldValue.serverTimestamp()
      const ref = await col().add({ ...pick(data), userId, createdAt: now, updatedAt: now })
      return ref.id
    },
    async update(userId, id, data) {
      const { ref } = await owned(userId, id)
      await ref.update({ ...pick(data), updatedAt: FieldValue.serverTimestamp() })
    },
    async remove(userId, id) {
      const { ref } = await owned(userId, id)
      await ref.delete()
    },
    async count(userId) {
      const snap = await col().where('userId', '==', userId).count().get()
      return snap.data().count
    },
  }
}
