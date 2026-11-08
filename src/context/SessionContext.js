'use client'

import { createContext, useContext } from 'react'

/**
 * Usuario activo para toda la app (Context API). El servidor lo lee de la cookie
 * de sesión en el layout raíz y lo baja acá; los componentes cliente lo leen con
 * useSession() sin volver a preguntarle a Firebase.
 */
const SessionContext = createContext(null)

export function SessionProvider({ user, children }) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>
}

/** @returns {{ uid: string, email: string | null, name: string, picture: string | null } | null} */
export function useSession() {
  return useContext(SessionContext)
}
