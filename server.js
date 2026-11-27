// 🎰 CASINO UAB — sala multijugador con 4 mesas de minijuegos
// Backend: Node.js + Express (sirve el frontend) + Socket.IO (WebSockets en tiempo real)
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static('public'));
app.use('/lib', express.static(__dirname + '/node_modules/three/build'));   // Three.js para el 3D
app.use('/jsm', express.static(__dirname + '/node_modules/three/examples/jsm')); // efectos (bloom, reflejos)

// ---------- Configuración ----------
const W = 1000, H = 1000;                       // tamaño del mundo (el cliente lo escala)
const START_COINS = 50;
const MIN_PLAYERS = Number(process.env.MIN_PLAYERS || 2);
const ZONE = 120;                               // radio de cada mesa / tienda
const PRIZES = [50, 30, 20, 10];                // monedas según posición (resto: 5)
const SHOP_POS = { x: 500, y: 70 };            // tienda al fondo de la sala
const BAR_POS = { x: 880, y: 120 };             // bar en la esquina derecha del fondo

const INTRO = 10000;                            // ms de instrucciones + cuenta atrás antes de cada juego
const TABLES = [
  { id: 'reflejos', name: 'Semáforo',       emoji: '🚦', x: 335, y: 214, color: '#e63946', dur: 8000,
    desc: 'Pulsa cuando se ponga verde',
    howto: 'La pantalla estará en ROJO. Cuando cambie a VERDE, toca lo más rápido que puedas. Si tocas en rojo quedas último.' },
  { id: 'clicks',   name: 'Machacabotones', emoji: '👊', x: 665, y: 214, color: '#f4a261', dur: 5500,
    desc: 'Pulsa más veces que nadie en 5 s',
    howto: 'Tienes 5 segundos. Machaca el botón dorado tantas veces como puedas. Gana quien más pulse.' },
  { id: 'stop',     name: 'Stop 7,77',      emoji: '⏱️', x: 830, y: 500, color: '#4cc9f0', dur: 12500,
    desc: 'Para el reloj en 7,77 s… a ciegas',
    howto: 'Un reloj empieza a contar. A los 3 segundos se oculta. Pulsa STOP cuando creas que marca 7,77 s. Gana el más cercano.' },
  { id: 'calculo',  name: 'Cálculo rápido', emoji: '🧮', x: 170, y: 500, color: '#b5179e', dur: 30000,
    desc: '5 operaciones, gana el más rápido',
    howto: 'Aparecen 5 operaciones con 4 respuestas. Elige la correcta. Gana quien acierte más; si empatáis, el más rápido.' },
  { id: 'memoria',  name: 'Memoria',        emoji: '🧠', x: 335, y: 786, color: '#06d6a0', dur: 25000,
    desc: 'Repite la secuencia de colores',
    howto: 'Se iluminarán 6 colores en orden. Memorízalos y repítelos tocando los botones. Gana quien acierte más seguidos; desempata el tiempo.' },
  { id: 'dianas',   name: 'Dianas',         emoji: '🎯', x: 665, y: 786, color: '#ffd166', dur: 20000,
    desc: 'Toca 10 dianas lo antes posible',
    howto: 'Irán apareciendo dianas en sitios distintos. Tócalas una a una. Gana quien haga las 10 en menos tiempo.' },
  { id: 'arena',    name: 'Tiroteo',        emoji: '🔫', x: 905, y: 860, color: '#ff006e', dur: 60000,
    desc: 'Shooter en primera persona: gana quien más bajas haga',
    howto: 'Arena de 60 s con tu propio avatar. Móvil: joystick a la izquierda para moverte, desliza a la derecha para apuntar y pulsa 🔫 para disparar. Ordenador: WASD + ratón (clic para disparar). Tiro a la cabeza = más daño. Si caes, reapareces en 2 s.' },
];
const ARENA_SPAWNS = [[-15, -15], [15, 15], [-15, 15], [15, -15], [0, -16], [0, 16], [-16, 0], [16, 0]];
const ARCADE_POS = { x: 130, y: 870 };

