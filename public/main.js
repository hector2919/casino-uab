// Frontend: dibuja la sala, mueve tu avatar y se comunica con el servidor por Socket.IO
const socket = io();
const $ = id => document.getElementById(id);
const PROJ = location.search.includes('pantalla');   // modo proyector: /?pantalla
const cv = $('cv'), ctx = cv.getContext('2d');
let CFG = null, me = null, myData = { coins: 0, owned: [], look: {} };
let others = {}, tableState = {}, joined = false, busy = false;
let target = null, keys = {}, lastSent = 0, view = { s: 1, x: 0, y: 0 };

// ---------- Utilidades ----------
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let toastT;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200); }
const open = id => $(id).classList.add('on'), close = id => $(id).classList.remove('on');
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => close(b.dataset.close));

// ---------- Conexión ----------
socket.on('init', cfg => { CFG = cfg; buildFloor(); if (joined) socket.emit('join', myName()); });
socket.on('me', d => { myData = d; $('coins').textContent = `🪙 ${d.coins}`; $('shopCoins').textContent = `🪙 ${d.coins}`; if ($('shop').classList.contains('on')) renderShop(); });
socket.on('toast', toast);
socket.on('feed', msg => {
  const f = $('feed'), d = document.createElement('div'); d.textContent = msg; f.prepend(d);
  while (f.children.length > 4) f.lastChild.remove();
});
socket.on('world', w => {
  const seen = {};
  w.players.forEach(p => {
    seen[p.id] = 1;
    if (p.id === socket.id) {
      if (!me) me = { x: p.x, y: p.y };
      me.look = p.look; me.name = p.name; me.coins = p.coins; busy = p.busy;
      return;
    }
    const o = others[p.id] || (others[p.id] = { ...p, rx: p.x, ry: p.y, seed: Math.random() * 9 });
    Object.assign(o, p);
  });
  Object.keys(others).forEach(id => { if (!seen[id]) delete others[id]; });
  w.tables.forEach(t => tableState[t.id] = t);
  $('online').textContent = `👥 ${w.players.length}`;
  if (PROJ) renderProj(w.players);
});

// ---------- Entrar ----------
const myName = () => { try { return localStorage.casinoName || 'Anónimo'; } catch (e) { return 'Anónimo'; } };
try { $('name').value = localStorage.casinoName || ''; } catch (e) {}
$('joinBtn').onclick = () => {
  const n = $('name').value.trim() || 'Anónimo';
  try { localStorage.casinoName = n; } catch (e) {}
  joined = true; socket.emit('join', n); close('join');
};
$('name').addEventListener('keydown', e => { if (e.key === 'Enter') $('joinBtn').click(); });
if (PROJ) { close('join'); document.body.classList.add('proj'); }

// ---------- Controles: tocar el suelo o teclado ----------
cv.addEventListener('pointerdown', e => {
  if (!me || busy) return;
  const r = cv.getBoundingClientRect();
  target = { x: (e.clientX - r.left) / view.s + view.x, y: (e.clientY - r.top) / view.s + view.y };
});
addEventListener('keydown', e => { if (document.activeElement.tagName !== 'INPUT') keys[e.key.toLowerCase()] = 1; });
addEventListener('keyup', e => keys[e.key.toLowerCase()] = 0);

function updateMe(dt) {
  if (!me || busy || !CFG) return;
  const sp = 300 * dt;
  let dx = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0);
  let dy = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0);
  if (dx || dy) target = null;
  else if (target) {
    const tx = target.x - me.x, ty = target.y - me.y, d = Math.hypot(tx, ty);
    if (d < 4) target = null; else { dx = tx / d; dy = ty / d; }
  }
  me.moving = !!(dx || dy);
  if (!me.moving) return;
  const n = Math.hypot(dx, dy) || 1;
  me.x = Math.max(25, Math.min(CFG.W - 25, me.x + dx / n * sp));
  me.y = Math.max(140, Math.min(CFG.H - 25, me.y + dy / n * sp));
  const now = performance.now();
  if (now - lastSent > 60) { socket.emit('move', { x: me.x, y: me.y }); lastSent = now; }
}

