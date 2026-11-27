// Frontend 3D: sala del casino con Three.js, avatares, controles táctiles y comunicación con Socket.IO
const socket = io();
const $ = id => document.getElementById(id);
const PROJ = location.search.includes('pantalla');   // modo proyector: /?pantalla
const U = 20;                                       // 20 unidades del servidor = 1 unidad 3D
let CFG = null, me = null, myData = { coins: 0, owned: [], look: {} };
let others = {}, tableState = {}, joined = false, busy = false, target = null, keys = {}, lastSent = 0;
const to3 = (x, y) => new THREE.Vector3((x - 500) / U, 0, (y - 500) / U);

// ---------- Utilidades ----------
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let toastT;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200); }
const open = id => $(id).classList.add('on'), close = id => $(id).classList.remove('on');
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => close(b.dataset.close));

// ---------- Escena 3D ----------
const cv = $('cv');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
renderer.outputEncoding = THREE.sRGBEncoding;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x12040a);
scene.fog = new THREE.Fog(0x12040a, 45, 90);
const camera = new THREE.PerspectiveCamera(55, 1, .1, 200);
scene.add(new THREE.HemisphereLight(0xffe2b8, 0x3a0a14, 1.0));
const sun = new THREE.DirectionalLight(0xffffff, .6); sun.position.set(10, 30, 15); scene.add(sun);
const animated = [];   // objetos con animación propia

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  return t;
}
function textSprite(text, color, h = 1.2, font = 'Bungee') {
  const tex = canvasTex(512, 128, (x, w, hh) => {
    x.font = `64px ${font}, Impact, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = color; x.shadowBlur = 24; x.fillStyle = '#fff'; x.fillText(text, w / 2, hh / 2);
    x.shadowBlur = 8; x.fillText(text, w / 2, hh / 2);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(h * 4, h, 1); return s;
}

function buildRoom() {
  const S = CFG.W / U;   // 50
  // Moqueta
  const carpet = canvasTex(256, 256, (x) => {
    x.fillStyle = '#7a0f1f'; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = '#ffd16655'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(128, 0); x.lineTo(256, 128); x.lineTo(128, 256); x.lineTo(0, 128); x.closePath(); x.stroke();
    x.fillStyle = '#ffd16688'; x.beginPath(); x.arc(128, 128, 10, 0, 7); x.fill();
    x.fillStyle = '#5c0a17'; [[0, 0], [256, 0], [0, 256], [256, 256]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, 30, 0, 7); x.fill(); });
  }, 12);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshStandardMaterial({ map: carpet, roughness: .9 }));
  floor.rotation.x = -Math.PI / 2; floor.name = 'floor'; scene.add(floor);
  // Alfombra de entrada
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(6, 10), new THREE.MeshStandardMaterial({ color: 0xc1121f }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0, .01, S / 2 - 5); scene.add(rug);
  // Paredes
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x3b0a16, roughness: .8 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: .8, roughness: .3, emissive: 0x332200 });
  [[0, -S / 2, 0], [-S / 2, 0, Math.PI / 2], [S / 2, 0, -Math.PI / 2]].forEach(([x, z, r]) => {
    const w = new THREE.Mesh(new THREE.BoxGeometry(S, 9, .6), wallMat); w.position.set(x, 4.5, z); w.rotation.y = r; scene.add(w);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(S, .25, .7), gold); trim.position.set(x, 1.2, z); trim.rotation.y = r; scene.add(trim);
    const trim2 = trim.clone(); trim2.position.y = 8.6; scene.add(trim2);
  });
  // Columnas doradas
  [[-S / 2 + 1, -S / 2 + 1], [S / 2 - 1, -S / 2 + 1], [-S / 2 + 1, S / 2 - 1], [S / 2 - 1, S / 2 - 1]].forEach(([x, z]) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(.7, .7, 9, 16), gold); c.position.set(x, 4.5, z); scene.add(c);
  });
  // Letrero de neón
  const sign = textSprite('CASINO UAB', '#ff4ecd', 4.5); sign.position.set(0, 6.3, -S / 2 + .8); scene.add(sign);
  animated.push(t => { sign.material.opacity = Math.sin(t * 9) > -.97 ? 1 : .4; });
  // Bombillas bajo el letrero
  const bulbs = [];
  for (let i = 0; i < 24; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(.18, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfff3b0 }));
    b.position.set(-11.5 + i, 3.9, -S / 2 + .5); scene.add(b); bulbs.push(b);
  }
  animated.push(t => bulbs.forEach((b, i) => b.material.color.set((Math.floor(t * 5) + i) % 3 ? 0x7a5a00 : 0xfff3b0)));
  // Tragaperras decorativas en la pared del fondo
  [-21, -17.5, 17.5, 21].forEach((x, i) => {
    const m = new THREE.Group();
    const bodyM = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.6, 1.6), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x9d0208 : 0x6a040f, metalness: .4, roughness: .4 }));
    bodyM.position.y = 1.8; m.add(bodyM);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1), new THREE.MeshBasicMaterial({ map: canvasTex(256, 128, (x) => { x.fillStyle = '#111'; x.fillRect(0, 0, 256, 128); x.font = '80px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('7️⃣🍒7️⃣', 128, 68); }) }));
    scr.position.set(0, 2.4, .81); m.add(scr);
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.5, .4, 1.7), gold); top.position.y = 3.7; m.add(top);
    m.position.set(x, 0, -S / 2 + 1.6); scene.add(m);
  });
  // Lámparas colgantes
  [[-12, -6], [12, -6], [-12, 12], [12, 12]].forEach(([x, z]) => {
    const l = new THREE.PointLight(0xffc870, .8, 30); l.position.set(x, 7, z); scene.add(l);
  });

  // Mesas de minijuegos
  CFG.tables.forEach(tb => {
    const p = to3(tb.x, tb.y), col = new THREE.Color(tb.color);
    const g = new THREE.Group(); g.position.copy(p);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.4, 1, 20), new THREE.MeshStandardMaterial({ color: 0x5c3a12 })); base.position.y = .5;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, .25, 40), new THREE.MeshStandardMaterial({ color: 0x0f7a45, roughness: .9 })); top.position.y = 1.1;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(3, .2, 10, 40), gold); rim.rotation.x = Math.PI / 2; rim.position.y = 1.22;
    const ring = new THREE.Mesh(new THREE.RingGeometry(CFG.zone / U - .25, CFG.zone / U, 48), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .6, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = .03;
    const icon = AV.sprite(tb.emoji, 2.4); icon.position.y = 3.2;
    const name = textSprite(tb.name.toUpperCase(), tb.color, 1); name.position.y = 5;
    const light = new THREE.PointLight(col, 1.2, 10); light.position.y = 3;
    g.add(base, top, rim, ring, icon, name, light); scene.add(g);
    animated.push(t => {
      icon.position.y = 3.2 + Math.sin(t * 2 + p.x) * .25;
      const near = me && Math.hypot(me.x - tb.x, me.y - tb.y) < CFG.zone;
      ring.material.opacity = near ? .95 : .35 + Math.sin(t * 3) * .15;
      ring.material.color.set(near ? 0xffd166 : col);
    });
  });
  // Tienda
  const sp = to3(CFG.shopPos.x, CFG.shopPos.y);
  const shop = new THREE.Group(); shop.position.copy(sp);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(6, 1.4, 2.2), gold); counter.position.y = .7;
  const shopSign = textSprite('TIENDA', '#ff4ecd', 1.3); shopSign.position.y = 4.6;
  const gem = AV.sprite('💎', 2); gem.position.y = 2.8;
  const crown = AV.sprite('👑', 1.2); crown.position.set(-2, 2, 0);
  const hat = AV.sprite('🎩', 1.2); hat.position.set(2, 2, 0);
  const ringS = new THREE.Mesh(new THREE.RingGeometry(CFG.zone / U - .25, CFG.zone / U, 48), new THREE.MeshBasicMaterial({ color: 0xff4ecd, transparent: true, opacity: .5, side: THREE.DoubleSide }));
  ringS.rotation.x = -Math.PI / 2; ringS.position.y = .03;
  shop.add(counter, shopSign, gem, crown, hat, ringS, new THREE.PointLight(0xff4ecd, 1.2, 10)); scene.add(shop);
  animated.push(t => { gem.rotation.z = 0; gem.position.y = 2.8 + Math.sin(t * 2) * .3; gem.material.rotation = Math.sin(t) * .3; });
  // Arcade de compañeros
  const ap = to3(CFG.arcadePos.x, CFG.arcadePos.y);
  const arc = new THREE.Group(); arc.position.copy(ap);
  [-2.2, 0, 2.2].forEach((dz, i) => {
    const cab = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.4, 1.6), new THREE.MeshStandardMaterial({ color: [0x3a0ca3, 0x4361ee, 0x7209b7][i] })); b.position.y = 1.7;
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.1), new THREE.MeshBasicMaterial({ color: [0x4cc9f0, 0xf72585, 0x06d6a0][i] }));
    scr.position.set(.91, 2.3, 0); scr.rotation.y = Math.PI / 2;
    cab.add(b, scr); cab.position.set(-1, 0, dz); arc.add(cab);
    animated.push(t => scr.material.color.setHSL((t * .2 + i * .3) % 1, .8, .55));
  });
  const arcSign = textSprite('ARCADE', '#4cc9f0', 1.2); arcSign.position.y = 4.8;
  const ringA = new THREE.Mesh(new THREE.RingGeometry(CFG.zone / U - .25, CFG.zone / U, 48), new THREE.MeshBasicMaterial({ color: 0x4cc9f0, transparent: true, opacity: .5, side: THREE.DoubleSide }));
  ringA.rotation.x = -Math.PI / 2; ringA.position.y = .03;
  arc.add(arcSign, ringA, new THREE.PointLight(0x4cc9f0, 1.2, 10)); scene.add(arc);
}

// ---------- Etiquetas HTML (nombres y estado de las mesas) ----------
const labels = {};
function label(id, html, pos3, cls = '') {
  let el = labels[id];
  if (!el) { el = labels[id] = document.createElement('div'); el.className = 'lbl3d ' + cls; $('labels').appendChild(el); }
  if (el._h !== html) { el.innerHTML = html; el._h = html; }
  const v = pos3.clone().project(camera);
  const w = cv.clientWidth, h = cv.clientHeight;
  el.style.display = v.z < 1 ? '' : 'none';
  el.style.left = (v.x * .5 + .5) * w + 'px'; el.style.top = (-v.y * .5 + .5) * h + 'px';
  el._seen = true;
}

// ---------- Conexión ----------
socket.on('init', cfg => { if (!CFG) { CFG = cfg; buildRoom(); } if (joined) socket.emit('join', myName()); });
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
      if (!me) { me = { x: p.x, y: p.y, mesh: AV.create(p.look), dir: Math.PI }; scene.add(me.mesh); }
      me.look = p.look; me.name = p.name; me.coins = p.coins; busy = p.busy;
      AV.setLook(me.mesh, p.look);
      return;
    }
    let o = others[p.id];
    if (!o) { o = others[p.id] = { ...p, rx: p.x, ry: p.y, dir: 0, mesh: AV.create(p.look) }; scene.add(o.mesh); }
    Object.assign(o, p); AV.setLook(o.mesh, p.look);
  });
  Object.keys(others).forEach(id => { if (!seen[id]) { scene.remove(others[id].mesh); delete others[id]; } });
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
const ray = new THREE.Raycaster(), floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
cv.addEventListener('pointerdown', e => {
  if (!me || busy) return;
  const r = cv.getBoundingClientRect();
  ray.setFromCamera({ x: (e.clientX - r.left) / r.width * 2 - 1, y: -(e.clientY - r.top) / r.height * 2 + 1 }, camera);
  const hit = new THREE.Vector3();
  if (ray.ray.intersectPlane(floorPlane, hit)) target = { x: hit.x * U + 500, y: hit.z * U + 500 };
});
addEventListener('keydown', e => { if (document.activeElement.tagName !== 'INPUT') keys[e.key.toLowerCase()] = 1; });
addEventListener('keyup', e => keys[e.key.toLowerCase()] = 0);

function updateMe(dt) {
  if (!me || !CFG) return;
  me.moving = false;
  if (busy) return;
  const sp = 260 * dt;
  let dx = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0);
  let dy = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0);
  if (dx || dy) target = null;
  else if (target) {
    const tx = target.x - me.x, ty = target.y - me.y, d = Math.hypot(tx, ty);
    if (d < 5) target = null; else { dx = tx / d; dy = ty / d; }
  }
  if (!dx && !dy) return;
  me.moving = true;
  const n = Math.hypot(dx, dy);
  me.dir = Math.atan2(dx, dy);
  me.x = Math.max(30, Math.min(CFG.W - 30, me.x + dx / n * sp));
  me.y = Math.max(40, Math.min(CFG.H - 25, me.y + dy / n * sp));
  const now = performance.now();
  if (now - lastSent > 60) { socket.emit('move', { x: me.x, y: me.y }); lastSent = now; }
}

const turn = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * k; };

// ---------- Bucle de dibujo ----------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000;
  if (!CFG || window.PAUSE3D) return;
  const w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.floor(w * renderer.getPixelRatio()) || cv.height !== Math.floor(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  updateMe(dt);
  Object.values(labels).forEach(l => l._seen = false);
  const k = 1 - Math.pow(.001, dt);
  // Otros jugadores (interpolados)
  Object.values(others).forEach(o => {
    const px = o.rx, py = o.ry;
    o.rx += (o.x - o.rx) * k; o.ry += (o.y - o.ry) * k;
    const mx = o.rx - px, my = o.ry - py, moving = Math.abs(mx) + Math.abs(my) > .15;
    if (moving) o.dir = turn(o.dir, Math.atan2(mx, my), .3);
    o.mesh.position.copy(to3(o.rx, o.ry)); o.mesh.rotation.y = o.dir;
    AV.animate(o.mesh, t, moving);
    label('p' + o.id, `${esc(o.name)} · 🪙${o.coins}`, o.mesh.position.clone().setY(3.4));
  });
  if (me) {
    me.mesh.position.copy(to3(me.x, me.y));
    me.mesh.rotation.y = turn(me.mesh.rotation.y, me.dir, .25);
    AV.animate(me.mesh, t, me.moving);
    label('me', `${esc(me.name || '')} · 🪙${me.coins ?? ''}`, me.mesh.position.clone().setY(3.4), 'me');
  }
  // Estado de las mesas
  CFG.tables.forEach(tb => {
    const st = tableState[tb.id] || {};
    label('t' + tb.id, `${tb.emoji} <b>${tb.name}</b> · ` + (st.status === 'playing' ? `🔴 EN JUEGO (${st.playing})` : `👥 ${st.count || 0}`), to3(tb.x, tb.y).setY(1.6));
  });
  Object.values(labels).forEach(l => { if (!l._seen) l.style.display = 'none'; });
  animated.forEach(f => f(t));
  // Cámara
  if (PROJ || !me) {
    camera.position.set(0, 42, 34); camera.lookAt(0, 0, 2);
  } else {
    const p = me.mesh.position, portrait = w < h;
    const want = new THREE.Vector3(p.x, p.y + (portrait ? 17 : 12), p.z + (portrait ? 17 : 14));
    camera.position.lerp(want, 1 - Math.pow(.01, dt));
    camera.lookAt(p.x, 1, p.z);
  }
  renderer.render(scene, camera);
  if ($('shop').classList.contains('on')) drawPreview(t);
  updateAction();
}
requestAnimationFrame(frame);

// ---------- Barra de acción contextual ----------
let actionKey = '';
function updateAction() {
  if (PROJ || !me) return;
  let key = 'walk', html = '<span>👆 Toca el suelo para moverte. Ve a una <b>mesa</b>, a la <b>tienda</b> o al <b>arcade</b>.</span>';
  const tb = CFG.tables.find(tb => Math.hypot(me.x - tb.x, me.y - tb.y) < CFG.zone);
  const nearShop = Math.hypot(me.x - CFG.shopPos.x, me.y - CFG.shopPos.y) < CFG.zone;
  const nearArcade = Math.hypot(me.x - CFG.arcadePos.x, me.y - CFG.arcadePos.y) < CFG.zone;
  if (busy) { key = 'busy'; html = '<span>🎲 Jugando…</span>'; }
  else if (tb) {
    const st = tableState[tb.id] || {};
    key = `t-${tb.id}-${st.status}-${st.count}`;
    html = st.status === 'playing'
      ? `<span>${tb.emoji} Partida en curso, espera a la siguiente</span>`
      : `<div style="text-align:left;flex:1"><b>${tb.emoji} ${tb.name}</b><br><small>${tb.desc} · 👥 ${st.count}/${CFG.minPlayers}+</small></div><button id="playBtn" ${st.count < CFG.minPlayers ? 'disabled' : ''}>¡JUGAR!</button>`;
  } else if (nearShop) { key = 'shop'; html = `<button id="shopBtn">🛍️ Abrir tienda</button>`; }
  else if (nearArcade) { key = 'arcade'; html = `<button id="arcadeBtn">🕹️ Juegos de otros grupos</button>`; }
  if (key === actionKey) return;
  actionKey = key; $('action').innerHTML = html;
  if ($('playBtn')) $('playBtn').onclick = () => socket.emit('table:start', tb.id);
  if ($('shopBtn')) $('shopBtn').onclick = () => { renderShop(); open('shop'); };
  if ($('arcadeBtn')) $('arcadeBtn').onclick = openArcade;
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
// Vista previa 3D del avatar en la tienda
let pv;
function drawPreview(t) {
  if (!pv) {
    const r = new THREE.WebGLRenderer({ canvas: $('preview'), antialias: true, alpha: true });
    r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); r.outputEncoding = THREE.sRGBEncoding;
    const s = new THREE.Scene(); s.add(new THREE.HemisphereLight(0xffffff, 0x553333, 1.2));
    const d = new THREE.DirectionalLight(0xffffff, .6); d.position.set(2, 4, 5); s.add(d);
    const c = new THREE.PerspectiveCamera(40, 1, .1, 50); c.position.set(0, 2, 6.2); c.lookAt(0, 1.4, 0);
    const a = AV.create(myData.look); s.add(a);
    pv = { r, s, c, a };
  }
  pv.r.setSize(96, 96, false);
  AV.setLook(pv.a, myData.look); pv.a.rotation.y = Math.sin(t) * .7; AV.animate(pv.a, t, false);
  pv.r.render(pv.s, pv.c);
}

// ---------- Arcade (juegos de otros grupos) ----------
async function openArcade() {
  let list = [];
  try { list = await (await fetch('arcade.json?' + Date.now())).json(); } catch (e) {}
  $('arcadeList').innerHTML = list.length ? list.map((g, i) => `<a href="#" data-i="${i}"><span class="e">${esc(g.emoji || '🕹️')}</span><span><b>${esc(g.name)}</b><br><small>${esc(g.author || '')}</small></span></a>`).join('') : '<p>Todavía no hay juegos.</p>';
  $('arcadeList').querySelectorAll('a').forEach(a => a.onclick = e => {
    e.preventDefault(); const g = list[+a.dataset.i];
    $('frameTitle').textContent = `${g.emoji || '🕹️'} ${g.name}`; $('frameOpen').href = g.url; $('frame').src = g.url;
    close('arcade'); $('frameWrap').classList.add('on');
  });
  open('arcade');
}
$('frameClose').onclick = () => { $('frameWrap').classList.remove('on'); $('frame').src = 'about:blank'; };

// ---------- Minijuegos ----------
socket.on('game:start', g => {
  target = null; close('shop'); close('arcade'); open('game');
  $('gTitle').textContent = `${g.emoji} ${g.name}`; $('gTimer').textContent = '';
  const body = $('gBody');
  // Pantalla de instrucciones con cuenta atrás
  let left = Math.round((g.intro || 10000) / 1000);
  body.innerHTML = `<div class="howto"><b>📖 Cómo se juega</b><br>${esc(g.howto || g.desc)}</div>
    <p style="opacity:.8">Jugáis: ${g.rivals.map(esc).join(', ')}</p>
    <p class="ready">Premios: 🥇${CFG.prizes[0]} · 🥈${CFG.prizes[1]} · 🥉${CFG.prizes[2]} 🪙</p>
    <div class="count" id="cd">${left}</div><p>Prepárate…</p>`;
  const iv = setInterval(() => {
    left--;
    if (left > 0) { const cd = $('cd'); if (cd) cd.outerHTML = `<div class="count" id="cd">${left}</div>`; return; }
    clearInterval(iv);
    let sent = false, tIv;
    const done = v => { if (sent) return; sent = true; clearInterval(tIv); socket.emit('game:result', v); };
    const timer = (ms, cb) => {
      const end = performance.now() + ms;
      tIv = setInterval(() => {
        const l = Math.max(0, end - performance.now());
        $('gTimer').textContent = `⏳ ${(l / 1000).toFixed(1)}`;
        if (l <= 0) { clearInterval(tIv); cb(); }
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
