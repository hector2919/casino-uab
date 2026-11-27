// ¡DERRAPA! · Lógica del juego (sin red): circuito, física de karts, derrapes, objetos y vueltas.
// El servidor es la autoridad: los móviles solo mandan {steer, throttle, brake, drift, item, assist}.

const W = 1600, H = 900;          // tamaño del mundo (el proyector lo pinta en 3D: x → X, y → Z)
const HALF_W = 68;                // medio ancho del asfalto
const LAPS = 3;
const KART_R = 17;

// Velocidades (unidades/segundo)
const MAX_SPEED = 400, GRASS_FACTOR = 0.5, BOOST_SPEED = 650;
const ACCEL = 360, TURN_RATE = 3.0, BRAKE = 820, REVERSE_SPEED = 120;
const GRIP = 9, DRIFT_GRIP = 2.2;  // cuanto menos agarre, más derrapa
const SPIN_TIME = 1.1, SHIELD_TIME = 8, ROLL_TIME = 1.2;
const PAD_BOOST = 0.9;             // segundos de turbo de las plataformas

const COLORS = ['#e8433c', '#2f7de1', '#2fb35a', '#f5c000', '#9b4fd6', '#ff7a1a',
  '#12b5a8', '#ec4f9a', '#5c6bc0', '#8bc34a', '#795548', '#222831'];

// ---------- Circuito: puntos de control suavizados con Catmull-Rom ----------
const CTRL = [
  [260, 780], [650, 800], [860, 730], [940, 590], [1060, 490], [1250, 520], [1410, 650],
  [1490, 460], [1460, 230], [1300, 120], [1050, 140], [900, 260], [760, 380], [610, 360],
  [530, 220], [390, 120], [230, 160], [150, 350], [150, 610],
];

