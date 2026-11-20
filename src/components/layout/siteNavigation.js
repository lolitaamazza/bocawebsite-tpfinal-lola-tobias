const publicLinks = [
  { href: '/', label: 'Vestuario 3D' },
  { href: '/cronologia', label: 'Cronología de camisetas' },
  { href: '/museo', label: 'Museo de camisetas' },
  { href: '/idolos', label: 'Salón de ídolos' },
  { href: '/bombonera', label: 'La Bombonera 3D' },
  { href: '/trivia', label: 'Trivia xeneize' },
  { href: '/carnet', label: 'Creá tu carnet de hincha' },
  { href: '/personaliza', label: 'Personalizá tu camiseta' },
]

const accountLinks = [
  { href: '/mis-remeras', label: 'Mis remeras', private: true },
  { href: '/mi-xi', label: 'Mi XI ideal', private: true },
  { href: '/mi-carnet', label: 'Mi carnet', private: true },
]

export function navigationLinks(signedIn) {
  return signedIn
    ? [...publicLinks, ...accountLinks]
    : [...publicLinks, ...accountLinks, { href: '/login', label: 'Ingresar', private: true }]
}

export function currentNavPage(pathname, href) {
  if (pathname === href) return 'page'
  if (href === '/' ? pathname?.startsWith('/dorsal/') : pathname?.startsWith(`${href}/`)) return 'location'
  return undefined
}
