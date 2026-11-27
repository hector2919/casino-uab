// 🔊 Efectos de sonido sintetizados con Web Audio (sin archivos). Se activan tras el primer clic.
const SFX = (() => {
  let ac = null, master = null, amb = null, on = true, ambTimer = 0;
  try { on = localStorage.casinoSound !== '0'; } catch (e) {}

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = on ? 1 : 0; master.connect(ac.destination);
      startAmbient();
    } catch (e) { ac = null; }
  }
  function tone(f, d, type = 'sine', v = .15, when = 0, slide = 0) {
    if (!ac || !on) return;
    const t = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(master); o.start(t); o.stop(t + d + .05);
  }
  function noiseBuf(sec = 2) {
    const b = ac.createBuffer(1, ac.sampleRate * sec, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  // Murmullo de sala + campanitas de tragaperras lejanas
  function startAmbient() {
    const src = ac.createBufferSource(); src.buffer = noiseBuf(3); src.loop = true;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 140;
    amb = ac.createGain(); amb.gain.value = .045;
    src.connect(hp).connect(lp).connect(amb).connect(master); src.start();
    const chime = () => {
      if (ac && on && !document.hidden) {
        const base = [523, 659, 784, 988][Math.floor(Math.random() * 4)];
        [0, .09, .18].forEach((w, i) => tone(base * [1, 1.25, 1.5][i], .35, 'triangle', .012, w));
      }
      ambTimer = setTimeout(chime, 2500 + Math.random() * 6000);
    };
    chime();
  }
  const api = {
    init,
    get on() { return on; },
    toggle() {
      on = !on; try { localStorage.casinoSound = on ? '1' : '0'; } catch (e) {}
      if (master) master.gain.value = on ? 1 : 0;
      return on;
    },
    click()  { tone(880, .06, 'triangle', .07); },
    tick()   { tone(660, .09, 'square', .06); },
    go()     { tone(988, .35, 'square', .09); tone(1318, .4, 'square', .07, .08); },
    coin()   { tone(1318, .09, 'square', .07); tone(1760, .25, 'square', .07, .08); },
    win()    { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, .32, 'triangle', .12, i * .09)); },
    lose()   { tone(330, .3, 'sawtooth', .07); tone(247, .45, 'sawtooth', .07, .22); },
    door()   { tone(180, .5, 'sawtooth', .06, 0, 260); tone(520, .5, 'sine', .05, .1, 380); },
    ding()   { tone(1568, .5, 'sine', .1); tone(2093, .6, 'sine', .07, .12); },
    open()   { tone(520, .1, 'triangle', .07); tone(780, .14, 'triangle', .07, .06); },
    step()   { tone(70 + Math.random() * 20, .06, 'sine', .05); },
  };
  return api;
})();
