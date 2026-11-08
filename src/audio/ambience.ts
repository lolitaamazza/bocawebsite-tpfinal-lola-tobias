/**
 * Sonido del vestuario, todo sintetizado con WebAudio (sin archivos):
 *  - rumor grave de fondo (ruido filtrado)
 *  - roce metálico de las perchas mientras el riel se desliza
 *  - "clinc" al pasar de remera, y un soplido al abrir y cerrar la ficha
 * Arranca mudo; el navegador exige un gesto del usuario para sonar.
 */
export class Ambience {
  private ctx?: AudioContext
  private master?: GainNode
  private slideGain?: GainNode
  private noise?: AudioBuffer
  private lastTick = 0
  enabled = false

  setEnabled(on: boolean, chime = false) {
    this.enabled = on
    if (on) {
      this.unlock()
      if (chime) this.ctx!.resume().then(() => this.enabled && this.clink(0.035), () => {})
    }
    if (!this.ctx || !this.master) return
    this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.08)
    if (!on) {
      const ctx = this.ctx
      setTimeout(() => !this.enabled && void ctx.suspend().catch(() => {}), 400)
    }
  }

  /** Crea el contexto (si hace falta) y lo reanuda. Llamar dentro de un gesto. */
  unlock() {
    if (!this.ctx) this.start()
    if (this.ctx!.state !== 'running') this.ctx!.resume().catch(() => {})
  }

  private start() {
    const ctx = (this.ctx = new AudioContext())
    this.master = ctx.createGain()
    this.master.gain.value = 0
    this.master.connect(ctx.destination)
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = this.noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1

    const rumble = ctx.createBiquadFilter()
    rumble.type = 'lowpass'
    rumble.frequency.value = 170
    const rumbleGain = ctx.createGain()
    rumbleGain.gain.value = 0.11
    this.loop().connect(rumble).connect(rumbleGain).connect(this.master)

    const hiss = ctx.createBiquadFilter()
    hiss.type = 'bandpass'
    hiss.frequency.value = 2600
    hiss.Q.value = 0.9
    this.slideGain = ctx.createGain()
    this.slideGain.gain.value = 0
    this.loop().connect(hiss).connect(this.slideGain).connect(this.master)
  }

  private loop() {
    const src = this.ctx!.createBufferSource()
    src.buffer = this.noise!
    src.loop = true
    src.start()
    return src
  }

  /** Ráfaga de ruido filtrado con envolvente (opcionalmente con barrido de frecuencia) */
  private burst(freq: number, q: number, peak: number, attack: number, release: number, sweepTo?: number) {
    const ctx = this.ctx!
    const now = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.noise!
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.setValueAtTime(freq, now)
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, now + attack + release)
    f.Q.value = q
    const g = ctx.createGain()
    g.gain.setValueAtTime(1e-4, now)
    g.gain.exponentialRampToValueAtTime(peak, now + attack)
    g.gain.exponentialRampToValueAtTime(1e-4, now + attack + release)
    src.connect(f).connect(g).connect(this.master!)
    src.start(now, Math.random())
    src.stop(now + attack + release + 0.05)
  }

  /** Tintineo metálico: tres parciales inarmónicos que decaen rápido */
  private clink(level: number, pitch = 1) {
    const ctx = this.ctx!
    const now = ctx.currentTime
    for (const [hz, amp, decay] of [
      [3120, 1, 0.16],
      [4710, 0.55, 0.11],
      [6890, 0.3, 0.07],
    ]) {
      const osc = ctx.createOscillator()
      osc.frequency.value = hz * pitch * (0.985 + Math.random() * 0.03)
      const g = ctx.createGain()
      g.gain.setValueAtTime(level * amp, now)
      g.gain.exponentialRampToValueAtTime(1e-4, now + decay)
      osc.connect(g).connect(this.master!)
      osc.start(now)
      osc.stop(now + decay + 0.02)
    }
  }

  /** Al pasar de una remera a otra (con límite de frecuencia) */
  tick() {
    if (!this.enabled || !this.ctx) return
    const now = performance.now()
    if (now - this.lastTick < 70) return
    this.lastTick = now
    this.burst(3400, 1.4, 0.05, 0.004, 0.06)
    this.clink(0.012, 0.9 + Math.random() * 0.25)
  }

  open() {
    if (!this.enabled || !this.ctx) return
    this.clink(0.03)
    this.burst(420, 0.7, 0.16, 0.12, 0.42, 2400)
  }

  close() {
    if (!this.enabled || !this.ctx) return
    this.burst(2100, 0.7, 0.1, 0.06, 0.34, 380)
    setTimeout(() => this.enabled && this.clink(0.022, 0.82), 330)
  }

  /** Roce de perchas proporcional a la velocidad del riel */
  slide(speed: number) {
    if (!this.ctx || !this.slideGain) return
    const v = this.enabled ? Math.min(Math.abs(speed), 2.5) : 0
    this.slideGain.gain.setTargetAtTime(Math.min(0.09, v * 0.05), this.ctx.currentTime, 0.06)
  }
}
