import { NextResponse } from 'next/server'
import { createSessionCookie, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/firebase/session'

export async function POST(request) {
  const { idToken } = await request.json()

  if (!idToken) {
    return NextResponse.json({ error: 'Missing Firebase ID token.' }, { status: 400 })
  }

  try {
    const sessionCookie = await createSessionCookie(idToken)
    const response = NextResponse.json({ ok: true })

    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      maxAge: SESSION_MAX_AGE,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })

    return response
  } catch {
    return NextResponse.json({ error: 'Could not create a server session.' }, { status: 401 })
  }
}
