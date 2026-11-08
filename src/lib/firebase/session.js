import { cookies } from 'next/headers'
import { getAdminAuth } from './admin.js'
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE } from './constants.js'

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE }

export async function createSessionCookie(idToken) {
  return getAdminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE * 1000,
  })
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!sessionCookie) {
    return null
  }

  try {
    return await getAdminAuth().verifySessionCookie(sessionCookie, true)
  } catch {
    return null
  }
}

/**
 * Datos del usuario que viajan al cliente (Context de sesión). Solo lo serializable
 * y necesario para la UI: nunca el token ni la cookie.
 */
export async function getSessionUser() {
  const decoded = await getCurrentUser()
  if (!decoded) return null
  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    name: decoded.name ?? decoded.email?.split('@')[0] ?? 'Hincha',
    picture: decoded.picture ?? null,
  }
}
