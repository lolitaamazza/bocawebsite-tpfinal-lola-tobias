import { describe, expect, it } from 'vitest'
import { currentNavPage, navigationLinks } from './siteNavigation'

describe('Menú principal', () => {
  it('ofrece cada sección del sitio una sola vez y permite entrar a la cuenta', () => {
    const links = navigationLinks(false)
    expect(links.map(({ href }) => href)).toEqual(['/', '/cronologia', '/museo', '/journey', '/personaliza', '/mis-remeras', '/mi-xi', '/login'])
    expect(navigationLinks(true).map(({ href }) => href)).toEqual(links.slice(0, -1).map(({ href }) => href))
  })

  it('distingue la página exacta de la sección de una ficha o pantalla privada', () => {
    expect(currentNavPage('/cronologia', '/cronologia')).toBe('page')
    expect(currentNavPage('/', '/')).toBe('page')
    expect(currentNavPage('/dorsal/10', '/')).toBe('location')
    expect(currentNavPage('/mis-remeras/vestuario', '/mis-remeras')).toBe('location')
    expect(currentNavPage('/mi-xi/nuevo', '/mi-xi')).toBe('location')
    expect(currentNavPage('/mis-remeras-ajenas', '/mis-remeras')).toBeUndefined()
    expect(currentNavPage('/museo', '/')).toBeUndefined()
    expect(currentNavPage(null, '/')).toBeUndefined()
  })
})
