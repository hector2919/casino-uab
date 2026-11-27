// 🏛️ Mundo 3D del casino: sala principal estilo Las Vegas (neón, dorados, suelo pulido, ruleta gigante).
// La sala del casino clásico está en classic.js. Unidades: 1 unidad 3D = 1 metro (el servidor usa 16 unidades por metro).
const World = (() => {
  const T = THREE, U = 16, H = 15;
  const C = c => new T.Color(c);
  const neonMat = (c, k = 1.8) => new T.MeshBasicMaterial({ color: C(c).multiplyScalar(k), toneMapped: false });
  const std = (c, o = {}) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: .5, metalness: 0 }, o));
  const canvasTex = (w, h, draw, srgb = true) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c); if (srgb) t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t;
  };
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const mtx = (x, y, z, ry = 0, sx = 1, sy = 1, sz = 1) => new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(0, ry, 0)), new T.Vector3(sx, sy, sz));
  function instanced(geo, mat, mats, colors) {
    const im = new T.InstancedMesh(geo, mat, mats.length);
    mats.forEach((m, i) => im.setMatrixAt(i, m));
    if (colors) colors.forEach((c, i) => im.setColorAt(i, c));
    im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; return im;
  }
  const mesh = (geo, mat, x = 0, y = 0, z = 0, parent) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); if (parent) parent.add(m); return m; };
  const m3 = (x, y) => ({ x: (x - 500) / U, z: (y - 500) / U });

  // Cartel de neón con marco (plano físico)
  function signPlane(text, color, w, h, sub) {
    const tx = canvasTex(1024, Math.round(1024 * h / w), (g, cw, ch) => {
      rr(g, 14, 14, cw - 28, ch - 28, 38); g.fillStyle = 'rgba(8,4,22,.88)'; g.fill();
      g.lineWidth = 10; g.strokeStyle = color; g.shadowColor = color; g.shadowBlur = 34; g.stroke();
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.shadowBlur = 26;
      g.font = `${ch * (sub ? .44 : .54)}px Bungee, Impact, sans-serif`; g.fillText(text, cw / 2, ch * (sub ? .42 : .52));
      if (sub) { g.font = `700 ${ch * .17}px Inter, sans-serif`; g.shadowBlur = 12; g.fillStyle = color; g.fillText(sub, cw / 2, ch * .77); }
    });
    return new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tx, transparent: true, toneMapped: false, side: T.DoubleSide, depthWrite: false }));
  }
  // Haz de luz (cono aditivo)
  const beamTex = canvasTex(8, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, false);
  function beam(color, rTop, rBot, h, op = .16) {
    const m = new T.Mesh(new T.CylinderGeometry(rTop, rBot, h, 40, 1, true), new T.MeshBasicMaterial({ map: beamTex, color: C(color), transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
    return m;
  }
  // Pantalla animada (se redibuja unas veces por segundo)
  function liveScreen(w, h, px, draw) {
    const cv = document.createElement('canvas'); cv.width = px; cv.height = Math.round(px * h / w);
    const ctx2 = cv.getContext('2d'); const tx = new T.CanvasTexture(cv); tx.encoding = T.sRGBEncoding;
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tx, toneMapped: false }));
    let last = -1;
    m.userData.upd = t => { if (t - last < .12) return; last = t; draw(ctx2, cv.width, cv.height, t); tx.needsUpdate = true; };
    return m;
  }

  const ROUL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const rouletteTex = () => canvasTex(1024, 1024, (g) => {
    g.translate(512, 512);
    const bg = g.createRadialGradient(0, 0, 0, 0, 0, 512); bg.addColorStop(0, '#2a0f55'); bg.addColorStop(1, '#0a0420'); g.fillStyle = bg; g.beginPath(); g.arc(0, 0, 512, 0, 7); g.fill();
    const n = ROUL.length, a = Math.PI * 2 / n;
    ROUL.forEach((v, i) => {
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 470, i * a - a / 2, i * a + a / 2); g.closePath();
      g.fillStyle = v === 0 ? '#0fa958' : RED.has(v) ? '#d1122f' : '#0c0c14'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#ffd77a'; g.stroke();
      g.save(); g.rotate(i * a); g.translate(420, 0); g.rotate(Math.PI / 2); g.fillStyle = '#fff'; g.font = '700 38px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(v, 0, 0); g.restore();
    });
    g.fillStyle = '#12082a'; g.beginPath(); g.arc(0, 0, 330, 0, 7); g.fill();
    [[330, '#ffd77a', 8], [300, '#ff3ea5', 5], [230, '#2de2ff', 4], [150, '#ffd77a', 6]].forEach(([r, c, w]) => { g.strokeStyle = c; g.lineWidth = w; g.shadowColor = c; g.shadowBlur = 18; g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); });
    g.shadowBlur = 0; g.strokeStyle = '#ffd77a88'; g.lineWidth = 3;
    for (let i = 0; i < 8; i++) { g.save(); g.rotate(i * Math.PI / 4); g.beginPath(); g.moveTo(0, 0); g.lineTo(330, 0); g.stroke(); g.restore(); }
    const hub = g.createRadialGradient(-20, -20, 5, 0, 0, 90); hub.addColorStop(0, '#fff6c8'); hub.addColorStop(1, '#c8921a'); g.fillStyle = hub; g.beginPath(); g.arc(0, 0, 90, 0, 7); g.fill();
  });

  // ---------- Suelo pintado: moqueta oscura con curvas doradas y los círculos de cada juego ----------
  function paintFloor(g, N, S, CFG) {
    const ppm = N / S, P = v => (v / S + .5) * N;
    const bg = g.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N * .72);
    bg.addColorStop(0, '#1d1044'); bg.addColorStop(.5, '#0d0824'); bg.addColorStop(1, '#05030f'); g.fillStyle = bg; g.fillRect(0, 0, N, N);
    g.lineCap = 'round';
    for (let i = 0; i < 160; i++) {   // vetas de mármol
      g.strokeStyle = `rgba(190,160,255,${.025 + Math.random() * .05})`; g.lineWidth = .6 + Math.random() * 1.4; g.beginPath();
      const x = Math.random() * N, y = Math.random() * N; g.moveTo(x, y);
      g.bezierCurveTo(x + 200 * Math.random() - 100, y + 160, x + 260 * Math.random() - 130, y + 300, x + 320 * Math.random() - 160, y + 480 * Math.random()); g.stroke();
    }
    const neon = (c, w, blur, fn) => { g.save(); g.strokeStyle = c; g.lineWidth = w; g.shadowColor = c; g.shadowBlur = blur; fn(); g.restore(); };
    const cx = N / 2, cy = N / 2;
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; neon('rgba(226,176,74,.25)', 2, 0, () => { g.beginPath(); g.moveTo(cx + Math.cos(a) * 11 * ppm, cy + Math.sin(a) * 11 * ppm); g.lineTo(cx + Math.cos(a) * 41 * ppm, cy + Math.sin(a) * 41 * ppm); g.stroke(); }); }
    [[11.5, '#e2b04a', 5, 14], [14, '#ff3ea5', 4, 22], [26, '#a24bff', 4, 22], [30, '#2de2ff', 3, 16], [38, '#e2b04a', 4, 12]].forEach(([r, c, w, b]) =>
      neon(c, w, b, () => { g.beginPath(); g.arc(cx, cy, r * ppm, 0, 7); g.stroke(); }));
    // Pétalos curvos
    for (let i = 0; i < 12; i++) neon('rgba(162,75,255,.55)', 3, 18, () => { g.beginPath(); g.arc(cx + Math.cos(i * Math.PI / 6) * 20 * ppm, cy + Math.sin(i * Math.PI / 6) * 20 * ppm, 9 * ppm, 0, 7); g.stroke(); });
    // Círculos de los juegos
    const zr = CFG.zone / U * ppm;
    CFG.tables.forEach(tb => {
      const p = m3(tb.x, tb.y), x = P(p.x), y = P(p.z);
      const rg = g.createRadialGradient(x, y, 0, x, y, zr); rg.addColorStop(0, tb.color + 'aa'); rg.addColorStop(.7, tb.color + '33'); rg.addColorStop(1, tb.color + '00');
      g.fillStyle = rg; g.beginPath(); g.arc(x, y, zr * 1.1, 0, 7); g.fill();
      neon('#e2b04a', 7, 16, () => { g.beginPath(); g.arc(x, y, zr, 0, 7); g.stroke(); });
      neon(tb.color, 4, 22, () => { g.beginPath(); g.arc(x, y, zr * .8, 0, 7); g.setLineDash([22, 16]); g.stroke(); g.setLineDash([]); });
    });
    const zone = (x0, z0, c, r) => {   // zonas de tienda, arcade
      const x = P(x0), y = P(z0), rg = g.createRadialGradient(x, y, 0, x, y, r * ppm); rg.addColorStop(0, c + '88'); rg.addColorStop(1, c + '00');
      g.fillStyle = rg; g.beginPath(); g.arc(x, y, r * ppm, 0, 7); g.fill(); neon(c, 5, 16, () => { g.beginPath(); g.arc(x, y, r * ppm * .8, 0, 7); g.stroke(); });
    };
    const sp = m3(CFG.shopPos.x, CFG.shopPos.y); zone(sp.x, sp.z + 3, '#ff3ea5', 9);
    const ap = m3(CFG.arcadePos.x, CFG.arcadePos.y); zone(ap.x, ap.z, '#2de2ff', 7.5);
    const bp = m3(CFG.barPos.x, CFG.barPos.y); zone(bp.x, bp.z + 2, '#ffb703', 10);
    // Alfombra roja de la entrada, hasta la ruleta central
    const rx = P(-3), rw = 6 * ppm, ry0 = P(11), ry1 = P(S / 2);
    const rgd = g.createLinearGradient(0, ry0, 0, ry1); rgd.addColorStop(0, 'rgba(120,10,40,0)'); rgd.addColorStop(.3, '#6e0a26'); rgd.addColorStop(1, '#8e1034');
    g.fillStyle = rgd; g.fillRect(rx, ry0, rw, ry1 - ry0);
    neon('#e2b04a', 5, 10, () => { g.beginPath(); g.moveTo(rx + 12, ry0 + 40); g.lineTo(rx + 12, ry1); g.moveTo(rx + rw - 12, ry0 + 40); g.lineTo(rx + rw - 12, ry1); g.stroke(); });
  }

  // ---------- Construcción ----------
  function build(CFG, renderer) {
    const S = CFG.W / U, HS = S / 2;                 // 62,5 m
    const main = new T.Group(), colliders = { main: [], classic: [] }, anim = { main: [], classic: [] };
    const billboards = [], screens = [], npcs = { main: [], classic: [] }, reflectors = [];
    const gold = std('#e0a830', { metalness: 1, roughness: .28 }), goldBright = std('#ffd77a', { metalness: 1, roughness: .2 });
    const marble = std('#0a0818', { roughness: .18, metalness: .55 }), velvet = std('#5a1578', { roughness: .85 });
    const circle = (x, z, r) => colliders.main.push({ t: 'c', x, z, r });
    const box = (x0, x1, z0, z1) => colliders.main.push({ t: 'b', x0, x1, z0, z1 });

    // Entorno para reflejos metálicos (luces de neón de colores)
    const envScene = new T.Scene(); envScene.background = C('#0a0618');
    [[60, 1, 6, 0, 12, 0, '#ff3ea5', 7], [6, 1, 60, 0, 12, 0, '#2de2ff', 7], [40, .6, 40, 0, 14, 0, '#a24bff', 3], [1, 12, 30, -25, 3, 0, '#ffb703', 4], [1, 12, 30, 25, 3, 0, '#a24bff', 4], [30, 12, 1, 0, 3, -25, '#2de2ff', 3], [30, 12, 1, 0, 3, 25, '#ff3ea5', 3]]
      .forEach(([w, h, d, x, y, z, c, k]) => { const e = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshBasicMaterial({ color: C(c).multiplyScalar(k * .45) })); e.position.set(x, y, z); envScene.add(e); });
    const pm = new T.PMREMGenerator(renderer); const env = pm.fromScene(envScene, .02).texture; pm.dispose();

    // ----- Suelo: reflector + moqueta pulida semitransparente -----
    const N = 2048, floorTex = canvasTex(N, N, (g) => paintFloor(g, N, S, CFG)); floorTex.anisotropy = 8;
    const floorMat = new T.MeshStandardMaterial({ map: floorTex, roughness: .36, metalness: .35, transparent: true, opacity: .84, envMapIntensity: .8 });
    const floor = mesh(new T.PlaneGeometry(S, S), floorMat, 0, 0, 0, main); floor.rotation.x = -Math.PI / 2;
    let reflector = null;
    if (window.FX && FX.Reflector) {
      reflector = new FX.Reflector(new T.PlaneGeometry(S, S), { textureWidth: 1024, textureHeight: 1024, color: 0x6f64b8, clipBias: .003, multisample: 0 });
      reflector.rotation.x = -Math.PI / 2; reflector.position.y = -.01; main.add(reflector); reflectors.push({ r: reflector, mat: floorMat });
    }

    // ----- Paredes -----
    const wallTex = canvasTex(512, 512, (g) => {
      g.fillStyle = '#150b30'; g.fillRect(0, 0, 512, 512);
      for (let x = 0; x < 512; x += 128) { g.fillStyle = '#1d1042'; rr(g, x + 10, 10, 108, 492, 54); g.fill(); g.strokeStyle = 'rgba(226,176,74,.55)'; g.lineWidth = 3; g.stroke(); }
      for (let i = 0; i < 800; i++) { g.fillStyle = `rgba(200,170,255,${Math.random() * .05})`; g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); }
    }); wallTex.wrapS = wallTex.wrapT = T.RepeatWrapping; wallTex.repeat.set(S / 8, 1);
    const wallMat = new T.MeshStandardMaterial({ map: wallTex, roughness: .6, metalness: .2 });
    [[0, -HS, 0], [0, HS, Math.PI], [-HS, 0, Math.PI / 2], [HS, 0, -Math.PI / 2]].forEach(([x, z, ry], i) => {
      const w = mesh(new T.PlaneGeometry(S, H), wallMat, x, H / 2, z, main); w.rotation.y = ry;
      const dir = new T.Vector3(Math.sin(ry), 0, Math.cos(ry));     // hacia el interior de la sala
      const put = (geo, mat, off, y, along = 0) => { const m = mesh(geo, mat, x + dir.x * off + dir.z * along, y, z + dir.z * off - dir.x * along, main); m.rotation.y = ry; return m; };
      put(new T.BoxGeometry(S, .5, .3), gold, .15, .25);
      put(new T.BoxGeometry(S, .22, .26), gold, .13, 5.2);
      put(new T.BoxGeometry(S, .6, .5), gold, .25, H - .3);
      put(new T.BoxGeometry(S, .1, .1), neonMat(i % 2 ? '#2de2ff' : '#ff3ea5'), .32, H - .75);
      for (let k = -4; k <= 4; k++) put(new T.BoxGeometry(.12, H - 2, .12), neonMat(k % 2 ? '#a24bff' : '#2de2ff', 1.5), .18, H / 2, k * 6.25 + 3.1);
    });

    // Pantallas LED gigantes con animación
    const jackpot = (g, w, h, t) => {
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#1a0638'); gr.addColorStop(1, '#4a0a50'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = `hsl(${(t * 60) % 360},90%,62%)`; g.font = `${h * .3}px Bungee, Impact`; g.shadowColor = g.fillStyle; g.shadowBlur = 24; g.fillText('JACKPOT', w / 2, h * .3);
      g.fillStyle = '#ffd77a'; g.font = `${h * .24}px Bungee, Impact`; g.fillText('🪙 ' + (1284730 + Math.floor(t * 37)).toLocaleString('es-ES'), w / 2, h * .62);
      g.shadowBlur = 0; g.fillStyle = '#fff'; g.font = `700 ${h * .09}px Inter`;
      const txt = '   ★ CASINO UAB ★ 6 MINIJUEGOS ★ BAR ★ TIENDA VIP ★ CASINO CLÁSICO ★   '; const off = (t * 90) % (w * 1.5);
      g.fillText(txt + txt, w * .5 - off + w * .5, h * .9);
      for (let i = 0; i < 28; i++) { g.fillStyle = (Math.floor(t * 4) + i) % 3 ? '#4a3a00' : '#ffe08a'; g.beginPath(); g.arc(14 + i * (w - 28) / 27, 10, 5, 0, 7); g.arc(14 + i * (w - 28) / 27, h - 10, 5, 0, 7); g.fill(); }
    };
    [[-HS + .2, 9, 4, Math.PI / 2, 12, 4.5], [HS - .2, 9, -4, -Math.PI / 2, 12, 4.5], [0, 9.5, HS - .2, Math.PI, 14, 4.5]].forEach(([x, y, z, ry, w, h]) => {
      const s = liveScreen(w, h, 768, jackpot); s.position.set(x, y, z); s.rotation.y = ry; main.add(s); screens.push(s);
      const fr = mesh(new T.BoxGeometry(w + .5, h + .5, .12), gold, x, y, z, main); fr.rotation.y = ry; fr.position.x -= Math.sin(ry) * .07; fr.position.z -= Math.cos(ry) * .07;
    });

    // ----- Techo -----
    const ceil = mesh(new T.PlaneGeometry(S, S), std('#0a0618', { roughness: .8 }), 0, H, 0, main); ceil.rotation.x = Math.PI / 2;
    [[26, '#a24bff'], [21, '#ff3ea5'], [16.5, '#2de2ff'], [31, '#ffb703']].forEach(([r, c], i) => {
      const ring = mesh(new T.TorusGeometry(r, .16, 10, 96), neonMat(c, 1.9), 0, H - .35, 0, main); ring.rotation.x = Math.PI / 2;
      anim.main.push(t => { ring.material.color.copy(C(c)).multiplyScalar(1.5 + Math.sin(t * 1.4 + i) * .5); });
    });
    const spots = [];   // luces empotradas
    for (let i = 0; i < 90; i++) { const a = Math.random() * 6.283, r = 4 + Math.random() * 29; spots.push(mtx(Math.cos(a) * r, H - .06, Math.sin(a) * r)); }
    const spotGeo = new T.CircleGeometry(.22, 10); spotGeo.rotateX(Math.PI / 2);
    main.add(instanced(spotGeo, neonMat('#ffe9b0', 1.4), spots));

    // ----- Columnas doradas -----
    [-1, 1].forEach(sx => [-22, -11, 11, 22].forEach(z => {
      const x = sx * 27.5, g = new T.Group(); g.position.set(x, 0, z); main.add(g);
      mesh(new T.CylinderGeometry(.55, .6, H, 24), marble, 0, H / 2, 0, g);
      [1.2, 6, 12].forEach(y => mesh(new T.TorusGeometry(.6, .1, 8, 24), gold, 0, y, 0, g).rotation.x = Math.PI / 2);
      mesh(new T.CylinderGeometry(.8, .8, .5, 24), gold, 0, .25, 0, g); mesh(new T.CylinderGeometry(.85, .62, .7, 24), gold, 0, H - .35, 0, g);
      mesh(new T.CylinderGeometry(.12, .12, H - 3, 8), neonMat(z > 0 ? '#2de2ff' : '#ff3ea5', 1.6), -sx * .56, H / 2, 0, g);
      circle(x, z, .8);
    }));

    // ----- Estructura central: ruleta gigante + tambor con ascensor al casino clásico -----
    const ctr = new T.Group(); main.add(ctr);
    const plat = mesh(new T.CylinderGeometry(10.4, 10.7, .14, 72), marble, 0, .07, 0, ctr); plat.material = std('#0b0820', { roughness: .15, metalness: .7 });
    mesh(new T.CylinderGeometry(9.5, 9.7, .22, 72), std('#150a34', { roughness: .2, metalness: .6 }), 0, .15, 0, ctr);
    [10.55, 9.6].forEach((r, i) => { const t = mesh(new T.TorusGeometry(r, .08, 8, 96), i ? neonMat('#a24bff', 1.7) : gold, 0, .27, 0, ctr); t.rotation.x = Math.PI / 2; });
    const GAP = .44, DR = 5.4, DH = 4.4, TWO = Math.PI * 2;
    // pared del tambor (con hueco hacia la entrada, +z)
    const drumMat = new T.MeshStandardMaterial({ color: '#12082e', roughness: .25, metalness: .6, side: T.DoubleSide });
    mesh(new T.CylinderGeometry(DR, DR, DH, 72, 1, true, GAP, TWO - GAP * 2), drumMat, 0, DH / 2 + .2, 0, ctr);
    const roof = mesh(new T.CylinderGeometry(DR + .35, DR + .35, .3, 72), std('#0d0826', { roughness: .3, metalness: .7 }), 0, DH + .35, 0, ctr);
    [DR + .35].forEach(r => { const t = mesh(new T.TorusGeometry(r, .12, 8, 96), gold, 0, DH + .5, 0, ctr); t.rotation.x = Math.PI / 2; });
    const pil = [], neonB = [], neonC = [];
    for (let i = 0; i < 48; i++) {
      const a = i / 48 * TWO + .02, dz = Math.atan2(Math.sin(a), Math.cos(a));
      const toGap = Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2)));   // la entrada está en +z
      if (toGap < GAP + .02) continue;
      const x = Math.cos(a) * (DR + .12), z = Math.sin(a) * (DR + .12);
      if (i % 3 === 0) pil.push(mtx(x, DH / 2 + .2, z, -a + Math.PI / 2));
      [1.3, 3.3].forEach((y, k) => { neonB.push(mtx(x, y + .2, z, -a + Math.PI / 2)); });
      if (i % 2 === 0) circle(Math.cos(a) * (DR + .3), Math.sin(a) * (DR + .3), .75);
    }
    main.add(instanced(new T.BoxGeometry(.4, DH, .3), gold, pil));
    const nb = instanced(new T.BoxGeometry(.8, .06, .06), neonMat('#ff3ea5', 1.9), neonB); main.add(nb);
    // marco de la puerta y rótulo
    [-1, 1].forEach(s => { mesh(new T.CylinderGeometry(.3, .3, DH + .1, 16), goldBright, s * 2.55, DH / 2 + .2, DR - .15, ctr); circle(s * 2.85, DR - .1, .5); });
    mesh(new T.BoxGeometry(5.6, .9, .5), gold, 0, DH - .1, DR - .1, ctr);
    mesh(new T.BoxGeometry(4.9, .08, .08), neonMat('#ffb703', 2), 0, DH - .65, DR + .18, ctr);
    const doorSign = signPlane('CASINO CLÁSICO', '#ffb703', 7.4, 1.7, 'ascensor · blackjack · póquer · billar · bingo'); doorSign.position.set(0, DH + 2.4, DR + .5); ctr.add(doorSign); billboards.push(doorSign);
    // interior: suelo, luz y ascensor dorado
    mesh(new T.CircleGeometry(DR - .1, 48), std('#2a0a1c', { roughness: .3, metalness: .5 }), 0, .27, 0, ctr).rotation.x = -Math.PI / 2;
    const lift = new T.Group(); lift.position.set(0, 0, -DR + .5); ctr.add(lift);
    mesh(new T.BoxGeometry(3.8, 3.6, .2), gold, 0, 2.1, -.05, lift);
    mesh(new T.PlaneGeometry(3.2, 3.2), neonMat('#ffd89a', .5), 0, 2.1, .08, lift);
    const doorL = mesh(new T.BoxGeometry(1.6, 3.2, .12), goldBright, -.8, 2.1, .16, lift), doorR = mesh(new T.BoxGeometry(1.6, 3.2, .12), goldBright, .8, 2.1, .16, lift);
    const arrow = signPlane('▲', '#ffb703', 1.4, 1, null); arrow.position.set(0, 4.15, .25); lift.add(arrow);
    anim.main.push(() => { const o = world.liftOpen || 0; doorL.position.x = -.8 - o * 1.55; doorR.position.x = .8 + o * 1.55; });
    const inLight = new T.PointLight('#ffb36b', 1.6, 14); inLight.position.set(0, 3.6, 0); ctr.add(inLight);
    // columna central y ruleta colgante
    const colm = mesh(new T.CylinderGeometry(.85, 1.15, H - DH - .5, 32), goldBright, 0, DH + .5 + (H - DH - .5) / 2, 0, ctr);
    [6.5, 9, 12.5].forEach(y => mesh(new T.TorusGeometry(1.0, .12, 8, 32), neonMat('#2de2ff', 1.9), 0, y, 0, ctr).rotation.x = Math.PI / 2);
    const wheel = new T.Group(); wheel.position.y = 9.4; ctr.add(wheel);
    const wface = mesh(new T.CircleGeometry(7.4, 96), new T.MeshBasicMaterial({ map: rouletteTex(), toneMapped: false }), 0, -.05, 0, wheel); wface.rotation.x = Math.PI / 2;
    const wtop = mesh(new T.CylinderGeometry(7.5, 7.5, .35, 96), std('#0b0620', { metalness: .8, roughness: .3 }), 0, .15, 0, wheel);
    const wr = mesh(new T.TorusGeometry(7.5, .3, 16, 96), gold, 0, -.05, 0, wheel); wr.rotation.x = Math.PI / 2;
    const wn = mesh(new T.TorusGeometry(6.2, .07, 8, 96), neonMat('#ff3ea5', 2.2), 0, -.12, 0, wheel); wn.rotation.x = Math.PI / 2;
    mesh(new T.SphereGeometry(1.25, 24, 16), goldBright, 0, -.35, 0, wheel).scale.y = .6;
    const ball = mesh(new T.SphereGeometry(.2, 12, 10), neonMat('#ffffff', 2.4), 6.9, -.28, 0, wheel);
    const gyro = [[8.8, '#a24bff', .45, .5], [9.9, '#2de2ff', -.35, .22], [11, '#ff3ea5', .28, -.3]].map(([r, c, sp, tilt]) => {
      const g = new T.Group(); g.position.y = 9.4; g.rotation.x = tilt; ctr.add(g);
      mesh(new T.TorusGeometry(r, .09, 8, 96), neonMat(c, 1.9), 0, 0, 0, g); g.userData.sp = sp; return g;
    });
    anim.main.push((t, dt) => { wheel.rotation.y += dt * .16; ball.position.set(Math.cos(-t * 1.6) * 6.9, -.28, Math.sin(-t * 1.6) * 6.9); gyro.forEach(g => g.rotation.y += g.userData.sp * dt); });
    // haces de luz desde el borde de la plataforma hacia la ruleta
    for (let i = 0; i < 10; i++) { const a = i / 10 * TWO, b = beam(['#ff3ea5', '#2de2ff', '#a24bff'][i % 3], .1, .5, 9.2, .22); b.position.set(Math.cos(a) * 9.4, 4.7, Math.sin(a) * 9.4); b.rotation.set(-Math.sin(a) * .62, 0, Math.cos(a) * .62); ctr.add(b); }
    const cLight = new T.PointLight('#c27bff', 2.2, 34); cLight.position.set(0, 8, 0); ctr.add(cLight);
    spots.door = { x: 0, z: 0, r: DR - .6 };

    // ----- Estaciones de juego (una por minijuego) -----
    const stationLights = [], tableSpots = {};
    const dais = (g, color) => {
      mesh(new T.CylinderGeometry(3.6, 3.8, .2, 48), std('#0c0824', { roughness: .15, metalness: .7 }), 0, .1, 0, g);
      const ring = mesh(new T.TorusGeometry(3.55, .07, 8, 64), neonMat(color, 1.9), 0, .22, 0, g); ring.rotation.x = Math.PI / 2;
      const rim = mesh(new T.TorusGeometry(3.75, .08, 8, 64), gold, 0, .2, 0, g); rim.rotation.x = Math.PI / 2;
    };
    const makers = {
      reflejos(g, tb) {          // semáforo gigante
        mesh(new T.CylinderGeometry(.14, .2, 3.4, 12), std('#15151c', { metalness: .8, roughness: .3 }), 0, 1.9, 0, g);
        mesh(new T.BoxGeometry(1.1, 2.7, .8), std('#15151c', { metalness: .6, roughness: .3 }), 0, 4.3, 0, g);
        const lamps = ['#ff2a2a', '#ffd23f', '#2dff6f'].map((c, i) => { const l = mesh(new T.SphereGeometry(.34, 20, 14), neonMat(c, .2), 0, 5.1 - i * .85, .42, g); l.userData.c = c; return l; });
        const back = mesh(new T.BoxGeometry(1.6, 3.2, .1), gold, 0, 4.3, -.45, g);
        anim.main.push(t => lamps.forEach((l, i) => { const on = Math.floor(t * .9) % 3 === i; l.material.color.copy(C(l.userData.c)).multiplyScalar(on ? 2.6 : .14); }));
        circle(tb.p.x, tb.p.z, 1.3);
      },
      clicks(g, tb) {            // pulsador gigante
        mesh(new T.CylinderGeometry(1.5, 1.8, .7, 32), std('#9aa0b5', { metalness: 1, roughness: .2 }), 0, .55, 0, g);
        const dome = mesh(new T.SphereGeometry(1.1, 32, 16, 0, TWO, 0, Math.PI / 2), neonMat('#ff2a3a', 1.5), 0, .9, 0, g); dome.scale.y = .8;
        const st = mesh(new T.TorusGeometry(1.5, .1, 8, 40), neonMat('#ffd23f', 1.7), 0, .88, 0, g); st.rotation.x = Math.PI / 2;
        const ic = AV.sprite('👊', 1.5); ic.position.y = 3; g.add(ic);
        anim.main.push(t => { const k = 1 + Math.sin(t * 5) * .05; dome.scale.set(k, .8 * k, k); dome.material.color.copy(C('#ff2a3a')).multiplyScalar(1.3 + Math.sin(t * 5) * .5); ic.position.y = 3 + Math.sin(t * 2) * .2; });
        circle(tb.p.x, tb.p.z, 1.9);
      },
      stop(g, tb) {              // cronómetro gigante
        mesh(new T.CylinderGeometry(.22, .4, 1.3, 12), gold, 0, .85, 0, g);
        const face = canvasTex(512, 512, (c) => {
          c.translate(256, 256); c.fillStyle = '#05061a'; c.beginPath(); c.arc(0, 0, 250, 0, 7); c.fill();
          c.strokeStyle = '#2de2ff'; c.lineWidth = 8; c.shadowColor = '#2de2ff'; c.shadowBlur = 20; c.beginPath(); c.arc(0, 0, 236, 0, 7); c.stroke(); c.shadowBlur = 0;
          for (let i = 0; i < 40; i++) { c.save(); c.rotate(i / 40 * TWO); c.fillStyle = i % 4 ? '#7a86c8' : '#fff'; c.fillRect(-2, -228, i % 4 ? 4 : 7, i % 4 ? 16 : 28); c.restore(); }
          c.fillStyle = '#ffd77a55'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 200, -Math.PI / 2 + 7.77 / 12 * TWO - .1, -Math.PI / 2 + 7.77 / 12 * TWO + .1); c.fill();
          c.fillStyle = '#ffd77a'; c.font = '700 54px Bungee, Impact'; c.textAlign = 'center'; c.fillText('7,77', 0, 100); c.font = '700 26px Inter'; c.fillStyle = '#2de2ff'; c.fillText('STOP', 0, -80);
        });
        const wg = new T.Group(); wg.position.y = 3; g.add(wg);
        mesh(new T.CylinderGeometry(1.7, 1.7, .5, 48), gold, 0, 0, 0, wg).rotation.x = Math.PI / 2;
        const fc = mesh(new T.CircleGeometry(1.55, 48), new T.MeshBasicMaterial({ map: face, toneMapped: false }), 0, 0, .26, wg);
        const hand = new T.Group(); hand.position.z = .3; wg.add(hand); mesh(new T.BoxGeometry(.07, 1.3, .03), neonMat('#ff3ea5', 2), 0, .55, 0, hand);
        mesh(new T.CylinderGeometry(.14, .14, .4, 12), goldBright, 0, 1.95, 0, wg);
        const fc2 = fc.clone(); fc2.position.z = -.26; fc2.rotation.y = Math.PI; wg.add(fc2);
        anim.main.push(t => { hand.rotation.z = -t * 1.3; wg.rotation.y = Math.sin(t * .5) * .5; });
        circle(tb.p.x, tb.p.z, 1.9);
      },
      calculo(g, tb) {           // pizarra holográfica
        [-1.9, 1.9].forEach(x => mesh(new T.CylinderGeometry(.1, .14, 3.2, 10), gold, x, 1.7, 0, g));
        const sc = liveScreen(4.6, 2.6, 512, (c, w, h, t) => {
          const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#16064a'); gr.addColorStop(1, '#2a0a5e'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
          c.strokeStyle = '#b5179e'; c.lineWidth = 6; c.strokeRect(5, 5, w - 10, h - 10); c.textAlign = 'center'; c.textBaseline = 'middle';
          const ops = ['7 × 8', '12 + 9', '45 − 17', '6 × 9', '33 + 28']; c.fillStyle = '#fff'; c.shadowColor = '#e040ff'; c.shadowBlur = 20; c.font = `700 ${h * .34}px Bungee, Impact`; c.fillText(ops[Math.floor(t / 2) % 5], w / 2, h * .42);
          c.fillStyle = '#2de2ff'; c.font = `700 ${h * .14}px Inter`; c.shadowColor = '#2de2ff'; c.fillText('= ?', w / 2, h * .8);
        }); sc.position.set(0, 3.2, 0); g.add(sc); screens.push(sc);
        const sc2 = sc.clone(); sc2.position.z = -.02; sc2.rotation.y = Math.PI; g.add(sc2);
        mesh(new T.BoxGeometry(5, 2.9, .14), gold, 0, 3.2, 0, g).material = std('#0c0824', { metalness: .8, roughness: .3 });
        const orb = ['➕', '➖', '✖️', '➗'].map((e, i) => { const s = AV.sprite(e, .7); g.add(s); return s; });
        anim.main.push(t => orb.forEach((s, i) => { const a = t * .9 + i * 1.57; s.position.set(Math.cos(a) * 2.9, 1.3 + Math.sin(t * 1.5 + i) * .3, Math.sin(a) * 2.9); }));
        circle(tb.p.x, tb.p.z, 2.4);
      },
      memoria(g, tb) {           // cuatro pilares de colores
        const cols = ['#ff2a3a', '#2dd36f', '#ffd23f', '#3d6bff'], pil = [];
        [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]].forEach(([x, z], i) => {
          mesh(new T.CylinderGeometry(.6, .7, 2.2, 24), std('#15102c', { metalness: .7, roughness: .3 }), x, 1.2, z, g);
          const cap = mesh(new T.CylinderGeometry(.55, .55, .3, 24), neonMat(cols[i], .3), x, 2.45, z, g); cap.userData.c = cols[i]; pil.push(cap);
          const bs = beam(cols[i], .5, .5, 2, .2); bs.position.set(x, 3.6, z); g.add(bs); bs.visible = false; cap.userData.beam = bs;
          circle(tb.p.x + x, tb.p.z + z, .8);
        });
        anim.main.push(t => pil.forEach((c, i) => { const on = Math.floor(t * 1.6) % 6 === i; c.material.color.copy(C(c.userData.c)).multiplyScalar(on ? 3 : .25); c.userData.beam.visible = on; }));
      },
      dianas(g, tb) {            // diana gigante con dardos
        mesh(new T.CylinderGeometry(.12, .18, 3, 10), gold, 0, 1.5, 0, g);
        const bt = canvasTex(512, 512, (c) => {
          c.translate(256, 256); [[250, '#111'], [200, '#f2f2f2'], [150, '#e8182b'], [100, '#f2f2f2'], [52, '#e8182b'], [22, '#2dd36f']].forEach(([r, col], i) => { c.fillStyle = col; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill(); });
          for (let i = 0; i < 20; i++) { c.save(); c.rotate(i / 20 * TWO); c.strokeStyle = '#ffffff55'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 22); c.lineTo(0, 250); c.stroke(); c.restore(); }
          c.strokeStyle = '#ffd77a'; c.lineWidth = 10; c.beginPath(); c.arc(0, 0, 248, 0, 7); c.stroke();
        });
        const bg = new T.Group(); bg.position.y = 3.6; g.add(bg);
        mesh(new T.CircleGeometry(1.9, 48), new T.MeshBasicMaterial({ map: bt, toneMapped: false }), 0, 0, .12, bg);
        mesh(new T.CylinderGeometry(2, 2, .2, 48), gold, 0, 0, 0, bg).rotation.x = Math.PI / 2;
        [[.4, .3], [-.6, -.2], [.1, -.7]].forEach(([x, y]) => { const d = mesh(new T.CylinderGeometry(.02, .02, .7, 6), std('#ddd', { metalness: 1 }), x, y, .45, bg); d.rotation.x = Math.PI / 2; mesh(new T.ConeGeometry(.07, .2, 8), neonMat('#ff3ea5', 1.6), x, y, .85, bg).rotation.x = Math.PI / 2; });
        anim.main.push(t => { bg.rotation.y = Math.sin(t * .6) * .35; });
        circle(tb.p.x, tb.p.z, 1.6);
      },
    };
    CFG.tables.forEach(tb => {
      const p = m3(tb.x, tb.y); tb.p = p; tableSpots[tb.id] = p;
      const g = new T.Group(); g.position.set(p.x, 0, p.z); main.add(g);
      dais(g, tb.color); (makers[tb.id] || (() => {}))(g, tb);
      const sg = signPlane(tb.name.toUpperCase(), tb.color, 6.4, 1.6, tb.desc); sg.position.set(p.x, 7.6, p.z); main.add(sg); billboards.push(sg);
      const ic = AV.sprite(tb.emoji, 1.5); ic.position.set(p.x, 9.4, p.z); main.add(ic); anim.main.push(t => { ic.position.y = 9.4 + Math.sin(t * 2 + p.x) * .2; });
      const rg = mesh(new T.TorusGeometry(6.8, .12, 10, 64), neonMat(tb.color, 1.9), p.x, H - .5, p.z, main); rg.rotation.x = Math.PI / 2;
      const b = beam(tb.color, 3, CFG.zone / U * .92, H - .6, .13); b.position.set(p.x, (H - .6) / 2, p.z); main.add(b);
      const l = new T.PointLight(tb.color, 1.0, 11); l.position.set(p.x, 3.2, p.z); main.add(l); stationLights.push(l);
    });

    // ----- Tienda VIP (al fondo, visible nada más entrar) -----
    const sp = m3(CFG.shopPos.x, CFG.shopPos.y), shop = new T.Group(); shop.position.set(0, 0, -HS); main.add(shop);
    mesh(new T.BoxGeometry(14, 1.2, 1.7), marble, 0, .6, 5.1, shop); mesh(new T.BoxGeometry(14.4, .12, 2.1), goldBright, 0, 1.25, 5.1, shop);
    mesh(new T.BoxGeometry(14, .14, .14), neonMat('#ff3ea5', 2), 0, .22, 6, shop);
    box(-7.2, 7.2, -HS + 3.9, -HS + 6.4);
    [-1, 1].forEach(s => {   // vitrinas de cristal con objetos flotantes
      const vg = new T.Group(); vg.position.set(s * 10.6, 0, 1.4); shop.add(vg);
      mesh(new T.BoxGeometry(3.4, .5, 2), marble, 0, .25, 0, vg);
      mesh(new T.BoxGeometry(3.3, 3.2, 1.9), new T.MeshStandardMaterial({ color: '#cfe8ff', transparent: true, opacity: .13, roughness: .05, metalness: .2, depthWrite: false }), 0, 2.1, 0, vg);
      mesh(new T.BoxGeometry(3.5, .12, 2.1), gold, 0, 3.75, 0, vg);
      const items = (s < 0 ? ['👑', '🎩', '🤠'] : ['🕶️', '🐉', '🦜']).map((e, i) => { const sp2 = AV.sprite(e, .95); sp2.position.set((i - 1) * 1.0, 2, 0); vg.add(sp2); return sp2; });
      anim.main.push(t => items.forEach((it, i) => { it.position.y = 2 + Math.sin(t * 2 + i * 2 + s) * .18; }));
      mesh(new T.CylinderGeometry(1.4, 1.6, .05, 24), neonMat('#ff3ea5', 1.5), 0, .52, 0, vg);
      box(s * 10.6 - 1.8, s * 10.6 + 1.8, -HS + .3, -HS + 2.5);
    });
    [-5.2, 5.2].forEach((x, i) => {   // expositores con focos
      const pg = new T.Group(); pg.position.set(x, 0, 8.2); shop.add(pg);
      mesh(new T.CylinderGeometry(.6, .7, 1.1, 24), marble, 0, .55, 0, pg); mesh(new T.CylinderGeometry(.66, .66, .06, 24), gold, 0, 1.12, 0, pg);
      const it = AV.sprite(i ? '✨' : '💎', 1), cone = beam('#ffd9f5', .1, .8, 3.6, .2); it.position.y = 2; cone.position.y = 3.1; pg.add(it, cone);
      anim.main.push(t => { it.position.y = 1.9 + Math.sin(t * 2 + i) * .2; });
      circle(x, -HS + 8.2, .8);
    });
    const shopSign = signPlane('TIENDA VIP', '#ff3ea5', 11, 2.6, 'colores · gorros · mascotas · efectos'); shopSign.position.set(0, 7.4, .7); shop.add(shopSign);
    mesh(new T.BoxGeometry(11.6, 3.2, .1), gold, 0, 7.4, .6, shop).material = gold;
    const shopLight = new T.PointLight('#ff6ad0', 1.6, 20); shopLight.position.set(0, 5, 6); shop.add(shopLight);
    const shopBeam = beam('#ff3ea5', 3, 8, H - .6, .1); shopBeam.position.set(0, (H - .6) / 2, 6); shop.add(shopBeam);
    const keeper = AV.createStaff('shopkeeper', 'tienda'); keeper.position.set(0, 0, -HS + 2.2 + 0); keeper.rotation.y = 0; main.add(keeper);
    npcs.main.push({ mesh: keeper, x: 0, z: -HS + 2.2, rot: 0, look: 'shopkeeper' }); keeper.position.set(0, 0, -HS + 3.1);
    npcs.main[0].z = -HS + 3.1;

    // ----- Bar (esquina derecha del fondo) -----
    const BR = 8, cx = HS, cz = -HS;             // centro del arco = esquina
    const bar = new T.Group(); main.add(bar);
    const barSide = new T.MeshStandardMaterial({ color: '#1a0c2e', roughness: .25, metalness: .6, side: T.DoubleSide });
    mesh(new T.CylinderGeometry(BR, BR, 1.15, 48, 1, true, -Math.PI / 2, Math.PI / 2), barSide, cx, .58, cz, bar);
    const topP = mesh(new T.RingGeometry(BR - .75, BR + .55, 48, 1, Math.PI, Math.PI / 2), std('#0a0612', { roughness: .1, metalness: .8, side: T.DoubleSide }), cx, 1.17, cz, bar); topP.rotation.x = -Math.PI / 2;
    mesh(new T.CylinderGeometry(BR + .56, BR + .56, .1, 48, 1, true, -Math.PI / 2, Math.PI / 2), new T.MeshStandardMaterial({ color: '#ffd77a', metalness: 1, roughness: .2, side: T.DoubleSide }), cx, 1.15, cz, bar);
    mesh(new T.CylinderGeometry(BR + .02, BR + .02, .14, 48, 1, true, -Math.PI / 2, Math.PI / 2), new T.MeshBasicMaterial({ color: C('#ffb703').multiplyScalar(2), side: T.DoubleSide, toneMapped: false }), cx, .3, cz, bar);
    for (let a = .06; a < Math.PI / 2 - .03; a += .12) circle(cx - Math.cos(a) * (BR + .1), cz + Math.sin(a) * (BR + .1), .75);
    // taburetes
    const stoolM = [], sA = []; for (let i = 0; i < 8; i++) { const a = .17 + i * (Math.PI / 2 - .34) / 7; sA.push([cx - Math.cos(a) * (BR + 1.35), cz + Math.sin(a) * (BR + 1.35)]); }
    const sGeo = new T.CylinderGeometry(.3, .26, .1, 16); sGeo.translate(0, .78, 0);
    const pGeo = new T.CylinderGeometry(.04, .04, .78, 8); pGeo.translate(0, .39, 0); const bGeo = new T.CylinderGeometry(.24, .26, .05, 16); bGeo.translate(0, .03, 0);
    const sm = sA.map(([x, z]) => mtx(x, 0, z));
    main.add(instanced(sGeo, std('#8a1034', { roughness: .5 }), sm), instanced(pGeo, gold, sm), instanced(bGeo, gold, sm));
    // estantes con botellas luminosas
    const bottles = [], bcols = [];
    const palette = ['#ff3ea5', '#2de2ff', '#ffb703', '#a24bff', '#3dff8a', '#ff5a36'];
    [0, 1].forEach(w => [0, 1, 2].forEach(row => { for (let k = 0; k < 32; k++) {
      const along = .9 + k * .22, y = 1.5 + row * 1.05;
      const x = w ? cx - .55 : cx - along, z = w ? cz + along : cz + .55;
      if (w && k > 30) continue; bottles.push(mtx(x, y + .17, z, 0, 1, .8 + Math.random() * .5, 1)); bcols.push(C(palette[(k * 7 + row * 3 + w) % 6]).multiplyScalar(.9 + Math.random() * .6));
    } mesh(new T.BoxGeometry(w ? .5 : 7.4, .06, w ? 7.4 : .5), gold, w ? cx - .5 : cx - 3.8, 1.5 + row * 1.05, w ? cz + 3.8 : cz + .5, bar); }));
    const bm = instanced(new T.CylinderGeometry(.055, .075, .34, 8), new T.MeshBasicMaterial({ toneMapped: false }), bottles, bcols); bar.add(bm);
    mesh(new T.PlaneGeometry(8, 4.2), neonMat('#ff9a00', .35), cx - 4, 2.8, cz + .1, bar);
    const bw = mesh(new T.PlaneGeometry(8, 4.2), neonMat('#ff9a00', .35), cx - .1, 2.8, cz + 4, bar); bw.rotation.y = -Math.PI / 2;
    const barSign = signPlane('BAR', '#ffb703', 5.5, 2.2, 'comida y bebida · pídelo desde tu móvil'); barSign.position.set(cx - 3, 7.5, cz + .6); bar.add(barSign);
    const barSign2 = barSign.clone(); barSign2.position.set(cx - .6, 7.5, cz + 3); barSign2.rotation.y = -Math.PI / 2; bar.add(barSign2);
    const brg = mesh(new T.TorusGeometry(BR - 1.5, .1, 8, 48, Math.PI / 2), neonMat('#ffb703', 1.9), cx, H - .6, cz, bar); brg.rotation.x = Math.PI / 2; brg.rotation.z = Math.PI / 2;
    const barLight = new T.PointLight('#ff9d3a', 1.8, 24); barLight.position.set(cx - 5, 4.5, cz + 5); bar.add(barLight);
    const bbeam = beam('#ffb703', 2.5, 6, H - .6, .09); bbeam.position.set(cx - 5.5, (H - .6) / 2, cz + 5.5); bar.add(bbeam);
    // mesitas con velas
    [[21, -14.5], [26.5, -17.5], [25.5, -11.5]].forEach(([x, z]) => {
      const tg = new T.Group(); tg.position.set(x, 0, z); main.add(tg);
      mesh(new T.CylinderGeometry(.06, .06, 1, 8), gold, 0, .5, 0, tg); mesh(new T.CylinderGeometry(.6, .6, .06, 24), marble, 0, 1, 0, tg);
      mesh(new T.SphereGeometry(.07, 8, 8), neonMat('#ffb36b', 2.4), 0, 1.12, 0, tg);
      for (let k = 0; k < 3; k++) { const a = k * 2.09 + x; mesh(sGeo, std('#8a1034'), Math.cos(a) * 1.15, 0, Math.sin(a) * 1.15, tg); mesh(pGeo, gold, Math.cos(a) * 1.15, 0, Math.sin(a) * 1.15, tg); }
      circle(x, z, .85);
    });
    const bartender = AV.createStaff('bartender', 'barman'); bartender.position.set(cx - 4.6, 0, cz + 4.6); bartender.rotation.y = -Math.PI / 4; main.add(bartender);
    npcs.main.push({ mesh: bartender, x: cx - 4.6, z: cz + 4.6, rot: -Math.PI / 4, look: 'bartender' });
    const barSpot = { x: cx - 0.707 * (BR + 2.4), z: cz + 0.707 * (BR + 2.4) };

    // ----- Tragaperras a lo largo de las paredes -----
    const slotM = [], slotC = [], slotStool = [];
    const addSlots = (x, zs, ry) => zs.forEach((z, i) => { slotM.push(mtx(x, 0, z, ry)); slotC.push(new T.Color().setHSL((i * .137) % 1, .9, .5)); slotStool.push(mtx(x + Math.sin(ry) * 1.3, 0, z + Math.cos(ry) * 1.3)); circle(x, z, .62); });
    const zr = (a, b, st) => { const r = []; for (let z = a; z <= b; z += st) r.push(+z.toFixed(2)); return r; };
    addSlots(-HS + 1.05, zr(-14, 14, 1.75), Math.PI / 2); addSlots(HS - 1.05, zr(-4, 22, 1.75), -Math.PI / 2);
    const slotBody = new T.BoxGeometry(1.15, 1.95, .95); slotBody.translate(0, .98, 0);
    const slotScr = new T.PlaneGeometry(.82, .56); slotScr.translate(0, 1.45, .49);
    const slotTop = new T.PlaneGeometry(.95, .3); slotTop.translate(0, 1.82, .49);
    const slotBtn = new T.PlaneGeometry(.8, .2); slotBtn.translate(0, .95, .49);
    main.add(instanced(slotBody, std('#1b0f3a', { metalness: .7, roughness: .3 }), slotM));
    const scrM = new T.MeshBasicMaterial({ toneMapped: false }); const scrI = instanced(slotScr, scrM, slotM, slotC), topI = instanced(slotTop, new T.MeshBasicMaterial({ toneMapped: false }), slotM, slotC), btnI = instanced(slotBtn, neonMat('#ff3ea5', 1.4), slotM);
    main.add(scrI, topI, btnI);
    main.add(instanced(sGeo, std('#5a1578', { roughness: .5 }), slotStool), instanced(pGeo, gold, slotStool));
    const tmpC = new T.Color(); let slotT = 0;
    anim.main.push(t => { if (t - slotT < .15) return; slotT = t; slotC.forEach((c, i) => { tmpC.setHSL((t * .25 + i * .137) % 1, .9, .55); scrI.setColorAt(i, tmpC); tmpC.offsetHSL(.4, 0, 0); topI.setColorAt(i, tmpC); }); scrI.instanceColor.needsUpdate = true; topI.instanceColor.needsUpdate = true; });

    // ----- Zona arcade (esquina suroeste) -----
    const ap = m3(CFG.arcadePos.x, CFG.arcadePos.y); const arcadeSpots = [];
    [17.5, 19.9, 22.3, 24.7, 27.1].forEach((z, i) => {
      const g = new T.Group(); g.position.set(-HS + 1.1, 0, z); g.rotation.y = Math.PI / 2; main.add(g);
      mesh(new T.BoxGeometry(1.3, 2.3, 1.1), std(['#3a0ca3', '#7209b7', '#4361ee', '#b5179e', '#0b7a8c'][i], { metalness: .5, roughness: .35 }), 0, 1.15, 0, g);
      const scr = mesh(new T.PlaneGeometry(.95, .7), new T.MeshBasicMaterial({ toneMapped: false }), 0, 1.65, .56, g); scr.rotation.x = -.15;
      mesh(new T.BoxGeometry(1.2, .12, .5), gold, 0, 1.05, .6, g); mesh(new T.SphereGeometry(.07, 8, 8), neonMat('#ff2a3a', 2), -.2, 1.16, .62, g);
      mesh(new T.PlaneGeometry(1.1, .3), neonMat(['#2de2ff', '#ff3ea5', '#ffb703', '#3dff8a', '#a24bff'][i], 1.8), 0, 2.1, .56, g);
      anim.main.push(t => scr.material.color.setHSL((t * .3 + i * .2) % 1, .9, .5));
      circle(-HS + 1.1, z, .8);
    });
    const arcSign = signPlane('ARCADE', '#2de2ff', 6, 1.7, 'juegos de otros grupos'); arcSign.position.set(-HS + .5, 6.6, 22.3); arcSign.rotation.y = Math.PI / 2; main.add(arcSign);

    // ----- Rincón lounge (esquina noroeste): sofás de terciopelo -----
    [[-24, -26, 0], [-18.5, -22, Math.PI / 2], [-27, -19.5, -Math.PI / 2]].forEach(([x, z, ry], i) => {
      const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; main.add(g);
      mesh(new T.BoxGeometry(3.2, .55, 1.1), velvet, 0, .45, 0, g); mesh(new T.BoxGeometry(3.2, .9, .3), velvet, 0, .95, -.5, g);
      [-1.6, 1.6].forEach(s => mesh(new T.BoxGeometry(.25, .85, 1.1), velvet, s, .6, 0, g));
      [-1.4, 1.4].forEach(s => [-.4, .4].forEach(zz => mesh(new T.CylinderGeometry(.05, .05, .2, 8), gold, s, .1, zz, g)));
      box(x - 1.7, x + 1.7, z - 1.7, z + 1.7);
    });
    const lt = mesh(new T.CylinderGeometry(.9, .9, .08, 24), marble, -23.5, .6, -22.3, main);
    mesh(new T.CylinderGeometry(.07, .07, .6, 8), gold, -23.5, .3, -22.3, main);
    const lr = mesh(new T.TorusGeometry(.9, .03, 8, 32), neonMat('#a24bff', 2), -23.5, .65, -22.3, main); lr.rotation.x = Math.PI / 2;
    // lámparas de araña de cristal
    const chand = (x, z, y = 11) => {
      const g = new T.Group(); g.position.set(x, y, z); main.add(g);
      mesh(new T.CylinderGeometry(.03, .03, H - y, 6), gold, 0, (H - y) / 2, 0, g);
      [1.5, 1.0, .5].forEach((r, i) => { const t = mesh(new T.TorusGeometry(r, .05, 8, 32), gold, 0, -i * .5, 0, g); t.rotation.x = Math.PI / 2; });
      const bs = []; for (let k = 0; k < 36; k++) { const a = k / 36 * TWO, r = [1.5, 1.0, .5][k % 3]; bs.push(mtx(Math.cos(a) * r, -(k % 3) * .5 - .15 - Math.random() * .4, Math.sin(a) * r)); }
      g.add(instanced(new T.OctahedronGeometry(.1), new T.MeshBasicMaterial({ color: C('#ffe9c0').multiplyScalar(1.5), toneMapped: false }), bs));
      anim.main.push(t => { g.rotation.y = t * .1; });
    };
    chand(-20, -22); chand(20, 20); chand(-17, 22); chand(0, 20, 12);

    // ----- Entrada (pared sur): grandes puertas doradas y alfombra -----
    const ent = new T.Group(); ent.position.set(0, 0, HS); main.add(ent);
    [-1, 1].forEach(s => { mesh(new T.BoxGeometry(2.4, 5, .25), gold, s * 1.3, 2.5, -.2, ent); mesh(new T.PlaneGeometry(2, 4.4), neonMat('#ffe0a0', .55), s * 1.3, 2.5, -.34, ent).rotation.y = Math.PI; });
    mesh(new T.BoxGeometry(5.6, .4, .4), gold, 0, 5.15, -.2, ent);
    const wel = signPlane('BIENVENIDOS', '#e2b04a', 8, 1.5, null); wel.position.set(0, 6.6, -.5); wel.rotation.y = Math.PI; ent.add(wel);
    [-6, 6].forEach(x => { const dm = AV.createStaff('dealer', 'portero' + x); dm.position.set(x, 0, -2); dm.rotation.y = Math.PI; ent.add(dm); npcs.main.push({ mesh: dm, x, z: HS - 2, rot: Math.PI, look: 'dealer' }); });
    anim.main.push(() => {});

    // Texturas de relleno del reloj/pantallas se actualizan en update()
    const world = {
      S, H, U, env, reflectors, colliders, anim, billboards, screens, npcs, spots: { door: spots.door, shop: { x: 0, z: -HS + 6 }, bar: barSpot, tables: tableSpots, arcade: ap && m3(CFG.arcadePos.x, CFG.arcadePos.y), shopNpc: { x: 0, z: -HS + 3.1 }, barNpc: { x: cx - 4.6, z: cz + 4.6 } },
      rooms: { main: { group: main, fog: [0x09051c, .0125], bg: 0x05030c }, classic: null },
      stationLights, quality: 'high', lastScreen: 0,
      setQuality(q) {
        world.quality = q;
        const refl = q === 'high';
        reflectors.forEach(({ r, mat }) => { r.visible = refl; mat.transparent = refl; mat.opacity = refl ? .84 : 1; mat.needsUpdate = true; });
        stationLights.forEach(l => { l.intensity = q === 'low' ? 0 : 1; });
      },
      // t: segundos, dt: delta, cam: cámara, room: sala actual
      update(t, dt, cam, room) {
        const list = anim[room] || [];
        for (let i = 0; i < list.length; i++) list[i](t, dt);
        if (world.rooms[room]) world.rooms[room].screens?.forEach(s => s.userData.upd && s.userData.upd(t));
        if (room === 'main') screens.forEach(s => s.userData.upd && s.userData.upd(t));
        const bl = room === 'main' ? billboards : world.billboardsClassic || [];
        for (let i = 0; i < bl.length; i++) { const b = bl[i]; b.rotation.y = Math.atan2(cam.position.x - b.position.x - (b.parent?.position.x || 0), cam.position.z - b.position.z - (b.parent?.position.z || 0)); }
      },
    };
    world.liftOpen = 0;
    world.shared = { renderer, T, C, std, neonMat, canvasTex, rr, mtx, instanced, mesh, signPlane, beam, liveScreen, gold, goldBright, marble, velvet, U, H, S, HS, TWO, env, anim, colliders, npcs, reflectors, rouletteTex };
    if (World.buildClassic) World.buildClassic(world, CFG);
    return world;
  }
  return { build };
})();