function buildTrack(ctrl, perSeg = 24) {
  const pts = [];
  const n = ctrl.length;
  for (let i = 0; i < n; i++) {
    const p0 = ctrl[(i - 1 + n) % n], p1 = ctrl[i], p2 = ctrl[(i + 1) % n], p3 = ctrl[(i + 2) % n];
    for (let k = 0; k < perSeg; k++) {
      const t = k / perSeg, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  // distancia acumulada de cada punto (para medir el progreso)
  const s = [0];
  for (let i = 1; i <= pts.length; i++) {
    const a = pts[i - 1], b = pts[i % pts.length];
    s.push(s[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  return { pts, s, length: s[pts.length] };
}
const TRACK = buildTrack(CTRL);
const N = TRACK.pts.length;

// Punto más cercano del circuito: devuelve distancia al eje y posición "s" a lo largo
function locate(x, y) {
  let best = Infinity, bestS = 0;
  for (let i = 0; i < N; i++) {
    const a = TRACK.pts[i], b = TRACK.pts[(i + 1) % N];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    let t = ((x - a[0]) * dx + (y - a[1]) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = a[0] + dx * t, py = a[1] + dy * t;
    const d2 = (x - px) ** 2 + (y - py) ** 2;
    if (d2 < best) { best = d2; bestS = TRACK.s[i] + t * Math.sqrt(len2); }
  }
  return { dist: Math.sqrt(best), s: bestS };
}

// Punto (y dirección) del circuito a una distancia s, con desplazamiento lateral
function pointAt(s, lateral = 0) {
  const L = TRACK.length;
  s = ((s % L) + L) % L;
  let i = 0;
  while (i < N - 1 && TRACK.s[i + 1] < s) i++;
  const a = TRACK.pts[i], b = TRACK.pts[(i + 1) % N];
  const seg = TRACK.s[i + 1] - TRACK.s[i];
  const t = seg > 0 ? (s - TRACK.s[i]) / seg : 0;
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  return { x: a[0] + (b[0] - a[0]) * t + nx * lateral, y: a[1] + (b[1] - a[1]) * t + ny * lateral, ang };
}

// Cajas de objetos: 3 filas de 3 repartidas por el circuito
const BOX_ROWS = [0.22, 0.52, 0.78];
const BOXES = [];
for (const f of BOX_ROWS) for (const lat of [-36, 0, 36]) {
  const p = pointAt(f * TRACK.length, lat);
  BOXES.push({ x: Math.round(p.x), y: Math.round(p.y) });
}

// Plataformas luminosas de aceleración (en rectas, alternando el lado)
const PAD_LEN = 56, PAD_W = 44;
const PADS = [[0.08, 0], [0.33, -28], [0.62, 28], [0.9, -24]].map(([f, lat]) => {
  const p = pointAt(f * TRACK.length, lat);
  return { x: Math.round(p.x), y: Math.round(p.y), a: +p.ang.toFixed(3) };
});

// ---------- Ambiente según la hora real de España ----------
const ENV_MODES = ['auto', 'day', 'sunset', 'night'];
function madridClock(date = new Date()) {
  const parts = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const get = t => +(parts.find(p => p.type === t) || { value: 0 }).value;
  return { h: get('hour') % 24, m: get('minute') };
}
function ambientForHour(h) {
  if (h >= 7 && h < 17) return 'day';        // 07:00–16:59
  if (h >= 17 && h < 20) return 'sunset';    // 17:00–19:59
  return 'night';                            // 20:00–06:59
}

// ---------- Objetos ----------
const ITEMS = ['nitro', 'triple', 'aceite', 'misil', 'escudo'];
function rollItem(r) {                 // r: 0 = vas primero, 1 = vas último
  const w = { nitro: 20 + 20 * r, triple: 30 * r, aceite: 38 - 28 * r, misil: 12 + 20 * r, escudo: 26 - 16 * r };
  let total = 0; for (const k in w) total += w[k];
  let x = Math.random() * total;
  for (const k in w) { x -= w[k]; if (x <= 0) return k; }
  return 'nitro';
}

const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

class Game {
  constructor() {
    this.players = new Map();
    this.state = 'lobby';                 // lobby | countdown | racing | finished
    this.countdown = 0;
    this.raceTime = 0;
    this.endTimer = 0;
    this.finishOrder = [];
    this.colorIdx = 0;
    this.botCount = 0;
    this.boxes = BOXES.map(b => ({ ...b, cd: 0 }));
    this.hazards = [];                    // manchas de aceite
    this.missiles = [];
    this.events = [];                     // sucesos para efectos visuales y sonidos (se vacían en cada snapshot)
    this.fastest = null;                  // vuelta más rápida de la carrera {id, name, color, time}
    this.raceNo = 0;
    this.envMode = 'auto';                // auto | day | sunset | night (lo elige el anfitrión)
  }

  addPlayer(id, name, bot = false) {
    const used = new Set([...this.players.values()].map(p => p.color));
    const color = COLORS.find(c => !used.has(c)) || COLORS[this.colorIdx++ % COLORS.length];
    const p = {
      id, bot, name: String(name || 'Piloto').slice(0, 12), color,
      x: 0, y: 0, vx: 0, vy: 0, angle: 0, speed: 0,
      steer: 0, throttle: 1, brake: false, assist: false,
      drift: false, driftCharge: 0, driftDir: 0,
      boostLeft: 0, spin: 0, shield: 0, hits: 0, padCd: 0, bumpCd: 0,
      item: null, itemCount: 0, rollLeft: 0,
      dist: 0, lastS: 0, offTrack: false, finished: false, finishTime: 0,
      lapIdx: -1, lapStart: 0, lastLap: 0, bestLap: 0,
      botLane: (Math.random() - 0.5) * 50, botItemAt: 0, botSkill: 0.88 + Math.random() * 0.1,
    };
    this.players.set(id, p);
    this.placeOnGrid(p, this.players.size - 1);
    return p;
  }

  addBot() {
    const names = ['Turbina', 'Chispa', 'Rayo', 'Pistón', 'Bujía', 'Tuerca', 'Gasolina', 'Rueda'];
    const id = 'bot-' + (++this.botCount);
    return this.addPlayer(id, '🤖 ' + names[(this.botCount - 1) % names.length], true);
  }
  removeBots() { for (const [id, p] of this.players) if (p.bot) this.players.delete(id); }
  removePlayer(id) {
    this.players.delete(id);
    this.finishOrder = this.finishOrder.filter(f => f !== id);
  }

  placeOnGrid(p, i) {
    // Parrilla de dos en dos, detrás de la línea de meta
    const row = Math.floor(i / 2), col = i % 2;
    const s = -40 - row * 46 - col * 18;
    const pt = pointAt(s, col ? 26 : -26);
    Object.assign(p, {
      x: pt.x, y: pt.y, angle: pt.ang, vx: 0, vy: 0, speed: 0,
      dist: s, lastS: ((s % TRACK.length) + TRACK.length) % TRACK.length,
      finished: false, finishTime: 0, boostLeft: 0, spin: 0, shield: 0,
      item: null, itemCount: 0, rollLeft: 0, driftCharge: 0, drift: false, brake: false,
      lapIdx: Math.floor(s / TRACK.length), lapStart: 0, lastLap: 0, bestLap: 0,
    });
  }

  setInput(id, input) {
    const p = this.players.get(id);
    if (!p || p.bot) return;
    if (typeof input.steer === 'number' && isFinite(input.steer)) p.steer = clamp(input.steer, -1, 1);
    // throttle: si el mando no lo manda (versiones antiguas), acelera solo
    p.throttle = typeof input.throttle === 'number' && isFinite(input.throttle) ? clamp(input.throttle, 0, 1) : 1;
    p.brake = !!input.brake;
    p.assist = !!input.assist;
    this.setDrift(p, !!input.drift);
    if (input.item) this.useItem(p);
  }

  setDrift(p, on) {
    if (on && !p.drift) { p.driftDir = 0; p.driftCharge = 0; }
    if (!on && p.drift) {
      // Al soltar el derrape: mini-turbo según lo cargado
      let t = 0;
      if (p.driftCharge > 2.0) t = 1.0;
      else if (p.driftCharge > 1.0) t = 0.55;
      if (t) { p.boostLeft = Math.max(p.boostLeft, t); this.events.push({ t: 'turbo', id: p.id, lvl: t > 0.6 ? 2 : 1 }); }
      p.driftCharge = 0;
    }
    p.drift = on;
  }

  setEnv(mode) { if (ENV_MODES.includes(mode)) this.envMode = mode; }
  env(date) {
    const c = madridClock(date);
    const ambient = this.envMode === 'auto' ? ambientForHour(c.h) : this.envMode;
    return { mode: this.envMode, ambient, clock: String(c.h).padStart(2, '0') + ':' + String(c.m).padStart(2, '0') };
  }

  start() {
    if (this.players.size === 0) return;
    [...this.players.values()].forEach((p, i) => this.placeOnGrid(p, i));
    this.finishOrder = [];
    this.hazards = []; this.missiles = [];
    this.boxes.forEach(b => b.cd = 0);
    this.raceTime = 0;
    this.fastest = null;
    this.raceNo++;
    this.state = 'countdown';
    this.countdown = 3.99;
  }

  reset() {
    this.state = 'lobby';
    this.hazards = []; this.missiles = [];
    this.fastest = null;
    [...this.players.values()].forEach((p, i) => this.placeOnGrid(p, i));
  }

  // ---------- Objetos ----------
  useItem(p) {
    if (this.state !== 'racing' || !p.item || p.rollLeft > 0 || p.spin > 0 || p.finished) return;
    const fx = Math.cos(p.angle), fy = Math.sin(p.angle);
    switch (p.item) {
      case 'nitro': case 'triple': p.boostLeft = Math.max(p.boostLeft, 1.2); break;
      case 'aceite': this.hazards.push({ x: p.x - fx * 34, y: p.y - fy * 34, owner: p.id, safe: 0.6, life: 30 }); break;
      case 'escudo': p.shield = SHIELD_TIME; break;
      case 'misil': {
        // Persigue al kart que va justo delante (si vas primero, sale recto)
        const rank = this.ranking();
        const idx = rank.indexOf(p);
        const target = idx > 0 ? rank[idx - 1] : null;
        this.missiles.push({ x: p.x + fx * 26, y: p.y + fy * 26, a: p.angle, owner: p.id, target: target && target.id, life: 4 });
        break;
      }
    }
    this.events.push({ t: 'use', id: p.id, item: p.item });
    if (--p.itemCount <= 0) { p.item = null; p.itemCount = 0; }
  }

  hit(p, by) {
    if (p.shield > 0) { p.shield = 0; this.events.push({ t: 'block', id: p.id, x: Math.round(p.x), y: Math.round(p.y) }); return; }
    if (p.spin > 0) return;
    p.spin = SPIN_TIME; p.boostLeft = 0; p.driftCharge = 0; p.hits++;
    this.events.push({ t: 'hit', id: p.id, by, x: Math.round(p.x), y: Math.round(p.y) });
  }

  botThink(p, dt) {
    const ahead = pointAt(p.lastS + 120, p.botLane);
    const want = Math.atan2(ahead.y - p.y, ahead.x - p.x);
    p.steer = clamp(angDiff(want, p.angle) * 2.2, -1, 1);
    p.throttle = 1; p.brake = false;
    // Derrapa en curvas cerradas
    const curve = Math.abs(angDiff(pointAt(p.lastS + 200).ang, pointAt(p.lastS).ang));
    this.setDrift(p, curve > 0.9 && p.speed > 250);
    if (p.item && p.rollLeft <= 0) {
      p.botItemAt -= dt;
      if (p.botItemAt <= 0) { this.useItem(p); p.botItemAt = 1 + Math.random() * 3; }
    }
  }

  step(dt) {
    if (this.state === 'countdown') {
      this.countdown -= dt;
      if (this.countdown <= 0) { this.state = 'racing'; this.raceTime = 0; this.events.push({ t: 'go' }); }
      return;
    }
    if (this.state !== 'racing') return;
    this.raceTime += dt;
    const ps = [...this.players.values()];
    const rank = this.ranking();

    for (const p of ps) {
      if (p.bot && !p.finished) this.botThink(p, dt);
      this.physics(p, dt);
      this.updateProgress(p);
    }

    // Choques entre karts
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i], b = ps[j];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d > 0 && d < KART_R * 2) {
        const push = (KART_R * 2 - d) / 2, nx = dx / d, ny = dy / d;
        const closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
        a.vx -= nx * 40; a.vy -= ny * 40; b.vx += nx * 40; b.vy += ny * 40;
        if (closing > 90 && a.bumpCd <= 0 && b.bumpCd <= 0) {
          a.bumpCd = b.bumpCd = 0.35;
          this.events.push({ t: 'bump', a: a.id, b: b.id, x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2), f: Math.min(1, closing / 300) });
        }
      }
    }

    // Cajas de objetos
    for (const box of this.boxes) {
      if (box.cd > 0) { box.cd -= dt; continue; }
      for (const p of ps) {
        if (p.finished || Math.hypot(p.x - box.x, p.y - box.y) > KART_R + 16) continue;
        box.cd = 3;
        this.events.push({ t: 'pick', id: p.id, x: box.x, y: box.y });
        if (!p.item) {
          const r = ps.length > 1 ? rank.indexOf(p) / (ps.length - 1) : 0.5;
          p.item = rollItem(r);
          p.itemCount = p.item === 'triple' ? 3 : 1;
          p.rollLeft = ROLL_TIME;
        }
        break;
      }
    }

    // Aceite
    for (const h of this.hazards) {
      h.life -= dt; h.safe -= dt;
      for (const p of ps) {
        if (h.life <= 0 || (p.id === h.owner && h.safe > 0)) continue;
        if (Math.hypot(p.x - h.x, p.y - h.y) < KART_R + 14) { this.hit(p, 'aceite'); h.life = 0; }
      }
    }
    this.hazards = this.hazards.filter(h => h.life > 0);

    // Misiles teledirigidos
    for (const m of this.missiles) {
      m.life -= dt;
      const t = m.target && this.players.get(m.target);
      if (t) {
        const want = Math.atan2(t.y - m.y, t.x - m.x);
        m.a += clamp(angDiff(want, m.a), -1, 1) * 5 * dt;
      }
      m.x += Math.cos(m.a) * 720 * dt; m.y += Math.sin(m.a) * 720 * dt;
      if (m.x < 0 || m.y < 0 || m.x > W || m.y > H) { m.life = 0; this.events.push({ t: 'boom', x: Math.round(clamp(m.x, 0, W)), y: Math.round(clamp(m.y, 0, H)) }); }
      for (const p of ps) {
        if (m.life <= 0 || p.id === m.owner) continue;
        if (Math.hypot(p.x - m.x, p.y - m.y) < KART_R + 8) { this.hit(p, 'misil'); m.life = 0; this.events.push({ t: 'boom', x: Math.round(m.x), y: Math.round(m.y) }); }
      }
    }
    this.missiles = this.missiles.filter(m => m.life > 0);

    // Fin: todos han llegado o 20 s después del primero
    if (this.finishOrder.length > 0) {
      this.endTimer -= dt;
      if (this.endTimer <= 0 || this.finishOrder.length >= ps.length) { this.state = 'finished'; this.events.push({ t: 'end' }); }
    }
  }

  physics(p, dt) {
    p.boostLeft = Math.max(0, p.boostLeft - dt);
    p.shield = Math.max(0, p.shield - dt);
    p.rollLeft = Math.max(0, p.rollLeft - dt);
    p.spin = Math.max(0, p.spin - dt);
    p.padCd = Math.max(0, p.padCd - dt);
    p.bumpCd = Math.max(0, p.bumpCd - dt);

    const loc = locate(p.x, p.y);
    const grass = loc.dist > HALF_W;
    p.offTrack = grass;

    // Plataformas de aceleración
    if (!p.finished && p.padCd <= 0) for (const pad of PADS) {
      const dx = p.x - pad.x, dy = p.y - pad.y, c = Math.cos(pad.a), s = Math.sin(pad.a);
      if (Math.abs(dx * c + dy * s) < PAD_LEN / 2 + 6 && Math.abs(-dx * s + dy * c) < PAD_W / 2 + 6) {
        p.boostLeft = Math.max(p.boostLeft, PAD_BOOST); p.padCd = 0.6;
        this.events.push({ t: 'pad', id: p.id });
        break;
      }
    }

    let target = p.finished ? 0 : p.boostLeft > 0 ? BOOST_SPEED : MAX_SPEED * (p.bot ? p.botSkill : 1);
    if (!p.finished && p.boostLeft <= 0) target *= p.throttle;
    if (grass && p.boostLeft <= 0) target *= GRASS_FACTOR;
    if (p.drift) target *= 0.92;
    if (p.spin > 0) target = 60;
    const braking = p.brake && !p.finished && p.spin <= 0;

    if (braking) {
      // Freno fuerte; si ya está parado, marcha atrás lenta (para salir de un atasco)
      if (p.speed > 0) p.speed = Math.max(0, p.speed - BRAKE * dt);
      else p.speed = Math.max(-REVERSE_SPEED, p.speed - ACCEL * 0.6 * dt);
    } else if (p.speed < target) p.speed = Math.min(target, p.speed + ACCEL * dt * (p.boostLeft > 0 ? 3 : p.speed < 0 ? 2.5 : 1));
    else p.speed = Math.max(target, p.speed - ACCEL * (p.throttle < 0.5 ? 0.9 : 1.6) * dt);

    if (p.spin <= 0) {
      let steer = p.steer;
      // Asistencia (modo fácil): si no tocas la dirección, el kart sigue suavemente la curva
      // (apunta a un punto del eje un poco más adelante; en curvas cerradas hay que ayudarle)
      if (p.assist && Math.abs(steer) < 0.05 && !p.drift && p.speed > 60) {
        const ahead = pointAt(loc.s + 110);
        const want = Math.atan2(ahead.y - p.y, ahead.x - p.x);
        steer = clamp(angDiff(want, p.angle) * 1.2, -0.45, 0.45);
      }
      let turn = steer * TURN_RATE;
      if (p.drift) {
        // El derrape fija un lado y deja girar más cerrado
        if (p.driftDir === 0 && Math.abs(steer) > 0.25) p.driftDir = Math.sign(steer);
        if (p.driftDir !== 0) {
          turn = p.driftDir * TURN_RATE * (0.9 + 0.6 * Math.max(0, steer * p.driftDir));
          if (p.speed > 200 && !grass) p.driftCharge += dt;
        }
      }
      p.angle += turn * dt * clamp(p.speed / 120, -1, 1);
    }

    // Velocidad real vs. hacia dónde apunta el kart: el agarre los acerca
    const grip = p.drift ? DRIFT_GRIP : GRIP;
    const dvx = Math.cos(p.angle) * p.speed, dvy = Math.sin(p.angle) * p.speed;
    const k = Math.min(1, grip * dt);
    p.vx += (dvx - p.vx) * k; p.vy += (dvy - p.vy) * k;
    p.x = clamp(p.x + p.vx * dt, KART_R, W - KART_R);
    p.y = clamp(p.y + p.vy * dt, KART_R, H - KART_R);
  }

  // Progreso continuo a lo largo del circuito (no deja hacer trampas atajando)
  updateProgress(p) {
    const L = TRACK.length;
    const { s } = locate(p.x, p.y);
    let d = s - p.lastS;
    if (d > L / 2) d -= L; else if (d < -L / 2) d += L;
    d = clamp(d, -25, 25);
    p.lastS = s;
    if (p.finished) return;
    p.dist += d;
    // Tiempos por vuelta
    const idx = Math.floor(p.dist / L);
    if (idx > p.lapIdx) {
      p.lapIdx = idx;
      if (idx >= 1) {
        const lt = this.raceTime - p.lapStart;
        p.lapStart = this.raceTime;
        p.lastLap = lt;
        if (!p.bestLap || lt < p.bestLap) p.bestLap = lt;
        const record = !this.fastest || lt < this.fastest.time;
        if (record) this.fastest = { id: p.id, name: p.name, color: p.color, time: +lt.toFixed(2) };
        this.events.push({ t: 'lap', id: p.id, lap: idx + 1, time: +lt.toFixed(2), record });
      }
    }
    if (p.dist >= LAPS * L) {
      p.finished = true;
      p.finishTime = this.raceTime;
      p.drift = false;
      this.finishOrder.push(p.id);
      this.events.push({ t: 'finish', id: p.id, pos: this.finishOrder.length });
      if (this.finishOrder.length === 1) this.endTimer = 20;
    }
  }

  lapOf(p) { return Math.max(1, Math.min(LAPS, Math.floor(p.dist / TRACK.length) + 1)); }

  ranking() {
    return [...this.players.values()].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.dist - a.dist;
    });
  }

  snapshot() {
    const events = this.events; this.events = [];
    return {
      state: this.state,
      countdown: Math.ceil(this.countdown),
      raceTime: +this.raceTime.toFixed(2),
      laps: LAPS,
      raceNo: this.raceNo,
      env: this.env(),
      fastest: this.fastest,
      players: this.ranking().map(p => ({
        id: p.id, name: p.name, color: p.color, bot: p.bot,
        x: Math.round(p.x), y: Math.round(p.y), a: +p.angle.toFixed(3),
        sp: Math.round(p.speed), st: +p.steer.toFixed(2), br: p.brake && p.speed > 20,
        off: p.offTrack,
        boost: p.boostLeft > 0, shield: p.shield > 0, spin: p.spin > 0,
        drift: p.drift ? (p.driftCharge > 2 ? 2 : p.driftCharge > 1 ? 1 : 0) : -1,
        item: p.rollLeft > 0 ? '?' : p.item, lap: this.lapOf(p),
        finished: p.finished, time: +p.finishTime.toFixed(2),
        best: +p.bestLap.toFixed(2),
      })),
      boxes: this.boxes.map(b => b.cd <= 0 ? 1 : 0),
      hazards: this.hazards.map(h => [Math.round(h.x), Math.round(h.y)]),
      missiles: this.missiles.map(m => [Math.round(m.x), Math.round(m.y), +m.a.toFixed(2)]),
      events,
    };
  }
}

module.exports = {
  Game, ambientForHour, madridClock,
  TRACK_INFO: {
    W, H, HALF_W, KART_R, LAPS, MAX_SPEED, BOOST_SPEED,
    pts: TRACK.pts.map(([x, y]) => [Math.round(x), Math.round(y)]),
    boxes: BOXES, pads: PADS, padLen: PAD_LEN, padW: PAD_W,
  },
};
