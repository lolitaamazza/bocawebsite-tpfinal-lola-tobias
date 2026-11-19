'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { carnets } from '@/lib/data/carnets'
import { carnetFromForm, carnetPath, currentYear, parseCarnet } from '@/lib/domain/carnet'

/**
 * Escrituras del carnet de hincha. Igual que Mis remeras: (1) el uid sale de la cookie
 * de sesión, nunca del formulario; (2) se valida con la misma función que el editor;
 * (3) los errores vuelven por campo para useActionState.
 */

const refresh = () => {
  revalidatePath('/carnet')
  revalidatePath('/mi-carnet')
}

/** Alta o modificación (un carnet por usuario). No redirige: el editor sigue en pantalla con la foto. */
export async function saveCarnet(_prev, formData) {
  // Se valida antes de pedir sesión para que, si se venció, el login vuelva con el diseño
  const { data, errors, values } = parseCarnet(carnetFromForm(formData), { year: currentYear() })
  const user = await requireUser(carnetPath(values))
  if (!data) return { ok: false, errors, values }
  try {
    const { created } = await carnets.save(user.uid, data)
    console.info(`[carnet] ${created ? 'alta' : 'modificación'}`)
    refresh()
    return { ok: true, created, errors: {}, values }
  } catch (e) {
    console.error('[carnet] no se pudo guardar:', e)
    return { ok: false, errors: {}, values, message: 'No pudimos guardar tu carnet. Probá de nuevo en un rato.' }
  }
}

/** Baja del carnet del usuario de la sesión */
export async function deleteCarnet() {
  const user = await requireUser('/mi-carnet')
  try {
    await carnets.remove(user.uid)
    console.info('[carnet] baja')
  } catch (e) {
    console.error('[carnet] no se pudo borrar:', e)
    redirect('/mi-carnet?error=borrar')
  }
  refresh()
  redirect('/mi-carnet?ok=borrado')
}