// ---------- Suelo pre-renderizado (moqueta de casino) ----------
let floor;
function buildFloor() {
  floor = document.createElement('canvas'); floor.width = CFG.W; floor.height = CFG.H;
  const f = floor.getContext('2d');
  const g = f.createRadialGradient(500, 550, 100, 500, 550, 750);
  g.addColorStop(0, '#7a0f1f'); g.addColorStop(1, '#2a0610');
  f.fillStyle = g; f.fillRect(0, 0, CFG.W, CFG.H);
  f.strokeStyle = '#ffd16622'; f.lineWidth = 2;
  for (let i = -CFG.H; i < CFG.W + CFG.H; i += 50) {
    f.beginPath(); f.moveTo(i, 0); f.lineTo(i + CFG.H, CFG.H); f.stroke();
    f.beginPath(); f.moveTo(i, CFG.H); f.lineTo(i + CFG.H, 0); f.stroke();
  }
  f.fillStyle = '#ffd16618';
  for (let x = 25; x < CFG.W; x += 50) for (let y = 0; y < CFG.H; y += 50) { f.beginPath(); f.arc(x, y + 25, 3, 0, 7); f.fill(); }
  // Pasillo de entrada
  f.fillStyle = '#b8001f'; f.fillRect(440, 820, 120, 180);
  f.strokeStyle = '#ffd166'; f.lineWidth = 4; f.strokeRect(440, 820, 120, 185);
  // Pared superior
  const wg = f.createLinearGradient(0, 0, 0, 130); wg.addColorStop(0, '#0a0204'); wg.addColorStop(1, '#2a0610');
  f.fillStyle = wg; f.fillRect(0, 0, CFG.W, 130);
  f.fillStyle = '#ffd166'; f.fillRect(0, 126, CFG.W, 4);
}

// ---------- Dibujo ----------
function resize() {
  const dpr = devicePixelRatio || 1, r = cv.getBoundingClientRect();
  cv.width = r.width * dpr; cv.height = r.height * dpr;
}
addEventListener('resize', resize);

