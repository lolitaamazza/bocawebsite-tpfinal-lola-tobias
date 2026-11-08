'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { squad } from '@/data'
import { requireUser } from '@/lib/auth'
import { lineups } from '@/lib/data/lineups'
import { lineupFromForm, parseLineup } from '@/lib/domain/lineups'

/** Escrituras de "Mi XI ideal": uid de la sesión, validación compartida, errores por campo. */

const refresh = (id) => {
  revalidatePath('/mi-xi')
  if (id) revalidatePath(`/mi-xi/${id}`)
}

export async function createLineup(_prev, formData) {
  const user = await requireUser('/mi-xi/nuevo')
  const { data, errors, values } = parseLineup(lineupFromForm(formData), squad)
  if (!data) return { errors, values }
  await lineups.create(user.uid, data)
  refresh()
  redirect('/mi-xi?ok=creado')
}

export async function updateLineup(id, _prev, formData) {
  const user = await requireUser(`/mi-xi/${id}`)
  const { data, errors, values } = parseLineup(lineupFromForm(formData), squad)
  if (!data) return { errors, values }
  await lineups.update(user.uid, id, data)
  refresh(id)
  redirect('/mi-xi?ok=editado')
}

export async function deleteLineup(id) {
  const user = await requireUser('/mi-xi')
  await lineups.remove(user.uid, id)
  refresh(id)
  redirect('/mi-xi?ok=borrado')
}
