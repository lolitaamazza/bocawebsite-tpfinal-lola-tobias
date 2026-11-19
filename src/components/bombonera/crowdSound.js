/**
 * Murmullo de tribuna sintetizado con WebAudio (sin archivos): ruido filtrado
 * en la banda de las voces que respira despacio, un rumor grave y, cada tanto,
 * una ola que crece y se apaga como un "uhhh". Desde la vista aérea se oye
 * apagado (filtro pasabajos); sentado en la tribuna, abierto.
 * Arranca mudo: el navegador exige un gesto del usuario para sonar.
 */
export class CrowdSound {
  ctx = null
  master = null
  tone = null
  swell = null
  timer = 0
  enabled = false

  /** Llamar dentro de un gesto (clic en el botón de sonido) */
  setEnabled(on) {
    this.enabled = on
    if (on && !this.ctx) this.start()
    if (!this.ctx) return
    const now = this.ctx.currentTime
    if (on) {
      this.ctx.resume().catch(() => {})
      this.scheduleSwell()
    } else clearTimeout(this.timer)
    this.master.gain.setTargetAtTime(on ? 0.85 : 0, now, 0.25)
    if (!on) {
      const ctx = this.ctx
      setTimeout(() => !this.enabled && void ctx.suspend().catch(() => {}), 900)
    }
  }

  /** aerial: oído lejano (más grave y apagado) */
  setAerial(aerial) {
    if (!this.ctx) return
    this.tone.frequency.setTargetAtTime(aerial ? 700 : 5200, this.ctx.currentTime, 0.6)
  }

  start() {
    const ctx = (this.ctx = new AudioContext())
    this.master = ctx.createGain()
    this.master.gain.value = 0
    this.tone = ctx.createBiquadFilter()
    this.tone.type = 'lowpass'
    this.tone.frequency.value = 700
    this.tone.connect(this.master).connect(ctx.destination)

    const noise = ctx.createBuffer(2, ctx.sampleRate * 3, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = noise.getChannelData(ch)
      // ruido rosado aproximado (filtro de Paul Kellet, versión corta)
      let b0 = 0
      let b1 = 0
      let b2 = 0
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1
        b0 = 0.99765 * b0 + w * 0.099046
        b1 = 0.963 * b1 + w * 0.2965164
        b2 = 0.57 * b2 + w * 1.0526913
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2
      }
    }
    const loop = () => {
      const src = ctx.createBufferSource()
      src.buffer = noise
      src.loop = true
      src.start(0, Math.random() * 2)
      return src
    }
    // voces: banda media que respira con un LFO lento
    const voices = ctx.createBiquadFilter()
    voices.type = 'bandpass'
    voices.frequency.value = 650
    voices.Q.value = 0.55
    const voiceGain = ctx.createGain()
    voiceGain.gain.value = 0.5
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.09
    const lfoDepth = ctx.createGain()
    lfoDepth.gain.value = 0.14
    lfo.connect(lfoDepth).connect(voiceGain.gain)
    lfo.start()
    loop().connect(voices).connect(voiceGain).connect(this.tone)
    // rumor grave
    const low = ctx.createBiquadFilter()
    low.type = 'lowpass'
    low.frequency.value = 180
    const lowGain = ctx.createGain()
    lowGain.gain.value = 0.4
    loop().connect(low).connect(lowGain).connect(this.tone)
    // la ola: misma banda de voces, con su propia envolvente
    const swellBand = ctx.createBiquadFilter()
    swellBand.type = 'bandpass'
    swellBand.frequency.value = 520
    swellBand.Q.value = 0.8
    this.swell = ctx.createGain()
    this.swell.gain.value = 0
    loop().connect(swellBand).connect(this.swell).connect(this.tone)
  }

  scheduleSwell() {
    clearTimeout(this.timer)
    this.timer = setTimeout(
      () => {
        if (!this.enabled || !this.ctx) return
        const g = this.swell.gain
        const now = this.ctx.currentTime
        g.cancelScheduledValues(now)
        g.setValueAtTime(g.value, now)
        g.linearRampToValueAtTime(0.55 + Math.random() * 0.3, now + 1.4)
        g.linearRampToValueAtTime(0, now + 4.2)
        this.scheduleSwell()
      },
      7000 + Math.random() * 9000,
    )
  }

  dispose() {
    clearTimeout(this.timer)
    this.enabled = false
    this.ctx?.close().catch(() => {})
    this.ctx = null
  }
}
