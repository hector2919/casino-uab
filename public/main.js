// Frontend 3D en primera persona: cámara, controles, interacciones, camareros, teléfono virtual y conexión Socket.IO
const socket = io();
const $ = id => document.getElementById(id);
const T = THREE;
const PROJ = location.search.includes('pantalla');             // modo proyector: /?pantalla
const TOUCH = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
const U = 16;                                                   // 16 unidades del servidor = 1 metro
if (TOUCH) document.body.classList.add('touch');
if (PROJ) document.body.classList.add('proj');
let CFG = null, world = null, me = null, myData = { coins: 0, owned: [], look: {}, inv: {} };
let others = {}, tableState = {}, joined = false, busy = false, transitioning = false;
let room = 'main', barTo = 'me';
let viewMode = 'first';        // 'first' = primera persona · 'third' = tercera persona
try { if (localStorage.casinoView === 'third') viewMode = 'third'; } catch (e) {}
const orders = {}, orderQ = [], history = [];
const to3 = (x, y) => ({ x: (x - 500) / U, z: (y - 500) / U });
const turn = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * k; };

// ---------- Utilidades ----------
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let toastT;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }
const open = id => { $(id).classList.add('on'); try { document.exitPointerLock(); } catch (e) {} };
const close = id => $(id).classList.remove('on');
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => close(b.dataset.close));
const uiOpen = () => ['join', 'shop', 'barMenu', 'game', 'arcade', 'qrModal'].some(i => $(i).classList.contains('on')) || $('frameWrap').classList.contains('on') || $('phone').classList.contains('on');
document.addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest('button')) SFX.click(); }, true);

// ---------- Escena, render y calidad ----------
const cv = $('cv');
const renderer = new T.WebGLRenderer({ canvas: cv, antialias: !TOUCH, powerPreference: 'high-performance' });
renderer.outputEncoding = T.sRGBEncoding;
const scene = new T.Scene();
const camera = new T.PerspectiveCamera(72, 1, .08, 220);
const hemi = new T.HemisphereLight(0x8c78f0, 0x22103a, .62); scene.add(hemi);
scene.add(camera);                                    // la cámara en la escena para poder llevar las manos en primera persona
let composer = null, bloom = null, quality = TOUCH ? 'low' : 'high', pr = 1;
try { const q = localStorage.casinoQuality; if (q) quality = q; } catch (e) {}
function applyQuality(q) {
  quality = q; try { localStorage.casinoQuality = q; } catch (e) {}
  pr = q === 'low' ? Math.min(1.25, devicePixelRatio || 1) : Math.min(1.75, devicePixelRatio || 1);
  renderer.setPixelRatio(pr);
  if (q !== 'low' && !composer && window.FX) {
    const w = innerWidth * pr, h = innerHeight * pr;
    const rt = new T.WebGLRenderTarget(w, h, { type: T.HalfFloatType, samples: 4 });
    composer = new FX.EffectComposer(renderer, rt);
    composer.addPass(new FX.RenderPass(scene, camera));
    bloom = new FX.UnrealBloomPass(new T.Vector2(w, h), .55, .55, .92);
    composer.addPass(bloom); composer.addPass(new FX.ShaderPass(FX.GammaCorrectionShader));
  }
  if (bloom) bloom.strength = q === 'high' ? .55 : .4;
  if (world) world.setQuality(q);
  $('qBtn').textContent = { high: '✨', mid: '🌓', low: '⚡' }[q];
  $('qBtn').title = 'Calidad gráfica: ' + { high: 'alta', mid: 'media', low: 'baja' }[q];
  lastW = 0;
}
let lastW = 0, lastH = 0;
function resize() {
  const w = innerWidth, h = innerHeight; if (w === lastW && h === lastH) return; lastW = w; lastH = h;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 82 : 72; camera.updateProjectionMatrix();
  if (composer) composer.setSize(w * pr, h * pr);
}
$('qBtn').onclick = () => applyQuality({ high: 'mid', mid: 'low', low: 'high' }[quality]);
$('sndBtn').textContent = SFX.on ? '🔊' : '🔇';
$('sndBtn').onclick = () => { SFX.init(); $('sndBtn').textContent = SFX.toggle() ? '🔊' : '🔇'; };

function applyRoom() {
  if (!world) return;
  Object.entries(world.rooms).forEach(([k, r]) => { if (r) r.group.visible = k === room; });
  const r = world.rooms[room]; scene.fog = new T.FogExp2(r.fog[0], r.fog[1]); renderer.setClearColor(r.bg);
  scene.environment = r.env || world.env; const hm = r.hemi || [0x8c78f0, 0x22103a, .62]; hemi.color.set(hm[0]); hemi.groundColor.set(hm[1]); hemi.intensity = hm[2];
  $('where').textContent = room === 'main' ? 'Sala principal' : 'Casino clásico';
  Object.values(others).forEach(o => o.mesh.visible = o.room === room);
  if (me && me.mesh) me.mesh.visible = false;
  Object.values(labels).forEach(l => l.style.display = 'none');
  actionKey = '';
}

// ---------- Etiquetas HTML (nombres y estado de las mesas) ----------
const labels = {};
function label(id, html, pos, cls = '', maxD = 24) {
  let el = labels[id];
  if (!el) { el = labels[id] = document.createElement('div'); el.className = 'lbl3d ' + cls; $('labels').appendChild(el); }
  if (el._h !== html) { el.innerHTML = html; el._h = html; }
  const v = new T.Vector3(pos.x, pos.y, pos.z), d = camera.position.distanceTo(v);
  v.project(camera);
  const ok = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && d < maxD;
  el.style.display = ok ? '' : 'none';
  if (ok) { el.style.left = (v.x * .5 + .5) * innerWidth + 'px'; el.style.top = (-v.y * .5 + .5) * innerHeight + 'px'; el.style.opacity = Math.min(1, (maxD - d) / 6); }
  el._seen = true;
}

