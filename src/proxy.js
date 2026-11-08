import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/firebase/constants'

/**
 * Primera barrera de las rutas privadas: sin cookie de sesión, al login (y vuelve
 * después a donde iba). La cookie se verifica de verdad en el servidor, en el
 * layout de (cuenta) y en cada Server Action.
 */
export function proxy(request) {
  if (request.cookies.get(SESSION_COOKIE_NAME)?.value) return NextResponse.next()
  const login = new URL('/login', request.url)
  login.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)
  return NextResponse.redirect(login)
}

export const config = {
  matcher: ['/mis-remeras/:path*', '/mi-xi/:path*'],
}
