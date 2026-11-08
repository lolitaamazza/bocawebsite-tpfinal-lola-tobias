import { ownedCollection } from './ownedCollection.js'

/** Remeras personalizadas de cada usuario. Solo estos campos se leen y escriben. */
export const jerseys = ownedCollection('jerseys', (d) => ({
  name: String(d.name ?? ''),
  number: String(d.number ?? ''),
  size: String(d.size ?? ''),
  note: String(d.note ?? ''),
}))