// ---------- Conexión ----------
socket.on('init', async cfg => {
  if (!CFG) {
    CFG = cfg;
    $('joinHint').textContent = 'Construyendo el casino…';
    await new Promise(r => setTimeout(r, 30));
    try { world = World.build(CFG, renderer); } catch (e) { console.error(e); $('joinHint').textContent = '⚠️ Error al construir el casino: ' + e.message; return; }
    scene.environment = world.env;
    Object.values(world.rooms).forEach(r => r && scene.add(r.group));
    cfg.orders.forEach(o => orders[o.id] = o);
    initStaff(); applyQuality(quality); applyRoom();
    $('joinHint').textContent = TOUCH ? 'Joystick para andar · desliza a la derecha para mirar' : 'WASD andar · ratón mirar · Shift correr · E interactuar · T teléfono';
    $('joinBtn').disabled = false;
  }
  if (joined) socket.emit('join', myName());
});
socket.on('me', d => {
  const gained = d.coins > myData.coins; myData = d; $('coins').textContent = `🪙 ${d.coins}`; $('shopCoins').textContent = `🪙 ${d.coins}`;
  if (gained && joined) SFX.coin();
  if ($('shop').classList.contains('on')) renderShop(); if ($('phone').classList.contains('on')) renderPhone();
});
socket.on('toast', toast);
socket.on('feed', msg => {
  const f = $('feed'), d = document.createElement('div'); d.textContent = msg; f.prepend(d);
  while (f.children.length > 4) f.lastChild.remove();
  setTimeout(() => d.remove(), 12000);
});
socket.on('world', w => {
  const seen = {};
  w.players.forEach(p => {
    seen[p.id] = 1;
    if (p.id === socket.id) {
      if (!me) { const q = to3(p.x, p.y); me = { x: q.x, z: q.z, yaw: 0, pitch: 0, face: Math.PI, pose: '', sy: 0, room: 'main', moving: false, mesh: null, bob: 0, step: 0, speed: 0, turnRate: 0, dist: 3.4, distWant: 3.4, sitting: false, phoneOn: false, reachT: 0, seat: null, sig: '' }; }
      me.name = p.name; me.coins = p.coins; busy = p.busy; return;
    }
    if (p.look) p.look.__seed = p.id;
    let o = others[p.id];
    if (!o) { o = others[p.id] = { ...p, rx: p.x, ry: p.y, dir: 0, mesh: AV.create(p.look, { seed: p.id }) }; scene.add(o.mesh); }
    Object.assign(o, p); AV.setLook(o.mesh, p.look); o.mesh.visible = o.room === room;
  });
  Object.keys(others).forEach(id => { if (!seen[id]) { scene.remove(others[id].mesh); delete others[id]; if (labels['p' + id]) { labels['p' + id].remove(); delete labels['p' + id]; } } });
  w.tables.forEach(t => tableState[t.id] = t);
  $('online').textContent = `👥 ${w.players.length}`;
  if (PROJ) renderProj(w.players);
});

// ---------- Entrar ----------
const myName = () => { try { return localStorage.casinoName || 'Anónimo'; } catch (e) { return 'Anónimo'; } };
try { $('name').value = localStorage.casinoName || ''; } catch (e) {}
$('joinBtn').disabled = true;
$('joinBtn').onclick = () => {
  const n = $('name').value.trim() || 'Anónimo';
  try { localStorage.casinoName = n; } catch (e) {}
  SFX.init(); SFX.door();
  joined = true; document.body.classList.add('in'); socket.emit('join', n); close('join');
  if (!TOUCH) setTimeout(() => $('lockHint').classList.remove('off'), 100);
};
$('name').addEventListener('keydown', e => { if (e.key === 'Enter' && !$('joinBtn').disabled) $('joinBtn').click(); });
if (PROJ) { close('join'); document.body.classList.add('in'); }

// ---------- Controles: ratón (pointer lock), teclado, joystick y deslizar para mirar ----------
const keys = {}, joy = { x: 0, y: 0 };
let dragLook = null;
const locked = () => document.pointerLockElement === cv;
cv.addEventListener('click', () => { if (!TOUCH && joined && !uiOpen() && !locked() && cv.requestPointerLock) { try { const p = cv.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} } });
document.addEventListener('pointerlockchange', () => $('lockHint').classList.toggle('off', locked() || TOUCH));
addEventListener('mousemove', e => { if (locked() && me) { me.yaw -= e.movementX * .0022; me.pitch = Math.max(-1.35, Math.min(1.35, me.pitch - e.movementY * .0022)); } });
cv.addEventListener('pointerdown', e => { if (!me || locked() || uiOpen()) return; if (e.pointerType === 'mouse' || e.clientX > innerWidth * .38) dragLook = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
addEventListener('pointermove', e => {
  if (!dragLook || dragLook.id !== e.pointerId || !me) return;
  const k = e.pointerType === 'mouse' ? .0034 : .005;
  me.yaw -= (e.clientX - dragLook.x) * k; me.pitch = Math.max(-1.35, Math.min(1.35, me.pitch - (e.clientY - dragLook.y) * k)); dragLook.x = e.clientX; dragLook.y = e.clientY;
});
addEventListener('pointerup', e => { if (dragLook && dragLook.id === e.pointerId) dragLook = null; });
addEventListener('pointercancel', e => { if (dragLook && dragLook.id === e.pointerId) dragLook = null; });
addEventListener('keydown', e => {
  if (document.activeElement.tagName === 'INPUT') return;
  const k = e.key.toLowerCase();
  if (k === 'escape') { ['shop', 'barMenu', 'arcade', 'qrModal'].forEach(close); if ($('phone').classList.contains('on')) togglePhone(false); return; }
  if (!joined || transitioning) return;
  if (k === 't') { togglePhone(); return; }
  if (k === 'v' && !uiOpen()) { toggleView(); return; }
  keys[k] = 1;
  if (k === 'e' && !uiOpen() && !busy) { if (me) me.reachT = .6; useAction(); }
  if (k === ' ') e.preventDefault();
});
addEventListener('keyup', e => keys[e.key.toLowerCase()] = 0);
addEventListener('blur', () => Object.keys(keys).forEach(k => keys[k] = 0));
// joystick virtual
(() => {
  const el = $('joy'), kn = $('knob'); let id = null;
  const set = e => { const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2); const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } joy.x = dx; joy.y = dy; kn.style.transform = `translate(${dx * 34}px,${dy * 34}px)`; };
  el.addEventListener('pointerdown', e => { id = e.pointerId; el.setPointerCapture(id); set(e); e.preventDefault(); });
  el.addEventListener('pointermove', e => { if (e.pointerId === id) set(e); });
  const end = e => { if (e.pointerId === id) { id = null; joy.x = joy.y = 0; kn.style.transform = ''; } };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
})();
$('useBtn').addEventListener('pointerdown', e => { e.preventDefault(); if (!uiOpen() && !busy) useAction(); });
$('phoneBtn').onclick = () => togglePhone();

