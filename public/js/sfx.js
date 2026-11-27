// ¡DERRAPA! · Sonidos sintetizados con Web Audio (sin archivos): motores, derrape, frenos, turbo, golpes, objetos y música de victoria.
(function () {
'use strict';
class Sfx {
  constructor() {
    this.ac = null; this.muted = false; this.voices = new Map();
    try { this.muted = localStorage.getItem('derrapa-mute') === '1'; } catch (e) {}
  }
  // El navegador exige un clic antes de sonar
  unlock() {
    try {
      if (!this.ac) {
        this.ac = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ac.createGain(); this.master.gain.value = this.muted ? 0 : 0.8;
        this.comp = this.ac.createDynamicsCompressor(); this.master.connect(this.comp).connect(this.ac.destination);
        // ruido blanco reutilizable
        const len = this.ac.sampleRate * 1.5, b = this.ac.createBuffer(1, len, this.ac.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.noiseBuf = b;
        // capa de derrape continua
        this.skid = this.noiseLoop('bandpass', 1800, 0);
        this.brakeN = this.noiseLoop('bandpass', 3200, 0);
      }
      this.ac.resume();
    } catch (e) { this.ac = null; }
  }
  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('derrapa-mute', m ? '1' : '0'); } catch (e) {}
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ac.currentTime, 0.05);
  }
  noiseLoop(type, freq, gain) {
    const src = this.ac.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = this.ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = 3;
    const g = this.ac.createGain(); g.gain.value = gain;
    src.connect(f).connect(g).connect(this.master); src.start();
    return { src, f, g };
  }
  tone(freq, dur, type = 'square', vol = 0.12, slide = 0, delay = 0) {
    if (!this.ac) return;
    const t = this.ac.currentTime + delay, o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  }
  noise(dur, freq, vol = 0.3, type = 'lowpass', slideTo = 0) {
    if (!this.ac) return;
    const t = this.ac.currentTime, s = this.ac.createBufferSource(), f = this.ac.createBiquadFilter(), g = this.ac.createGain();
    s.buffer = this.noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(this.master); s.start(t); s.stop(t + dur + 0.05);
  }
  // ---- Sonidos sueltos ----
  beep(hi) { this.tone(hi ? 880 : 440, hi ? 0.5 : 0.18, 'square', 0.1); }
  pick() { [660, 880, 1320].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.08, 0, i * 0.05)); }
  turbo() { this.noise(0.6, 400, 0.35, 'bandpass', 3000); this.tone(120, 0.5, 'sawtooth', 0.08, 3); }
  hit() { this.noise(0.35, 900, 0.5, 'lowpass', 120); this.tone(180, 0.3, 'square', 0.1, 0.3); }
  boom() { this.noise(0.8, 600, 0.7, 'lowpass', 60); }
  bump() { this.noise(0.12, 500, 0.35, 'lowpass', 100); }
  use() { this.tone(520, 0.12, 'sawtooth', 0.06, 1.8); }
  block() { this.tone(1200, 0.25, 'sine', 0.12, 0.5); }
  lap() { this.tone(740, 0.1, 'square', 0.07); this.tone(988, 0.15, 'square', 0.07, 0, 0.1); }
  finalLap() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'square', 0.08, 0, i * 0.11)); }
  fanfare() { [[523, 0], [659, .15], [784, .3], [1047, .45], [784, .7], [1047, .85]].forEach(([f, d]) => { this.tone(f, 0.3, 'square', 0.07, 0, d); this.tone(f / 2, 0.3, 'triangle', 0.06, 0, d); }); }

  // ---- Motores: una voz por kart (hasta 8), con panorámica según dónde está en pantalla ----
  update(view, project, width) {
    if (!this.ac || this.muted) { if (this.ac) this.voices.forEach(v => v.g.gain.setTargetAtTime(0, this.ac.currentTime, 0.1)); return; }
    const t = this.ac.currentTime, live = new Set();
    const racing = view.state === 'racing' || view.state === 'countdown';
    const list = view.players.slice(0, 8);
    let drifting = 0, braking = 0;
    for (const p of list) {
      live.add(p.id);
      let v = this.voices.get(p.id);
      if (!v) {
        const o = this.ac.createOscillator(), o2 = this.ac.createOscillator(), f = this.ac.createBiquadFilter(), g = this.ac.createGain(), pan = this.ac.createStereoPanner();
        o.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 600; g.gain.value = 0;
        o.connect(f); o2.connect(f); f.connect(g).connect(pan).connect(this.master); o.start(); o2.start();
        v = { o, o2, f, g, pan, base: 0.9 + Math.random() * 0.2 }; this.voices.set(p.id, v);
      }
      const sp = Math.abs(p.sp || 0), r = Math.min(1.6, sp / 400);
      const f0 = (48 + r * 95 + (p.boost ? 40 : 0)) * v.base;
      v.o.frequency.setTargetAtTime(f0, t, 0.08); v.o2.frequency.setTargetAtTime(f0 * 0.5, t, 0.08);
      v.f.frequency.setTargetAtTime(300 + r * 1400, t, 0.1);
      const vol = racing ? (0.03 + r * 0.035) / Math.sqrt(list.length) * (p.finished ? 0.4 : 1) : 0;
      v.g.gain.setTargetAtTime(vol, t, 0.15);
      const sc = project && project(p.x, 0, p.y);
      if (sc) v.pan.pan.setTargetAtTime(Math.max(-0.8, Math.min(0.8, sc[0] / width * 2 - 1)), t, 0.1);
      if (p.drift >= 0 && sp > 100) drifting++;
      if (p.br && sp > 80) braking++;
    }
    for (const [id, v] of this.voices) if (!live.has(id)) { v.g.gain.setTargetAtTime(0, t, 0.1); setTimeout(() => { try { v.o.stop(); v.o2.stop(); } catch (e) {} }, 400); this.voices.delete(id); }
    this.skid.g.gain.setTargetAtTime(Math.min(0.12, drifting * 0.05), t, 0.08);
    this.skid.f.frequency.setTargetAtTime(1500 + Math.sin(t * 20) * 300, t, 0.05);
    this.brakeN.g.gain.setTargetAtTime(Math.min(0.1, braking * 0.06), t, 0.05);
  }
}
window.Sfx = Sfx;
})();