// Tienda: cada artículo ocupa un "hueco" del personaje (slot)
const SHOP = {
  // Colores de piel
  c_rojo:   { slot: 'color', name: 'Rojo pasión', value: '#e63946', price: 20 },
  c_verde:  { slot: 'color', name: 'Verde tapete', value: '#2a9d8f', price: 20 },
  c_rosa:   { slot: 'color', name: 'Rosa neón',   value: '#ff4ecd', price: 40 },
  c_negro:  { slot: 'color', name: 'Negro mafia', value: '#1b1b1b', price: 50 },
  c_oro:    { slot: 'color', name: 'Oro puro',    value: '#ffd166', price: 90 },
  c_arco:   { slot: 'color', name: 'Arcoíris',    value: 'rainbow', price: 200 },
  // Sombreros
  h_gorra:  { slot: 'hat', name: 'Gorra',         value: '🧢', price: 25 },
  h_fiesta: { slot: 'hat', name: 'Gorro fiesta',  value: '🎉', price: 30 },
  h_vaq:    { slot: 'hat', name: 'Vaquero',       value: '🤠', price: 45 },
  h_chist:  { slot: 'hat', name: 'Chistera',      value: '🎩', price: 70 },
  h_corona: { slot: 'hat', name: 'Corona VIP',    value: '👑', price: 250 },
  // Cara
  f_gafas:  { slot: 'face', name: 'Gafas de sol', value: '🕶️', price: 30 },
  f_bigote: { slot: 'face', name: 'Disfraz',      value: '🥸', price: 40 },
  f_mascara:{ slot: 'face', name: 'Antifaz',      value: '🎭', price: 60 },
  // Mascotas
  p_perro:  { slot: 'pet', name: 'Perrito',       value: '🐶', price: 60 },
  p_gato:   { slot: 'pet', name: 'Gatito',        value: '🐱', price: 60 },
  p_loro:   { slot: 'pet', name: 'Loro',          value: '🦜', price: 90 },
  p_dragon: { slot: 'pet', name: 'Dragón',        value: '🐉', price: 300 },
  // Efectos
  x_brillo: { slot: 'fx', name: 'Brillos',        value: 'sparkle', price: 80 },
  x_aura:   { slot: 'fx', name: 'Aura dorada',    value: 'aura', price: 120 },
  x_fuego:  { slot: 'fx', name: 'En llamas',      value: 'fire', price: 160 },
};
// Carta del bar: se paga con monedas ficticias
const BAR = {
  cola:     { name: 'Cola',          emoji: '🥤', price: 6,  kind: 'Bebida' },
  cerveza:  { name: 'Cerveza fría',  emoji: '🍺', price: 10, kind: 'Bebida' },
  mojito:   { name: 'Mojito',        emoji: '🍹', price: 14, kind: 'Bebida' },
  cocktail: { name: 'Cóctel neón',   emoji: '🍸', price: 20, kind: 'Bebida' },
  champan:  { name: 'Champán',       emoji: '🥂', price: 40, kind: 'Bebida' },
  patatas:  { name: 'Patatas',       emoji: '🍟', price: 8,  kind: 'Comida' },
  nachos:   { name: 'Nachos',        emoji: '🌮', price: 12, kind: 'Comida' },
  burger:   { name: 'Hamburguesa',   emoji: '🍔', price: 16, kind: 'Comida' },
  pizza:    { name: 'Pizza',         emoji: '🍕', price: 18, kind: 'Comida' },
  tarta:    { name: 'Tarta',         emoji: '🍰', price: 14, kind: 'Postre' },
};
const DEFAULT_LOOK = { color: '#8d99ae', hat: '', face: '', pet: '', fx: '' };

// ---------- Estado ----------
const players = {};   // id -> { id, name, x, y, coins, owned:[], look, busy }
const tables = {};    // id -> { status, players:[], results:{}, timer }
let orders = [];      // pedidos del bar activos { id, pid, item, to, status }
let orderSeq = 0;
TABLES.forEach(t => tables[t.id] = { status: 'idle', players: [], results: {} });

const rnd = (a, b) => a + Math.random() * (b - a);
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
const sock = id => io.sockets.sockets.get(id);
const feed = msg => io.emit('feed', msg);
const pub = p => ({ id: p.id, name: p.name, x: p.x, y: p.y, coins: p.coins, look: p.look, busy: !!p.busy, room: p.room });
const sendMe = id => { const p = players[id]; if (p) sock(id)?.emit('me', { coins: p.coins, owned: p.owned, look: p.look, inv: p.inv }); };
const inZone = t => Object.values(players).filter(p => !p.busy && p.room === 'main' && dist(p, t) < ZONE);