// ---------- Colisiones (muebles, columnas, barra…) ----------
const R_ME = .38, WALL = { x0: -29.6, x1: 29.6, z0: -28.7, z1: 29.6 };
function collide(x, z, rm) {
  for (const c of world.colliders[rm] || []) {
    if (c.t === 'c') {
      const dx = x - c.x, dz = z - c.z, m = c.r + R_ME, d2 = dx * dx + dz * dz;
      if (d2 < m * m && d2 > 1e-8) { const d = Math.sqrt(d2); x = c.x + dx / d * m; z = c.z + dz / d * m; }
    } else {
      const cx = Math.max(c.x0, Math.min(x, c.x1)), cz = Math.max(c.z0, Math.min(z, c.z1)), dx = x - cx, dz = z - cz, d2 = dx * dx + dz * dz;
      if (d2 < R_ME * R_ME) {
        if (d2 > 1e-8) { const d = Math.sqrt(d2); x = cx + dx / d * R_ME; z = cz + dz / d * R_ME; }
        else { const l = x - c.x0, r = c.x1 - x, t = z - c.z0, b = c.z1 - z, m = Math.min(l, r, t, b); if (m === l) x = c.x0 - R_ME; else if (m === r) x = c.x1 + R_ME; else if (m === t) z = c.z0 - R_ME; else z = c.z1 + R_ME; }
      }
    }
  }
  return [Math.max(WALL.x0, Math.min(WALL.x1, x)), Math.max(WALL.z0, Math.min(WALL.z1, z))];
}
let lastSent = 0;
function sendMove(force) {
  const now = performance.now();
  if (!force && now - lastSent < 60) return; lastSent = now;
  socket.emit('move', { x: me.x * U + 500, y: me.z * U + 500, room: me.room, face: +me.face.toFixed(2), pose: me.pose || '', sy: me.sy || 0 });
}
const WALK = 3.2, RUN = 6.4;                         // m/s
const wrapA = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const setPose = () => { me.pose = me.sitting ? 'sit' : me.phoneOn ? 'phone' : ''; };
function sitDown(seat) {
  me.sitting = true; me.seat = seat; me.x = seat.x; me.z = seat.z; me.face = seat.face; me.sy = seat.sy;
  me.yaw = seat.face + Math.PI; me.pitch = 0; setPose(); sendMove(true); SFX.open();
}
function standUp() {
  if (!me.sitting) return; me.sitting = false; me.sy = 0; setPose();
  [me.x, me.z] = collide(me.x - Math.sin(me.face) * .75, me.z - Math.cos(me.face) * .75, me.room); sendMove(true);
}
function toggleView() {
  viewMode = viewMode === 'first' ? 'third' : 'first';
  try { localStorage.casinoView = viewMode; } catch (e) {}
  syncViewBtn(); toast(viewMode === 'first' ? '👁️ Primera persona' : '🧍 Tercera persona');
}
function syncViewBtn() { $('viewBtn').textContent = viewMode === 'first' ? '👁️' : '🧍'; $('viewBtn').title = (viewMode === 'first' ? 'Primera persona' : 'Tercera persona') + ' · pulsa para cambiar (V)'; }
$('viewBtn').onclick = () => toggleView(); syncViewBtn();
function updateMe(dt, t) {
  me.moving = false; const px0 = me.x, pz0 = me.z, pf = me.face;
  let wantFace = null;
  if (!(busy || uiOpen() || transitioning)) {
    let fwd = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) - joy.y;
    let rgt = (keys.d ? 1 : 0) - (keys.a ? 1 : 0) + joy.x;
    if (keys.arrowleft) me.yaw += 1.9 * dt; if (keys.arrowright) me.yaw -= 1.9 * dt;
    const len = Math.hypot(fwd, rgt); if (len > 1) { fwd /= len; rgt /= len; }
    if (len >= .05) {
      if (me.sitting) standUp();
      const sy = Math.sin(me.yaw), cy = Math.cos(me.yaw), run = keys.shift || Math.hypot(joy.x, joy.y) > .9;
      const dx = -sy * fwd + cy * rgt, dz = -cy * fwd - sy * rgt, sp = (run ? RUN : WALK) * dt;   // dx, dz ya llevan la intensidad (0..1) del joystick
      [me.x, me.z] = collide(me.x + dx * sp, me.z + dz * sp, me.room);
      me.moving = true; me.bob += dt * (run ? 12 : 8);
      if (t - me.step > (run ? .3 : .45)) { me.step = t; SFX.step(); }
      wantFace = Math.atan2(dx, dz);
    }
  }
  // velocidad real (alimenta las animaciones de caminar/correr)
  me.speed += (Math.hypot(me.x - px0, me.z - pz0) / Math.max(dt, .001) - me.speed) * Math.min(1, dt * 10);
  // hacia dónde mira el personaje
  if (me.sitting) { /* orientación fija del asiento */ }
  else if (viewMode === 'first') me.face = me.yaw + Math.PI;
  else if (wantFace !== null) me.face = turn(me.face, wantFace, 1 - Math.exp(-dt * 12));
  me.turnRate += (wrapA(me.face - pf) / Math.max(dt, .001) - me.turnRate) * Math.min(1, dt * 10);
  me.reachT = Math.max(0, me.reachT - dt);
  // sincronización: al moverse, y también si cambia la orientación o la pose
  const sig = me.face.toFixed(1) + '|' + me.pose + '|' + me.sy;
  if (me.moving) sendMove(false); else if (sig !== me.sig && performance.now() - lastSent > 110) { me.sig = sig; sendMove(true); }
}

