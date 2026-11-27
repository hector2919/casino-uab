// ¡DERRAPA! · Escena 3D: circuito, decorado de casino, karts, ambientes, cámara y efectos.
// El mundo del servidor es 2D (x, y). Aquí se pinta en 3D: x → X, y → Z, y la altura es Y.
(function () {
'use strict';
const { M4, Geo, Engine, hex } = window.DERRAPA3D;
const rnd = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angLerp = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

// Semilla fija: el decorado sale igual en cada recarga
let seed = 7;
const srnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (seed / 2147483647) * (b - a); };

// ======================= Ambientes =======================
const PRESETS = {
  day: {
    zen: '#2a6fd8', hor: '#bfe2ff', band: '#ffffff', bandK: 0, fog: '#c9e3fb', fogDen: 0.00018,
    sunEl: 50, sunAz: -60, sunCol: [1.08, 1.0, 0.9], sunDisc: [1.0, 0.95, 0.8], sunSize: 0.0016,
    skyAmb: [0.38, 0.43, 0.54], gndAmb: [0.24, 0.23, 0.19], nightGlow: 0, spec: 0.3, wet: 0.1,
    shadowK: 0.85, stars: 0, clouds: 0.75, lightK: 0, grass: [1, 1, 1], under: 0,
  },
  sunset: {
    zen: '#2b1d63', hor: '#ff9152', band: '#ff4f8b', bandK: 0.6, fog: '#d9806f', fogDen: 0.0003,
    sunEl: 7, sunAz: -112, sunCol: [1.35, 0.66, 0.34], sunDisc: [1.0, 0.55, 0.2], sunSize: 0.003,
    skyAmb: [0.4, 0.27, 0.42], gndAmb: [0.22, 0.12, 0.14], nightGlow: 0.45, spec: 0.7, wet: 0.45,
    shadowK: 0.85, stars: 0.12, clouds: 0.65, lightK: 0.45, grass: [1.0, 0.86, 0.72], under: 0.35,
  },
  night: {
    zen: '#04030d', hor: '#2a0f4d', band: '#8a2be2', bandK: 0.45, fog: '#170a2e', fogDen: 0.00034,
    sunEl: 38, sunAz: -100, sunCol: [0.17, 0.19, 0.36], sunDisc: [0.75, 0.8, 1.0], sunSize: 0.0012,
    skyAmb: [0.1, 0.08, 0.2], gndAmb: [0.05, 0.035, 0.08], nightGlow: 1, spec: 1.0, wet: 1,
    shadowK: 0.55, stars: 1, clouds: 0.12, lightK: 1, grass: [0.75, 0.8, 1.0], under: 1,
  },
};
function presetVec(p) {
  const el = p.sunEl * Math.PI / 180, az = p.sunAz * Math.PI / 180;
  return {
    zen: hex(p.zen), hor: hex(p.hor), band: hex(p.band), bandK: p.bandK, fog: hex(p.fog), fogDen: p.fogDen,
    sunDir: [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)],
    sunCol: p.sunCol, sunDisc: p.sunDisc, sunSize: p.sunSize, skyAmb: p.skyAmb, gndAmb: p.gndAmb,
    nightGlow: p.nightGlow, spec: p.spec, wet: p.wet, shadowK: p.shadowK, stars: p.stars, clouds: p.clouds,
    lightK: p.lightK, grass: p.grass, under: p.under,
  };
}
const ENVS = { day: presetVec(PRESETS.day), sunset: presetVec(PRESETS.sunset), night: presetVec(PRESETS.night) };
function lerpEnv(cur, tgt, k) {
  for (const key in tgt) {
    const a = cur[key], b = tgt[key];
    if (Array.isArray(b)) for (let i = 0; i < b.length; i++) a[i] = lerp(a[i], b[i], k);
    else cur[key] = lerp(a, b, k);
  }
  const d = cur.sunDir, l = Math.hypot(d[0], d[1], d[2]); d[0] /= l; d[1] /= l; d[2] /= l;
}
const cloneEnv = e => JSON.parse(JSON.stringify(e));

// ======================= Texturas generadas con canvas =======================
function canvas(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
function noise(g, w, h, n, colors, size = 2) {
  for (let i = 0; i < n; i++) { g.fillStyle = colors[(Math.random() * colors.length) | 0]; g.fillRect(Math.random() * w, Math.random() * h, size, size); }
}
const TEX = {
  asphalt: () => canvas(512, 512, (g, w, h) => {
    g.fillStyle = '#5b5e66'; g.fillRect(0, 0, w, h);
    noise(g, w, h, 26000, ['#50535b', '#666971', '#484b52', '#70737b', '#5f6168'], 2);
    // parches y grietas suaves
    for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(30,30,36,.12)'; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 40 + Math.random() * 60, 20 + Math.random() * 30, Math.random() * 3, 0, 7); g.fill(); }
    // líneas de borde blancas y línea central discontinua
    g.fillStyle = '#f2f2f2'; g.fillRect(18, 0, 9, h); g.fillRect(w - 27, 0, 9, h);
    g.fillStyle = '#f5f0d8'; g.fillRect(w / 2 - 4, 0, 8, h * 0.45);
    // trazada oscura en el centro de cada carril (desgaste de neumáticos)
    const grd = g.createLinearGradient(0, 0, w, 0);
    grd.addColorStop(0.2, 'rgba(0,0,0,0)'); grd.addColorStop(0.3, 'rgba(0,0,0,.10)'); grd.addColorStop(0.4, 'rgba(0,0,0,0)');
    grd.addColorStop(0.6, 'rgba(0,0,0,0)'); grd.addColorStop(0.7, 'rgba(0,0,0,.10)'); grd.addColorStop(0.8, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  }),
  grass: () => canvas(256, 256, (g, w, h) => {
    for (let y = 0; y < h; y += 32) { g.fillStyle = (y / 32) % 2 ? '#5aa548' : '#4f9840'; g.fillRect(0, y, w, 32); }
    noise(g, w, h, 9000, ['#3f8a33', '#64b052', '#4a9a3b', '#72bb5c', '#44913a'], 2);
  }),
  checker: () => canvas(64, 64, (g) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fafafa'; g.fillRect(x * 8, y * 8, 8, 8); } }),
  box: () => canvas(128, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#d9d9d9');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#fff'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = '#222'; g.font = 'bold 96px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', w / 2, h / 2 + 6);
  }),
  pad: () => canvas(128, 256, (g, w, h) => {
    g.fillStyle = '#1a1030'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 4; k++) {
      const y = k * 64;
      g.fillStyle = k % 2 ? '#ffb300' : '#ff6a00';
      g.beginPath(); g.moveTo(10, y + 56); g.lineTo(w / 2, y + 10); g.lineTo(w - 10, y + 56); g.lineTo(w - 10, y + 38); g.lineTo(w / 2, y - 8 + 26); g.lineTo(10, y + 38); g.closePath(); g.fill();
    }
    g.strokeStyle = '#ffe066'; g.lineWidth = 8; g.strokeRect(4, -10, w - 8, h + 20);
  }),
  sign: (text, c1, c2, fg = '#fff', w = 512, h = 128, glow = '#ff4fd8') => canvas(w, h, (g) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = glow; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
    for (let x = 22; x < w - 10; x += 26) { g.fillStyle = '#fff6c8'; g.beginPath(); g.arc(x, 16, 4, 0, 7); g.arc(x, h - 16, 4, 0, 7); g.fill(); }
    let fs = Math.round(h * 0.52); g.font = `900 italic ${fs}px system-ui, sans-serif`;
    while (g.measureText(text).width > w - 60 && fs > 10) { fs -= 2; g.font = `900 italic ${fs}px system-ui, sans-serif`; }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = glow; g.shadowBlur = 18; g.fillStyle = fg; g.fillText(text, w / 2, h / 2 + 4);
    g.shadowBlur = 0; g.lineWidth = 3; g.strokeStyle = '#0006'; g.strokeText(text, w / 2, h / 2 + 4);
  }),
};

// ======================= Construcción del mundo =======================
class World3D {
  constructor(cv, T, labelLayer) {
    this.eng = new Engine(cv);
    this.T = T; this.labels = labelLayer;
    this.env = cloneEnv(ENVS.day); this.envTarget = ENVS.day; this.ambient = null;
    this.camMode = 'auto';
    this.cam = { eye: [800, 900, 1500], target: [800, 0, 450], shake: 0, fov: 50 * Math.PI / 180 };
    this.karts = new Map();
    this.particles = []; this.glowStatic = [];
    this.boxAppear = T.boxes.map(() => 0);
    this.prevBoxes = null;
    this.time = 0;
    this.resScale = Math.min(window.devicePixelRatio || 1, 1.5);
    this.frameTimes = [];
    this.build();
  }