// Envía el estado del mundo 15 veces por segundo
setInterval(() => {
  io.emit('world', {
    players: Object.values(players).map(pub),
    tables: TABLES.map(t => ({ id: t.id, status: tables[t.id].status, count: inZone(t).length, playing: tables[t.id].players.length })),
  });
}, 66);

// ---------- Minijuegos ----------
function makeParams(id) {
  if (id === 'reflejos') return { delay: Math.round(rnd(2000, 5000)) };
  if (id === 'calculo') {
    return { qs: Array.from({ length: 5 }, () => {
      const op = ['+', '-', '×'][Math.floor(Math.random() * 3)];
      let a = Math.floor(rnd(2, op === '×' ? 10 : 50)), b = Math.floor(rnd(2, op === '×' ? 10 : 50));
      if (op === '-' && b > a) [a, b] = [b, a];
      const ans = op === '+' ? a + b : op === '-' ? a - b : a * b;
      const opts = new Set([ans]);
      while (opts.size < 4) opts.add(ans + Math.floor(rnd(-10, 11)) || ans + 11);
      return { q: `${a} ${op} ${b}`, a: ans, opts: [...opts].sort(() => Math.random() - 0.5) };
    }) };
  }
  if (id === 'memoria') return { seq: Array.from({ length: 6 }, () => Math.floor(Math.random() * 4)) };
  if (id === 'dianas') return { pos: Array.from({ length: 10 }, () => [Math.round(rnd(8, 82)), Math.round(rnd(8, 82))]) };
  return {};
}

// Convierte el resultado de cada jugador en { key (menor = mejor), txt }
function score(id, v) {
  if (v === undefined || v === null) return { key: 1e12, txt: 'No jugó' };
  if (id === 'reflejos') return v < 0 ? { key: 1e9, txt: '¡Demasiado pronto!' } : { key: v, txt: `${Math.round(v)} ms` };
  if (id === 'clicks')   { const c = Math.min(100, Math.round(v)); return { key: -c, txt: `${c} pulsaciones` }; }
  if (id === 'stop')     return { key: Math.abs(v - 7770), txt: `${(v / 1000).toFixed(2).replace('.', ',')} s` };
  if (id === 'memoria')  { const c = Math.min(6, v.c | 0), ms = +v.ms || 99999; return { key: -c * 1e6 + ms, txt: `${c}/6 en ${(ms / 1000).toFixed(1).replace('.', ',')} s` }; }
  if (id === 'dianas')   { const h = Math.min(10, v.h | 0), ms = +v.ms || 99999; return { key: (10 - h) * 1e6 + ms, txt: `${h}/10 en ${(ms / 1000).toFixed(1).replace('.', ',')} s` }; }
  if (id === 'arena')    return { key: -v.k * 1000 + v.d, txt: `${v.k} bajas · ${v.d} muertes` };
  if (id === 'calculo')  { const c = Math.min(5, v.c | 0), ms = +v.ms || 99999; return { key: -c * 1e6 + ms, txt: `${c}/5 en ${(ms / 1000).toFixed(1).replace('.', ',')} s` }; }
}

function startTable(t, starterId) {
  const st = tables[t.id];
  if (st.status !== 'idle') return;
  const ps = inZone(t);
  if (!ps.find(p => p.id === starterId)) return;
  if (ps.length < MIN_PLAYERS) return sock(starterId)?.emit('toast', `Hacen falta ${MIN_PLAYERS} jugadores en la mesa`);
  st.status = 'playing'; st.players = ps.map(p => p.id); st.results = {};
  const params = makeParams(t.id);
  if (t.id === 'arena') {
    st.arena = {};
    ps.forEach((p, i) => { const [x, z] = ARENA_SPAWNS[i % ARENA_SPAWNS.length]; st.arena[p.id] = { x, z, ry: 0, hp: 100, k: 0, d: 0, alive: true }; });
    params.me = null; params.spawns = Object.fromEntries(Object.entries(st.arena).map(([id, a]) => [id, [a.x, a.z]]));
  }
  ps.forEach(p => {
    p.busy = t.id;
    sock(p.id)?.emit('game:start', { table: t.id, name: t.name, emoji: t.emoji, desc: t.desc, howto: t.howto, intro: INTRO, params, rivals: ps.map(x => x.name) });
  });
  feed(`${t.emoji} Empieza ${t.name} con ${ps.map(p => p.name).join(', ')}`);
  st.timer = setTimeout(() => finishTable(t), INTRO + t.dur + 3000);   // instrucciones + juego + margen
}