// ---------- Cámara: primera y tercera persona ----------
let hands = null, handsKey = '';
function ensureMe() {
  if (!me.mesh) { me.mesh = AV.create(myData.look, { seed: socket.id }); scene.add(me.mesh); }
  AV.setLook(me.mesh, myData.look);
}
function ensureHands() {
  const k = JSON.stringify(myData.look && myData.look.color);
  if (hands && k === handsKey) return; if (hands) camera.remove(hands.group);
  hands = AV.createHands(myData.look, socket.id); camera.add(hands.group); handsKey = k;
}
// Longitud libre del "brazo" de la cámara: se acorta si hay una pared, columna u objeto alto por el camino
function camBoom(tx, ty, tz, bx, by, bz, maxD) {
  const cols = world.colliders[room] || [], HS = world.S / 2 - .45, ceil = (room === 'main' ? 15 : 10) - .35;
  for (let s = .25; s <= maxD; s += .12) {
    const x = tx + bx * s, y = ty + by * s, z = tz + bz * s; let hit = y < .3 || y > ceil || Math.abs(x) > HS || Math.abs(z) > HS;
    if (!hit) for (const c of cols) {
      if (y > (c.h || 1.2) + .25) continue;
      if (c.t === 'c') { const dx = x - c.x, dz = z - c.z, m = c.r + .3; if (dx * dx + dz * dz < m * m) { hit = true; break; } }
      else if (x > c.x0 - .3 && x < c.x1 + .3 && z > c.z0 - .3 && z < c.z1 + .3) { hit = true; break; }
    }
    if (hit) return Math.max(.45, s - .35);
  }
  return maxD;
}
function updateCamera(dt, t) {
  ensureMe();
  const eye = me.sitting ? me.sy + .82 : 1.66;
  const mode = me.phoneOn ? 'phone' : me.reachT > 0 ? 'reach' : 'none';
  me.mesh.visible = false;
  if (viewMode === 'first') {
    me.pitch = Math.max(-1.35, Math.min(1.35, me.pitch));
    camera.position.set(me.x, eye + (me.moving ? Math.sin(me.bob) * .03 : 0), me.z);
    camera.rotation.set(me.pitch, me.yaw, 0, 'YXZ');
    ensureHands(); hands.update(dt, mode, t, me.moving);
  } else {
    if (hands) hands.group.visible = false;
    me.pitch = Math.max(-1.1, Math.min(.8, me.pitch));
    const cp = Math.cos(me.pitch), fx = -Math.sin(me.yaw) * cp, fy = Math.sin(me.pitch), fz = -Math.cos(me.yaw) * cp;
    const ty = me.sitting ? me.sy + .75 : 1.55, tx = me.x + Math.cos(me.yaw) * .3, tz = me.z - Math.sin(me.yaw) * .3;   // sobre el hombro
    const free = camBoom(tx, ty, tz, -fx, -fy, -fz, me.distWant);
    me.dist = free < me.dist ? free : me.dist + (free - me.dist) * Math.min(1, dt * 3);        // se acerca al instante, se aleja con suavidad
    camera.position.set(tx - fx * me.dist, ty - fy * me.dist, tz - fz * me.dist);
    camera.rotation.set(me.pitch, me.yaw, 0, 'YXZ');
    // el personaje, con su animación y su pose
    const m = me.mesh; m.visible = me.dist > .8;
    m.position.set(me.x, me.sitting ? Math.max(0, me.sy - .41) : 0, me.z); m.rotation.y = me.face;
    AV.update(m, dt, { speed: me.moving ? me.speed : 0, turn: me.turnRate, pose: me.pose === 'phone' ? 'phone' : me.pose });
  }
}
$('cv').addEventListener('wheel', e => { if (viewMode === 'third' && me && !uiOpen()) { me.distWant = Math.max(1.8, Math.min(5.5, me.distWant + e.deltaY * .003)); e.preventDefault(); } }, { passive: false });

// ---------- Personal del casino: camareros que se mueven y reparten pedidos ----------
const staff = [];
let patrolPts = [];
function initStaff() {
  const S = world.S;
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; patrolPts.push({ x: Math.cos(a) * 14.5, z: Math.sin(a) * 14.5 }); }
  patrolPts.push({ x: 14, z: -24 }, { x: -12, z: -22 }, { x: 24, z: 14 }, { x: -24, z: 8 }, { x: 0, z: 18 });
  const bp = world.spots.bar;
  for (let i = 0; i < 3; i++) {
    const mesh = AV.createStaff('waiter', 'camarero' + i); mesh.position.set(bp.x - i * 1.2, 0, bp.z + 1.5 + i); world.rooms.main.group.add(mesh);
    staff.push({ mesh, x: bp.x - i, z: bp.z + 1.5, state: 'patrol', wp: null, wait: i * 1.5, order: 0, stuck: 0, hand: 0 });
  }
}
function route(s, tx, tz) {            // rodea la ruleta central si está en medio
  const dx = tx - s.x, dz = tz - s.z, l2 = dx * dx + dz * dz || 1, k = Math.max(0, Math.min(1, -(s.x * dx + s.z * dz) / l2));
  const px = s.x + dx * k, pz = s.z + dz * k, d = Math.hypot(px, pz);
  if (d < 7.6 && Math.hypot(s.x, s.z) > 6.5 && Math.hypot(tx, tz) > 6.5) { const nx = d > .01 ? px / d : 1, nz = d > .01 ? pz / d : 0; return { x: nx * 8.6, z: nz * 8.6 }; }
  return { x: tx, z: tz };
}
function walk(s, tx, tz, dt, speed = 2.6) {
  const r = route(s, tx, tz), dx = r.x - s.x, dz = r.z - s.z, d = Math.hypot(dx, dz);
  if (d > .05) {
    const ox = s.x, oz = s.z, st = Math.min(d, speed * dt);
    [s.x, s.z] = collide(s.x + dx / d * st, s.z + dz / d * st, 'main');
    s.mesh.rotation.y = turn(s.mesh.rotation.y, Math.atan2(dx, dz), .15);
    s.stuck = Math.hypot(s.x - ox, s.z - oz) < st * .3 ? s.stuck + dt : 0;
  }
  return Math.hypot(tx - s.x, tz - s.z);
}
function targetOf(o) {                 // dónde está el cliente de un pedido
  if (o.to === 'bar') return { x: world.spots.bar.x, z: world.spots.bar.z, here: true };
  if (o.pid === socket.id && me) return me.room === 'main' ? { x: me.x, z: me.z, here: true } : { x: 0, z: 6.5, here: false };
  const p = others[o.pid]; if (!p) return null;
  return p.room === 'main' ? { ...to3(p.rx, p.ry), here: true } : { x: 0, z: 6.5, here: false };
}
function updateStaff(dt, t) {
  const bp = world.spots.bar;
  // asignar pedidos a camareros libres
  while (orderQ.length) {
    const o = orders[orderQ[0]]; if (!o || o.status === 'delivered' || o.status === 'cancelled') { orderQ.shift(); continue; }
    const free = staff.filter(s => s.state === 'patrol').sort((a, b) => Math.hypot(a.x - bp.x, a.z - bp.z) - Math.hypot(b.x - bp.x, b.z - bp.z))[0];
    if (!free) break; free.state = 'pickup'; free.order = o.id; orderQ.shift();
  }
  staff.forEach(s => {
    const o = orders[s.order];
    if (s.order && (!o || o.status === 'delivered' || o.status === 'cancelled') && s.state !== 'return') { s.state = 'return'; AV.carry(s.mesh, null); s.order = 0; }
    if (s.state === 'patrol') {
      if (!s.wp) { s.wait -= dt; if (s.wait <= 0) { s.wp = patrolPts[Math.floor(Math.random() * patrolPts.length)]; s.stuck = 0; } }
      else if (walk(s, s.wp.x, s.wp.z, dt) < .5 || s.stuck > 2.5) { s.wp = null; s.wait = 1.5 + Math.random() * 3; }
    } else if (s.state === 'pickup') {
      const d = walk(s, bp.x - .6, bp.z + .6, dt, 3.4);
      if (d < 1.2 && o.status === 'delivering') { s.state = 'deliver'; AV.carry(s.mesh, CFG.bar[o.item]?.emoji || '🍹'); s.stuck = 0; }
    } else if (s.state === 'deliver') {
      const tg = targetOf(o); if (!tg) { s.state = 'return'; return; }
      const d = walk(s, tg.x, tg.z, dt, 3.6);
      if (d < 1.9 && tg.here) {
        s.mesh.rotation.y = turn(s.mesh.rotation.y, Math.atan2(tg.x - s.x, tg.z - s.z), .3);
        if (o.pid === socket.id && (o.to !== 'bar' || (me && me.room === 'main' && Math.hypot(me.x - bp.x, me.z - bp.z) < 9))) { if (!s.sent) { socket.emit('order:arrived', o.id); s.sent = true; } }
        s.mesh.userData.wave = .6;
      }
      if (s.stuck > 3) { s.x = bp.x; s.z = bp.z; s.stuck = 0; }
    } else if (s.state === 'return') {
      if (walk(s, bp.x - 1.5, bp.z + 2.5, dt, 3) < 1 || s.stuck > 2.5) { s.state = 'patrol'; s.wp = null; s.wait = 1; s.sent = false; AV.carry(s.mesh, null); }
    }
    const mv = Math.hypot(s.x - s.mesh.position.x, s.z - s.mesh.position.z) / Math.max(dt, .001);
    s.sp = (s.sp || 0) + (mv - (s.sp || 0)) * Math.min(1, dt * 8);
    s.mesh.position.set(s.x, 0, s.z); AV.update(s.mesh, dt, { speed: s.sp < .25 ? 0 : s.sp, turn: 0 });
  });
}
socket.on('order', o => {
  const prev = orders[o.id]; orders[o.id] = { ...prev, ...o };
  const mine = o.pid === socket.id, it = CFG && CFG.bar[o.item];
  if (!prev && o.status === 'preparing') {
    orderQ.push(o.id);
    if (mine) { toast(`🧾 Pedido recibido: ${it.emoji} ${it.name}`); history.unshift({ e: it.emoji, t: it.name, v: `−${it.price}` }); SFX.coin(); }
    if (world) { const b = world.npcs.main.find(n => n.look === 'bartender'); if (b) b.mesh.userData.wave = 2.2; }
  } else if (o.status === 'delivering' && mine) toast('🚶 Un camarero va hacia ti con tu pedido');
  else if (o.status === 'delivered') { if (mine) SFX.ding(); setTimeout(() => delete orders[o.id], 9000); }
  else if (o.status === 'cancelled') delete orders[o.id];
  if ($('phone').classList.contains('on')) renderPhone();
});

