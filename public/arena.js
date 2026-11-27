// 🔫 Tiroteo: shooter en primera persona dentro de una arena 3D, con los avatares de cada jugador
GAMES.arena = function (el, p, done, timer) {
  window.PAUSE3D = true;                                   // pausa la sala del casino para ahorrar batería
  const wrap = document.createElement('div'); wrap.id = 'arenaWrap';
  wrap.innerHTML = `<canvas></canvas>
    <div class="ahud"><span id="aHp">❤️ 100</span><span id="aTime">60</span><span id="aK">💀 0 · ☠️ 0</span></div>
    <div class="cross"></div><div id="aFeed"></div><div id="aDead">☠️ Has caído<br><small>Reapareces en 2 s…</small></div>
    <div id="aDmg"></div><div class="joy"><div class="knob"></div></div><button id="aFire">🔫</button>
    <p class="ahelp">Joystick: moverse · Desliza a la derecha: apuntar · 🔫 disparar<br>PC: WASD + ratón (clic para fijar el ratón y disparar)</p>`;
  document.body.appendChild(wrap);
  const cv = wrap.querySelector('canvas');
  const R = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
  R.setPixelRatio(Math.min(1.5, devicePixelRatio || 1)); R.outputEncoding = THREE.sRGBEncoding;
  // Arena estilo casino de neón (a juego con la sala principal)
  const S = new THREE.Scene(); S.background = new THREE.Color(0x07061a); S.fog = new THREE.Fog(0x07061a, 25, 60);
  const cam = new THREE.PerspectiveCamera(75, 1, .05, 120); cam.rotation.order = 'YXZ';
  S.add(new THREE.HemisphereLight(0x9a8cff, 0x1a0b2e, .9));
  const sunL = new THREE.DirectionalLight(0xffffff, .5); sunL.position.set(10, 20, 5); S.add(sunL);
  [[-12, -12, 0xff2bd6], [12, 12, 0x00e5ff], [12, -12, 0xffd166], [-12, 12, 0x7b2dff]].forEach(([x, z, c]) => {
    const l = new THREE.PointLight(c, 1.4, 26); l.position.set(x, 5, z); S.add(l);
  });
  // Suelo: baldosas oscuras con líneas de neón
  const tile = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    x.fillStyle = '#14112e'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#7b2dff'; x.lineWidth = 3; x.shadowColor = '#b06bff'; x.shadowBlur = 8; x.strokeRect(2, 2, 124, 124);
    x.fillStyle = '#ffd16655'; x.beginPath(); x.arc(64, 64, 4, 0, 7); x.fill();
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(16, 16); t.encoding = THREE.sRGBEncoding; return t; })();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ map: tile, roughness: .35, metalness: .3 })); floor.rotation.x = -Math.PI / 2; S.add(floor);
  // Logo en el centro del suelo
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.2), new THREE.MeshBasicMaterial({ transparent: true, map: (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d');
    x.font = '72px Bungee, Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = '#ff2bd6'; x.shadowBlur = 20; x.fillStyle = '#ffd166'; x.fillText('TIROTEO', 256, 70);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; })() }));
  logo.rotation.x = -Math.PI / 2; logo.position.set(0, .02, 6.5); S.add(logo);
  const solids = [];
  const NEON = [0xff2bd6, 0x00e5ff, 0xffd166, 0x7b2dff];
  const block = (x, z, w, h, d, color, neon) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: .5, metalness: .4 })); m.position.set(x, h / 2, z); S.add(m);
    if (neon !== undefined) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: neon })); m.add(e); }
    solids.push({ m, x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
  };
  // Muros con franja de neón
  [[0, -20.5, 42, 1], [0, 20.5, 42, 1], [-20.5, 0, 1, 42], [20.5, 0, 1, 42]].forEach(([x, z, w, d], i) => {
    block(x, z, w, 5, d, 0x1c1240);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w + .02, .15, d + .02), new THREE.MeshBasicMaterial({ color: NEON[i] })); strip.position.set(x, 3.2, z); S.add(strip);
    const strip2 = strip.clone(); strip2.position.y = .3; S.add(strip2);
  });
  // Coberturas: mesas de juego, cajas de fichas y tragaperras
  [[0, 0, 4, 2.2, 4], [-8, -6, 2, 2.2, 6], [8, 6, 2, 2.2, 6], [-8, 8, 5, 2.2, 2], [8, -8, 5, 2.2, 2], [0, -11, 6, 1.3, 1.2], [0, 11, 6, 1.3, 1.2],
   [-14, 0, 1.5, 1.5, 1.5], [14, 0, 1.5, 1.5, 1.5], [-4, 4, 1.5, 1.5, 1.5], [4, -4, 1.5, 1.5, 1.5]]
    .forEach(([x, z, w, h, d], i) => block(x, z, w, h, d, i < 7 ? 0x2a1650 : 0x0f5132, NEON[i % 4]));
  // Fichas gigantes decorativas sobre la cobertura central
  [[0, 0], [-1, .8], [1, -.6]].forEach(([dx, dz], i) => {
    const chip = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, .2, 24), new THREE.MeshStandardMaterial({ color: [0xe63946, 0x111111, 0xffd166][i], emissive: [0x330000, 0, 0x332200][i] }));
    chip.position.set(dx, 2.3 + i * .2, dz); S.add(chip);
  });
  // Arma en primera persona
  const gun = new THREE.Group();
  const gm = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: .6, roughness: .4 });
  const g1 = new THREE.Mesh(new THREE.BoxGeometry(.12, .14, .6), gm); const g2 = new THREE.Mesh(new THREE.BoxGeometry(.1, .22, .12), new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: .8, roughness: .3 }));
  g2.position.set(0, -.14, .15); gun.add(g1, g2); gun.scale.setScalar(.55); gun.position.set(.2, -.17, -.42); cam.add(gun); S.add(cam);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffdd55 })); flash.position.set(0, 0, -.35); flash.visible = false; gun.add(flash);

  // Estado
  const myId = socket.id;
  let [px, pz] = (p.spawns && p.spawns[myId]) || [0, 15];
  let yaw = Math.atan2(px, pz), pitch = 0, alive = true, hp = 100, lastShot = 0, lastSend = 0, raf = 0, over = false;
  const foes = {};   // id -> { mesh, tx, tz, ry, alive }
  const move = { x: 0, y: 0 }; const keys = {};
  const lookOf = id => (others[id] && others[id].look) || { color: '#8d99ae' };

  function collide(x, z) {
    for (const b of solids) if (x > b.x0 - .45 && x < b.x1 + .45 && z > b.z0 - .45 && z < b.z1 + .45) return true;
    return false;
  }
  // Controles táctiles: joystick (izquierda) y apuntar (derecha)
  const joy = wrap.querySelector('.joy'), knob = wrap.querySelector('.knob');
  let joyId = null, lookId = null, lx = 0, ly = 0, jc = null;
  cv.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') { if (document.pointerLockElement !== cv) cv.requestPointerLock?.(); else shoot(); return; }
    if (e.clientX < innerWidth / 2 && joyId === null) { joyId = e.pointerId; jc = { x: e.clientX, y: e.clientY }; joy.style.left = (e.clientX - 60) + 'px'; joy.style.top = (e.clientY - 60) + 'px'; joy.classList.add('on'); }
    else if (lookId === null) { lookId = e.pointerId; lx = e.clientX; ly = e.clientY; }
  });
  const onMove = e => {
    if (e.pointerId === joyId) {
      let dx = e.clientX - jc.x, dy = e.clientY - jc.y; const d = Math.hypot(dx, dy), m = 50;
      if (d > m) { dx = dx / d * m; dy = dy / d * m; }
      move.x = dx / m; move.y = dy / m; knob.style.transform = `translate(${dx}px,${dy}px)`;
    } else if (e.pointerId === lookId) {
      yaw -= (e.clientX - lx) * .006; pitch -= (e.clientY - ly) * .006; lx = e.clientX; ly = e.clientY;
    } else if (document.pointerLockElement === cv) { yaw -= e.movementX * .0025; pitch -= e.movementY * .0025; }
    pitch = Math.max(-1.3, Math.min(1.3, pitch));
  };
  const onUp = e => {
    if (e.pointerId === joyId) { joyId = null; move.x = move.y = 0; knob.style.transform = ''; joy.classList.remove('on'); }
    if (e.pointerId === lookId) lookId = null;
  };
  const onKey = e => { keys[e.key.toLowerCase()] = e.type === 'keydown'; };
  addEventListener('pointermove', onMove); addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp);
  addEventListener('keydown', onKey); addEventListener('keyup', onKey);
  const fireBtn = wrap.querySelector('#aFire');
  let firing = false;
  fireBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); firing = true; shoot(); });
  fireBtn.addEventListener('pointerup', () => firing = false); fireBtn.addEventListener('pointerleave', () => firing = false);

  // Disparo: rayo desde el centro de la pantalla
  const ray = new THREE.Raycaster();
  function tracer(from, to, color) {
    const g = new THREE.BufferGeometry().setFromPoints([from, to]);
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: .9 })); S.add(l);
    setTimeout(() => { S.remove(l); g.dispose(); }, 80);
  }
  function shoot() {
    const now = performance.now(); if (!alive || now - lastShot < 220) return; lastShot = now;
    flash.visible = true; setTimeout(() => flash.visible = false, 50); try { SFX.tick(); } catch (e) {}
    gun.position.z = -.38; setTimeout(() => gun.position.z = -.42, 70);
    ray.setFromCamera({ x: 0, y: 0 }, cam);
    const targets = [...solids.map(b => b.m), ...Object.values(foes).filter(f => f.alive).map(f => f.mesh)];
    const hit = ray.intersectObjects(targets, true)[0];
    const muzzle = new THREE.Vector3(.28, -.2, -.9).applyMatrix4(cam.matrixWorld);
    tracer(muzzle, hit ? hit.point : ray.ray.at(60, new THREE.Vector3()), 0x00e5ff);
    if (!hit) return;
    const fid = Object.keys(foes).find(id => { let o = hit.object; while (o) { if (o === foes[id].mesh) return true; o = o.parent; } return false; });
    if (fid) {
      const head = hit.point.y - foes[fid].mesh.position.y > 1.65;   // impacto a la altura de la cabeza
      socket.emit('arena:shoot', { target: fid, head });
    } else socket.emit('arena:shoot', {});
  }

  // Mensajes del servidor
  const feed = msg => { const f = wrap.querySelector('#aFeed'), d = document.createElement('div'); d.innerHTML = msg; f.prepend(d); setTimeout(() => d.remove(), 3500); };
  const onState = list => list.forEach(a => {
    if (a.id === myId) { hp = a.hp; wrap.querySelector('#aHp').textContent = `❤️ ${a.hp}`; wrap.querySelector('#aK').textContent = `💀 ${a.k} · ☠️ ${a.d}`; return; }
    let f = foes[a.id];
    if (!f) { f = foes[a.id] = { mesh: AV.create(lookOf(a.id)), x: a.x, z: a.z }; S.add(f.mesh); }
    f.tx = a.x; f.tz = a.z; f.ry = a.ry; f.alive = a.alive; f.mesh.visible = a.alive;
  });
  const onHit = h => {
    const esc2 = s => String(s || '').replace(/[&<>"]/g, '');
    if (h.target === myId) { const d = wrap.querySelector('#aDmg'); d.classList.remove('on'); void d.offsetWidth; d.classList.add('on'); }
    if (h.shooter === myId && h.killed) { try { SFX.coin(); } catch (e) {} }
    if (h.shooter === myId && !h.killed) { const c = wrap.querySelector('.cross'); c.classList.add('hit'); setTimeout(() => c.classList.remove('hit'), 120); }
    if (h.killed) {
      feed(`<b>${esc2(h.s)}</b> 🔫${h.head ? '🎯' : ''} ${esc2(h.t)}`);
      if (h.target === myId) { alive = false; wrap.querySelector('#aDead').classList.add('on'); }
    }
  };
  const onRespawn = r => { px = r.x; pz = r.z; alive = true; wrap.querySelector('#aDead').classList.remove('on'); };
  const onFx = fx => { const f = foes[fx.from]; if (f) { const from = f.mesh.position.clone().setY(1.6); const dir = new THREE.Vector3(Math.sin(f.mesh.rotation.y), 0, Math.cos(f.mesh.rotation.y)); tracer(from, from.clone().add(dir.multiplyScalar(30)), 0xff2bd6); } };
  socket.on('arena:state', onState); socket.on('arena:hit', onHit); socket.on('arena:respawn', onRespawn); socket.on('arena:fx', onFx);

  // Bucle
  const tEnd = performance.now() + 60000; let last = performance.now();
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.floor(w * R.getPixelRatio())) { R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    wrap.querySelector('#aTime').textContent = `⏳ ${Math.max(0, Math.ceil((tEnd - now) / 1000))}`;
    if (alive) {
      let mx = move.x + ((keys.d || keys.arrowright) ? 1 : 0) - ((keys.a || keys.arrowleft) ? 1 : 0);
      let mz = move.y + ((keys.s || keys.arrowdown) ? 1 : 0) - ((keys.w || keys.arrowup) ? 1 : 0);
      const l = Math.hypot(mx, mz); if (l > 1) { mx /= l; mz /= l; }
      const sp = 7 * dt, sn = Math.sin(yaw), cs = Math.cos(yaw);
      const dx = (mx * cs + mz * sn) * sp, dz = (-mx * sn + mz * cs) * sp;
      if (!collide(px + dx, pz)) px += dx;
      if (!collide(px, pz + dz)) pz += dz;
      if (firing) shoot();
      if (now - lastSend > 50) { socket.emit('arena:pos', { x: px, z: pz, ry: yaw + Math.PI }); lastSend = now; }
      gun.position.y = -.17 + (l > .1 ? Math.sin(t * 12) * .015 : 0);
    }
    gun.visible = alive; cam.position.set(px, alive ? 1.9 : 6, pz); cam.rotation.set(alive ? pitch : -1.2, yaw, 0);
    const k = 1 - Math.pow(.0005, dt);
    Object.values(foes).forEach(f => {
      const ox = f.mesh.position.x, oz = f.mesh.position.z;
      f.mesh.position.x += (f.tx - f.mesh.position.x) * k; f.mesh.position.z += (f.tz - f.mesh.position.z) * k;
      f.mesh.rotation.y = f.ry;
      AV.animate(f.mesh, t, Math.abs(f.mesh.position.x - ox) + Math.abs(f.mesh.position.z - oz) > .01);
    });
    R.render(S, cam);
  }
  raf = requestAnimationFrame(loop);

  // Limpieza al terminar la partida
  socket.once('game:end', () => {
    over = true; cancelAnimationFrame(raf); window.PAUSE3D = false;
    socket.off('arena:state', onState); socket.off('arena:hit', onHit); socket.off('arena:respawn', onRespawn); socket.off('arena:fx', onFx);
    removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp);
    removeEventListener('keydown', onKey); removeEventListener('keyup', onKey);
    if (document.pointerLockElement) document.exitPointerLock();
    R.dispose(); R.forceContextLoss?.(); wrap.remove();
  });
  el.innerHTML = '<p>🔫 En la arena…</p>';
};