function finishTable(t) {
  const st = tables[t.id];
  if (st.status !== 'playing') return;
  clearTimeout(st.timer);
  if (t.id === 'arena' && st.arena) { Object.entries(st.arena).forEach(([id, a]) => st.results[id] = { k: a.k, d: a.d }); st.arena = null; }
  const ranking = st.players.filter(id => players[id])
    .map(id => ({ id, name: players[id].name, ...score(t.id, st.results[id]) }))
    .sort((a, b) => a.key - b.key)
    .map((r, i) => {
      const prize = PRIZES[i] ?? 5;
      players[r.id].coins += prize;
      players[r.id].busy = null;
      return { id: r.id, name: r.name, txt: r.txt, prize, pos: i + 1 };
    });
  ranking.forEach(r => { sock(r.id)?.emit('game:end', { name: t.name, emoji: t.emoji, ranking }); sendMe(r.id); });
  if (ranking[0]) feed(`🏆 ${ranking[0].name} gana en ${t.name} (+${ranking[0].prize} 🪙)`);
  st.status = 'idle'; st.players = []; st.results = {};
}

// Arena del shooter: envía posiciones y vida a sus jugadores 20 veces por segundo
setInterval(() => {
  const st = tables.arena;
  if (st.status !== 'playing' || !st.arena) return;
  const list = Object.entries(st.arena).map(([id, a]) => ({ id, ...a }));
  Object.keys(st.arena).forEach(id => sock(id)?.emit('arena:state', list));
}, 50);