// ---------- Interacciones ----------
let actionKey = '', current = null;
const sd = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);                           // distancia en unidades del servidor
function findInteract() {
  if (!me || busy || transitioning) return null;
  const base = findStation();
  // Sentado: E abre la mesa (juego, barra…) si la hay a mano; si no, levanta. Moverse también levanta.
  if (me.sitting) return base ? { ...base, key: 'sat-' + base.key, sub: (base.sub ? base.sub + ' · ' : '') + 'Muévete para levantarte' } : { key: 'stand', icon: '🧍', txt: 'Levantarse', sub: 'O muévete para levantarte', act: standUp };
  const seat = (world.seats[me.room] || []).find(q => Math.hypot(me.x - q.x, me.z - q.z) < 1.15);
  if (seat) return { key: 'sit', icon: '🪑', txt: 'Sentarse', sub: base ? 'Y luego pulsa E para ' + base.txt.toLowerCase() : 'Descansa un momento', act: () => sitDown(seat) };
  return base;
}
function findStation() {
  const mp = { x: me.x * U + 500, y: me.z * U + 500 };
  if (me.room === 'classic') {
    const ex = world.spots.classic.exit;
    if (Math.hypot(me.x - ex.x, me.z - ex.z) < 4.2) return { key: 'exit', icon: '🚪', txt: 'Volver a la sala principal', act: () => goRoom('main') };
    for (const st of world.classicStations || []) if (Math.hypot(me.x - st.x, me.z - st.z) < st.r) return { key: 'c-' + st.id, icon: st.emoji, txt: st.name, sub: st.desc, act: () => (window.CLASSIC && CLASSIC[st.id.replace(/\d+$/, '')]) ? CLASSIC.open(st.id.replace(/\d+$/, ''), st) : toast(`${st.emoji} ${st.name}: ${st.soon}`) };
    return null;
  }
  if (Math.hypot(me.x, me.z) < world.spots.door.r) return { key: 'lift', icon: '🛗', txt: 'Subir al Casino Clásico', sub: 'Blackjack · Póquer · Billar · Bingo · Ruleta', act: () => goRoom('classic') };
  for (const tb of CFG.tables) if (sd(mp, tb) < CFG.zone) {
    const st = tableState[tb.id] || {};
    const full = st.status === 'playing';
    return { key: `t-${tb.id}-${st.status}-${st.count}`, icon: tb.emoji, txt: full ? `${tb.name} — partida en curso` : `Jugar a ${tb.name}`, sub: full ? 'Espera a la siguiente' : `${tb.desc} · 👥 ${st.count || 0}/${CFG.minPlayers}+ jugadores`, act: () => { if (!full) socket.emit('table:start', tb.id); } };
  }
  if (sd(mp, CFG.shopPos) < CFG.zone) return { key: 'shop', icon: '🛍️', txt: 'Abrir la tienda VIP', sub: 'Colores, gorros, mascotas y efectos', act: () => { renderShop(); open('shop'); SFX.open(); } };
  const bs = world.spots.bar; if (Math.hypot(me.x - bs.x, me.z - bs.z) < 5.5) return { key: 'bar', icon: '🍸', txt: 'Pedir en la barra', sub: 'Comida y bebida con monedas', act: () => { barTo = 'bar'; renderBarMenu(); open('barMenu'); SFX.open(); } };
  if (sd(mp, CFG.arcadePos) < CFG.zone) return { key: 'arcade', icon: '🕹️', txt: 'Arcade', sub: 'Juegos de otros grupos', act: () => { openArcade(); SFX.open(); } };
  const w = staff.find(s => Math.hypot(me.x - s.x, me.z - s.z) < 2.8 && s.state === 'patrol');
  if (w) return { key: 'waiter', icon: '🤵', txt: 'Hablar con el camarero', sub: '¡Buenas noches! ¿Qué le apetece?', act: () => { barTo = 'me'; renderBarMenu(); open('barMenu'); SFX.open(); } };
  return null;
}
function useAction() { if (current) { SFX.click(); current.act(); } }
function updatePrompt() {
  current = findInteract();
  const key = current ? current.key : '';
  if (key === actionKey) return; actionKey = key;
  $('prompt').classList.toggle('on', !!current); $('useBtn').classList.toggle('on', !!current);
  if (current) { $('promptTxt').innerHTML = `<div>${current.icon} <b>${esc(current.txt)}</b>${current.sub ? `<small>${esc(current.sub)}</small>` : ''}</div>`; $('useBtn').textContent = current.icon + ' ' + (current.txt.length > 22 ? 'Usar' : current.txt); }
}
function goRoom(to) {
  if (transitioning) return; transitioning = true;
  SFX.door(); $('fadeTxt').textContent = to === 'classic' ? '🛗 Subiendo al Casino Clásico…' : '🛗 Bajando a la sala principal…';
  $('fade').classList.add('on'); world.liftOpen = 1;
  setTimeout(() => {
    room = me.room = to; me.sitting = false; me.sy = 0; setPose();
    if (to === 'classic') { me.x = 0; me.z = 21.5; me.yaw = 0; } else { me.x = 0; me.z = -2.8; me.yaw = Math.PI; }
    me.pitch = 0; applyRoom(); sendMove(true);
    setTimeout(() => { $('fade').classList.remove('on'); transitioning = false; world.liftOpen = 0; if (to === 'classic') toast('🃏 Bienvenido al Casino Clásico'); }, 500);
  }, 900);
}

