import { ownedCollection } from './ownedCollection.js'

/** Formaciones ("Mi XI ideal") de cada usuario. `slots` son 11 dorsales, el 0 es el arco. */
export const lineups = ownedCollection('lineups', (d) => ({
  name: String(d.name ?? ''),
  formation: String(d.formation ?? ''),
  slots: Array.isArray(d.slots) ? d.slots.map(Number) : [],
  captain: Number(d.captain ?? 0),
}))