// ---------- Conexiones ----------
io.on('connection', socket => {
  socket.emit('init', { W, H, tables: TABLES, shop: SHOP, shopPos: SHOP_POS, barPos: BAR_POS, bar: BAR, orders, arcadePos: ARCADE_POS, zone: ZONE, prizes: PRIZES, minPlayers: MIN_PLAYERS });

  socket.on('join', name => {
    name = String(name || '').trim().slice(0, 14) || 'Anónimo';
    players[socket.id] = { id: socket.id, name, x: rnd(420, 580), y: rnd(900, 950), coins: START_COINS, owned: [], inv: {}, look: { ...DEFAULT_LOOK }, busy: null, room: 'main' };
    sendMe(socket.id);
    feed(`👋 ${name} ha entrado al casino`);
  });

  socket.on('move', pos => {
    const p = players[socket.id]; if (!p || p.busy || !pos) return;
    p.x = Math.max(25, Math.min(W - 25, +pos.x || 0));
    p.y = Math.max(40, Math.min(H - 25, +pos.y || 0));
    p.room = pos.room === 'classic' ? 'classic' : 'main';
  });

  socket.on('table:start', id => { const t = TABLES.find(x => x.id === id); if (t) startTable(t, socket.id); });

  socket.on('game:result', v => {
    const p = players[socket.id]; if (!p || !p.busy) return;
    const t = TABLES.find(x => x.id === p.busy), st = tables[p.busy];
    if (st.status !== 'playing' || socket.id in st.results) return;
    st.results[socket.id] = v;
    if (st.players.every(id => id in st.results || !players[id])) finishTable(t);
  });

  // Shooter: posición y disparos (el servidor lleva la vida y las bajas)
  socket.on('arena:pos', d => {
    const a = tables.arena.arena?.[socket.id]; if (!a || !a.alive || !d) return;
    a.x = Math.max(-19, Math.min(19, +d.x || 0)); a.z = Math.max(-19, Math.min(19, +d.z || 0)); a.ry = +d.ry || 0;
  });
  socket.on('arena:shoot', d => {
    const A = tables.arena.arena; if (!A || !d) return;
    const me = A[socket.id], tg = A[d.target];
    Object.keys(A).forEach(id => id !== socket.id && sock(id)?.emit('arena:fx', { from: socket.id }));
    if (!me || !me.alive || !tg || !tg.alive || d.target === socket.id) return;
    if (Math.hypot(me.x - tg.x, me.z - tg.z) > 45) return;
    tg.hp -= d.head ? 60 : 25;
    let killed = false;
    if (tg.hp <= 0) {
      killed = true; tg.alive = false; tg.hp = 0; tg.d++; me.k++;
      setTimeout(() => {
        if (tables.arena.arena !== A) return;
        const [x, z] = ARENA_SPAWNS[Math.floor(Math.random() * ARENA_SPAWNS.length)];
        Object.assign(tg, { x, z, hp: 100, alive: true });
        sock(d.target)?.emit('arena:respawn', { x, z });
      }, 2000);
    }
    const names = { s: players[socket.id]?.name, t: players[d.target]?.name };
    Object.keys(A).forEach(id => sock(id)?.emit('arena:hit', { shooter: socket.id, target: d.target, head: !!d.head, killed, hp: tg.hp, ...names }));
  });

  // Tienda: comprar o equipar/quitar
  socket.on('shop', key => {
    const p = players[socket.id], item = SHOP[key]; if (!p || !item) return;
    if (p.room !== 'main' || dist(p, SHOP_POS) > ZONE + 30) return socket.emit('toast', 'Ve a la tienda para comprar');
    if (!p.owned.includes(key)) {
      if (p.coins < item.price) return socket.emit('toast', 'No tienes monedas suficientes 💸');
      p.coins -= item.price; p.owned.push(key);
      feed(`🛍️ ${p.name} ha comprado ${item.name}`);
    }
    p.look[item.slot] = p.look[item.slot] === item.value ? DEFAULT_LOOK[item.slot] : item.value;
    sendMe(socket.id);
  });

  // Bar: pide comida o bebida con monedas ficticias; un camarero la lleva a tu posición
  const pubOrder = o => ({ id: o.id, pid: o.pid, item: o.item, to: o.to, status: o.status });
  const deliver = o => {
    if (o.status === 'delivered' || o.status === 'cancelled') return;
    o.status = 'delivered';
    const p = players[o.pid]; if (p) { p.inv[o.item] = (p.inv[o.item] || 0) + 1; sendMe(o.pid); sock(o.pid)?.emit('toast', `${BAR[o.item].emoji} ¡Tu pedido ha llegado! Disfruta`); }
    io.emit('order', pubOrder(o));
    setTimeout(() => { orders = orders.filter(x => x.id !== o.id); }, 5000);
  };
  socket.on('bar:order', msg => {
    const p = players[socket.id], it = msg && BAR[msg.item]; if (!p || !it) return;
    if (orders.filter(o => o.pid === socket.id && o.status !== 'delivered').length >= 3) return socket.emit('toast', 'Ya tienes 3 pedidos en camino');
    if (p.coins < it.price) return socket.emit('toast', 'No tienes monedas suficientes 💸');
    p.coins -= it.price;
    const o = { id: ++orderSeq, pid: socket.id, item: msg.item, to: msg.to === 'bar' ? 'bar' : 'me', status: 'preparing' };
    orders.push(o); sendMe(socket.id); io.emit('order', pubOrder(o));
    setTimeout(() => {
      if (o.status !== 'preparing') return;
      o.status = 'delivering'; io.emit('order', pubOrder(o));
      setTimeout(() => deliver(o), 70000);        // por si el camarero no llega
    }, 3500);
  });
  socket.on('order:arrived', id => {
    const o = orders.find(x => x.id === id);
    if (o && o.pid === socket.id && o.status === 'delivering') deliver(o);
  });

  socket.on('disconnect', () => {
    orders.filter(o => o.pid === socket.id && o.status !== 'delivered').forEach(o => { o.status = 'cancelled'; io.emit('order', pubOrder(o)); });
    orders = orders.filter(o => o.status !== 'cancelled');
    const p = players[socket.id]; if (!p) return;
    delete players[socket.id];
    if (p.busy) { const t = TABLES.find(x => x.id === p.busy), st = tables[p.busy];
      if (st.players.every(id => id in st.results || !players[id])) finishTable(t); }
    feed(`🚪 ${p.name} ha salido`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🎰 Casino escuchando en el puerto ${PORT}`));