// ---------- Bucle de dibujo ----------
let last = performance.now(), fpsAcc = 0, fpsN = 0, lastDown = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000;
  if (!CFG || !world || window.PAUSE3D) return;       // PAUSE3D: la arena del Tiroteo pausa la sala para ahorrar batería
  resize();
  Object.values(labels).forEach(l => l._seen = false);
  if (me && joined && !PROJ) updateMe(dt, t);
  updateStaff(dt, t);
  // otros jugadores (interpolados)
  const k = 1 - Math.pow(.001, dt);
  Object.values(others).forEach(o => {
    const px = o.rx, py = o.ry;
    o.rx += (o.x - o.rx) * k; o.ry += (o.y - o.ry) * k;
    const vx = (o.rx - px) / U / Math.max(dt, .001), vz = (o.ry - py) / U / Math.max(dt, .001);
    o.sp = (o.sp || 0) + (Math.hypot(vx, vz) - (o.sp || 0)) * Math.min(1, dt * 8);
    const prev = o.dir; o.dir = turn(o.dir, o.face !== undefined && (o.pose === 'sit' || o.sp < 1.2 || true) ? o.face : Math.atan2(vx, vz), 1 - Math.exp(-dt * 9));
    let dd = o.dir - prev; while (dd > Math.PI) dd -= 2 * Math.PI; while (dd < -Math.PI) dd += 2 * Math.PI;
    const q = to3(o.rx, o.ry); o.mesh.position.set(q.x, o.pose === 'sit' ? Math.max(0, (o.sy || .5) - .41) : 0, q.z); o.mesh.rotation.y = o.dir;
    AV.update(o.mesh, dt, { speed: o.sp < .2 ? 0 : o.sp, turn: dd / Math.max(dt, .001), pose: o.pose });
    if (o.room === room) label('p' + o.id, `${esc(o.name)} · 🪙${o.coins}`, { x: q.x, y: 2.15, z: q.z }, '', 20);
  });
  // personal fijo mira al jugador
  (world.npcs[room] || []).forEach(n => {
    let tgt = n.rot;
    if (me && me.room === room && joined) { const dx = me.x - n.mesh.position.x, dz = me.z - n.mesh.position.z; if (dx * dx + dz * dz < 100) tgt = Math.atan2(dx, dz); }
    const before = n.mesh.rotation.y; n.mesh.rotation.y = turn(before, tgt, .06); AV.update(n.mesh, dt, { speed: 0, turn: (n.mesh.rotation.y - before) / Math.max(dt, .001) });
  });
  world.liftOpen += ((me && me.room === 'main' && Math.hypot(me.x, me.z) < world.spots.door.r + 1.5 ? 1 : (transitioning ? 1 : 0)) - world.liftOpen) * Math.min(1, dt * 3);
  world.update(t, dt, camera, room);
  // cámara
  if (me && joined && !PROJ) {
    updateCamera(dt, t);
    updatePrompt();
    CFG.tables.forEach(tb => { if (room !== 'main') return; const st = tableState[tb.id] || {}; label('t' + tb.id, `${tb.emoji} <b>${tb.name}</b> · ` + (st.status === 'playing' ? `🔴 EN JUEGO (${st.playing})` : `👥 ${st.count || 0}/${CFG.minPlayers}`), { x: tb.p.x, y: 2.6, z: tb.p.z }, 'tbl', 22); });
  } else {      // cámara cinematográfica (antes de entrar / modo proyector)
    if (me && me.mesh) me.mesh.visible = false; if (hands) hands.group.visible = false;
    const a = t * .07, r = 23;
    camera.position.set(Math.cos(a) * r, 6.5 + Math.sin(t * .13) * 2.5, Math.sin(a) * r); camera.lookAt(0, 6.2, 0);
  }
  Object.values(labels).forEach(l => { if (!l._seen) l.style.display = 'none'; });
  if (composer && quality !== 'low') composer.render(); else renderer.render(scene, camera);
  if ($('shop').classList.contains('on')) drawPreview(t);
  if ($('phone').classList.contains('on')) drawMapSoon(t);
  // calidad automática: si va muy lento, baja un nivel
  fpsAcc += dt; fpsN++;
  if (fpsAcc > 3) { const avg = fpsAcc / fpsN; fpsAcc = fpsN = 0; if (avg > .045 && quality !== 'low' && now - lastDown > 4000) { lastDown = now; applyQuality(quality === 'high' ? 'mid' : 'low'); toast('Calidad gráfica ajustada para ir más fluido'); } }
}
requestAnimationFrame(frame);

// ---------- Tienda ----------
const SLOTS = { color: '🎨 Traje', hat: '🎩 Gorro', face: '🕶️ Cara', pet: '🐶 Mascota', fx: '✨ Efecto' };
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
    const btn = eq ? `<button class="off" data-k="${k}">Quitar</button>` : owned ? `<button class="own" data-k="${k}">Equipar</button>` : `<button data-k="${k}">🪙 ${it.price}</button>`;
    return `<div class="item ${eq ? 'eq' : ''}">${icon}<small>${it.name}</small>${btn}</div>`;
  }).join('');
  $('items').querySelectorAll('button').forEach(b => b.onclick = () => { SFX.coin(); socket.emit('shop', b.dataset.k); });
}
// Vista previa 3D del personaje en la tienda
let pv;
function drawPreview(t) {
  if (!pv) {
    const r = new T.WebGLRenderer({ canvas: $('preview'), antialias: true, alpha: true });
    r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); r.outputEncoding = T.sRGBEncoding;
    const s = new T.Scene(); s.add(new T.HemisphereLight(0xffffff, 0x6a4a8a, 2.2));
    const d = new T.DirectionalLight(0xffffff, 1.6); d.position.set(2, 4, 5); s.add(d);
    const c = new T.PerspectiveCamera(30, 1, .1, 50); c.position.set(0, 1.28, 2.7); c.lookAt(0, 1.22, 0);
    const a = AV.create(myData.look, { seed: socket.id }); s.add(a);
    pv = { r, s, c, a };
  }
  pv.r.setSize(96, 96, false);
  AV.setLook(pv.a, myData.look); pv.a.rotation.y = Math.sin(t) * .6; AV.update(pv.a, .016, { speed: 0 });
  pv.r.render(pv.s, pv.c);
}

