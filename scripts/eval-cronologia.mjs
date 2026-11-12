import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'

const site = process.env.CRONOLOGIA_URL ?? 'http://127.0.0.1:4950'
const devtools = process.env.CHROME_DEVTOOLS_URL ?? 'http://127.0.0.1:9229'
const page = await fetch(`${devtools}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json())
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true })
  ws.addEventListener('error', reject, { once: true })
})
let nextId = 0
const pending = new Map()
const errors = []
ws.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data)
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text)
  const request = pending.get(message.id)
  if (!request) return
  pending.delete(message.id)
  if (message.error) request.reject(new Error(message.error.message))
  else request.resolve(message.result)
})

function send(method, params = {}) {
  const id = ++nextId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
  return result.result.value
}

async function until(expression, timeout = 45000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (await evaluate(expression)) return
    await delay(150)
  }
  throw new Error(`No se cumplió: ${expression}`)
}

const timeline = 'document.querySelectorAll("nav ol button")'
const currentYear = 'document.querySelector("nav [aria-current]")?.textContent.trim()'

try {
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: `${site}/cronologia#camiseta-2000` })
  await until(`${currentYear} === "2000" && document.body.innerText.includes("Ver espalda")`)
  assert.equal(await evaluate(`${timeline}.length`), 10)
  assert.equal(await evaluate('document.querySelectorAll("canvas").length'), 1)
  const headings = new Set()
  for (let i = 0; i < 10; i++) {
    await evaluate(`${timeline}[${i}].click()`)
    await until(`${timeline}[${i}].hasAttribute("aria-current") && document.location.hash.length > 0`)
    headings.add(await evaluate('document.querySelector("h2").textContent'))
  }
  assert.equal(headings.size, 10)
  assert.equal(await evaluate('location.hash'), '#camiseta-2025')
  await evaluate('history.back()')
  await until(`${currentYear} === "2020"`)
  await evaluate('document.querySelector("figcaption button").click()')
  await until('document.body.innerText.includes("Ver frente")')
  await delay(500)

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await until('window.innerWidth === 390')
  assert.equal(await evaluate('document.documentElement.scrollWidth <= 390'), true)

  await evaluate('document.querySelector("canvas").getContext("webgl2").getExtension("WEBGL_lose_context").loseContext()')
  await until('document.querySelector("figure img")?.complete && document.querySelector("figure img").naturalWidth > 0')
  await evaluate(`${timeline}[0].click()`)
  await until(`${currentYear} === "1905" && document.querySelector("figure img")?.alt.includes("1905")`)
  assert.deepEqual(errors, [])
  console.log('Cronología: 10/10 piezas, enlace directo, historial, visor y giro, móvil y respaldo sin WebGL.')
} finally {
  ws.close()
  await fetch(`${devtools}/json/close/${page.id}`).catch(() => {})
}
