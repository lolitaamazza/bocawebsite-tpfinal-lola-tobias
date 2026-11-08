'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { jerseys } from '@/lib/data/jerseys'
import { parseJersey } from '@/lib/domain/jerseys'

/**
 * Escrituras de "Mis remeras". Todas: (1) toman el uid de la cookie de sesión,
 * nunca del formulario; (2) validan con la misma función que usa el cliente;
 * (3) devuelven errores por campo para que el form los muestre (useActionState).
 */

const fields = (formData) => ({
  name: formData.get('name'),
  number: formData.get('number'),
  size: formData.get('size'),
  note: formData.get('note'),
})

const refresh = (id) => {
  revalidatePath('/mis-remeras')
  if (id) revalidatePath(`/mis-remeras/${id}`)
}

export async function createJersey(_prev, formData) {
  const user = await requireUser('/mis-remeras/nueva')
  const { data, errors, values } = parseJersey(fields(formData))
  if (!data) return { errors, values }
  await jerseys.create(user.uid, data)
  refresh()
  redirect('/mis-remeras?ok=creada')
}

export async function updateJersey(id, _prev, formData) {
  const user = await requireUser(`/mis-remeras/${id}`)
  const { data, errors, values } = parseJersey(fields(formData))
  if (!data) return { errors, values }
  await jerseys.update(user.uid, id, data)
  refresh(id)
  redirect('/mis-remeras?ok=editada')
}

export async function deleteJersey(id) {
  const user = await requireUser('/mis-remeras')
  await jerseys.remove(user.uid, id)
  refresh(id)
  redirect('/mis-remeras?ok=borrada')
}

/**
 * Guardado rápido desde el personalizador del vestuario 3D. No redirige: devuelve
 * el resultado para que el vestuario muestre un aviso y siga en pantalla.
 */
export async function saveFromCustomizer(input) {
  const user = await requireUser('/personaliza')
  const { data, errors } = parseJersey(input)
  if (!data) return { ok: false, errors }
  const id = await jerseys.create(user.uid, data)
  refresh()
  return { ok: true, id }
}
