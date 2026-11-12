import { setTimeout as delay } from 'node:timers/promises'

/** Abre una pestaña de prueba en Chrome DevTools y la cierra al terminar. */
export async function openChromePage(devtools = process.env.CHROME_DEVTOOLS_URL ?? 'http://127.0.0.1:9229') {
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

  async function until(expression, timeout = 90000) {
    const deadline = Date.now() + timeout
    while (Date.now() < deadline) {
      if (await evaluate(`Boolean(${expression})`)) return
      await delay(150)
    }
    throw new Error(`No se cumplió: ${expression}`)
  }

  const close = async () => {
    ws.close()
    await fetch(`${devtools}/json/close/${page.id}`).catch(() => {})
  }

  return { send, evaluate, until, errors, close }
}