function drawSign(t) {
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const flick = Math.sin(t / 90) > -0.95 ? 1 : 0.4;
  ctx.font = '64px Bungee, sans-serif';
  ctx.shadowColor = '#ff4ecd'; ctx.shadowBlur = 30 * flick; ctx.fillStyle = '#ffd166';
  ctx.fillText('CASINO UAB', 500, 62);
  ctx.shadowBlur = 0;
  // Bombillas
  for (let i = 0; i < 26; i++) {
    const on = (Math.floor(t / 200) + i) % 3 === 0;
    ctx.fillStyle = on ? '#fff3b0' : '#7a5a00';
    if (on) { ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 12; }
    ctx.beginPath(); ctx.arc(180 + i * 25.6, 112, 5, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  }
  // Tragaperras decorativas
  ctx.font = '46px serif';
  [70, 140, 860, 930].forEach((x, i) => ctx.fillText('🎰', x, 75 + Math.sin(t / 300 + i) * 2));
  ctx.restore();
}

function drawTable(tb, t) {
  const st = tableState[tb.id] || {}, near = me && Math.hypot(me.x - tb.x, me.y - tb.y) < CFG.zone;
  ctx.save();
  // Zona de juego
  ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t / 40;
  ctx.strokeStyle = near ? '#ffd166' : tb.color + '88'; ctx.lineWidth = near ? 4 : 2;
  ctx.beginPath(); ctx.arc(tb.x, tb.y, CFG.zone, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  // Mesa
  ctx.shadowColor = tb.color; ctx.shadowBlur = 25 + Math.sin(t / 300) * 10;
  ctx.fillStyle = '#5c3a12'; ctx.beginPath(); ctx.ellipse(tb.x, tb.y, 82, 58, 0, 0, 7); ctx.fill();
  ctx.shadowBlur = 0;
  const g = ctx.createRadialGradient(tb.x, tb.y - 10, 5, tb.x, tb.y, 75);
  g.addColorStop(0, '#1f8a55'); g.addColorStop(1, '#0b3d24');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(tb.x, tb.y, 72, 48, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '44px serif'; ctx.fillText(tb.emoji, tb.x, tb.y - 2 + Math.sin(t / 250) * 3);
  // Cartel
  ctx.font = '22px Bungee, sans-serif';
  ctx.shadowColor = tb.color; ctx.shadowBlur = 16; ctx.fillStyle = '#fff';
  ctx.fillText(tb.name.toUpperCase(), tb.x, tb.y - 82); ctx.shadowBlur = 0;
  ctx.font = '700 16px Inter, sans-serif';
  ctx.fillStyle = st.status === 'playing' ? '#ff4d5a' : '#ffd166';
  ctx.fillText(st.status === 'playing' ? `🔴 EN JUEGO (${st.playing})` : `👥 ${st.count || 0} en la mesa`, tb.x, tb.y + 72);
  ctx.restore();
}

function drawShop(t) {
  const s = CFG.shopPos, near = me && Math.hypot(me.x - s.x, me.y - s.y) < CFG.zone;
  ctx.save();
  ctx.setLineDash([10, 8]); ctx.lineDashOffset = t / 40;
  ctx.strokeStyle = near ? '#ff4ecd' : '#ff4ecd66'; ctx.lineWidth = near ? 4 : 2;
  ctx.beginPath(); ctx.arc(s.x, s.y, CFG.zone, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  ctx.shadowColor = '#ff4ecd'; ctx.shadowBlur = 30;
  const g = ctx.createLinearGradient(s.x, s.y - 45, s.x, s.y + 45); g.addColorStop(0, '#ffe08a'); g.addColorStop(1, '#b07a00');
  ctx.fillStyle = g; roundRect(ctx, s.x - 90, s.y - 40, 180, 80, 18); ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = '#2a0610'; roundRect(ctx, s.x - 80, s.y - 30, 160, 60, 12); ctx.fill();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '30px serif'; ctx.fillText('💎', s.x - 52, s.y); ctx.fillText('👑', s.x + 52, s.y);
  ctx.font = '20px Bungee, sans-serif'; ctx.fillStyle = '#ff4ecd'; ctx.shadowColor = '#ff4ecd'; ctx.shadowBlur = 12;
  ctx.fillText('TIENDA', s.x, s.y + 2);
  ctx.restore();
}

let last = performance.now();
function frame(t) {
  const dt = Math.min(.05, (t - last) / 1000); last = t;
  requestAnimationFrame(frame);
  if (!CFG || !floor) return;
  if (cv.width !== Math.round(cv.getBoundingClientRect().width * (devicePixelRatio || 1))) resize();
  updateMe(dt);
  const dpr = devicePixelRatio || 1, cw = cv.width / dpr, ch = cv.height / dpr;
  const fit = Math.min(cw / CFG.W, ch / CFG.H);
  view.s = PROJ ? fit : Math.max(fit, Math.min(cw, ch) / 620);
  const vw = cw / view.s, vh = ch / view.s;
  const fx = me && !PROJ ? me.x : CFG.W / 2, fy = me && !PROJ ? me.y : CFG.H / 2;
  view.x = vw >= CFG.W ? (CFG.W - vw) / 2 : Math.max(0, Math.min(CFG.W - vw, fx - vw / 2));
  view.y = vh >= CFG.H ? (CFG.H - vh) / 2 : Math.max(0, Math.min(CFG.H - vh, fy - vh / 2));

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#0a0204'; ctx.fillRect(0, 0, cw, ch);
  ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, -view.x * view.s * dpr, -view.y * view.s * dpr);
  ctx.drawImage(floor, 0, 0);
  drawSign(t);
  CFG.tables.forEach(tb => drawTable(tb, t));
  drawShop(t);
  if (target && !busy) { ctx.strokeStyle = '#ffd166aa'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(target.x, target.y, 8 + Math.sin(t / 100) * 3, 0, 7); ctx.stroke(); }

  // Avatares ordenados por Y (los de abajo delante)
  const list = Object.values(others).map(o => {
    const k = 1 - Math.pow(.001, dt);   // interpolación suave
    const px = o.rx, py = o.ry;
    o.rx += (o.x - o.rx) * k; o.ry += (o.y - o.ry) * k;
    o.moving = Math.abs(o.rx - px) + Math.abs(o.ry - py) > .3;
    return { look: o.look, x: o.rx, y: o.ry, name: o.name, coins: o.coins, seed: o.seed, moving: o.moving };
  });
  if (me && me.look) list.push({ look: me.look, x: me.x, y: me.y, name: me.name, coins: me.coins, me: true, moving: me.moving });
  list.sort((a, b) => a.y - b.y).forEach(a => drawAvatar(ctx, a.look, a.x, a.y, 22, t, a));

  if ($('shop').classList.contains('on')) drawPreview(t);
  updateAction();
}
requestAnimationFrame(frame);

// ---------- Barra de acción contextual ----------
let actionKey = '';
function updateAction() {
  if (PROJ || !me) return;
  let key = 'walk', html = '👆 Toca el suelo para moverte. Ve a una <b>mesa</b> para jugar o a la <b>tienda</b>.';
  const tb = CFG.tables.find(tb => Math.hypot(me.x - tb.x, me.y - tb.y) < CFG.zone);
  const nearShop = Math.hypot(me.x - CFG.shopPos.x, me.y - CFG.shopPos.y) < CFG.zone;
  if (busy) { key = 'busy'; html = '🎲 Jugando…'; }
  else if (tb) {
    const st = tableState[tb.id] || {};
    key = `t-${tb.id}-${st.status}-${st.count}`;
    html = st.status === 'playing'
      ? `${tb.emoji} Partida en curso, espera a la siguiente`
      : `<div style="text-align:left;flex:1"><b>${tb.emoji} ${tb.name}</b><br><small>${tb.desc} · 👥 ${st.count}/${CFG.minPlayers}+</small></div><button id="playBtn" ${st.count < CFG.minPlayers ? 'disabled' : ''}>¡JUGAR!</button>`;
  } else if (nearShop) { key = 'shop'; html = `<button id="shopBtn">🛍️ Abrir tienda</button>`; }
  if (key === actionKey) return;
  actionKey = key; $('action').innerHTML = html;
  if ($('playBtn')) $('playBtn').onclick = () => socket.emit('table:start', tb.id);
  if ($('shopBtn')) $('shopBtn').onclick = () => { renderShop(); open('shop'); };
}

// ---------- Tienda ----------
const SLOTS = { color: '🎨 Color', hat: '🎩 Gorro', face: '🕶️ Cara', pet: '🐶 Mascota', fx: '✨ Efecto' };
let shopTab = 'color';
function renderShop() {
  $('tabs').innerHTML = Object.entries(SLOTS).map(([k, v]) => `<button data-t="${k}" class="${k === shopTab ? 'on' : ''}">${v}</button>`).join('');
  $('tabs').querySelectorAll('button').forEach(b => b.onclick = () => { shopTab = b.dataset.t; renderShop(); });
  const fxIcon = { sparkle: '✨', aura: '🌟', fire: '🔥' };
  $('items').innerHTML = Object.entries(CFG.shop).filter(([, it]) => it.slot === shopTab).map(([k, it]) => {
    const owned = myData.owned.includes(k), eq = myData.look[it.slot] === it.value;
    const icon = it.slot === 'color'
      ? `<div class="sw" style="background:${it.value === 'rainbow' ? 'conic-gradient(red,orange,yellow,lime,cyan,blue,magenta,red)' : it.value}"></div>`
      : `<div class="ic">${it.slot === 'fx' ? fxIcon[it.value] : it.value}</div>`;
    const btn = eq ? `<button class="off" data-k="${k}">Quitar</button>`
      : owned ? `<button class="own" data-k="${k}">Equipar</button>`
      : `<button data-k="${k}">🪙 ${it.price}</button>`;
    return `<div class="item ${eq ? 'eq' : ''}">${icon}<small>${it.name}</small>${btn}</div>`;
  }).join('');
  $('items').querySelectorAll('button').forEach(b => b.onclick = () => socket.emit('shop', b.dataset.k));
}
function drawPreview(t) {
  const c = $('preview'), x = c.getContext('2d');
  x.clearRect(0, 0, c.width, c.height);
  drawAvatar(x, myData.look, 70, 82, 38, t, {});
}

// ---------- Minijuegos ----------
socket.on('game:start', g => {
  target = null; close('shop'); open('game');
  $('gTitle').textContent = `${g.emoji} ${g.name}`; $('gTimer').textContent = '';
  const body = $('gBody');
  body.innerHTML = `<p>${esc(g.desc)}</p><p style="opacity:.7">Contra: ${g.rivals.map(esc).join(', ')}</p><div class="count">3</div>`;
  let n = 3;
  const iv = setInterval(() => {
    n--;
    if (n > 0) { body.querySelector('.count').outerHTML = `<div class="count">${n}</div>`; return; }
    clearInterval(iv);
    let sent = false, tIv;
    const done = v => { if (sent) return; sent = true; clearInterval(tIv); socket.emit('game:result', v); };
    const timer = (ms, cb) => {
      const end = performance.now() + ms;
      tIv = setInterval(() => {
        const left = Math.max(0, end - performance.now());
        $('gTimer').textContent = `⏳ ${(left / 1000).toFixed(1)}`;
        if (left <= 0) { clearInterval(tIv); cb(); }
      }, 100);
    };
    GAMES[g.table](body, g.params, done, timer);
  }, 1000);
});

socket.on('game:end', r => {
  $('gTimer').textContent = '';
  const medal = ['🥇', '🥈', '🥉'];
  const mine = r.ranking.find(x => x.id === socket.id);
  $('gBody').innerHTML = `
    <div class="count" style="font-size:3rem">${mine ? (mine.pos === 1 ? '¡GANASTE!' : `${mine.pos}º PUESTO`) : 'FIN'}</div>
    ${mine ? `<div class="pill big">+${mine.prize} 🪙</div>` : ''}
    <ul class="rank">${r.ranking.map(x => `<li class="${x.id === socket.id ? 'me' : ''}"><span class="m">${medal[x.pos - 1] || x.pos + 'º'}</span><span class="n">${esc(x.name)}<small>${esc(x.txt)}</small></span><span class="p">+${x.prize} 🪙</span></li>`).join('')}</ul>
    <button class="gold" id="backBtn">Volver al casino</button>`;
  $('backBtn').onclick = () => close('game');
});

// ---------- Modo proyector ----------
function renderProj(players) {
  let side = $('projSide');
  if (!side) {
    side = document.createElement('div'); side.id = 'projSide';
    side.innerHTML = `<h3>¡ENTRA YA!</h3><div id="qr"></div><p style="margin:6px 0;font-weight:700">${location.host}</p><h3>💰 MÁS RICOS</h3><ol id="rich"></ol>`;
    $('stage').appendChild(side);
    if (window.QRCode) new QRCode($('qr'), { text: location.origin, width: 170, height: 170 });
  }
  $('rich').innerHTML = [...players].sort((a, b) => b.coins - a.coins).slice(0, 8).map(p => `<li>${esc(p.name)} · 🪙 ${p.coins}</li>`).join('');
}
