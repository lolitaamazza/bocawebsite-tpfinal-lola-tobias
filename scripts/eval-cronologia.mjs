import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { openChromePage } from './browser-session.mjs'

const site = process.env.CRONOLOGIA_URL ?? 'http://127.0.0.1:4950'
const { send, evaluate, until, errors, close } = await openChromePage()

const timelineNav = `document.querySelector('nav[aria-label="Línea de tiempo de camisetas"]')`
const timeline = `${timelineNav}.querySelectorAll('button')`
const currentYear = `${timelineNav}.querySelector('[aria-current]')?.textContent.trim()`

async function drag(x, y, toX) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 })
  for (let i = 1; i <= 10; i++) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + (toX - x) * i / 10, y, button: 'left', buttons: 1 })
    await delay(22)
  }
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: toX, y, button: 'left', buttons: 0, clickCount: 1 })
}

async function screenshot() {
  return (await send('Page.captureScreenshot')).data
}

try {
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: `${site}/cronologia` })
  await until('document.querySelector("canvas") && !document.querySelector("[role=status]")')
  assert.equal(await evaluate(`${timeline}.length`), 10)
  assert.equal(await evaluate('document.querySelectorAll("canvas").length'), 1)
  assert.equal(await evaluate(currentYear), '1905')
  if (process.env.CRONOLOGIA_SCREENSHOT) {
    await writeFile(`${process.env.CRONOLOGIA_SCREENSHOT}-riel.png`, Buffer.from(await screenshot(), 'base64'))
  }
  for (const type of ['mousePressed', 'mouseReleased']) {
    await send('Input.dispatchMouseEvent', { type, x: 720, y: 430, button: 'left', clickCount: 1 })
  }
  await until('location.hash === "#camiseta-1905" && document.querySelector("h2")')
  await evaluate(`document.querySelector('[aria-label="Cerrar ficha"]').click()`)
  await until('!location.hash')
  await drag(950, 430, 470)
  await until(`${currentYear} !== "1905"`)
  assert.equal(await evaluate('location.hash'), '')

  const headings = new Set()
  for (let i = 0; i < 10; i++) {
    await evaluate(`${timeline}[${i}].click()`)
    await until(`${timeline}[${i}].hasAttribute("aria-current") && document.location.hash.length > 0`)
    headings.add(await evaluate('document.querySelector("h2").textContent'))
  }
  assert.equal(headings.size, 10)
  assert.equal(await evaluate('location.hash'), '#camiseta-2025')
  await evaluate('history.back()')
  await until(`${currentYear} === "2020" && document.querySelector("h2")?.textContent === "Vuelven las tres tiras"`)
  await evaluate(`${timeline}[5].click()`)
  await delay(1150)
  const front = await screenshot()
  if (process.env.CRONOLOGIA_SCREENSHOT) {
    await writeFile(`${process.env.CRONOLOGIA_SCREENSHOT}-ficha.png`, Buffer.from(front, 'base64'))
  }
  await drag(430, 402, 650)
  await delay(750)
  assert.notEqual(await screenshot(), front)
  assert.equal(await evaluate('location.hash'), '#camiseta-1996')

  await evaluate(`document.querySelector('[aria-label="Cerrar ficha"]').click()`)
  await until('!document.querySelector("h2") && !location.hash')
  await send('Page.navigate', { url: `${site}/cronologia#camiseta-2000` })
  await until(`${currentYear} === "2000" && document.querySelector("h2")?.textContent === "De Boca al mundo"`)

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await until('window.innerWidth === 390')
  assert.equal(await evaluate('document.documentElement.scrollWidth <= 390'), true)
  if (process.env.CRONOLOGIA_SCREENSHOT) {
    await delay(850)
    await writeFile(`${process.env.CRONOLOGIA_SCREENSHOT}-movil.png`, Buffer.from(await screenshot(), 'base64'))
  }

  await evaluate('document.querySelector("canvas").getContext("webgl2").getExtension("WEBGL_lose_context").loseContext()')
  await until('document.querySelector("figure img")?.complete && document.querySelector("figure img").naturalWidth > 0')
  await evaluate(`${timeline}[0].click()`)
  await until(`${currentYear} === "1905" && document.querySelector("figure img")?.alt.includes("1905")`)
  assert.deepEqual(errors, [])
  console.log('Cronología: arrastre del riel, 10/10 fichas, giro, historial, enlace directo, móvil y respaldo sin WebGL.')
} finally {
  await close()
}