  // Normales y anchura del circuito
  trackFrame() {
    const P = this.T.pts, n = P.length, out = [];
    let s = 0;
    for (let i = 0; i < n; i++) {
      const a = P[(i - 1 + n) % n], b = P[(i + 1) % n], c = P[i];
      let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      if (i > 0) s += Math.hypot(c[0] - P[i - 1][0], c[1] - P[i - 1][1]);
      out.push({ x: c[0], z: c[1], tx, tz, nx: -tz, nz: tx, s });
    }
    this.trackLen = s + Math.hypot(P[0][0] - P[n - 1][0], P[0][1] - P[n - 1][1]);
    return out;
  }
  distToTrack(x, z) {
    let best = Infinity; const P = this.T.pts;
    for (let i = 0; i < P.length; i += 2) { const d = (P[i][0] - x) ** 2 + (P[i][1] - z) ** 2; if (d < best) best = d; }
    return Math.sqrt(best);
  }

  build() {
    const E = this.eng, T = this.T, HW = T.HALF_W;
    const F = this.F = this.trackFrame();
    this.tex = {
      asphalt: E.texture(TEX.asphalt()), grass: E.texture(TEX.grass()), checker: E.texture(TEX.checker()),
      box: E.texture(TEX.box()), pad: E.texture(TEX.pad()),
    };
    this.statics = [];   // {mesh, model, o, shadow, kind}
    const ID = M4.ident();
    const add = (geo, o = {}, shadow = false, kind = '') => { const m = { mesh: E.mesh(geo), model: ID, o, shadow, kind }; this.statics.push(m); return m; };

    // ---- Suelo de césped (grande, se pierde en la niebla) ----
    const ground = new Geo();
    const G0 = [-1600, -1400], G1 = [3200, 2300], gs = 260;
    ground.quad([G0[0], 0, G1[1]], [G1[0], 0, G1[1]], [G1[0], 0, G0[1]], [G0[0], 0, G0[1]], '#ffffff', 0,
      [[G0[0] / gs, G1[1] / gs], [G1[0] / gs, G1[1] / gs], [G1[0] / gs, G0[1] / gs], [G0[0] / gs, G0[1] / gs]], [0, 1, 0]);
    this.groundM = add(ground, { tex: this.tex.grass, spec: 0.05, kind: 'grass' });

    // ---- Asfalto ----
    const road = new Geo(), n = F.length, VT = 150;
    for (let i = 0; i <= n; i++) {
      const f = F[i % n], v = (i === n ? this.trackLen : f.s) / VT;
      road.v(f.x - f.nx * HW, 0.5, f.z - f.nz * HW, 0, 1, 0, [1, 1, 1], 0, 0, v);
      road.v(f.x + f.nx * HW, 0.5, f.z + f.nz * HW, 0, 1, 0, [1, 1, 1], 0, 1, v);
    }
    for (let i = 0; i < n; i++) { const a = i * 2; road.i.push(a, a + 1, a + 3, a, a + 3, a + 2); }
    this.roadM = add(road, { tex: this.tex.asphalt, kind: 'road' });

    // ---- Pianos rojo/blanco + tiras de neón ----
    const kerb = new Geo(), neon = new Geo();
    for (let i = 0; i < n; i++) {
      const a = F[i], b = F[(i + 1) % n], col = (i >> 1) % 2 ? '#f4f4f4' : '#e23b3b';
      for (const side of [-1, 1]) {
        const r0 = HW * side, r1 = (HW + 13) * side;
        const P = (f, r, y) => [f.x + f.nx * r, y, f.z + f.nz * r];
        kerb.quad(P(a, r0, 0.7), P(b, r0, 0.7), P(b, r1, 0.7), P(a, r1, 0.7), col, 0, undefined, [0, 1, 0]);
        const nc = side < 0 ? '#ff4fd8' : '#35e0ff';
        const q0 = (HW + 14) * side, q1 = (HW + 17) * side;
        neon.quad(P(a, q0, 2.2), P(b, q0, 2.2), P(b, q1, 2.2), P(a, q1, 2.2), nc, 1.0, undefined, [0, 1, 0]);
        neon.quad(P(a, q1, 0.2), P(b, q1, 0.2), P(b, q1, 2.2), P(a, q1, 2.2), nc, 1.0, undefined, [side * a.nx, 0, side * a.nz]);
      }
    }
    add(kerb, { spec: 0.2 });
    this.neonM = add(neon, { spec: 0.4 });
    for (let i = 0; i < n; i += 10) for (const side of [-1, 1]) {
      const f = F[i]; this.glowStatic.push({ p: [f.x + f.nx * (HW + 15.5) * side, 3, f.z + f.nz * (HW + 15.5) * side], c: side < 0 ? [1, 0.3, 0.85] : [0.2, 0.85, 1], s: 34, night: true });
    }

    // ---- Línea de meta a cuadros y pórtico de salida ----
    {
      const f = F[0], start = new Geo(), d = 10;
      const P = (r, along) => [f.x + f.nx * r + f.tx * along, 0.8, f.z + f.nz * r + f.tz * along];
      start.quad(P(-HW, -d), P(HW, -d), P(HW, d), P(-HW, d), '#ffffff', 0, [[0, 0], [8, 0], [8, 1], [0, 1]], [0, 1, 0]);
      add(start, { tex: this.tex.checker, spec: 0.3 });
      const gantry = new Geo(), ang = Math.atan2(f.tz, f.tx);
      const m = M4.compose(f.x, 0, f.z, -ang);
      const g = new Geo();
      for (const side of [-1, 1]) { g.box(0, 40, side * (HW + 22), 8, 80, 8, '#2b2f3a'); g.box(0, 2, side * (HW + 22), 16, 4, 16, '#444'); }
      g.box(0, 84, 0, 10, 10, (HW + 22) * 2 + 8, '#2b2f3a');
      gantry.add(g, m);
      add(gantry, { spec: 0.5, shine: 40 }, true);
      // cartel
      const sg = new Geo(), W2 = 150, H2 = 34;
      sg.quad([-6, 78 - H2 / 2, -W2 / 2], [-6, 78 - H2 / 2, W2 / 2], [-6, 78 + H2 / 2, W2 / 2], [-6, 78 + H2 / 2, -W2 / 2], '#ffffff', 0.32, [[0, 1], [1, 1], [1, 0], [0, 0]], [-1, 0, 0]);
      sg.quad([6, 78 - H2 / 2, W2 / 2], [6, 78 - H2 / 2, -W2 / 2], [6, 78 + H2 / 2, -W2 / 2], [6, 78 + H2 / 2, W2 / 2], '#ffffff', 0.32, [[0, 1], [1, 1], [1, 0], [0, 0]], [1, 0, 0]);
      const sgw = new Geo(); sgw.add(sg, m);
      add(sgw, { tex: E.texture(TEX.sign('¡DERRAPA!', '#5b0eb5', '#e0177a', '#ffe14d', 512, 128, '#ffcc00'), false) });
      // semáforo de salida (3 luces)
      this.startLights = [];
      for (let k = 0; k < 3; k++) {
        const z = (k - 1) * 22;
        const red = new Geo(), green = new Geo();
        red.sphere(-7, 70, z, 5, 10, '#ff2a2a', 0.5); green.sphere(-7.2, 70, z, 5, 10, '#2aff5a', 0.5);
        const rw = new Geo(); rw.add(red, m); const gw = new Geo(); gw.add(green, m);
        const pos = M4.apply(m, -9, 70, z);
        this.startLights.push({ red: E.mesh(rw), green: E.mesh(gw), pos });
      }
      this.startLightHousing = (() => { const h = new Geo(); for (let k = 0; k < 3; k++) h.box(-3, 70, (k - 1) * 22, 6, 14, 14, '#15161b'); const w = new Geo(); w.add(h, m); return add(w, {}, false); })();
      this.startFrame = f;
    }

    // ---- Plataformas de aceleración ----
    {
      const pg = new Geo();
      for (const p of T.pads) {
        const c = Math.cos(p.a), s = Math.sin(p.a), L = T.padLen / 2, Wd = T.padW / 2;
        const P = (al, lat) => [p.x + c * al - s * lat, 0.9, p.y + s * al + c * lat];
        pg.quad(P(-L, -Wd), P(-L, Wd), P(L, Wd), P(L, -Wd), '#ffffff', 0.4, [[0, 1], [1, 1], [1, 0], [0, 0]], [0, 1, 0]);
        this.glowStatic.push({ p: [p.x, 4, p.y], c: [1, 0.6, 0.1], s: 90, night: false, pulse: true });
      }
      this.padM = { mesh: E.mesh(pg), model: ID };
    }

    // ---- Valla perimetral del mundo con neón ----
    {
      const fence = new Geo(), W = T.W, H = T.H, y = 0, h = 14;
      const sides = [[[-6, -6], [W + 6, -6]], [[W + 6, -6], [W + 6, H + 6]], [[W + 6, H + 6], [-6, H + 6]], [[-6, H + 6], [-6, -6]]];
      let k = 0;
      for (const [a, b] of sides) {
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]), steps = Math.ceil(L / 60);
        for (let i = 0; i <= steps; i++) { const t = i / steps, x = lerp(a[0], b[0], t), z = lerp(a[1], b[1], t); fence.box(x, h / 2, z, 3, h, 3, '#3a3f4b'); }
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
        const rail = new Geo(); rail.box(0, 6, 0, L, 2, 1.5, '#9aa3b5'); rail.box(0, h, 0, L, 2.2, 2.2, k % 2 ? '#ff4fd8' : '#35e0ff', 1.0);
        fence.add(rail, M4.compose(mx, 0, mz, -ang)); k++;
      }
      add(fence, { spec: 0.5 }, true);
    }

    // ---- Zonas reservadas (gradas, accesorios) para no plantar árboles encima ----
    const reserved = [];
    const isFree = (x, z, r) => reserved.every(q => Math.hypot(q[0] - x, q[1] - z) > q[2] + r);

    // ---- Gradas con público ----
    this.crowdMeshes = [];
    const stand = (cx, cz, len, ry, sign) => {
      const g = new Geo(), crowdA = new Geo(), crowdB = new Geo();
      const tiers = 5, depth = 16;
      for (let t = 0; t < tiers; t++) {
        g.box(0, 6 + t * 9, t * depth, len, 12 + t * 18 > 0 ? 9 : 9, depth, '#cfd3dc', 0, { top: '#9aa2b3' });
        g.box(0, (6 + t * 9) / 2, t * depth, len, 6 + t * 9, depth, '#7a8091');
        for (let x = -len / 2 + 8; x < len / 2 - 4; x += 9) {
          if (srnd() < 0.12) continue;
          const shirt = ['#e8433c', '#2f7de1', '#ffcc00', '#2fb35a', '#ff4fd8', '#ffffff', '#ff922b', '#9b4fd6'][(srnd() * 8) | 0];
          const tgt = srnd() < 0.5 ? crowdA : crowdB;
          const px = x + srnd(-2, 2), py = 6 + t * 9 + 4.5, pz = t * depth + srnd(-2, 2);
          tgt.box(px, py + 4, pz, 5, 8, 4, shirt);
          tgt.sphere(px, py + 10.5, pz, 2.6, 6, ['#f1c27d', '#c68642', '#8d5524', '#ffdbac'][(srnd() * 4) | 0]);
          if (srnd() < 0.3) tgt.box(px + 2.5, py + 13, pz, 1.2, 6, 1.2, shirt);   // brazo en alto
        }
      }
      // tejado y columnas
      const back = tiers * depth;
      for (const x of [-len / 2, 0, len / 2]) g.box(x, 45, back - 4, 4, 90, 4, '#2b2f3a');
      const roof = new Geo(); roof.box(0, 0, 0, len + 16, 4, back + 18, '#e8e8ee', 0, { top: '#c33' });
      g.add(roof, M4.compose(0, 92, back / 2 - 6, 0, -0.12, 0));
      // tira de neón en el borde del tejado
      g.box(0, 89, -8, len + 16, 2.5, 2.5, '#ff4fd8', 1.0);
      const m = M4.compose(cx, 0, cz, ry);
      const gw = new Geo(); gw.add(g, m); add(gw, { spec: 0.25 }, true);
      const ca = new Geo(); ca.add(crowdA, m); const cb = new Geo(); cb.add(crowdB, m);
      this.crowdMeshes.push({ mesh: E.mesh(ca), phase: 0 }, { mesh: E.mesh(cb), phase: Math.PI });
      // cartel sobre el tejado
      const sg = new Geo(), sw = Math.min(len * 0.8, 300), sh = sw / 4;
      sg.quad([sw / 2, 100, -9], [-sw / 2, 100, -9], [-sw / 2, 100 + sh, -9], [sw / 2, 100 + sh, -9], '#ffffff', 0.32, [[0, 1], [1, 1], [1, 0], [0, 0]], [0, 0, -1]);
      sg.box(0, 100 + sh / 2, -6, sw + 6, sh + 6, 3, '#222');
      const sgw = new Geo(); sgw.add(sg, m);
      add(sgw, { tex: E.texture(TEX.sign(sign, '#0b1a5c', '#7a0e9e', '#ffffff', 512, 128, '#35e0ff'), false) });
      reserved.push([cx, cz, len / 2 + 60]);
    };
    // Grada sur (recta de meta) y grada norte
    stand(455, 935, 380, 0, 'GRAN CASINO');
    stand(1175, -40, 300, Math.PI, 'JACKPOT ★ 777');

    // ---- Accesorios de casino en los huecos libres ----
    const cand = [];
    for (let x = 120; x <= T.W - 120; x += 25) for (let z = 110; z <= T.H - 110; z += 25) {
      const d = this.distToTrack(x, z); if (d > 165) cand.push([x, z, d]);
    }
    cand.sort((a, b) => b[2] - a[2]);
    const spots = [];
    for (const c of cand) if (spots.every(s => Math.hypot(s[0] - c[0], s[1] - c[1]) > 210)) spots.push(c);
    this.roulette = null;
    const props = new Geo();
    spots.slice(0, 6).forEach((s, k) => {
      const [x, z, d] = s, r = Math.min(d - 95, 110);
      reserved.push([x, z, r + 20]);
      if (k === 0) {
        // ruleta gigante que gira
        const rg = new Geo(), R = Math.max(60, r), segs = 37;
        rg.cyl(0, 5, 0, R + 8, 10, 48, '#6b3a1e', 0, 'y', '#5a2f17');
        for (let i = 0; i < segs; i++) {
          const a0 = i / segs * Math.PI * 2, a1 = (i + 1) / segs * Math.PI * 2, c = i === 0 ? '#1f9d4a' : i % 2 ? '#c8102e' : '#141414';
          rg.quad([Math.cos(a0) * R * 0.55, 10.6, Math.sin(a0) * R * 0.55], [Math.cos(a0) * R, 10.6, Math.sin(a0) * R],
            [Math.cos(a1) * R, 10.6, Math.sin(a1) * R], [Math.cos(a1) * R * 0.55, 10.6, Math.sin(a1) * R * 0.55], c, 0, undefined, [0, 1, 0]);
        }
        rg.cyl(0, 11, 0, R * 0.55, 1.4, 32, '#b8860b', 0.0);
        rg.cyl(0, 18, 0, 6, 14, 12, '#ffd700'); rg.box(0, 24, 0, R * 0.7, 3, 3, '#ffd700'); rg.box(0, 24, 0, 3, 3, R * 0.7, '#ffd700');
        rg.sphere(R * 0.78, 13, 0, 3.4, 10, '#ffffff');
        // anillo de bombillas
        for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; rg.sphere(Math.cos(a) * (R + 8), 11, Math.sin(a) * (R + 8), 2, 6, '#fff3b0', 0.45); }
        this.roulette = { mesh: E.mesh(rg), x, z, R };
        this.glowStatic.push({ p: [x, 16, z], c: [1, 0.8, 0.3], s: R * 3.2, night: true });
      } else if (k % 2 === 1) {
        // dados gigantes
        const dice = (dx, dz, sz, ry) => {
          const dg = new Geo(); dg.box(0, sz / 2, 0, sz, sz, sz, '#f8f8f8', 0);
          const pip = (cx, cy, cz, nx, ny, nz) => { const q = sz * 0.09; if (nx) dg.box(cx, cy, cz, 0.8, q * 2, q * 2, '#c8102e'); else if (ny) dg.box(cx, cy, cz, q * 2, 0.8, q * 2, '#111'); else dg.box(cx, cy, cz, q * 2, q * 2, 0.8, '#111'); };
          const o = sz * 0.25, hs = sz / 2 + 0.3;
          pip(0, sz + 0.3, 0, 0, 1, 0); pip(o, sz + 0.3, o, 0, 1, 0); pip(-o, sz + 0.3, -o, 0, 1, 0);           // 3 arriba
          pip(hs, sz / 2 + o, o, 1, 0, 0); pip(hs, sz / 2 - o, -o, 1, 0, 0);                                    // 2
          for (const a of [-o, o]) for (const b of [-o, o]) pip(a, sz / 2 + b, hs, 0, 0, 1);                       // 4
          pip(-hs, sz / 2, 0, 1, 0, 0);                                                                         // 1
          props.add(dg, M4.compose(x + dx, 0, z + dz, ry));
        };
        dice(-r * 0.25, 0, 40, srnd(0, 3)); dice(r * 0.35, r * 0.15, 32, srnd(0, 3));
      } else {
        // torres de fichas de póker
        const chipC = [['#c8102e', '#fff'], ['#1e50c8', '#fff'], ['#141414', '#ffd700'], ['#1f9d4a', '#fff']];
        for (let t = 0; t < 4; t++) {
          const ox = srnd(-r * 0.4, r * 0.4), oz = srnd(-r * 0.4, r * 0.4), cnt = 4 + (srnd() * 9 | 0), [c1, c2] = chipC[t];
          for (let h = 0; h < cnt; h++) { props.cyl(x + ox + srnd(-1, 1), 3 + h * 6, z + oz, 16, 5.4, 20, c1, 0, 'y', c2); props.cyl(x + ox, 3 + h * 6, z + oz, 16.3, 1.6, 20, c2); }
        }
      }
    });
    add(props, { spec: 0.5, shine: 40 }, true);

    // ---- Farolas de neón a lo largo del circuito (luces de la noche) ----
    this.lamps = [];
    const lampG = new Geo(), lampHeads = new Geo();
    const LCOL = [['#ff4fd8', [1, 0.3, 0.85]], ['#35e0ff', [0.25, 0.85, 1]], ['#a45cff', [0.65, 0.4, 1]], ['#ffd27a', [1, 0.8, 0.45]]];
    let li = 0;
    for (let s = 60; s < this.trackLen; s += 200) {
      let i = 0; while (i < n - 1 && F[i + 1].s < s) i++;
      const f = F[i], side = li % 2 ? 1 : -1, off = HW + 34;
      const x = f.x + f.nx * off * side, z = f.z + f.nz * off * side;
      if (!isFree(x, z, 10) || this.distToTrack(x, z) < HW + 20) { li++; continue; }
      const [hc, lc] = LCOL[li % 4];
      lampG.cyl(x, 30, z, 1.8, 60, 8, '#2b2f3a'); lampG.cyl(x, 1.5, z, 5, 3, 10, '#3a3f4b');
      const ax = x - f.nx * side * 12, az = z - f.nz * side * 12;
      lampG.box((x + ax) / 2, 60, (z + az) / 2, Math.abs(ax - x) + 2, 2, Math.abs(az - z) + 2, '#2b2f3a');
      lampHeads.box(ax, 58, az, 9, 3, 9, hc, 1.0);
      this.lamps.push({ p: [ax, 52, az], c: lc });
      this.glowStatic.push({ p: [ax, 56, az], c: lc, s: 60, night: true });
      reserved.push([x, z, 14]);
      li++;
    }
    add(lampG, { spec: 0.4 }, true); this.lampHeadM = add(lampHeads, {});

    // ---- Vegetación: pinos, árboles redondos y palmeras ----
    const trees = new Geo();
    const tree = (x, z, k) => {
      const s = srnd(0.8, 1.35);
      if (k < 0.45) { // pino
        trees.cyl(x, 8 * s, z, 2.5 * s, 16 * s, 6, '#6b4423');
        trees.cone(x, 12 * s, z, 15 * s, 26 * s, 8, srnd() < 0.5 ? '#2f7a3a' : '#28683a');
        trees.cone(x, 26 * s, z, 11 * s, 22 * s, 8, '#3a8f45');
      } else if (k < 0.8) { // frondoso
        trees.cyl(x, 9 * s, z, 2.8 * s, 18 * s, 6, '#6b4423');
        trees.sphere(x, 26 * s, z, 14 * s, 8, srnd() < 0.5 ? '#3f9a3f' : '#4aa64a', 0, 0.85);
        trees.sphere(x + 6 * s, 22 * s, z + 3 * s, 9 * s, 7, '#57b04f', 0, 0.8);
      } else { // palmera (toque de casino de Las Vegas)
        const lean = srnd(-0.25, 0.25), m = M4.compose(x, 0, z, srnd(0, 6), lean, 0);
        const p = new Geo();
        for (let k2 = 0; k2 < 5; k2++) p.cyl(0, 6 + k2 * 10, 0, 2.6 - k2 * 0.25, 10, 7, k2 % 2 ? '#8b6a3e' : '#7a5a33');
        for (let l = 0; l < 7; l++) { const a = l / 7 * Math.PI * 2; const leaf = new Geo(); leaf.box(11, 0, 0, 22, 1, 6, '#3e9b45'); p.add(leaf, M4.compose(0, 54, 0, a, 0, -0.35)); }
        trees.add(p, M4.compose(x, 0, z, srnd(0, 6), lean, 0, s));
      }
    };
    for (let x = -700; x <= T.W + 700; x += 34) for (let z = -600; z <= T.H + 600; z += 34) {
      const jx = x + srnd(-14, 14), jz = z + srnd(-14, 14);
      const inside = jx > -10 && jx < T.W + 10 && jz > -10 && jz < T.H + 10;
      const d = this.distToTrack(jx, jz);
      const prob = inside ? (d > HW + 70 ? 0.16 : 0) : (d > 220 ? 0.28 : 0);
      if (srnd() > prob || !isFree(jx, jz, 18)) continue;
      if (!inside && Math.hypot(jx - 800, (jz - 450) * 1.35) > 1250) continue;  // los edificios van más lejos
      tree(jx, jz, srnd());
    }
    add(trees, { spec: 0.05 }, true);

    // ---- Skyline de casinos (edificios con ventanas y neones) ----
    const city = new Geo(), signs = [];
    const SIGNS = [['CASINO', '#3a0a6e', '#c4126b', '#ff4fd8'], ['777', '#0a2a6e', '#0aa0c4', '#35e0ff'], ['JACKPOT', '#6e3a0a', '#c4126b', '#ffcc00'],
      ['♠ ♥ ♣ ♦', '#111', '#3a0a6e', '#ff4fd8'], ['ROYAL', '#0a4a2e', '#0a8a6e', '#2ed573'], ['DERRAPA', '#5b0eb5', '#e0177a', '#ffcc00'], ['BINGO', '#6e0a2a', '#e04a17', '#ffd27a']];
    let si = 0;
    for (let a = 0; a < Math.PI * 2; a += 0.17) {
      const R = 1330 + srnd(-60, 160);
      const cx = 800 + Math.cos(a) * R, cz = 450 + Math.sin(a) * R * 0.78;
      const w = srnd(110, 220), d = srnd(110, 200), h = srnd(150, 520);
      const face = Math.atan2(450 - cz, 800 - cx);
      const g = new Geo();
      const wall = ['#2a2f45', '#3b2a4f', '#22344a', '#4a3b5c', '#30304a'][(srnd() * 5) | 0];
      g.box(0, h / 2, 0, w, h, d, wall, 0, { top: '#1a1d2a' });
      // ventanas
      const floors = Math.floor(h / 22), cols = (len) => Math.floor(len / 20);
      const winCol = ['#ffd890', '#9fe8ff', '#ff9ae6', '#fff3c4'];
      const faces = [[w, d / 2 + 0.6, 0, 0, 1], [w, -d / 2 - 0.6, 0, 0, -1], [d, w / 2 + 0.6, 1, 1, 0], [d, -w / 2 - 0.6, 1, -1, 0]];
      for (const [len, off, alongZ, nx, nz] of faces) {
        const nc = cols(len);
        for (let fl = 1; fl < floors; fl++) for (let c = 0; c < nc; c++) {
          const u = -len / 2 + (c + 0.5) * (len / nc), y = fl * 22, lit = srnd() < 0.6;
          const col = lit ? winCol[(srnd() * 4) | 0] : '#1c2433', e = lit ? 0.9 + srnd(0, 0.1) : 0;
          const hw = len / nc * 0.3, hh = 6;
          if (!alongZ) g.quad([u - hw, y - hh, off], [u + hw, y - hh, off], [u + hw, y + hh, off], [u - hw, y + hh, off], col, e, undefined, [0, 0, nz]);
          else g.quad([off, y - hh, u - hw], [off, y - hh, u + hw], [off, y + hh, u + hw], [off, y + hh, u - hw], col, e, undefined, [nx, 0, 0]);
        }
      }
      // neón en las aristas del tejado
      const nc = ['#ff4fd8', '#35e0ff', '#a45cff', '#ffcc00'][(srnd() * 4) | 0];
      g.box(0, h, d / 2, w + 2, 3, 3, nc, 1.0); g.box(0, h, -d / 2, w + 2, 3, 3, nc, 1.0);
      g.box(w / 2, h, 0, 3, 3, d + 2, nc, 1.0); g.box(-w / 2, h, 0, 3, 3, d + 2, nc, 1.0);
      if (srnd() < 0.4) g.cyl(0, h + 30, 0, 2, 60, 6, '#888'), g.sphere(0, h + 62, 0, 4, 8, '#ff2a2a', 0.5);
      const m = M4.compose(cx, 0, cz, -face + Math.PI / 2);
      city.add(g, m);
      // carteles luminosos en la fachada que mira al circuito
      if (srnd() < 0.45) {
        const [txt, c1, c2, gl] = SIGNS[si++ % SIGNS.length];
        const sw = Math.min(w * 0.9, 200), sh = sw / 4, y = h * srnd(0.55, 0.8);
        const sg = new Geo();
        sg.quad([-sw / 2, y - sh / 2, d / 2 + 3], [sw / 2, y - sh / 2, d / 2 + 3], [sw / 2, y + sh / 2, d / 2 + 3], [-sw / 2, y + sh / 2, d / 2 + 3], '#ffffff', 0.35, [[0, 1], [1, 1], [1, 0], [0, 0]], [0, 0, 1]);
        const sgw = new Geo(); sgw.add(sg, m);
        signs.push({ geo: sgw, txt, c1, c2, gl });
        const sp = M4.apply(m, 0, y, d / 2 + 20);
        this.glowStatic.push({ p: sp, c: hex(gl), s: sw * 2.2, night: true });
      }
    }
    add(city, { spec: 0.6, shine: 50 }, false, 'city');
    const texCache = {};
    for (const s of signs) {
      const key = s.txt; texCache[key] = texCache[key] || E.texture(TEX.sign(s.txt, s.c1, s.c2, '#fff', 512, 128, s.gl), false);
      add(s.geo, { tex: texCache[key] });
    }

    // ---- Objetos del juego ----
    this.boxMesh = E.mesh(new Geo().box(0, 0, 0, 22, 22, 22, '#ffffff', 0.25, { uv: [1, 1] }));
    this.oilMesh = E.mesh(new Geo().cyl(0, 0, 0, 19, 0.6, 20, '#0b0b10', 0, 'y', '#141020').cyl(-5, 0.4, -3, 7, 0.4, 14, '#4a2a8a', 0.1));
    const mis = new Geo();
    mis.cyl(0, 0, 0, 3.2, 18, 10, '#e8433c', 0, 'x');
    const tip = new Geo(); tip.cone(0, 0, 0, 3.2, 7, 10, '#f4f4f4'); mis.add(tip, M4.compose(9, 0, 0, 0, 0, -Math.PI / 2));
    for (const a of [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]) { const fin = new Geo(); fin.box(-7, 4, 0, 5, 5, 0.8, '#ffcc00'); mis.add(fin, M4.compose(0, 0, 0, 0, a, 0)); }
    this.missileMesh = E.mesh(mis);

    // ---- Karts (piezas compartidas) ----
    this.wheelMesh = E.mesh(new Geo().cyl(0, 0, 0, 6, 5, 14, '#1b1b1f', 0, 'z', '#222').cyl(0, 0, 0, 3.4, 5.6, 10, '#c9ccd4', 0, 'z', '#9aa0aa').box(0, 2.5, 0, 1, 4, 5.8, '#e2e2e2'));
    this.headMesh = E.mesh(new Geo().box(19.6, 8.5, -7, 1.2, 3.2, 4.5, '#fff7d6', 1.0).box(19.6, 8.5, 7, 1.2, 3.2, 4.5, '#fff7d6', 1.0));
    this.tailMesh = E.mesh(new Geo().box(-19.8, 11, -8, 1, 2.6, 4.5, '#ff2020', 0.5).box(-19.8, 11, 8, 1, 2.6, 4.5, '#ff2020', 0.5));
    // Haz de luz de los faros (sin luz, aditivo)
    const beam = new Geo();
    for (const z0 of [-7, 7]) {
      const a = beam.v(20, 1.2, z0, 0, 1, 0, [1, 0.95, 0.8], 0.55), b = beam.v(150, 1.2, z0 * 3 - 30, 0, 1, 0, [1, 0.95, 0.8], 0), c = beam.v(150, 1.2, z0 * 3 + 30, 0, 1, 0, [1, 0.95, 0.8], 0);
      beam.tri(a, b, c);
    }
    this.beamMesh = E.mesh(beam);
    // Neón bajo el kart y burbuja del escudo
    const ug = new Geo(), segs = 20, c0 = ug.v(0, 0.95, 0, 0, 1, 0, [1, 1, 1], 0.55);
    for (let i = 0; i <= segs; i++) { const a = i / segs * Math.PI * 2; ug.v(Math.cos(a) * 34, 0.95, Math.sin(a) * 26, 0, 1, 0, [1, 1, 1], 0); }
    for (let i = 0; i < segs; i++) ug.tri(c0, c0 + 1 + i, c0 + 2 + i);
    this.underMesh = E.mesh(ug);
    const sh = new Geo(); sh.sphere(0, 12, 0, 30, 18, '#ffffff', 0.22, 0.8); this.shieldMesh = E.mesh(sh);

    // ---- Partículas, estelas y brillos ----
    this.pbAlpha = E.pointBuffer(2500); this.pbAdd = E.pointBuffer(3500);
    this.skid = E.flatBuffer(9000); this.skidN = 0; this.skidW = 0;
    this.envTex = null;
  }

  kartGeo(color) {
    const C = color, D = '#22252c', G = '#8d939e', dark = shade(color, 0.55);
    const g = new Geo();
    g.box(0, 4, 0, 38, 2.5, 21, D);                                  // bandeja
    g.box(-1, 8, 0, 26, 6, 15, C, 0, { top: shade(color, 1.15) });   // cuerpo
    g.box(12.5, 6.8, 0, 13, 4.5, 13, C);                             // morro
    g.box(19.5, 4.5, 0, 3, 3.5, 26, D);                              // parachoques
    for (const s of [-1, 1]) g.box(-2, 6.8, s * 10.5, 17, 5, 5, C, 0, { top: '#ffffff' });   // pontones
    g.box(-15, 9.5, 0, 8, 7, 12, G);                                 // motor
    for (const s of [-1, 1]) g.cyl(-20.5, 9, s * 4, 1.7, 6, 8, '#b9bec8', 0, 'x');          // escapes
    g.box(-9.5, 13, 0, 4, 11, 12, D);                                // respaldo
    g.box(-4, 14.5, 0, 8, 9, 10, dark);                              // piloto
    g.sphere(-3.5, 22.5, 0, 5.6, 12, C);                             // casco
    g.box(0.8, 22.5, 0, 3.2, 3.2, 8.2, '#0d0f14');                   // visera
    g.box(-3.5, 28, 0, 2, 1.2, 8, '#ffffff');                        // raya del casco
    g.box(4, 15.5, 0, 1.4, 6, 8, D);                                 // volante
    for (const s of [-1, 1]) g.box(-17.5, 13, s * 6, 2, 9, 2, D);    // soportes alerón
    g.box(-18.5, 18, 0, 7, 2, 27, C, 0, { top: '#ffffff' });         // alerón
    for (const s of [-1, 1]) g.box(-18.5, 19, s * 13.5, 8, 5, 1, D);
    return g;
  }
  ensureKart(p) {
    let k = this.karts.get(p.id);
    if (k && k.color === p.color) return k;
    const mesh = this.eng.mesh(this.kartGeo(p.color));
    k = { id: p.id, color: p.color, rgb: hex(p.color), mesh, wheelRot: 0, spinAng: 0, roll: 0, pitch: 0, lastSp: 0,
      skidL: null, skidR: null, label: null, flash: 0, prevBoost: false, prevDrift: -1, bounce: 0 };
    const lab = document.createElement('div'); lab.className = 'klabel';
    lab.innerHTML = `<span class="kdot" style="background:${p.color}"></span><span class="kname"></span>`;
    this.labels.appendChild(lab); k.label = lab; k.nameEl = lab.querySelector('.kname');
    this.karts.set(p.id, k);
    return k;
  }

  setAmbient(a) { if (ENVS[a] && a !== this.ambient) { this.ambient = a; this.envTarget = ENVS[a]; if (!this.envInit) { this.env = cloneEnv(ENVS[a]); this.envInit = true; } } }

  // ======================= Partículas =======================
  emit(o) {
    if (this.particles.length > 5500) return;
    this.particles.push(Object.assign({ vx: 0, vy: 0, vz: 0, life: 0, max: 1, s0: 10, s1: 20, c0: [1, 1, 1, 1], c1: [1, 1, 1, 0], drag: 1, grav: 0, add: false }, o));
  }
  burst(x, y, z, n, colors, speed, size, life, add = true, grav = -120) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI * 0.5, v = speed * rnd(0.4, 1);
      const c = hex(colors[(Math.random() * colors.length) | 0]);
      this.emit({ x, y, z, vx: Math.cos(a) * Math.cos(e) * v, vy: Math.sin(e) * v + speed * 0.3, vz: Math.sin(a) * Math.cos(e) * v,
        max: life * rnd(0.6, 1.2), s0: size, s1: size * 0.3, c0: [...c, 1], c1: [...c, 0], drag: 2, grav, add });
    }
  }
  updateParticles(dt) {
    const A = this.pbAlpha, B = this.pbAdd; let na = 0, nb = 0;
    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]; p.life += dt;
      if (p.life >= p.max) { ps[i] = ps[ps.length - 1]; ps.pop(); continue; }
      const dr = Math.exp(-p.drag * dt);
      p.vx *= dr; p.vz *= dr; p.vy = p.vy * dr + p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.5) { p.y = 0.5; p.vy *= -0.3; }
      const t = p.life / p.max, buf = p.add ? B : A, idx = p.add ? nb : na;
      if (idx >= buf.max) continue;
      const o = idx * 8, d = buf.data;
      d[o] = p.x; d[o + 1] = p.y; d[o + 2] = p.z;
      d[o + 3] = lerp(p.c0[0], p.c1[0], t); d[o + 4] = lerp(p.c0[1], p.c1[1], t); d[o + 5] = lerp(p.c0[2], p.c1[2], t); d[o + 6] = lerp(p.c0[3], p.c1[3], t);
      d[o + 7] = lerp(p.s0, p.s1, t);
      if (p.add) nb++; else na++;
    }
    this.nAlpha = na; this.nAdd = nb;
  }
  addGlow(p, c, s, a) {
    const B = this.pbAdd; if (this.nAdd >= B.max) return;
    const o = this.nAdd * 8, d = B.data;
    d[o] = p[0]; d[o + 1] = p[1]; d[o + 2] = p[2]; d[o + 3] = c[0]; d[o + 4] = c[1]; d[o + 5] = c[2]; d[o + 6] = a; d[o + 7] = s;
    this.nAdd++;
  }

  // Marcas de neumáticos: cuadriláteros oscuros en un búfer circular
  skidSeg(a, b, w, alpha) {
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
    if (l < 0.5 || l > 40) return;
    const nx = -dz / l * w / 2, nz = dx / l * w / 2, y = 0.95;
    const P = [[a[0] - nx, a[1] - nz], [a[0] + nx, a[1] + nz], [b[0] + nx, b[1] + nz], [b[0] - nx, b[1] - nz]];
    const order = [0, 1, 2, 0, 2, 3], d = this.skid.data;
    let o = this.skidW * 7;
    for (const k of order) { d[o++] = P[k][0]; d[o++] = y; d[o++] = P[k][1]; d[o++] = 0.04; d[o++] = 0.04; d[o++] = 0.05; d[o++] = alpha; }
    this.skidW = (this.skidW + 6) % this.skid.max;
    this.skidN = Math.min(this.skid.max, this.skidN + 6);
    this.skidDirty = true;
  }

  // ======================= Sucesos del servidor → efectos =======================
  onEvents(evs, view) {
    const byId = id => view.players.find(p => p.id === id);
    for (const e of evs) {
      if (e.t === 'pick') {
        this.burst(e.x, 16, e.y, 26, ['#ffcc00', '#ff4fd8', '#35e0ff', '#2ed573', '#ffffff'], 140, 9, 0.8);
        const i = this.T.boxes.findIndex(b => b.x === e.x && b.y === e.y); if (i >= 0) this.boxAppear[i] = this.time + 3;
      } else if (e.t === 'hit') {
        this.burst(e.x, 14, e.y, 30, e.by === 'misil' ? ['#ff922b', '#ffd43b', '#ff4757'] : ['#ffd43b', '#ffffff'], 180, 12, 0.7);
        for (let i = 0; i < 6; i++) this.emit({ x: e.x, y: 30, z: e.y, vx: Math.cos(i) * 30, vy: 20, vz: Math.sin(i) * 30, max: 1.1, s0: 10, s1: 4, c0: [1, 0.95, 0.3, 1], c1: [1, 1, 1, 0], drag: 0.5, add: true });
        const k = this.karts.get(e.id); if (k) k.flash = 0.6;
        this.shakeAt(e.x, e.y, 10);
      } else if (e.t === 'boom') {
        this.burst(e.x, 10, e.y, 40, ['#ff6a00', '#ffd43b', '#ff2a2a'], 220, 16, 0.6);
        for (let i = 0; i < 14; i++) this.emit({ x: e.x + rnd(-8, 8), y: 8, z: e.y + rnd(-8, 8), vx: rnd(-30, 30), vy: rnd(20, 60), vz: rnd(-30, 30), max: 1.4, s0: 16, s1: 40, c0: [0.25, 0.22, 0.24, 0.6], c1: [0.4, 0.4, 0.42, 0], drag: 1.5 });
        this.shakeAt(e.x, e.y, 14);
      } else if (e.t === 'bump') {
        this.burst(e.x, 8, e.y, 14, ['#ffffff', '#ffd43b'], 150, 5, 0.35);
        this.shakeAt(e.x, e.y, 6 + e.f * 10);
      } else if (e.t === 'block') {
        this.burst(e.x, 14, e.y, 30, ['#74c0fc', '#ffffff', '#35e0ff'], 160, 10, 0.6);
      } else if (e.t === 'turbo' || e.t === 'pad') {
        const p = byId(e.id); if (p) this.burst(p.x - Math.cos(p.a) * 22, 8, p.y - Math.sin(p.a) * 22, 14, ['#ff922b', '#ffd43b', '#4dabf7'], 90, 9, 0.4);
      } else if (e.t === 'use') {
        const p = byId(e.id); if (p) this.burst(p.x, 20, p.y, 10, ['#ffffff', '#ffcc00'], 60, 6, 0.4);
      } else if (e.t === 'finish') {
        const p = byId(e.id); if (p) this.burst(p.x, 20, p.y, 70, ['#ffcc00', '#ff4fd8', '#35e0ff', '#2ed573', '#ffffff', '#e8433c'], 260, 8, 1.6, true, -160);
      }
    }
  }
  shakeAt(x, z, amp) {
    const d = Math.hypot(x - this.cam.target[0], z - this.cam.target[2]);
    const dist = Math.hypot(this.cam.eye[0] - this.cam.target[0], this.cam.eye[1] - this.cam.target[1], this.cam.eye[2] - this.cam.target[2]);
    this.cam.shake = Math.max(this.cam.shake, amp * clamp(1 - d / (dist * 1.2), 0.2, 1) * (dist / 600));
  }

  // ======================= Cámara =======================
  updateCamera(view, dt, aspect) {
    const c = this.cam, ps = view.players, T = this.T;
    let eye, tgt, rate = 2.2;
    const tanH = Math.tan(c.fov / 2);
    const fit = (cx, cz, hx, hz, pitch, yaw = 0) => {
      const dist = clamp(Math.max(hx / (tanH * aspect), hz * Math.sin(pitch) / tanH) * 1.18 + 70, 230, 1600);
      const dy = Math.sin(pitch) * dist, dh = Math.cos(pitch) * dist;
      return { eye: [cx + Math.sin(yaw) * dh, dy, cz + Math.cos(yaw) * dh], tgt: [cx, 0, cz] };
    };
    const t = this.time;
    const leader = ps[0];
    let mode = this.camMode;
    if (view.state === 'lobby' || !ps.length) mode = 'orbit';
    else if (view.state === 'countdown') mode = 'grid';
    else if (view.state === 'finished' && mode !== 'orbit') mode = 'winner';

    if (this.debugCam) { eye = this.debugCam.eye; tgt = this.debugCam.tgt; rate = 50; }
    else if (mode === 'orbit') {
      const a = t * 0.06, R = 1150;
      eye = [800 + Math.sin(a) * R, 720, 450 + Math.cos(a) * R * 0.85]; tgt = [800, 0, 440]; rate = 1.2;
    } else if (mode === 'grid') {
      // Vista de la parrilla desde dentro del circuito (el lado de la grada queda detrás)
      const f = this.startFrame;
      tgt = [f.x - f.tx * 80, 8, f.z - f.tz * 80];
      const sw = Math.sin(t * 0.4) * 40;
      eye = [f.x + f.tx * (120 + sw) - f.nx * 150, 120, f.z + f.tz * (120 + sw) - f.nz * 150];
      rate = 1.6;
    } else if (mode === 'winner' && leader) {
      const a = t * 0.35;
      tgt = [leader.x, 12, leader.y]; eye = [leader.x + Math.cos(a) * 150, 70, leader.y + Math.sin(a) * 150]; rate = 2;
    } else if (mode === 'leader' && leader) {
      const fx = Math.cos(leader.a), fz = Math.sin(leader.a);
      this.chaseYaw = this.chaseYaw == null ? leader.a : angLerp(this.chaseYaw, leader.a, 1 - Math.exp(-dt * 3));
      const cx = Math.cos(this.chaseYaw), cz = Math.sin(this.chaseYaw);
      eye = [leader.x - cx * 125, 115, leader.y - cz * 125]; tgt = [leader.x + fx * 60, 8, leader.y + fz * 60]; rate = 5;
    } else {
      // Auto: encuadra a todos los que siguen corriendo (o a todos si ya han llegado)
      let act = ps.filter(p => !p.finished); if (!act.length) act = ps;
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const p of act) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.y); z1 = Math.max(z1, p.y); }
      // mira un poco hacia donde van
      let ax = 0, az = 0; for (const p of act) { ax += Math.cos(p.a); az += Math.sin(p.a); } ax /= act.length; az /= act.length;
      const cx = (x0 + x1) / 2 + ax * 40, cz = (z0 + z1) / 2 + az * 40;
      const r = fit(cx, cz, (x1 - x0) / 2 + 60, (z1 - z0) / 2 + 60, 0.95);
      eye = r.eye; tgt = r.tgt; rate = 1.8;
    }
    const k = 1 - Math.exp(-dt * rate);
    for (let i = 0; i < 3; i++) { c.eye[i] = lerp(c.eye[i], eye[i], k); c.target[i] = lerp(c.target[i], tgt[i], k); }
    c.shake *= Math.exp(-dt * 7);
    const sh = c.shake, se = [c.eye[0] + rnd(-sh, sh), c.eye[1] + rnd(-sh, sh), c.eye[2] + rnd(-sh, sh)];
    const dist = Math.hypot(se[0] - c.target[0], se[1] - c.target[1], se[2] - c.target[2]);
    c.proj = M4.persp(c.fov, aspect, Math.max(2, dist * 0.02), 9000);
    c.view = M4.lookAt(se, c.target);
    c.vp = M4.mul(c.proj, c.view);
    c.eyeShaken = se;
  }

  project(x, y, z) {
    const m = this.cam.vp, X = m[0] * x + m[4] * y + m[8] * z + m[12], Y = m[1] * x + m[5] * y + m[9] * z + m[13], W = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (W <= 0) return null;
    const cv = this.eng.canvas;
    return [(X / W * 0.5 + 0.5) * cv.clientWidth, (1 - (Y / W * 0.5 + 0.5)) * cv.clientHeight];
  }

  // ======================= Fotograma =======================
  frame(view, dt, ms) {
    const E = this.eng, gl = E.gl, T = this.T;
    this.time += dt;
    const t = this.time;
    // Resolución adaptativa para mantener los FPS en portátiles modestos
    this.frameTimes.push(dt); if (this.frameTimes.length > 60) this.frameTimes.shift();
    if (this.frameTimes.length === 60 && t > 3) {
      const avg = this.frameTimes.reduce((a, b) => a + b) / 60;
      if (avg > 1 / 40 && this.resScale > 0.6) { this.resScale = Math.max(0.6, this.resScale - 0.1); this.frameTimes = []; }
      else if (avg < 1 / 58 && this.resScale < Math.min(1.5, window.devicePixelRatio || 1)) { this.resScale = Math.min(1.5, this.resScale + 0.05); this.frameTimes = []; }
    }
    E.resize(this.resScale);
    const aspect = E.canvas.width / E.canvas.height;

    lerpEnv(this.env, this.envTarget, 1 - Math.exp(-dt * 1.6));
    const env = this.env;
    this.updateCamera(view, dt, aspect);
    const cam = { eye: this.cam.eyeShaken, vp: this.cam.vp, proj: this.cam.proj };

    // ---- Karts: animación y efectos ----
    const live = new Set();
    const kartDraw = [];
    for (const p of view.players) {
      const k = this.ensureKart(p); live.add(p.id);
      const sp = p.sp || 0;
      k.wheelRot -= sp * dt / 6;
      if (p.spin) k.spinAng += dt * 14; else k.spinAng = angLerp(k.spinAng, 0, 1 - Math.exp(-dt * 10)) % (Math.PI * 2);
      const accel = (sp - k.lastSp) / Math.max(dt, 1e-3); k.lastSp = sp;
      k.pitch = lerp(k.pitch, clamp(-accel / 3000, -0.06, 0.06), 1 - Math.exp(-dt * 6));
      k.roll = lerp(k.roll, clamp(-(p.st || 0) * sp / 400 * 0.09 + (p.drift >= 0 ? -(p.st || 0) * 0.05 : 0), -0.14, 0.14), 1 - Math.exp(-dt * 8));
      k.bounce = p.off ? Math.sin(t * 40 + p.x) * 0.8 * Math.min(1, Math.abs(sp) / 200) : 0;
      k.flash = Math.max(0, k.flash - dt);
      const yaw = -p.a - k.spinAng;
      const M = M4.compose(p.x, k.bounce + (p.spin ? Math.abs(Math.sin(k.spinAng)) * 4 : 0), p.y, yaw, k.roll, k.pitch);
      k.M = M;
      const fx = Math.cos(p.a), fz = Math.sin(p.a), rx = -fz, rz = fx;
      // Estelas de neumáticos
      const marking = p.drift >= 0 || p.br || p.spin;
      for (const s of [-1, 1]) {
        const wp = [p.x - fx * 12 + rx * 13 * s, p.y - fz * 12 + rz * 13 * s], key = s < 0 ? 'skidL' : 'skidR';
        if (marking && Math.abs(sp) > 60 && !p.off) { if (k[key]) this.skidSeg(k[key], wp, 4.2, p.spin ? 0.5 : 0.42); k[key] = wp; } else k[key] = null;
      }
      // Humo y chispas al derrapar
      if (p.drift >= 0 && Math.abs(sp) > 80) {
        for (const s of [-1, 1]) {
          const bx = p.x - fx * 16 + rx * 13 * s, bz = p.y - fz * 16 + rz * 13 * s;
          if (Math.random() < 0.7) this.emit({ x: bx, y: 3, z: bz, vx: -fx * 30 + rnd(-15, 15), vy: rnd(10, 25), vz: -fz * 30 + rnd(-15, 15), max: rnd(0.6, 1.1), s0: 9, s1: 30, c0: [0.85, 0.85, 0.9, 0.42], c1: [0.9, 0.9, 0.95, 0], drag: 1.6 });
          const sc = p.drift === 2 ? [1, 0.55, 0.15] : p.drift === 1 ? [0.3, 0.65, 1] : [1, 1, 0.9];
          for (let i = 0; i < (p.drift ? 3 : 1); i++) this.emit({ x: bx, y: 2, z: bz, vx: -fx * rnd(40, 120) + rx * s * rnd(10, 60), vy: rnd(30, 90), vz: -fz * rnd(40, 120) + rz * s * rnd(10, 60), max: rnd(0.18, 0.38), s0: p.drift ? 5 : 3.5, s1: 1, c0: [...sc, 1], c1: [...sc, 0], drag: 2, grav: -260, add: true });
        }
      } else if (p.off && Math.abs(sp) > 120 && Math.random() < 0.5) {
        this.emit({ x: p.x - fx * 18, y: 2, z: p.y - fz * 18, vx: rnd(-20, 20), vy: rnd(10, 30), vz: rnd(-20, 20), max: 0.7, s0: 8, s1: 22, c0: [0.45, 0.35, 0.2, 0.4], c1: [0.5, 0.42, 0.3, 0], drag: 2 });
      }
      if (p.br && Math.abs(sp) > 120 && Math.random() < 0.5) {
        for (const s of [-1, 1]) this.emit({ x: p.x - fx * 12 + rx * 13 * s, y: 2, z: p.y - fz * 12 + rz * 13 * s, vx: rnd(-10, 10), vy: rnd(5, 15), vz: rnd(-10, 10), max: 0.5, s0: 6, s1: 18, c0: [0.8, 0.8, 0.85, 0.3], c1: [0.9, 0.9, 0.9, 0], drag: 2 });
      }
      // Llamas del escape con el turbo
      if (p.boost) {
        for (const s of [-1, 1]) {
          const ex = M4.apply(M, -23, 9, s * 4);
          for (let i = 0; i < 2; i++) this.emit({ x: ex[0], y: ex[1], z: ex[2], vx: -fx * rnd(80, 160) + rnd(-10, 10), vy: rnd(-5, 15), vz: -fz * rnd(80, 160) + rnd(-10, 10), max: rnd(0.12, 0.25), s0: rnd(9, 13), s1: 3, c0: i ? [1, 0.85, 0.3, 1] : [0.4, 0.6, 1, 0.9], c1: [1, 0.25, 0.05, 0], drag: 3, add: true });
        }
        if (Math.random() < 0.4) this.emit({ x: p.x - fx * 26, y: 8, z: p.y - fz * 26, vx: -fx * 40, vy: 10, vz: -fz * 40, max: 0.6, s0: 6, s1: 20, c0: [0.3, 0.3, 0.32, 0.35], c1: [0.4, 0.4, 0.4, 0], drag: 2 });
      }
      k.prevBoost = p.boost;
      kartDraw.push({ p, k });
      // Etiqueta con el nombre
      const sp2 = this.project(p.x, 40, p.y);
      if (sp2) {
        k.label.style.display = '';
        k.label.style.transform = `translate(${sp2[0].toFixed(0)}px, ${sp2[1].toFixed(0)}px) translate(-50%, -100%)`;
        if (k.nameEl.textContent !== p.name) k.nameEl.textContent = p.name;
        const pos = view.players.indexOf(p) + 1;
        k.label.dataset.pos = view.state === 'lobby' ? '' : pos;
        k.label.classList.toggle('lead', pos === 1 && view.state !== 'lobby');
      } else k.label.style.display = 'none';
    }
    for (const [id, k] of this.karts) if (!live.has(id)) { k.label.remove(); this.karts.delete(id); }

    // Misiles: estela de fuego
    for (const m of view.missiles) {
      const fx = Math.cos(m[2]), fz = Math.sin(m[2]);
      this.emit({ x: m[0] - fx * 10, y: 10, z: m[1] - fz * 10, vx: rnd(-10, 10), vy: rnd(0, 10), vz: rnd(-10, 10), max: 0.25, s0: 10, s1: 3, c0: [1, 0.8, 0.3, 1], c1: [1, 0.2, 0, 0], drag: 2, add: true });
      if (Math.random() < 0.5) this.emit({ x: m[0] - fx * 14, y: 10, z: m[1] - fz * 14, vx: 0, vy: 8, vz: 0, max: 0.8, s0: 6, s1: 18, c0: [0.5, 0.5, 0.52, 0.4], c1: [0.6, 0.6, 0.6, 0], drag: 1 });
    }

    this.updateParticles(dt);

    // ---- Luces puntuales (de noche y al atardecer) ----
    const lights = [];
    if (env.lightK > 0.02) {
      for (const p of view.players) {
        const fx = Math.cos(p.a), fz = Math.sin(p.a);
        lights.push({ p: [p.x + fx * 60, 14, p.y + fz * 60], r: 150, c: [1.0 * env.lightK, 0.92 * env.lightK, 0.75 * env.lightK] });
        const kc = hex(p.color); lights.push({ p: [p.x, 4, p.y], r: 60, c: [kc[0] * env.under * 0.9, kc[1] * env.under * 0.9, kc[2] * env.under * 0.9] });
      }
      for (const m of view.missiles) lights.push({ p: [m[0], 12, m[1]], r: 110, c: [1.2 * env.lightK, 0.4 * env.lightK, 0.1 * env.lightK] });
      const tg = this.cam.target;
      const ls = this.lamps.map(l => ({ l, d: Math.hypot(l.p[0] - tg[0], l.p[2] - tg[2]) })).sort((a, b) => a.d - b.d);
      for (const { l } of ls) { if (lights.length >= 32) break; lights.push({ p: l.p, r: 260, c: [l.c[0] * 2 * env.lightK, l.c[1] * 2 * env.lightK, l.c[2] * 2 * env.lightK] }); }
    }
    E.setLights(lights.slice(0, 32));

    // ---- Sombras ----
    const sd = env.sunDir, ctr = [800, 0, 450];
    const lview = M4.lookAt([ctr[0] + sd[0] * 2000, sd[1] * 2000, ctr[2] + sd[2] * 2000], ctr, Math.abs(sd[1]) > 0.98 ? [0, 0, 1] : [0, 1, 0]);
    const lvp = M4.mul(M4.ortho(-1150, 1150, -1150, 1150, 100, 4200), lview);
    E.beginShadow(lvp);
    for (const s of this.statics) if (s.shadow) E.shadowDraw(s.mesh, s.model);
    for (const { k } of kartDraw) E.shadowDraw(k.mesh, k.M);
    E.endShadow();

    // ---- Pasada principal ----
    E.begin(cam, env, t);
    for (const s of this.statics) {
      const o = Object.assign({}, s.o);
      if (s.o.kind === 'road') { o.spec = 0.12 + env.wet * 0.95; o.shine = 18 + env.wet * 60; }
      if (s.o.kind === 'grass') o.tint = env.grass;
      E.draw(s.mesh, s.model, o);
    }
    // Público que bota (más cuando hay carrera)
    const jump = view.state === 'racing' || view.state === 'finished' ? 1 : 0.3;
    for (const c of this.crowdMeshes) E.draw(c.mesh, M4.compose(0, Math.max(0, Math.sin(t * 9 + c.phase)) * 2.2 * jump, 0), { spec: 0.1 });
    // Ruleta girando
    if (this.roulette) E.draw(this.roulette.mesh, M4.compose(this.roulette.x, 0, this.roulette.z, t * 0.6), { spec: 0.6, shine: 50 });
    // Semáforo de salida
    const cd = view.state === 'countdown' ? Math.min(3, view.countdown) : 0, go = view.state === 'racing' && view.raceTime < 2;
    this.startLights.forEach((L, i) => {
      const redOn = view.state === 'countdown' && i < 4 - cd;
      E.draw(L.red, ID4, { emis: redOn ? 2.2 : 0.05 });
      E.draw(L.green, ID4, { emis: go ? 2.2 : 0, alpha: 1 });
    });
    // Plataformas de turbo (animadas)
    E.draw(this.padM.mesh, this.padM.model, { tex: this.tex.pad, scroll: [0, -1.4], emis: 0.55 + Math.sin(t * 8) * 0.15 + env.nightGlow * 0.3, spec: 0.8 });
    // Cajas de objetos
    T.boxes.forEach((b, i) => {
      if (!view.boxes[i]) return;
      const sc = clamp((t - this.boxAppear[i]) / 0.4, 0.05, 1);
      const hue = (t * 0.25 + i * 0.11) % 1, c = hsl(hue, 0.85, 0.6);
      E.draw(this.boxMesh, M4.compose(b.x, 18 + Math.sin(t * 2.5 + i) * 3, b.y, t * 1.2 + i, 0.5, 0.3, sc), { tex: this.tex.box, tint: c, emis: 1.3, spec: 1.2, shine: 60 });
      this.addGlow([b.x, 18, b.y], c, 70, 0.25 + env.nightGlow * 0.35);
    });
    // Aceite
    for (const h of view.hazards) E.draw(this.oilMesh, M4.compose(h[0], 1, h[1], h[0] * 0.1), { spec: 1.6, shine: 90 });
    // Misiles
    for (const m of view.missiles) E.draw(this.missileMesh, M4.compose(m[0], 10, m[1], -m[2], Math.sin(t * 20) * 0.3, 0), { spec: 0.8 });
    // Karts
    for (const { p, k } of kartDraw) {
      const tint = k.flash > 0 && Math.floor(k.flash * 20) % 2 ? [2, 2, 2] : [1, 1, 1];
      E.draw(k.mesh, k.M, { spec: 0.9, shine: 60, tint, rim: 0.4 });
      const sp = p.sp || 0;
      for (const [wx, wz, front] of [[12, -13, 1], [12, 13, 1], [-12, -14, 0], [-12, 14, 0]]) {
        const wm = M4.mul(k.M, M4.compose(wx, 6, wz, front ? -(p.st || 0) * 0.45 : 0, 0, k.wheelRot));
        E.draw(this.wheelMesh, wm, { spec: 0.3 });
      }
      E.draw(this.headMesh, k.M, { emis: 1.2 });
      E.draw(this.tailMesh, k.M, { emis: p.br ? 2.6 : 0.35 + env.nightGlow * 0.9 });
    }

    // ---- Transparentes y brillos ----
    if (this.skidDirty) { E.uploadFlat(this.skid, this.skidN); this.skidDirty = false; }
    this.skid.count = this.skidN;
    E.drawFlat(this.skid, ID4, [1, 1, 1, 1], false);
    for (const { p, k } of kartDraw) {
      if (env.under > 0.02) E.drawFlat(this.underMesh, k.M, [...k.rgb, env.under * 0.55], true, true);
      if (env.lightK > 0.05) E.drawFlat(this.beamMesh, k.M, [1, 1, 1, env.lightK * 0.35], true, true);
      if (p.shield) E.drawFlat(this.shieldMesh, M4.compose(p.x, 0, p.y, t * 2), [0.45, 0.8, 1, 1.4 + Math.sin(t * 8) * 0.3], true, true);
      // brillos de faros y pilotos
      const fx = Math.cos(p.a), fz = Math.sin(p.a), rx = -fz, rz = fx;
      if (env.nightGlow > 0.05) for (const s of [-1, 1]) this.addGlow([p.x + fx * 21 + rx * 7 * s, 9, p.y + fz * 21 + rz * 7 * s], [1, 0.95, 0.8], 26, 0.7 * env.nightGlow);
      const tl = p.br ? 1 : env.nightGlow * 0.6;
      if (tl > 0.05) for (const s of [-1, 1]) this.addGlow([p.x - fx * 21 + rx * 8 * s, 11, p.y - fz * 21 + rz * 8 * s], [1, 0.1, 0.1], p.br ? 30 : 18, tl);
      if (p.boost) this.addGlow([p.x - fx * 24, 9, p.y - fz * 24], [1, 0.6, 0.2], 60, 0.7);
    }
    for (const g of this.glowStatic) {
      const a = g.night ? env.nightGlow : 0.35 + env.nightGlow * 0.4;
      if (a < 0.03) continue;
      this.addGlow(g.p, g.c, g.s * (g.pulse ? 1 + Math.sin(t * 8) * 0.15 : 1), a * 0.45);
    }
    E.uploadPoints(this.pbAlpha, this.nAlpha); E.uploadPoints(this.pbAdd, this.nAdd);
    E.drawPoints(this.pbAlpha, false, 1);
    E.drawPoints(this.pbAdd, true, 1);
  }
}
const ID4 = M4.ident();
function shade(c, k) { const v = hex(c); return v.map(x => Math.min(1, x * k)); }
function hsl(h, s, l) {
  const f = n => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return [f(0), f(8), f(4)];
}

window.World3D = World3D;
})();
