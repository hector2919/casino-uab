// 🃏 Sala del Casino Clásico: otro "mundo" dentro del casino. Verde tapete, burdeos, madera oscura y dorado.
// Mesas de blackjack, póquer, ruleta, billar y bingo con crupieres, fichas y cartas. (Las mesas clásicas son solo ambientación:
// los juegos jugables siguen siendo los 6 minijuegos de la sala principal.)
World.buildClassic = function (world, CFG) {
  const { T, C, std, neonMat, canvasTex, rr, mtx, instanced, mesh, signPlane, beam, gold, goldBright, HS, TWO, rouletteTex } = world.shared;
  const S = world.S, H = 10;
  const g = new T.Group(), colliders = world.colliders.classic, anim = world.shared.anim.classic, npcs = world.npcs.classic;
  const billboards = world.billboardsClassic = [];
  const stations = world.classicStations = [], map = world.classicMap = [], screens = [];
  world.rooms.classic = { group: g, fog: [0x0a0605, .014], bg: 0x050302, screens };
  world.spots.classic = { exit: { x: 0, z: 28.4 } };
  // Iluminación propia: ambiente cálido (ámbar, dorado, verde y burdeos) en lugar del neón de la sala principal
  { const es = new T.Scene(); es.background = C('#100804');
    [[60, 1, 6, 0, 9, 0, '#ffb25a', 5], [6, 1, 60, 0, 9, 0, '#ffd27a', 5], [40, .6, 40, 0, 10, 0, '#ff8a3a', 2.5], [1, 8, 30, -25, 3, 0, '#2a8f5a', 2.2], [1, 8, 30, 25, 3, 0, '#a0153a', 2.5], [30, 8, 1, 0, 3, -25, '#ffcf7a', 3], [30, 8, 1, 0, 3, 25, '#ffa04a', 3]]
      .forEach(([w, h, d, x, y, z, c, k]) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshBasicMaterial({ color: C(c).multiplyScalar(k * .4) })); m.position.set(x, y, z); es.add(m); });
    const pm = new T.PMREMGenerator(world.shared.renderer); world.rooms.classic.env = pm.fromScene(es, .02).texture; pm.dispose();
    world.rooms.classic.hemi = [0xffd9a0, 0x1a0f08, .8]; }
  const circle = (x, z, r) => colliders.push({ t: 'c', x, z, r });
  const wood = std('#2b150a', { roughness: .45, metalness: .1 }), green = std('#0d6b3c', { roughness: .95 }), leather = std('#4a0a18', { roughness: .6 });

  // ----- Suelo: moqueta verde con ornamentos + alfombra central burdeos -----
  const carpet = canvasTex(512, 512, (c) => {
    c.fillStyle = '#0a2a1e'; c.fillRect(0, 0, 512, 512);
    c.strokeStyle = 'rgba(214,170,70,.4)'; c.lineWidth = 3;
    for (let i = 0; i <= 512; i += 128) for (let j = 0; j <= 512; j += 128) { c.beginPath(); c.moveTo(i, j + 64); c.lineTo(i + 64, j); c.lineTo(i + 128, j + 64); c.lineTo(i + 64, j + 128); c.closePath(); c.stroke(); c.fillStyle = 'rgba(214,170,70,.35)'; c.beginPath(); c.arc(i + 64, j + 64, 7, 0, 7); c.fill(); }
  }); carpet.wrapS = carpet.wrapT = T.RepeatWrapping; carpet.repeat.set(14, 14);
  const floorMat = new T.MeshStandardMaterial({ map: carpet, roughness: .5, metalness: .15, transparent: true, opacity: .93 });
  const floor = mesh(new T.PlaneGeometry(S, S), floorMat, 0, 0, 0, g); floor.rotation.x = -Math.PI / 2;
  if (window.FX && FX.Reflector) {
    const rf = new FX.Reflector(new T.PlaneGeometry(S, S), { textureWidth: 768, textureHeight: 768, color: 0x4a4038, clipBias: .003, multisample: 0 });
    rf.rotation.x = -Math.PI / 2; rf.position.y = -.01; g.add(rf); world.reflectors.push({ r: rf, mat: floorMat, op: .93 });
  }
  const rugTex = canvasTex(1024, 1024, (c) => {
    c.fillStyle = '#5a0f22'; c.fillRect(0, 0, 1024, 1024);
    [[500, '#d6aa46', 10], [470, '#d6aa46', 3], [380, '#d6aa46', 3], [250, '#0d6b3c', 40], [250, '#d6aa46', 4]].forEach(([r, col, w]) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.arc(512, 512, r, 0, 7); c.stroke(); });
    c.translate(512, 512); for (let i = 0; i < 16; i++) { c.save(); c.rotate(i / 16 * TWO); c.fillStyle = i % 2 ? '#d6aa46' : '#0d6b3c'; c.beginPath(); c.moveTo(0, -250); c.lineTo(34, -340); c.lineTo(-34, -340); c.closePath(); c.fill(); c.restore(); }
    c.fillStyle = '#d6aa46'; c.font = '120px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('♠ ♥', 0, -20); c.fillText('♦ ♣', 0, 90);
  });
  const rug = mesh(new T.CircleGeometry(12, 64), new T.MeshStandardMaterial({ map: rugTex, roughness: 1, color: '#9a8a7c' }), 0, .02, -2, g); rug.rotation.x = -Math.PI / 2;

  // ----- Paredes: papel pintado burdeos, zócalo de madera y dorados -----
  const damask = canvasTex(512, 512, (c) => {
    c.fillStyle = '#4a0b1c'; c.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      c.save(); c.translate(128 + i * 256, 128 + j * 256); c.fillStyle = '#5e1226'; c.strokeStyle = 'rgba(214,170,70,.55)'; c.lineWidth = 2.5;
      for (let k = 0; k < 8; k++) { c.rotate(Math.PI / 4); c.beginPath(); c.ellipse(0, -52, 17, 46, 0, 0, 7); c.fill(); c.stroke(); }
      c.beginPath(); c.arc(0, 0, 14, 0, 7); c.fillStyle = 'rgba(214,170,70,.7)'; c.fill(); c.restore();
    }
  }); damask.wrapS = damask.wrapT = T.RepeatWrapping; damask.repeat.set(S / 5, 1.6);
  const wallMat = new T.MeshStandardMaterial({ map: damask, roughness: .75 });
  [[0, -HS, 0], [0, HS, Math.PI], [-HS, 0, Math.PI / 2], [HS, 0, -Math.PI / 2]].forEach(([x, z, ry]) => {
    mesh(new T.PlaneGeometry(S, H), wallMat, x, H / 2, z, g).rotation.y = ry;
    const dx = Math.sin(ry), dz = Math.cos(ry);
    const put = (geo, mat, off, y) => { const m = mesh(geo, mat, x + dx * off, y, z + dz * off, g); m.rotation.y = ry; return m; };
    put(new T.BoxGeometry(S, 2.4, .25), wood, .12, 1.2); put(new T.BoxGeometry(S, .14, .34), gold, .15, 2.45); put(new T.BoxGeometry(S, .5, .4), wood, .2, H - .25); put(new T.BoxGeometry(S, .08, .5), gold, .22, H - .55);
    for (let k = -5; k <= 5; k++) put(new T.BoxGeometry(.4, 2.4, .12), std('#1d0d06', { roughness: .4 }), .22, 1.2).position.add(new T.Vector3(dz * k * 5.4, 0, -dx * k * 5.4));
  });

  // ----- Techo artesonado y lámparas de araña -----
  const ceil = mesh(new T.PlaneGeometry(S, S), std('#1a0b07', { roughness: .8 }), 0, H, 0, g); ceil.rotation.x = Math.PI / 2;
  const beams = []; for (let k = -5; k <= 5; k++) { beams.push(mtx(k * 5.6, H - .2, 0)); }
  g.add(instanced(new T.BoxGeometry(.5, .4, S), wood, beams)); g.add(instanced(new T.BoxGeometry(S, .4, .5), wood, beams.map((_, i) => mtx(0, H - .22, (i - 5) * 5.6))));
  const chand = (x, z, big) => {
    const c = new T.Group(); c.position.set(x, H - (big ? 3.4 : 2.4), z); g.add(c);
    mesh(new T.CylinderGeometry(.04, .04, big ? 3.4 : 2.4, 6), gold, 0, (big ? 3.4 : 2.4) / 2, 0, c);
    const rs = big ? [2.4, 1.7, 1, .5] : [1.3, .8, .4];
    rs.forEach((r, i) => { const t = mesh(new T.TorusGeometry(r, .06, 8, 40), gold, 0, -i * .55, 0, c); t.rotation.x = Math.PI / 2; });
    const bs = []; for (let k = 0; k < (big ? 80 : 36); k++) { const a = k * 2.399, r = rs[k % rs.length]; bs.push(mtx(Math.cos(a) * r, -(k % rs.length) * .55 - .12 - (k % 5) * .06, Math.sin(a) * r)); }
    c.add(instanced(new T.OctahedronGeometry(big ? .13 : .1), new T.MeshBasicMaterial({ color: C('#ffe2a8').multiplyScalar(1.5), toneMapped: false }), bs));
    for (let k = 0; k < (big ? 10 : 6); k++) { const a = k / (big ? 10 : 6) * TWO; mesh(new T.CylinderGeometry(.03, .03, .22, 6), neonMat('#fff2c0', 2.5), Math.cos(a) * rs[0], .12, Math.sin(a) * rs[0], c); }
    const l = new T.PointLight('#ffc27a', big ? 2.2 : 1.1, big ? 34 : 20); l.position.y = -1; c.add(l);
    anim.push(t => { c.rotation.y = t * .08; });
  };
  chand(0, -14, true); chand(-19, -12); chand(19, -12); chand(-20, 6); chand(20, 6); chand(-12, 18); chand(0, 4, true);

  // ----- Mobiliario reutilizable -----
  const chairs = [];       // [x, z, ry]
  const chip = []; const chipCol = [];
  const CH = ['#d62839', '#1f8a4c', '#161616', '#2457d6', '#e0a830', '#7b2cbf'];
  const chipStack = (x, y, z, n, col) => { for (let i = 0; i < n; i++) { chip.push(mtx(x, y + i * .034, z)); chipCol.push(C(col)); } };
  const cardTex = {};
  const card = (face, red) => cardTex[face] || (cardTex[face] = canvasTex(128, 180, (c) => {
    c.fillStyle = '#fbf7ec'; rr(c, 4, 4, 120, 172, 14); c.fill(); c.strokeStyle = '#999'; c.lineWidth = 3; c.stroke();
    c.fillStyle = red ? '#c1121f' : '#111'; c.font = '700 54px serif'; c.textAlign = 'center'; c.fillText(face.slice(0, -1), 64, 70); c.font = '80px serif'; c.fillText(face.slice(-1), 64, 140);
  }));
  const putCard = (parent, x, y, z, ry, face, red) => { const m = mesh(new T.PlaneGeometry(.3, .42), new T.MeshStandardMaterial({ map: card(face, red), roughness: .6 }), x, y, z, parent); m.rotation.set(-Math.PI / 2, 0, ry); };
  const sign = (text, color, w, h, sub, x, y, z, ry = 0) => { const s = signPlane(text, color, w, h, sub); s.position.set(x, y, z); s.rotation.y = ry; g.add(s); return s; };
  const bsign = (...a) => { const m = sign(...a); billboards.push(m); return m; };
  const dealer = (x, z, ry, seed) => { const door = /^puerta/.test(seed), d = AV.createStaff(door ? 'doorman' : (seed === 'poker' || seed === 'bj1' ? 'croupier' : 'dealer'), seed); d.userData.deal = !door; d.position.set(x, 0, z); d.rotation.y = ry; g.add(d); npcs.push({ mesh: d, x, z, rot: ry, look: 'dealer' }); };
  const station = (id, x, z, r, emoji, name, desc, soon) => { stations.push({ id, x, z, r, emoji, name, desc, soon }); map.push({ x, z, e: emoji }); };
  const halo = (x, z, color) => { const l = new T.PointLight(color, 1.3, 13); l.position.set(x, 3.2, z); g.add(l); };

  // Dos mesas de blackjack
  [[-19, -12, Math.PI / 5 * 0], [19, -12, 0]].forEach(([x, z], i) => {
    const t = new T.Group(); t.position.set(x, 0, z); t.rotation.y = Math.atan2(-x, -z + 4) + Math.PI; g.add(t);   // el arco mira hacia el centro de la sala
    const sh = new T.Shape(); sh.absarc(0, 0, 2.7, 0, Math.PI, false); sh.lineTo(2.7, 0);
    const top = mesh(new T.ExtrudeGeometry(sh, { depth: .12, bevelEnabled: false, curveSegments: 40 }), green, 0, .86, 0, t); top.rotation.x = -Math.PI / 2;
    const base = mesh(new T.ExtrudeGeometry(sh, { depth: .86, bevelEnabled: false, curveSegments: 40 }), wood, 0, 0, 0, t); base.rotation.x = -Math.PI / 2; base.scale.set(.93, .93, 1);
    const rim = mesh(new T.TorusGeometry(2.74, .1, 8, 40, Math.PI), leather, 0, .93, 0, t); rim.rotation.x = Math.PI / 2; rim.rotation.z = Math.PI;
    const dec = mesh(new T.PlaneGeometry(5.1, 2.6), new T.MeshBasicMaterial({ transparent: true, toneMapped: false, map: canvasTex(1024, 512, (c) => {
      c.translate(512, 0); c.strokeStyle = '#e6c25a'; c.lineWidth = 6; c.beginPath(); c.arc(0, 0, 440, 0, Math.PI); c.stroke(); c.beginPath(); c.arc(0, 0, 270, 0, Math.PI); c.stroke();
      c.fillStyle = '#e6c25a'; c.font = '700 40px serif'; c.textAlign = 'center'; c.fillText('BLACKJACK PAGA 3 A 2', 0, 150);
      for (let k = 0; k < 5; k++) { const a = (k + .5) / 5 * Math.PI; c.beginPath(); c.arc(Math.cos(a) * 355, Math.sin(a) * 355, 40, 0, 7); c.stroke(); }
    }) }), 0, .995, -1.3, t); dec.rotation.x = -Math.PI / 2;
    for (let k = 0; k < 5; k++) {
      const a = (k + .5) / 5 * Math.PI, lx = Math.cos(a), lz = -Math.sin(a), p = new T.Vector3(lx, 0, lz).applyEuler(new T.Euler(0, t.rotation.y, 0));
      const q = new T.Vector3(lx * 1.9, 0, lz * 1.9).applyEuler(new T.Euler(0, t.rotation.y, 0));
      chipStack(x + q.x, .99, z + q.z, 2 + (k + i) % 4, CH[(k + i) % 6]);
      putCard(t, lx * 1.45, 1.0, lz * 1.45, .4 + k * .2, ['A♠', 'K♥', 'Q♦', 'J♣', '10♠'][k], k === 1 || k === 2);
      const cx = x + p.x * 3.45, cz = z + p.z * 3.45; chairs.push([cx, cz, Math.atan2(-p.x, -p.z)]);
    }
    const dp = new T.Vector3(0, 0, 1.2).applyEuler(new T.Euler(0, t.rotation.y, 0));
    dealer(x + dp.x, z + dp.z, t.rotation.y + Math.PI, 'bj' + i);
    circle(x, z, 1.9); halo(x, z, '#ffb36b');
    station('bj' + i, x, z, 5.8, '🃏', 'Blackjack', 'Mesa con crupier', 'próximamente podrás jugar aquí 🚧');
    bsign('BLACKJACK', '#e6c25a', 4.6, 1.2, 'mesa ' + (i + 1), x, 5.6, z);
  });

  // Póquer (mesa ovalada, 8 sillas)
  { const px = 0, pz = -16, t = new T.Group(); t.position.set(px, 0, pz); g.add(t);
    const top = mesh(new T.CylinderGeometry(1, 1, .14, 48), green, 0, .9, 0, t); top.scale.set(3.4, 1, 1.9);
    const base = mesh(new T.CylinderGeometry(.93, .85, .86, 32), wood, 0, .43, 0, t); base.scale.set(3.4, 1, 1.9);
    const rim = mesh(new T.TorusGeometry(1, .06, 8, 48), leather, 0, .98, 0, t); rim.rotation.x = Math.PI / 2; rim.scale.set(3.4, 1.9, 1); mesh(new T.TorusGeometry(1, .015, 6, 48), goldBright, 0, 1.05, 0, t).rotation.x = Math.PI / 2;
    t.children[t.children.length - 1].scale.set(3.3, 1.85, 1);
    for (let k = 0; k < 5; k++) putCard(t, (k - 2) * .38, 1.0, 0, 0, ['A♥', 'K♠', 'Q♥', 'J♠', '10♥'][k], k % 2 === 0);
    for (let k = 0; k < 8; k++) { const a = k / 8 * TWO + .4, lx = Math.cos(a) * 3.35, lz = Math.sin(a) * 1.9; chairs.push([px + lx * 1.05, pz + lz * 1.12, Math.atan2(-lx, -lz)]); chipStack(px + lx * .72, 1.0, pz + lz * .72, 3 + k % 3, CH[k % 6]); putCard(t, lx * .5, 1.0, lz * .5, a, ['A♠', '9♦', 'K♣', '7♥'][k % 4], k % 4 === 1 || k % 4 === 3); }
    dealer(px, pz + 2.3, Math.PI, 'poker');
    circle(px - 1.8, pz, 1.3); circle(px, pz, 1.5); circle(px + 1.8, pz, 1.3); halo(px, pz, '#7bffb0');
    station('poker', px, pz, 6.4, '♠️', 'Póquer', 'Mesa de Texas Hold\'em', 'próximamente podrás jugar aquí 🚧');
    bsign('PÓQUER', '#6dffb0', 4.6, 1.2, 'Texas Hold\'em', px, 5.8, pz); }

  // Ruleta (mesa con la rueda en un extremo)
  { const rx = -21, rz = 3, t = new T.Group(); t.position.set(rx, 0, rz); t.rotation.y = Math.PI / 2; g.add(t);
    mesh(new T.BoxGeometry(5.2, .9, 2), wood, 0, .45, 0, t); mesh(new T.BoxGeometry(5.2, .12, 2), green, 0, .93, 0, t); mesh(new T.BoxGeometry(5.4, .1, 2.2), leather, 0, .85, 0, t);
    mesh(new T.PlaneGeometry(3.2, 1.7), new T.MeshBasicMaterial({ transparent: true, toneMapped: false, map: canvasTex(768, 400, (c) => {
      c.strokeStyle = '#e6c25a'; c.lineWidth = 4; c.font = '700 34px Inter'; c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
      for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) { const x = 70 + i * 52, y = 80 + j * 80; c.strokeRect(x - 26, y - 38, 52, 76); const n = i * 3 + (3 - j); c.fillStyle = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(n) ? '#ff5a6a' : '#fff'; c.fillText(n, x, y); }
      c.fillStyle = '#4dffa0'; c.fillText('0', 36, 200);
    }) }), .7, 1.0, 0, t).rotation.x = -Math.PI / 2;
    const bowl = mesh(new T.CylinderGeometry(.82, .7, .22, 40), wood, -1.8, 1.05, 0, t);
    const rt = mesh(new T.CircleGeometry(.7, 40), new T.MeshBasicMaterial({ map: rouletteTex(), toneMapped: false }), -1.8, 1.17, 0, t); rt.rotation.x = -Math.PI / 2;
    const rim2 = mesh(new T.TorusGeometry(.78, .05, 8, 40), gold, -1.8, 1.17, 0, t); rim2.rotation.x = Math.PI / 2;
    anim.push(tm => { rt.rotation.z = tm * .8; });
    [-1, 1].forEach(s => chairs.push([rx + 1.9, rz + s * 1.0, -Math.PI / 2]));
    for (let k = 0; k < 9; k++) chipStack(rx + (k % 3 - 1) * .5 - .0, 1.0, rz - 0.4 + Math.floor(k / 3) * .55 - .4, 1 + k % 4, CH[k % 6]);
    dealer(rx - 1.1, rz, Math.PI / 2, 'ruleta');
    circle(rx, rz - 1.5, 1.4); circle(rx, rz, 1.4); circle(rx, rz + 1.5, 1.4); halo(rx + 1, rz, '#ff6a8a');
    station('ruleta', rx, rz, 6, '🎡', 'Ruleta', 'Ruleta europea', 'próximamente podrás jugar aquí 🚧');
    bsign('RULETA', '#ff5a7a', 4, 1.2, 'rojo · negro · pleno', rx - 1, 5.2, rz); }

  // Billares (2 mesas, lámpara colgante luminosa)
  [[21, 1], [21, 10]].forEach(([bx, bz], i) => {
    const t = new T.Group(); t.position.set(bx, 0, bz); t.rotation.y = Math.PI / 2; g.add(t);
    mesh(new T.BoxGeometry(3.4, .12, 1.9), wood, 0, .88, 0, t); mesh(new T.BoxGeometry(2.9, .06, 1.4), std('#0a5c46', { roughness: .95 }), 0, .93, 0, t);
    mesh(new T.BoxGeometry(3.1, .8, 1.6), wood, 0, .4, 0, t);
    [[-1.6, .9], [1.6, .9], [-1.6, -.9], [1.6, -.9], [0, .9], [0, -.9]].forEach(([x, z]) => mesh(new T.CylinderGeometry(.09, .09, .02, 12), std('#050505'), x * .97, .965, z * .97, t));
    const bc = ['#f6e52f', '#2457d6', '#d62839', '#7b2cbf', '#ff7a1a', '#1f8a4c', '#8a1c1c', '#111', '#f6e52f', '#2457d6', '#d62839', '#7b2cbf', '#ff7a1a', '#1f8a4c', '#8a1c1c'];
    let n = 0; for (let r = 0; r < 5; r++) for (let k = 0; k <= r; k++) mesh(new T.SphereGeometry(.057, 14, 10), std(bc[n++ % 15], { roughness: .2, metalness: .1 }), .7 + r * .1, .995, (k - r / 2) * .115, t);
    mesh(new T.SphereGeometry(.057, 14, 10), std('#fff', { roughness: .2 }), -.8, .995, .1, t);
    for (let k = 0; k < 2; k++) { const cue = mesh(new T.CylinderGeometry(.012, .02, 1.5, 8), std('#b78a4a', { roughness: .4 }), 0, .75, 0, t); cue.position.set(-2.1 + k * .15, .75, 1.3 - k * .1); cue.rotation.z = .12; }
    const lamp = mesh(new T.BoxGeometry(2.8, .18, .5), neonMat('#fff0c0', 1.4), 0, 3.3, 0, t); mesh(new T.BoxGeometry(2.9, .06, .6), gold, 0, 3.45, 0, t);
    [-1.2, 1.2].forEach(x => mesh(new T.CylinderGeometry(.01, .01, 1.5, 4), gold, x, 4.2, 0, t));
    const lg = new T.PointLight('#fff0c8', 1.1, 12); lg.position.set(bx, 3, bz); g.add(lg);
    circle(bx, bz - 1.3, 1.1); circle(bx, bz, 1.1); circle(bx, bz + 1.3, 1.1);
    if (i === 0) { station('billar', bx, bz + 4.5, 7.5, '🎱', 'Billar', 'Dos mesas de billar americano', 'próximamente podrás jugar aquí 🚧'); bsign('BILLAR', '#ffe9b0', 3.8, 1.1, 'americano', bx + 1, 5.4, bz + 4.5); }
  });

  // Bingo: jaula giratoria, bolas, pantalla grande y mesas con sillas
  { const bx = -18, bz = 18, t = new T.Group(); t.position.set(bx, 0, bz); g.add(t);
    mesh(new T.CylinderGeometry(1.5, 1.7, .5, 32), wood, 0, .25, 0, t); const tr = mesh(new T.TorusGeometry(1.55, .06, 8, 32), gold, 0, .52, 0, t); tr.rotation.x = Math.PI / 2;
    mesh(new T.CylinderGeometry(.12, .12, 1.4, 12), gold, 0, 1.2, 0, t);
    const cage = new T.Group(); cage.position.y = 2.2; t.add(cage);
    mesh(new T.SphereGeometry(.85, 24, 16), new T.MeshStandardMaterial({ color: '#cfe8ff', transparent: true, opacity: .16, roughness: .05, depthWrite: false }), 0, 0, 0, cage);
    [0, 1, 2].forEach(k => { const r = mesh(new T.TorusGeometry(.85, .02, 6, 32), goldBright, 0, 0, 0, cage); r.rotation.set(k * Math.PI / 3, k * Math.PI / 3, 0); });
    const balls = []; for (let k = 0; k < 28; k++) balls.push(mtx((Math.random() - .5) * 1, (Math.random() - .5) * 1, (Math.random() - .5) * 1));
    const bcol = []; for (let k = 0; k < 28; k++) bcol.push(new T.Color().setHSL(k / 28, .85, .55));
    cage.add(instanced(new T.SphereGeometry(.11, 12, 8), new T.MeshStandardMaterial({ roughness: .3 }), balls, bcol));
    anim.push(tm => { cage.rotation.y = tm * .9; cage.rotation.x = tm * .4; });
    const bs = liveScreenBingo(); bs.position.set(-HS + .3, 6, 18); bs.rotation.y = Math.PI / 2; g.add(bs); screens.push(bs);
    mesh(new T.BoxGeometry(11.4, 5.4, .2), gold, -HS + .22, 6, 18, g).material = gold;
    for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) {
      const tx = -9 + k * 5.2, tz = 15 + r * 5.4, tt = new T.Group(); tt.position.set(tx, 0, tz); g.add(tt);
      mesh(new T.CylinderGeometry(.9, .9, .08, 24), wood, 0, .8, 0, tt); mesh(new T.CylinderGeometry(.08, .08, .8, 8), gold, 0, .4, 0, tt);
      mesh(new T.PlaneGeometry(.55, .75), new T.MeshBasicMaterial({ map: canvasTex(128, 160, (c) => { c.fillStyle = '#fff6d8'; c.fillRect(0, 0, 128, 160); c.fillStyle = '#c1121f'; for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { c.strokeRect(6 + i * 23, 10 + j * 28, 23, 28); if ((i * 7 + j * 3 + k) % 5 === 0) { c.beginPath(); c.arc(17 + i * 23, 24 + j * 28, 8, 0, 7); c.fill(); } } }), toneMapped: false }), .15, .86, .1, tt).rotation.x = -Math.PI / 2;
      for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2 + .6; chairs.push([tx + Math.cos(a) * 1.5, tz + Math.sin(a) * 1.5, Math.atan2(-Math.cos(a), -Math.sin(a))]); }
      circle(tx, tz, 1.0);
    }
    dealer(bx + 2.2, bz, -Math.PI / 2, 'bingo'); circle(bx, bz, 1.7); halo(bx, bz, '#ffd23f'); halo(-9, 18, '#ff9ad0');
    station('bingo', bx + 5, bz, 10, '🎲', 'Bingo', 'Pantalla gigante y 6 mesas', 'próximamente podrás jugar aquí 🚧');
    bsign('BINGO', '#ffd23f', 3.6, 1.1, '¡línea y bingo!', bx, 5.2, bz); }
  function liveScreenBingo() {
    return world.shared.liveScreen(11, 5, 768, (c, w, h, t) => {
      c.fillStyle = '#12082a'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffd23f'; c.font = `${h * .13}px Bungee, Impact`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('BINGO UAB', w / 2, h * .09);
      const called = Math.floor(t / 1.6) % 75, cw = w / 15, ch = (h - 120) / 5.6;
      for (let r = 0; r < 5; r++) for (let k = 0; k < 15; k++) {
        const n = r * 15 + k + 1, on = ((n * 37) % 75) <= called; c.fillStyle = on ? ['#e8182b', '#2457d6', '#e0a830', '#1f8a4c', '#7b2cbf'][r] : '#241446'; rr(c, k * cw + 4, 70 + r * ch, cw - 8, ch - 8, 8); c.fill();
        c.fillStyle = on ? '#fff' : '#6a5a90'; c.font = `700 ${ch * .42}px Inter`; c.fillText(n, k * cw + cw / 2, 70 + r * ch + ch / 2 - 3);
      }
      c.fillStyle = '#fff'; c.font = `${h * .1}px Bungee, Impact`; c.fillText('Última bola: ' + (((called * 37) % 75) + 1 || 1), w / 2, h * .94);
    });
  }

  // ----- Sillas e instancias de fichas -----
  const seat = new T.BoxGeometry(.56, .1, .56); seat.translate(0, .55, 0); const back = new T.BoxGeometry(.56, .65, .1); back.translate(0, .93, -.28); const ped = new T.CylinderGeometry(.05, .05, .5, 6); ped.translate(0, .27, 0);
  const cm = chairs.map(([x, z, ry]) => mtx(x, 0, z, ry));
  g.add(instanced(seat, leather, cm), instanced(back, leather, cm), instanced(ped, gold, cm));
  g.add(instanced(new T.CylinderGeometry(.1, .1, .03, 14), new T.MeshStandardMaterial({ roughness: .4 }), chip, chipCol));

  // ----- Columnas verdes con capitel dorado, cuadros, apliques, plantas y cordones -----
  [-1, 1].forEach(sx => [-22, -8, 8, 22].forEach(z => {
    const c = new T.Group(); c.position.set(sx * 26.5, 0, z); g.add(c);
    mesh(new T.CylinderGeometry(.5, .56, H - .4, 24), std('#0b3b2a', { roughness: .2, metalness: .3 }), 0, H / 2, 0, c);
    [.2, H - .4].forEach(y => mesh(new T.CylinderGeometry(.78, .78, .4, 24), gold, 0, y, 0, c)); [2.2, 5, 8].forEach(y => { mesh(new T.TorusGeometry(.55, .06, 8, 24), gold, 0, y, 0, c).rotation.x = Math.PI / 2; });
    circle(sx * 26.5, z, .75);
    const sc = new T.Group(); sc.position.set(sx * -.62, 3.6, 0); c.add(sc); mesh(new T.SphereGeometry(.14, 12, 10), neonMat('#ffd9a0', 2), 0, 0, 0, sc); mesh(new T.CylinderGeometry(.12, .06, .26, 10), gold, 0, -.2, 0, sc);
  }));
  const paint = (x, z, ry, txt, col) => {
    const p = new T.Group(); p.position.set(x, 5.4, z); p.rotation.y = ry; g.add(p);
    mesh(new T.BoxGeometry(3.4, 4.2, .12), gold, 0, 0, 0, p);
    mesh(new T.PlaneGeometry(3, 3.8), new T.MeshStandardMaterial({ roughness: .6, map: canvasTex(300, 380, (c) => { const gr = c.createLinearGradient(0, 0, 300, 380); gr.addColorStop(0, col); gr.addColorStop(1, '#0a0a14'); c.fillStyle = gr; c.fillRect(0, 0, 300, 380); c.fillStyle = '#fbf7ec'; rr(c, 60, 50, 180, 280, 18); c.fill(); c.fillStyle = col; c.font = '700 90px serif'; c.textAlign = 'center'; c.fillText(txt.slice(0, -1), 150, 160); c.font = '130px serif'; c.fillText(txt.slice(-1), 150, 280); }) }), 0, 0, .07, p);
    const l = mesh(new T.BoxGeometry(2, .06, .12), neonMat('#ffe2a0', 1.6), 0, 2.25, .2, p);
  };
  paint(-HS + .2, -12, Math.PI / 2, 'A♠', '#7b2cbf'); paint(-HS + .2, -2, Math.PI / 2, 'K♥', '#c1121f'); paint(HS - .2, -14, -Math.PI / 2, 'Q♦', '#e0a830'); paint(HS - .2, 20, -Math.PI / 2, 'J♣', '#1f8a4c'); paint(-9, -HS + .2, 0, 'A♥', '#c1121f'); paint(9, -HS + .2, 0, '10♠', '#2457d6');
  [[-24, -24], [24, -24], [-24, 26], [24, 26]].forEach(([x, z]) => {
    mesh(new T.CylinderGeometry(.5, .4, .7, 16), std('#7a4a1a', { roughness: .5 }), x, .35, z, g);
    for (let k = 0; k < 9; k++) mesh(new T.SphereGeometry(.55 + (k % 3) * .12, 10, 8), std(['#1f6a35', '#2b8a46', '#175a2a'][k % 3], { roughness: .9 }), x + Math.cos(k * 2.4) * .5, 1.3 + (k % 4) * .35, z + Math.sin(k * 2.4) * .5, g);
    circle(x, z, .7);
  });

  // ----- Ascensor de vuelta a la sala principal (pared sur) -----
  const ex = new T.Group(); ex.position.set(0, 0, HS); g.add(ex);
  mesh(new T.BoxGeometry(5.4, 5.2, .3), gold, 0, 2.6, -.15, ex); mesh(new T.PlaneGeometry(4.4, 4.6), neonMat('#ffe0a0', .55), 0, 2.45, -.32, ex).rotation.y = Math.PI;
  [-1, 1].forEach(s => mesh(new T.BoxGeometry(2.1, 4.4, .12), goldBright, s * 1.1, 2.4, -.36, ex));
  const exitSign = signPlane('SALA PRINCIPAL', '#ffb703', 6.4, 1.3, 'ascensor · volver al casino de neón'); exitSign.position.set(0, 6.4, -.6); exitSign.rotation.y = Math.PI; ex.add(exitSign);
  [-4, 4].forEach(x => { mesh(new T.CylinderGeometry(.06, .06, 1, 8), gold, x, .5, -3, ex); mesh(new T.SphereGeometry(.12, 10, 8), gold, x, 1.05, -3, ex); });
  mesh(new T.TorusGeometry(2, .02, 6, 20, Math.PI), std('#a01028'), 0, .85, -3, ex).rotation.z = Math.PI;
  dealer(-6, HS - 2, Math.PI, 'puerta1'); dealer(6, HS - 2, Math.PI, 'puerta2');
  sign('CASINO CLÁSICO', '#e6c25a', 10, 2.2, 'blackjack · póquer · ruleta · billar · bingo', 0, 7.3, -HS + .6);
  anim.push(() => {});
  world.rooms.classic.group = g;
};