// ---------- Bar: carta, pedidos ----------
function menuHTML() {
  const groups = {}; Object.entries(CFG.bar).forEach(([k, it]) => (groups[it.kind] = groups[it.kind] || []).push([k, it]));
  return Object.entries(groups).map(([kind, arr]) => `<h4>${kind}s</h4>` + arr.map(([k, it]) => `<div class="dish"><span class="e">${it.emoji}</span><b>${it.name}</b><small>🪙 ${it.price}</small><button class="buy" data-i="${k}">Pedir</button></div>`).join('')).join('');
}
function bindMenu(el, to) {
  el.querySelectorAll('button.buy').forEach(b => b.onclick = () => { SFX.click(); socket.emit('bar:order', { item: b.dataset.i, to: to() }); });
}
function renderBarMenu() { $('barItems').innerHTML = menuHTML(); bindMenu($('barItems'), () => barTo); }

// ---------- Teléfono virtual ----------
let phTab = 'wallet';
function togglePhone(force) {
  const p = $('phone'), on = force ?? !p.classList.contains('on');
  if (on && (busy || transitioning || $('game').classList.contains('on'))) return;
  p.classList.toggle('on', on); if (me) { me.phoneOn = on; setPose(); sendMove(true); }
  if (on) { try { document.exitPointerLock(); } catch (e) {} renderPhone(); SFX.open(); }
}
$('phClose').onclick = () => togglePhone(false);
$('phNav').querySelectorAll('button').forEach(b => b.onclick = () => { phTab = b.dataset.t; renderPhone(); });
setInterval(() => { const d = new Date(); $('phTime').textContent = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); }, 5000);
const STATUS = { preparing: ['prep', '👨‍🍳 Preparando'], delivering: ['go', '🚶 En camino'], delivered: ['ok', '✅ Entregado'] };
function renderPhone() {
  $('phNav').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.t === phTab));
  const body = $('phBody'); let h = '';
  if (phTab === 'wallet') {
    h = `<div class="bal"><small>TU SALDO</small><b>🪙 ${myData.coins}</b><small>Monedas ficticias · no se pueden canjear por dinero real</small></div><h3>Movimientos</h3>` +
      (history.length ? history.slice(0, 8).map(x => `<div class="row"><span class="e">${x.e}</span><span class="g">${esc(x.t)}</span><b>${x.v}</b></div>`).join('') : '<div class="empty">Aún no hay movimientos. ¡Juega una partida!</div>');
  } else if (phTab === 'bar') {
    h = `<h3>🍸 Carta del bar</h3><p class="hint" style="margin-bottom:6px">Un camarero te lo llevará a donde estés.</p><div class="menu">${menuHTML()}</div>`;
  } else if (phTab === 'orders') {
    const mine = Object.values(orders).filter(o => o.pid === socket.id).sort((a, b) => b.id - a.id);
    h = `<h3>🧾 Mis pedidos</h3>` + (mine.length ? mine.map(o => { const it = CFG.bar[o.item], [c, tx] = STATUS[o.status] || ['', o.status]; return `<div class="row"><span class="e">${it.emoji}</span><span class="g">${it.name}<small>${o.to === 'bar' ? 'En la barra' : 'A tu posición'} · 🪙 ${it.price}</small></span><span class="chip ${c}">${tx}</span></div>`; }).join('') : '<div class="empty">No has pedido nada todavía.<br>Ve a la pestaña Bar 🍸</div>');
  } else if (phTab === 'inv') {
    const inv = Object.entries(myData.inv || {}), own = myData.owned || [];
    h = `<h3>🍽️ Consumiciones</h3>` + (inv.length ? inv.map(([k, n]) => `<div class="row"><span class="e">${CFG.bar[k].emoji}</span><span class="g">${CFG.bar[k].name}</span><b>x${n}</b></div>`).join('') : '<div class="empty">Nada por ahora</div>') +
      `<h3>🎒 Artículos de la tienda</h3>` + (own.length ? own.map(k => { const it = CFG.shop[k]; const eq = myData.look[it.slot] === it.value; return `<div class="row"><span class="e">${it.slot === 'color' ? '🎨' : it.slot === 'fx' ? '✨' : it.value}</span><span class="g">${it.name}<small>${SLOTS[it.slot]}</small></span>${eq ? '<span class="chip ok">Puesto</span>' : ''}</div>`; }).join('') : '<div class="empty">Compra cosas en la tienda VIP 🛍️</div>');
  } else if (phTab === 'map') {
    h = `<h3>🗺️ Mapa · ${room === 'main' ? 'Sala principal' : 'Casino clásico'}</h3><canvas id="phMap" width="300" height="300"></canvas><div class="legend">🔵 Tú · ⚪ Jugadores · 🟡 Camareros · 🎰 Juegos · 🛍️ Tienda · 🍸 Bar · 🛗 Ascensor</div>`;
  }
  body.innerHTML = h;
  if (phTab === 'bar') bindMenu(body, () => 'me');
  if (phTab === 'map') mapT = 0;
}
let mapT = 0;
function drawMapSoon(t) { if (phTab !== 'map' || t - mapT < .15) return; mapT = t; drawMap(); }
function drawMap() {
  const c = $('phMap'); if (!c || !me) return; const g = c.getContext('2d'), N = 300, S = world.S, P = v => (v / S + .5) * N;
  g.fillStyle = '#0a0620'; g.fillRect(0, 0, N, N); g.strokeStyle = '#e2b04a'; g.lineWidth = 3; g.strokeRect(2, 2, N - 4, N - 4);
  const dot = (x, z, col, r = 4) => { g.fillStyle = col; g.beginPath(); g.arc(P(x), P(z), r, 0, 7); g.fill(); };
  const em = (x, z, e, s = 15) => { g.font = `${s}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, P(x), P(z)); };
  if (room === 'main') {
    g.strokeStyle = '#a24bff55'; g.beginPath(); g.arc(P(0), P(0), P(6.5) - P(0), 0, 7); g.stroke(); em(0, 0, '🛗', 18);
    CFG.tables.forEach(tb => { g.strokeStyle = tb.color + '99'; g.beginPath(); g.arc(P(tb.p.x), P(tb.p.z), P(7.5) - P(0), 0, 7); g.stroke(); em(tb.p.x, tb.p.z, tb.emoji); });
    const sh = to3(CFG.shopPos.x, CFG.shopPos.y), ar = to3(CFG.arcadePos.x, CFG.arcadePos.y), br = world.spots.bar;
    em(sh.x, sh.z, '🛍️', 18); em(ar.x, ar.z, '🕹️', 18); em(br.x, br.z, '🍸', 18);
    staff.forEach(s => dot(s.x, s.z, '#ffd23f', 3.5));
  } else (world.classicMap || []).forEach(m => em(m.x, m.z, m.e, 16));
  Object.values(others).forEach(o => { if (o.room === room) { const q = to3(o.rx, o.ry); dot(q.x, q.z, '#fff', 3.5); } });
  g.save(); g.translate(P(me.x), P(me.z)); g.rotate(-me.yaw); g.fillStyle = '#2de2ff'; g.shadowColor = '#2de2ff'; g.shadowBlur = 8;
  g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 6); g.lineTo(0, 3); g.lineTo(-6, 6); g.closePath(); g.fill(); g.restore();
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

// ---------- Minijuegos (las reglas y la lógica están en games.js / server.js) ----------
socket.on('game:start', g => {
  close('shop'); close('arcade'); close('barMenu'); $('phone').classList.remove('on'); open('game'); SFX.open();
  $('gTitle').textContent = `${g.emoji} ${g.name}`; $('gTimer').textContent = '';
  const body = $('gBody');
  let left = Math.round((g.intro || 10000) / 1000);
  body.innerHTML = `<div class="howto"><b>📖 Cómo se juega</b><br>${esc(g.howto || g.desc)}</div>
    <p style="opacity:.8">Jugáis: ${g.rivals.map(esc).join(', ')}</p>
    <p class="ready">Premios: 🥇${CFG.prizes[0]} · 🥈${CFG.prizes[1]} · 🥉${CFG.prizes[2]} 🪙</p>
    <div class="count" id="cd">${left}</div><p>Prepárate…</p>`;
  const iv = setInterval(() => {
    left--;
    if (left > 0) { const cd = $('cd'); if (cd) cd.outerHTML = `<div class="count" id="cd">${left}</div>`; if (left <= 3) SFX.tick(); return; }
    clearInterval(iv); SFX.go();
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
  if (mine) { mine.pos === 1 ? SFX.win() : SFX.lose(); history.unshift({ e: r.emoji, t: `${r.name} · ${mine.pos}º puesto`, v: `+${mine.prize}` }); }
  $('gBody').innerHTML = `
    <div class="winTitle">${mine ? (mine.pos === 1 ? '¡GANASTE!' : `${mine.pos}º PUESTO`) : 'FIN'}</div>
    ${mine ? `<div class="pill big">+${mine.prize} 🪙</div>` : ''}
    <ul class="rank">${r.ranking.map(x => `<li class="${x.id === socket.id ? 'me' : ''}"><span class="m">${medal[x.pos - 1] || x.pos + 'º'}</span><span class="n">${esc(x.name)}<small>${esc(x.txt)}</small></span><span class="p">+${x.prize} 🪙</span></li>`).join('')}</ul>
    <button class="gold" id="backBtn">Volver al casino</button>`;
  $('backBtn').onclick = () => close('game');
});

// ---------- Código QR para unirse (URL pública real del juego) ----------
let shareUrl = null;
async function getShareUrl() {
  if (shareUrl) return shareUrl;
  let base = '', local = false;
  try { const j = await (await fetch('/public-url')).json(); base = j.url; local = j.local; } catch (e) {}
  if (!base) base = /^(localhost|127\.|10\.|192\.168\.)/.test(location.hostname) ? 'https://casino-uab.onrender.com' : location.origin;
  // Si algún día hay salas privadas (?sala=ID), el enlace compartido lleva la sala actual
  const sala = new URLSearchParams(location.search).get('sala');
  shareUrl = { url: base + (sala ? '/?sala=' + encodeURIComponent(sala) : ''), local, sala };
  return shareUrl;
}
let qrDone = '';
async function openQR() {
  const { url, local, sala } = await getShareUrl();
  $('qrUrl').textContent = url;
  $('qrNote').textContent = sala ? `Enlace de la sala «${sala}»` : local ? 'Estás en modo local: se comparte la dirección pública del casino.' : '';
  if (qrDone !== url) {
    qrDone = url; $('qrBox').innerHTML = '';
    if (window.QRCode) new QRCode($('qrBox'), { text: url, width: 200, height: 200, colorDark: '#12082a', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
    else $('qrBox').innerHTML = '<small style="color:#333;text-align:center;padding:10px">No se pudo cargar el generador de QR.<br>Comparte el enlace de abajo.</small>';
  }
  $('qrCopy').textContent = '📋 Copiar enlace'; open('qrModal'); SFX.open();
}
async function copyShare() {
  const { url } = await getShareUrl(); let ok = false;
  try { await navigator.clipboard.writeText(url); ok = true; } catch (e) {
    try { const ta = document.createElement('textarea'); ta.value = url; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove(); } catch (e2) {}
  }
  if (!ok) { try { const r = document.createRange(); r.selectNodeContents($('qrUrl')); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); } catch (e) {} }   // lo deja seleccionado para copiarlo a mano
  $('qrCopy').textContent = ok ? '✅ ¡Enlace copiado!' : '⚠️ Cópialo a mano'; if (ok) SFX.coin(); toast(ok ? 'Enlace copiado' : 'No se pudo copiar automáticamente');
  setTimeout(() => { $('qrCopy').textContent = '📋 Copiar enlace'; }, 2200);
}
$('qrBtn').onclick = () => openQR(); $('qrCopy').onclick = copyShare; $('qrClose').onclick = $('qrX').onclick = () => close('qrModal');
$('qrModal').addEventListener('pointerdown', e => { if (e.target === $('qrModal')) close('qrModal'); });

// ---------- Modo proyector ----------
function renderProj(players) {
  let side = $('projSide');
  if (!side) {
    side = document.createElement('div'); side.id = 'projSide';
    side.innerHTML = `<h3>¡ENTRA YA!</h3><div id="qr"></div><p id="qrHost" style="margin:6px 0;font-weight:700">…</p><h3>💰 MÁS RICOS</h3><ol id="rich"></ol>`;
    document.body.appendChild(side);
    getShareUrl().then(({ url }) => { $('qrHost').textContent = url.replace(/^https?:\/\//, ''); if (window.QRCode) new QRCode($('qr'), { text: url, width: 170, height: 170 }); });
  }
  $('rich').innerHTML = [...players].sort((a, b) => b.coins - a.coins).slice(0, 8).map(p => `<li>${esc(p.name)} · 🪙 ${p.coins}</li>`).join('');
}
