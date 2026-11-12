import assert from 'node:assert/strict'
import { openChromePage } from './browser-session.mjs'

const site = process.env.NAVBAR_URL ?? 'http://127.0.0.1:4950'
const { send, evaluate, until, close, errors } = await openChromePage()
const trigger = 'document.querySelector(\'[aria-label="Menú de navegación"]\')'
const nav = 'document.querySelector(\'nav[aria-label="Navegación principal"]\')'
const expanded = `${trigger}?.getAttribute('aria-expanded')`
const opened = `${expanded} === 'true' && !${nav}?.hidden`
const closed = `${expanded} === 'false' && ${nav}?.hidden`

async function resize(width, height, mobile) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
  await until(`innerWidth === ${width}`)
}

async function press(key, windowsVirtualKeyCode) {
  const common = { key, code: key, windowsVirtualKeyCode }
  const down = key === 'Enter' ? { type: 'keyDown', text: '\r', unmodifiedText: '\r' } : { type: 'rawKeyDown' }
  await send('Input.dispatchKeyEvent', { ...common, ...down })
  await send('Input.dispatchKeyEvent', { ...common, type: 'keyUp' })
}

async function click(x, y) {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 })
}

async function go(path) {
  await evaluate(`${nav}.querySelector('a[href="${path}"]').click()`)
  await until(`location.pathname === '${path}' && ${closed}`)
}

try {
  await send('Runtime.enable')
  await send('Page.bringToFront')
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await resize(1280, 800, false)
  await send('Page.navigate', { url: site })
  await until(`document.querySelector('#vestuario-stage canvas') && ${closed} && getComputedStyle(${trigger}.closest('header')).opacity === '1'`)
  const button = await evaluate(`(() => { const { x, y, width, height } = ${trigger}.getBoundingClientRect(); return { x: x + width / 2, y: y + height / 2 } })()`)
  await until(`document.elementFromPoint(${button.x}, ${button.y})?.closest('button') === ${trigger}`)
  await click(button.x, button.y)
  await until(opened)
  await go('/cronologia')
  await evaluate("location.hash = 'camiseta-1996'; true")
  await until(`document.querySelector('canvas') && document.querySelector('#camiseta-titulo') && ${closed}`)
  await evaluate(`${trigger}.focus()`)
  await press('Enter', 13)
  await until(opened)
  assert.equal(await evaluate(`${nav}.querySelectorAll('a').length`), 8)
  assert.equal(await evaluate(`${nav}.querySelector('[aria-current="page"]').getAttribute('href')`), '/cronologia')
  await press('Tab', 9)
  assert.equal(await evaluate('document.activeElement.getAttribute("href")'), '/')
  await press('Escape', 27)
  await until(`${closed} && document.activeElement === ${trigger}`)
  assert.equal(await evaluate('location.hash'), '#camiseta-1996', 'Escape cierra el menú antes que la ficha 3D')

  await evaluate(`${trigger}.click()`)
  await until(opened)
  await click(640, 20)
  await until(closed)

  await evaluate(`${trigger}.click()`)
  await until(opened)
  await go('/museo')
  await resize(320, 680, true)
  await evaluate(`${trigger}.click()`)
  await until(opened)
  const rect = await evaluate(`(() => { const { left, right, bottom } = ${nav}.getBoundingClientRect(); return { left, right, bottom } })()`)
  assert(rect.left >= 0 && rect.right <= 320 && rect.bottom <= 680, 'El desplegable entra completo a 320 px')
  await go('/journey')
  await evaluate(`${trigger}.click()`)
  await until(opened)
  await evaluate(`${nav}.querySelector('a[href="/mi-xi"]').click()`)
  await until(`location.pathname === '/login' && ${closed}`)
  assert.equal(await evaluate('new URLSearchParams(location.search).get("next")'), '/mi-xi')
  assert.deepEqual(errors, [])
  console.log('Menú: navegación desde la escena 3D, teclado, clic afuera, ruta activa, ancho de 320 px y vuelta desde login.')
} finally {
  await close()
}
