import { SessionProvider } from '@/context/SessionContext'
import { site } from '@/config/site'
import { getSessionUser } from '@/lib/firebase/session'
import './globals.css'

const description = 'Recorré la percha del vestuario xeneize: las camisetas de Boca Juniors 2026 en 3D, una por jugador. Tributo no oficial.'

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:4950'),
  title: { default: `${site.siteName} · Plantel ${site.season}`, template: `%s · ${site.name} ${site.season}` },
  description,
  icons: { icon: '/brand/escudo.svg' },
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    siteName: site.siteName,
    title: `${site.siteName} · Plantel ${site.season}`,
    description,
    images: [{ url: '/og/vestuario.jpg', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' },
}

export const viewport = {
  themeColor: '#050a18',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

/** Layout raíz: tipografías y tokens (globals.css) y el usuario activo para toda la app. */
export default async function RootLayout({ children }) {
  const user = await getSessionUser()
  return (
    <html lang="es-AR">
      <body className="bg-fondo font-sans text-claro antialiased">
        <SessionProvider user={user}>{children}</SessionProvider>
      </body>
    </html>
  )
}
