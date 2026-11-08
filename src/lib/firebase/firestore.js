import { getFirestore } from 'firebase-admin/firestore'
import { getAdminApp } from './admin.js'

export function getDb() {
  return getFirestore(getAdminApp())
}
