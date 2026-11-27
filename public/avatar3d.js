// 🧍 Personajes 3D realistas, generados por código (modelos originales, sin archivos externos).
// Cuerpo con proporciones humanas (≈7,5 cabezas), rostro con facciones, peinados, ropa con tejido y un esqueleto de
// articulaciones (cadera, rodillas, tobillos, columna, cuello, hombros, codos) animado de forma procedural:
// idle, caminar, correr, girar, sentarse, usar el teléfono, llevar una bandeja, repartir cartas…
// API compatible con la versión anterior: create, createStaff, setLook, animate, carry, sprite, emojiTex.
// Nuevo: update(g, dt, estado), createHands(look, seed), appearance(seed).
const AV = (() => {
  const T = THREE;

  // ---------- Emojis (gorros, mascotas, efectos) ----------
  const texCache = {};
  function emojiTex(txt, size = 128) {
    if (texCache[txt]) return texCache[txt];
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'); x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `${size * .8}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif`;
    x.fillText(txt, size / 2, size / 2 + size * .05);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; texCache[txt] = t; return t;
  }
  function sprite(txt, scale) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: emojiTex(txt), transparent: true, depthWrite: false }));
    s.scale.set(scale, scale, 1); return s;
  }

  // ---------- Utilidades ----------
  const hash = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const rng = seed => { let a = hash(seed) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const M4 = new T.Matrix4(), Q4 = new T.Quaternion(), E3 = new T.Euler(), V3 = new T.Vector3(), S3 = new T.Vector3();
  const xf = (geo, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) => { M4.compose(V3.set(p[0], p[1], p[2]), Q4.setFromEuler(E3.set(r[0], r[1], r[2])), S3.set(s[0], s[1], s[2])); geo.applyMatrix4(M4); return geo; };
  const lathe = (pts, seg = 14) => new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(r, y)), seg);
  const shade = (hex, k) => { const c = new T.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };

  const SKINS = ['#f6d7be', '#efc29f', '#dfa67f', '#c68a62', '#a56c46', '#7b4a2e', '#5b341f'];
  const HAIRS = ['#0e0b09', '#241710', '#3a2415', '#5d3a1f', '#8b6038', '#b88b4a', '#d9c7a0', '#8a8a90', '#6b1e1e'];
  const EYES = ['#3a2a1a', '#5b3a1c', '#2d5b8a', '#3f7a4a', '#6b6b6b', '#243a52'];
  const TIES = ['#c1121f', '#1d4ed8', '#e0a830', '#047857', '#6d28d9', '#111827'];
  const LIPS_F = ['#b4475a', '#c25b6a', '#a33a4d', '#d0707a'], LIPS_M = ['#a56456', '#9c5a4d', '#8f5a4a'];

  // Apariencia determinista a partir de una semilla (todos los jugadores ven lo mismo)
  function appearance(seed, o = {}) {
    const r = rng(seed);
    const fem = o.gender ? o.gender === 'f' : r() < .46;
    const skin = o.skin || pick(r, SKINS), hairColor = o.hair || pick(r, HAIRS);
    const styles = fem ? ['long', 'long', 'bun', 'ponytail', 'bob', 'short'] : ['short', 'short', 'slick', 'slick', 'bald', 'curly'];
    return {
      fem, skin, hairColor, eye: pick(r, EYES), tie: o.tie || pick(r, TIES),
      hair: o.hairStyle || pick(r, styles), beard: !fem && r() < .28, stache: !fem && r() < .18,
      height: (fem ? .94 : 1) * (.96 + r() * .1), build: .94 + r() * .16, lips: pick(r, fem ? LIPS_F : LIPS_M), skirt: fem && r() < .4, glasses: r() < .12,
    };
  }

  // ---------- Texturas compartidas ----------
  // Atlas: mitad izquierda = tejido de traje (raya diplomática + sarga), mitad derecha = liso (piel, camisa…)
  let atlas = null;
  function getAtlas() {
    if (atlas) return atlas;
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 128);
    const l = g.getImageData(0, 0, 128, 128), d = l.data;
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const i = (y * 128 + x) * 4; let v = 236 + (((x + y) % 4 < 2) ? 6 : -6) + (Math.random() * 10 - 5);   // sarga fina
      if (x % 16 === 0) v -= 26;                                                                            // raya diplomática
      d[i] = d[i + 1] = d[i + 2] = Math.max(150, Math.min(255, v)); d[i + 3] = 255;
    }
    g.putImageData(l, 0, 0);
    const r = g.getImageData(128, 0, 128, 128), e = r.data;
    for (let i = 0; i < e.length; i += 4) { const v = 250 + Math.random() * 5; e[i] = e[i + 1] = e[i + 2] = v; e[i + 3] = 255; }   // piel / lisos con grano
    g.putImageData(r, 128, 0);
    atlas = new T.CanvasTexture(c); atlas.anisotropy = 4; return atlas;
  }
  let MAT = null;
  const getMat = () => MAT || (MAT = new T.MeshStandardMaterial({ map: getAtlas(), vertexColors: true, roughness: .62, metalness: .04, color: new T.Color(.74, .74, .74) }));

  // Textura del rostro (ojos, cejas, nariz, labios): se cachea por combinación de rasgos
  const faceCache = {};
  function faceTex(a, brow) {
    const key = [a.skin, a.eye, brow, a.lips, a.fem, a.beard || a.stache].join('|');
    if (faceCache[key]) return faceCache[key];
    const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
    const sk = new T.Color(a.skin);
    g.fillStyle = a.skin; g.fillRect(0, 0, N, N);
    const dark = shade(a.skin, .78), light = shade(a.skin, 1.08);
    const blob = (x, y, rx, ry, col, al) => { g.save(); g.globalAlpha = al; g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); g.restore(); };
    blob(128, 150, 14, 34, light, .45);                                                   // puente nasal iluminado
    [64, 192].forEach(x => { blob(x, 112, 36, 20, dark, .30); blob(x < 128 ? 52 : 204, 165, 24, 26, a.fem ? '#e58a8a' : dark, a.fem ? .22 : .16); });   // cuencas y mejillas
    blob(128, 160, 22, 10, dark, .22);                                                    // sombra bajo la nariz
    // ojos
    [-1, 1].forEach(s => {
      const x = 128 + s * 64, y = 116;
      g.fillStyle = '#f4f1ec'; g.beginPath(); g.ellipse(x, y, 25, 11, 0, 0, 7); g.fill();
      g.save(); g.beginPath(); g.ellipse(x, y, 25, 11, 0, 0, 7); g.clip();
      g.fillStyle = a.eye; g.beginPath(); g.arc(x, y + 1, 11, 0, 7); g.fill();
      g.fillStyle = '#0b0b0d'; g.beginPath(); g.arc(x, y + 1, 5.5, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 4, y - 3, 2.6, 0, 7); g.fill();
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x - 26, y - 12, 52, 7);               // sombra del párpado
      g.restore();
      g.strokeStyle = shade(a.skin, .5); g.lineWidth = 2.6; g.beginPath(); g.ellipse(x, y, 25, 11, 0, Math.PI * 1.02, Math.PI * 1.98); g.stroke();   // párpado superior
      if (a.fem) { g.lineWidth = 3.4; g.strokeStyle = '#161014'; g.beginPath(); g.ellipse(x, y - 1, 26, 12, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); for (let k = 0; k < 5; k++) { const ax = x + s * (10 + k * 4); g.lineWidth = 1.6; g.beginPath(); g.moveTo(ax, y - 10); g.lineTo(ax + s * 3, y - 16); g.stroke(); } }
      // ceja
      g.strokeStyle = brow; g.lineCap = 'round'; g.lineWidth = a.fem ? 5 : 8.5; g.beginPath(); g.moveTo(x - s * 26, y - 25 + (a.fem ? 4 : 0)); g.quadraticCurveTo(x, y - 36 - (a.fem ? 3 : 0), x + s * 28, y - 26 + (a.fem ? 0 : 4)); g.stroke();
    });
    // nariz
    g.strokeStyle = shade(a.skin, .62); g.lineWidth = 2.4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(118, 152); g.quadraticCurveTo(111, 165, 119, 170); g.moveTo(138, 152); g.quadraticCurveTo(145, 165, 137, 170); g.stroke();
    g.fillStyle = 'rgba(40,20,15,.45)'; g.beginPath(); g.ellipse(121, 169, 3.5, 2.2, 0, 0, 7); g.ellipse(135, 169, 3.5, 2.2, 0, 0, 7); g.fill();
    // boca
    const my = 206; g.fillStyle = a.lips; g.beginPath(); g.moveTo(104, my); g.quadraticCurveTo(116, my - 9, 128, my - 4); g.quadraticCurveTo(140, my - 9, 152, my); g.quadraticCurveTo(140, my + 15, 128, my + 15); g.quadraticCurveTo(116, my + 15, 104, my); g.fill();
    g.strokeStyle = 'rgba(40,10,15,.75)'; g.lineWidth = 2.3; g.beginPath(); g.moveTo(104, my); g.quadraticCurveTo(128, my + 5, 152, my); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.ellipse(128, my + 8, 11, 3, 0, 0, 7); g.fill();
    // arruga sutil / barba incipiente
    if (!a.fem) { g.save(); g.globalAlpha = .13; g.fillStyle = '#000'; for (let i = 0; i < 520; i++) { const px = 40 + Math.random() * 176, py = 176 + Math.random() * 78; g.fillRect(px, py, 1.4, 1.4); } g.restore(); }
    // borde difuminado (se funde con el cráneo)
    g.globalCompositeOperation = 'destination-in';
    const m = g.createRadialGradient(128, 128, 78, 128, 128, 128); m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = m; g.fillRect(0, 0, N, N);
    const t = new T.CanvasTexture(c); t.anisotropy = 4; faceCache[key] = t; return t;
  }
  const faceMats = {};
  const faceMat = (a, brow) => { const k = [a.skin, a.eye, brow, a.lips, a.fem, a.beard || a.stache].join('|'); return faceMats[k] || (faceMats[k] = new T.MeshStandardMaterial({ map: faceTex(a, brow), transparent: true, roughness: .55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); };

  // ---------- Geometría ----------
  // Acumula piezas con color por vértice. suit=true → usa el tejido del traje y se puede recolorear.
  function Bag() {
    const list = [];
    return {
      add(geo, color, suit = false) {
        const n = geo.attributes.position.count, c = new Float32Array(n * 3), col = new T.Color(color);
        for (let i = 0; i < n; i++) { c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
        geo.setAttribute('color', new T.BufferAttribute(c, 3));
        geo.setAttribute('suit', new T.BufferAttribute(new Float32Array(n).fill(suit ? 1 : 0), 1));
        const uv = geo.attributes.uv;
        for (let i = 0; i < n; i++) { if (suit) uv.setXY(i, .02 + uv.getX(i) * .46, .04 + uv.getY(i) * .92); else uv.setXY(i, .8, .5); }
        list.push(geo); return geo;
      },
      mesh(parent, pos) {
        const geo = FX.merge(list, false); list.length = 0;
        geo.userData = { suitBase: null };
        const m = new T.Mesh(geo, getMat()); if (pos) m.position.set(pos[0], pos[1], pos[2]); parent.add(m); return m;
      },
    };
  }

  // Cuerpo: devuelve el esqueleto (jerarquía de articulaciones) con las mallas ya montadas
  function buildBody(a, S) {
    const fem = a.fem, bw = a.build * (fem ? .92 : 1), SKIN = a.skin, SH = '#f3f1ee';
    const suitC = S.jacket, pantsC = S.pants, sleeveC = S.sleeve, vestC = S.vest;
    const root = new T.Group(), body = new T.Group(); root.add(body);
    const hips = new T.Group(); hips.position.y = .93; body.add(hips);
    const spine = new T.Group(); spine.position.y = .06; hips.add(spine);
    const neck = new T.Group(); neck.position.set(0, .5, 0); spine.add(neck);
    const head = new T.Group(); head.position.set(0, .112, 0); neck.add(head);
    const J = { root, body, hips, spine, neck, head };

    // ---- Torso: pantalón (parte alta), chaqueta/chaleco, camisa en V, corbata, cuello ----
    const tb = Bag();
    const sx = (fem ? .98 : 1.04) * bw, sz = fem ? .6 : .64;
    const jp = fem
      ? [[.001, -.26], [.165, -.26], [.172, -.16], [.146, -.02], [.124, .08], [.145, .2], [.164, .3], [.168, .38], [.15, .43], [.1, .455], [.05, .475], [.001, .48]]
      : [[.001, -.26], [.162, -.26], [.172, -.15], [.15, -.02], [.14, .08], [.16, .2], [.18, .32], [.184, .39], [.166, .43], [.11, .452], [.05, .472], [.001, .48]];
    const rAt = y => { for (let i = 1; i < jp.length; i++) if (y <= jp[i][1]) { const t = (y - jp[i - 1][1]) / (jp[i][1] - jp[i - 1][1]); return jp[i - 1][0] + (jp[i][0] - jp[i - 1][0]) * t; } return .05; };
    const scaled = (geo, k = 1) => xf(geo, [0, 0, 0], [0, 0, 0], [sx * k, 1, sz * k]);
    const hasJacket = S.jacketOn, K = hasJacket ? 1.012 : 1.008;
    // Parche que sigue la superficie del torso (camisa en V, solapas, corbata) con bordes suaves
    const patch = (rows, off, color, suit = false, side = 0) => {   // rows: [[y, mitadAngular], …] de abajo arriba; side: 0 centro, ±1 tira lateral de ancho .085 rad
      const m = 8, pos = [], idx = [];
      rows.forEach(([y, h]) => { const r = (rAt(y) + off) * K; for (let j = 0; j <= m; j++) {
        let phi = side === 0 ? -h + 2 * h * j / m : side * (h + .085 * j / m);
        pos.push(r * Math.sin(phi) * sx, y, r * Math.cos(phi) * sz); } });
      for (let i = 0; i < rows.length - 1; i++) for (let j = 0; j < m; j++) { const A = i * (m + 1) + j, B = A + 1, C = A + m + 2, D = A + m + 1; idx.push(A, B, D, B, C, D); if (side < 0) { idx.splice(-6, 6, A, D, B, B, D, C); } }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2)); g.setIndex(idx); g.computeVertexNormals();
      return tb.add(g, color, suit);
    };
    tb.add(scaled(lathe([[.001, -.3], [.14, -.3], [.145, -.14], [.128, -.04], [.001, -.04]], 16), 1), pantsC, true);   // pantalón (cintura)
    if (hasJacket) tb.add(scaled(lathe(jp, 20), K), suitC, true);
    else {
      tb.add(scaled(lathe([...jp.filter(p => p[1] >= -.04 && p[1] <= .4), [.001, .4]], 20), K), vestC, false);                  // chaleco
      tb.add(scaled(lathe(jp.filter(p => p[1] >= .3), 20), 1.0), SH, false);                                                         // camisa (hombros y cuello)
    }
    if (hasJacket) {
      const Vrows = [[.17, .035], [.24, .12], [.31, .22], [.38, .31], [.43, .38]];
      patch(Vrows, .004, SH, false);                                                                  // camisa en V
      patch(Vrows, .009, shade(suitC, .8), true, 1); patch(Vrows, .009, shade(suitC, .8), true, -1);  // solapas
    } else patch([[.22, .05], [.3, .13], [.36, .16], [.4, .17]], .005, SH, false);
    // corbata o pajarita
    const zf = (y, o = 0) => (rAt(y) + o) * K * sz;
    if (S.bow) {
      tb.add(xf(new T.SphereGeometry(.016, 8, 6), [0, .418, zf(.418, .014)], [0, 0, 0], [1, 1, .8]), S.tieC);
      [-1, 1].forEach(q => tb.add(xf(new T.ConeGeometry(.03, .058, 6), [q * .04, .418, zf(.418, .012)], [0, 0, q * -Math.PI / 2], [1, .55, .5]), S.tieC));
    } else {
      patch([[.12, .006], [.16, .075 * 1], [.22, .05], [.3, .036], [.36, .026], [.404, .024]], .013, S.tieC, false);
      tb.add(xf(new T.SphereGeometry(.018, 8, 6), [0, .408, zf(.408, .02)], [0, 0, 0], [1, .85, .7]), S.tieC);
    }
    // cuello + cuello de camisa
    tb.add(xf(new T.CylinderGeometry(.042, .05, .13, 10), [0, .46, .0]), SKIN);
    tb.add(xf(new T.TorusGeometry(.053, .013, 6, 14), [0, .432, -.002], [Math.PI / 2, 0, 0], [1, 1.1, 1.0]), SH);
    [-1, 1].forEach(q => tb.add(xf(new T.BoxGeometry(.045, .01, .05), [q * .03, .44, zf(.44, .0) - .004], [.4, q * .4, q * .1]), SH));
    // botones, pañuelo de pecho, cinturón
    if (hasJacket) {
      [.02, .09].forEach(y => tb.add(xf(new T.SphereGeometry(.008, 6, 5), [0, y, zf(y, .006)], [0, 0, 0], [1, 1, .6]), '#d4af37'));
      tb.add(xf(new T.BoxGeometry(.032, .018, .005), [.075 * sx, .31, zf(.31, .008)], [0, -.12, 0]), '#f6f0e6');
    } else tb.add(xf(new T.TorusGeometry(.15, .011, 5, 18), [0, -.015, 0], [Math.PI / 2, 0, 0], [sx, sz, 1]), '#14110f');
    if (S.apronOn) tb.add(xf(new T.BoxGeometry(.27 * bw, .4, .01), [0, -.22, .1], [0, 0, 0]), '#f1efea');
    if (fem && S.skirt) tb.add(xf(lathe([[.001, -.56], [.25, -.56], [.23, -.4], [.18, -.2], [.15, -.02], [.001, .0]], 18), [0, 0, 0], [0, 0, 0], [1.05, 1, .8]), pantsC, true);
    const torso = tb.mesh(spine);

    // ---- Cabeza: cráneo, mandíbula, orejas, nariz, pelo, barba ----
    const hb = Bag();
    const R = [.08, .112, .099];
    hb.add(xf(new T.SphereGeometry(1, 20, 14), [0, 0, 0], [0, 0, 0], R), SKIN);
    hb.add(xf(new T.SphereGeometry(1, 14, 10), [0, -.05, .02], [0, 0, 0], [.068 * (fem ? .94 : 1.04), .062, .076]), SKIN);   // mandíbula y mentón
    hb.add(xf(new T.SphereGeometry(1, 8, 6), [0, -.082, .064], [0, 0, 0], [.022, .016, .018]), SKIN);                       // mentón
    [-1, 1].forEach(q => {
      hb.add(xf(new T.SphereGeometry(1, 8, 6), [q * .08, -.004, -.003], [0, 0, 0], [.009, .025, .019]), shade(SKIN, .96));
    });
    hb.add(xf(new T.ConeGeometry(.011, .034, 6), [0, -.02, .1], [-.2, 0, 0], [1, 1, 1.1]), SKIN);                          // nariz
    hb.add(xf(new T.SphereGeometry(1, 6, 5), [0, -.036, .104], [0, 0, 0], [.011, .008, .01]), SKIN);
    const HC = a.hairColor, hr = [R[0] * 1.07, R[1] * 1.09, R[2] * 1.07];
    const cap = (th = .55, y = .008, z = -.012) => xf(xf(new T.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * th), [0, 0, 0], [-.55, 0, 0]), [0, y, z], [0, 0, 0], hr);
    const style = S.visor ? 'visor' : a.hair;
    if (style !== 'bald' && style !== 'visor') hb.add(cap(style === 'long' || style === 'bob' ? .6 : .52), HC);
    if (style === 'short') hb.add(xf(new T.SphereGeometry(1, 10, 8), [0, .1, .035], [.3, 0, 0], [.07, .02, .05]), HC);
    if (style === 'slick') hb.add(xf(new T.SphereGeometry(1, 12, 8), [0, .035, -.068], [0, 0, 0], [.074, .085, .06]), HC);
    if (style === 'curly') for (let i = 0; i < 20; i++) { const u = i / 20 * Math.PI * 2, rr = .056 + (i % 3) * .01; hb.add(xf(new T.SphereGeometry(.024, 6, 5), [Math.cos(u) * rr, .08 + (i % 4) * .012, Math.sin(u) * rr * 1.1 - .01]), HC); }
    if (style === 'long') {
      hb.add(xf(new T.CylinderGeometry(.094, .068, .3, 12, 1, true), [0, -.1, -.054], [0, 0, 0], [1, 1, .62]), HC);
      [-1, 1].forEach(q => hb.add(xf(new T.CapsuleGeometry(.018, .2, 3, 6), [q * .084, -.07, .0], [0, 0, q * .06]), HC));
      hb.add(xf(new T.SphereGeometry(1, 10, 8), [0, .1, .035], [.4, 0, 0], [.072, .024, .05]), HC);
    }
    if (style === 'bob') { hb.add(xf(new T.CylinderGeometry(.095, .09, .12, 12, 1, true), [0, -.03, -.032], [0, 0, 0], [1, 1, .85]), HC); hb.add(xf(new T.SphereGeometry(1, 10, 8), [0, .1, .035], [.4, 0, 0], [.076, .024, .05]), HC); }
    if (style === 'bun') { hb.add(xf(new T.SphereGeometry(.044, 10, 8), [0, .108, -.072]), HC); hb.add(xf(new T.SphereGeometry(1, 10, 8), [0, .1, .035], [.4, 0, 0], [.072, .024, .05]), HC); }
    if (style === 'ponytail') { hb.add(xf(new T.CapsuleGeometry(.026, .24, 3, 6), [0, -.07, -.125], [.35, 0, 0]), HC); hb.add(xf(new T.SphereGeometry(.026, 6, 5), [0, .035, -.105]), shade(HC, .7)); }
    if (style === 'visor') { hb.add(xf(xf(new T.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI * .3), [0, 0, 0], [-.55, 0, 0]), [0, .03, -.01], [0, 0, 0], hr), S.visorC || '#1f6b4f'); hb.add(xf(new T.BoxGeometry(.15, .004, .07), [0, .052, .098], [.1, 0, 0]), S.visorC || '#1f6b4f'); hb.add(xf(new T.SphereGeometry(1, 16, 10, 0, Math.PI * 2, Math.PI * .5, Math.PI * .22), [0, 0, -.02], [0, 0, 0], [R[0] * 1.07, R[1] * 1.08, R[2] * 1.07]), HC); }
    if (a.beard) hb.add(xf(new T.SphereGeometry(1, 16, 8, Math.PI / 2 - 1.15, 2.3, Math.PI * .56, Math.PI * .34), [0, -.012, .006], [0, 0, 0], [R[0] * 1.03, R[1] * 1.02, R[2] * 1.03]), shade(HC, .9));
    if (a.stache) hb.add(xf(new T.BoxGeometry(.044, .009, .014), [0, -.062, .102]), HC);
    if (a.glasses) { [-1, 1].forEach(q => hb.add(xf(new T.TorusGeometry(.021, .0025, 5, 12), [q * .033, .018, .1]), '#1a1a1d')); hb.add(xf(new T.BoxGeometry(.024, .003, .003), [0, .022, .104]), '#1a1a1d'); }
    const headMesh = hb.mesh(head);
    // decal del rostro (se adapta a la curvatura del cráneo)
    const fg = new T.SphereGeometry(1, 16, 12, Math.PI / 2 - .8, 1.6, Math.PI * .25, Math.PI * .55); fg.scale(R[0] * 1.006, R[1] * 1.006, R[2] * 1.006);
    const face = new T.Mesh(fg, faceMat(a, HC)); face.renderOrder = 2; head.add(face);

    // ---- Brazos ----
    const arms = [-1, 1].map(q => {   // q=-1 → brazo derecho anatómico (x negativo), q=+1 → izquierdo
      const sh = new T.Group(); sh.position.set(q * .188 * bw * (fem ? .92 : 1), .405, 0); spine.add(sh);
      const ub = Bag();
      ub.add(xf(new T.SphereGeometry(.046, 10, 8), [0, 0, 0], [0, 0, 0], [1, 1.05, 1]), sleeveC, true);
      ub.add(lathe([[.039, -.3], [.041, -.22], [.047, -.1], [.05, -.01], [.036, .03]], 12), sleeveC, true);
      const upper = ub.mesh(sh);
      const el = new T.Group(); el.position.y = -.3; sh.add(el);
      const fb = Bag();
      fb.add(xf(new T.SphereGeometry(.04, 8, 6), [0, 0, 0]), sleeveC, true);
      fb.add(lathe([[.03, -.27], [.033, -.2], [.038, -.08], [.041, 0]], 12), S.rolled ? SKIN : sleeveC, !S.rolled);
      if (!S.rolled) fb.add(xf(new T.CylinderGeometry(.034, .034, .024, 12), [0, -.262, 0]), SH);                       // puño de camisa
      if (S.garter) fb.add(xf(new T.TorusGeometry(.044, .005, 5, 12), [0, -.02, 0], [Math.PI / 2, 0, 0]), '#d4af37');      // liga de manga (crupier)
      // mano: palma, dedos ligeramente curvados y pulgar
      fb.add(xf(new T.BoxGeometry(.064, .074, .022), [0, -.31, 0]), SKIN);
      for (let k = 0; k < 4; k++) fb.add(xf(new T.CapsuleGeometry(.0078, .036 + (k === 1 || k === 2 ? .008 : 0), 3, 4), [(k - 1.5) * .0165, -.365 - (k === 1 || k === 2 ? .004 : 0), .006], [-.3, 0, 0]), SKIN);
      fb.add(xf(new T.CapsuleGeometry(.0088, .034, 3, 4), [-q * .04, -.328, .012], [-.3, 0, -q * .75]), SKIN);
      if (S.watch && q === 1) fb.add(xf(new T.CylinderGeometry(.038, .038, .013, 12), [0, -.262, 0]), '#c8a24a');
      const fore = fb.mesh(el);
      return { sh, el, upper, fore };
    });
    // ---- Piernas ----
    const legs = [-1, 1].map(q => {
      const hp = new T.Group(); hp.position.set(q * .09 * bw, -.06, 0); hips.add(hp);
      const tbag = Bag();
      tbag.add(xf(new T.SphereGeometry(.088, 10, 8), [0, 0, 0]), pantsC, true);
      tbag.add(lathe([[.054, -.43], [.062, -.32], [.077, -.15], [.088, -.02]], 12), pantsC, true);
      const thigh = tbag.mesh(hp); thigh.userData.isLeg = true;
      const kn = new T.Group(); kn.position.y = -.43; hp.add(kn);
      const cb = Bag();
      cb.add(xf(new T.SphereGeometry(.055, 8, 6), [0, 0, 0]), pantsC, true);
      cb.add(lathe([[.048, -.42], [.05, -.36], [.047, -.22], [.054, -.06], [.055, 0]], 12), pantsC, true);
      const calf = cb.mesh(kn); calf.userData.isLeg = true;
      const an = new T.Group(); an.position.y = -.42; kn.add(an);
      const sb = Bag();
      sb.add(xf(new T.SphereGeometry(1, 10, 8), [0, -.04, .075], [0, 0, 0], [.045, .034, .105]), '#16120f');             // zapato
      sb.add(xf(new T.BoxGeometry(.084, .03, .09), [0, -.062, -.02]), '#16120f');                                          // talón
      sb.add(xf(new T.BoxGeometry(.088, .012, .24), [0, -.077, .052]), '#0a0807');                                         // suela
      const shoe = sb.mesh(an);
      return { hp, kn, an, thigh, calf, shoe };
    });
    Object.assign(J, { arms, legs, torso, headMesh, face });
    return J;
  }

  // ---------- Creación ----------
  const PANTS_K = .5;
  function create(look, opts = {}) {
    look = look || {};
    const seed = opts.seed ?? look.__seed ?? ('r' + Math.random());
    const a = appearance(seed, opts);
    const suitC = opts.outfit || look.color || '#8d99ae';
    const S = {
      jacketOn: opts.jacket !== false, jacket: suitC, sleeve: opts.sleeve || suitC, pants: opts.pants || shade(suitC, PANTS_K + .1), vest: opts.vest || suitC,
      tieC: opts.tie || a.tie, bow: !!opts.bow, rolled: !!opts.rolled, garter: !!opts.garter, apronOn: !!opts.apron, visor: !!opts.visor, visorC: opts.visorC, skirt: a.skirt && !opts.pants, watch: opts.watch ?? Math.random() < .3, cuffLinks: true,
    };
    const J = buildBody(a, S);
    const g = J.root, sc = a.height * (opts.scale || 1); g.scale.setScalar(sc);
    const shadow = new T.Mesh(new T.CircleGeometry(.5, 18), new T.MeshBasicMaterial({ color: 0, transparent: true, opacity: .38, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = .02; g.add(shadow);
    // Bandeja y teléfono (en la mano derecha)
    const tray = new T.Group(); tray.visible = false; J.arms[0].fore.add(tray); tray.position.set(0, -.37, .1);
    const td = new T.Mesh(new T.CylinderGeometry(.19, .19, .016, 22), new T.MeshStandardMaterial({ color: '#dadde6', metalness: .9, roughness: .22 })); tray.add(td);
    const trayEmoji = sprite('🍹', .34); trayEmoji.position.y = .2; tray.add(trayEmoji);
    const phone = new T.Mesh(new T.BoxGeometry(.07, .146, .008), [0, 1, 2, 3, 4, 5].map(i => new T.MeshStandardMaterial({ color: i === 4 ? '#7fd0ff' : '#101015', metalness: .7, roughness: .25, emissive: i === 4 ? '#2a6a9a' : '#000' })));
    phone.visible = false; phone.position.set(0, -.375, .026); phone.rotation.x = -.15; J.arms[0].fore.add(phone);
    g.userData = { J, a, S, tray, trayEmoji, phone, extras: [], look: null, anim: { phase: Math.random() * 6, run: 0, walk: 0, sit: 0, last: -1, jt: null, wave: 0, phoneW: 0, trayW: 0, dealW: 0, lean: 0, turnW: 0 }, carry: false, pose: '', wave: 0, head: J.head, fixedOutfit: !!opts.outfit, rainbow: false, suitC };
    setLook(g, look);
    return g;
  }

  const FX_EMOJI = { sparkle: '✨', fire: '🔥', aura: '🌟' };
  function recolor(g, color) {      // cambia el color del traje sin reconstruir la malla
    const u = g.userData, c = new T.Color(color), p = new T.Color(shade(color, PANTS_K + .1));
    const J = u.J, meshes = [J.torso, ...J.arms.flatMap(x => [x.upper, x.fore]), ...J.legs.flatMap(x => [x.thigh, x.calf])];
    meshes.forEach(m => {
      const col = m.geometry.attributes.color, su = m.geometry.attributes.suit, isLeg = !!m.userData.isLeg;
      const base = u.S; const cc = isLeg ? p : c;
      for (let i = 0; i < su.count; i++) if (su.array[i] > .5 && !(m === J.torso && false)) { col.array[i * 3] = cc.r; col.array[i * 3 + 1] = cc.g; col.array[i * 3 + 2] = cc.b; }
      col.needsUpdate = true;
    });
    u.suitC = color;
  }
  function setLook(g, look) {
    const u = g.userData; look = look || {};
    const key = JSON.stringify({ c: look.color, h: look.hat, f: look.face, p: look.pet, x: look.fx });
    if (u.look === key) return; u.look = key;
    u.extras.forEach(e => e.parent && e.parent.remove(e)); u.extras = [];
    if (!u.fixedOutfit) {
      u.rainbow = look.color === 'rainbow';
      if (!u.rainbow && look.color && look.color !== u.suitC) recolor(g, look.color);
    }
    const add = (parent, obj) => { parent.add(obj); u.extras.push(obj); return obj; };
    if (look.hat) { const s = add(u.head, sprite(look.hat, .5)); s.position.set(0, .2, 0); }
    if (look.face) { const s = add(u.head, sprite(look.face, .26)); s.position.set(0, .015, .12); }
    if (look.pet) { const s = add(g, sprite(look.pet, .55)); s.position.set(.8, .35, 0); s.userData.pet = true; }
    if (look.fx) {
      for (let i = 0; i < (look.fx === 'aura' ? 1 : 3); i++) {
        const s = add(g, sprite(FX_EMOJI[look.fx], look.fx === 'aura' ? 2.3 : .36));
        s.material = s.material.clone(); s.material.opacity = look.fx === 'aura' ? .3 : 1;
        s.userData.fx = look.fx; s.userData.i = i; s.position.y = 1;
      }
    }
  }

  // Personal del casino: ropa profesional
  const STAFF = {
    waiter:     { outfit: '#f4f3f0', jacket: false, vest: '#17171f', pants: '#101014', sleeve: '#f4f3f0', bow: true, tie: '#7a0f1f', apron: true, watch: true },
    bartender:  { outfit: '#f1efe9', jacket: false, vest: '#5a1030', pants: '#14080d', sleeve: '#f1efe9', rolled: true, tie: '#d4af37', hairStyle: 'slick', watch: true },
    dealer:     { outfit: '#f4f3f0', jacket: false, vest: '#10392c', pants: '#0b0b0b', sleeve: '#f4f3f0', bow: true, tie: '#b3122b', garter: true, visor: false },
    croupier:   { outfit: '#f4f3f0', jacket: false, vest: '#10392c', pants: '#0b0b0b', sleeve: '#f4f3f0', bow: true, tie: '#b3122b', garter: true, visor: true, visorC: '#1f6b4f' },
    shopkeeper: { outfit: '#3b1a78', jacket: true, pants: '#1a0b35', tie: '#ffd166', watch: true },
    doorman:    { outfit: '#141418', jacket: true, pants: '#0e0e12', tie: '#d4af37', watch: true },
  };
  function createStaff(kind, seed) {
    const o = STAFF[kind] || STAFF.waiter;
    const g = create({}, { ...o, seed: seed ?? kind + Math.random(), gender: kind === 'bartender' ? 'm' : kind === 'doorman' ? 'm' : undefined });
    g.userData.kind = kind; return g;
  }

  // ---------- Animación procedural ----------
  const sm = (cur, tgt, k) => cur + (tgt - cur) * k;
  const J0 = () => ({ tx: 0, ty: 0, tz: 0, cx: 0, cy: 0, ux: 0, uz: 0, ex: 0, ax: 0, az: 0, fx: 0, ...{} });
  // Estado: { speed (m/s), turn (rad/s), pose: ''|'sit'|'phone'|'reach' } ; también g.userData.carry (bandeja) y g.userData.deal
  function update(g, dt, st = {}) {
    const u = g.userData, an = u.anim, J = u.J; dt = Math.max(0, Math.min(.06, dt));
    const speed = st.speed || 0, turn = Math.abs(st.turn || 0), pose = st.pose ?? u.pose ?? '';
    const now = (an.t = (an.t || 0) + dt);
    const walkT = speed > .12 ? 1 : 0, runT = Math.max(0, Math.min(1, (speed - 3.3) / 2.4)), sitT = pose === 'sit' ? 1 : 0, phoneT = pose === 'phone' ? 1 : 0, reachT = pose === 'reach' ? 1 : 0;
    const k = 1 - Math.exp(-dt * 11);
    an.walk = sm(an.walk, walkT * (1 - sitT), k); an.run = sm(an.run, runT, k); an.sit = sm(an.sit, sitT, 1 - Math.exp(-dt * 7));
    an.phoneW = sm(an.phoneW, phoneT, k); an.trayW = sm(an.trayW, u.carry ? 1 : 0, k); an.dealW = sm(an.dealW, u.deal ? 1 : 0, k); an.reach = sm(an.reach || 0, reachT, k);
    // zancada: la frecuencia sigue a la velocidad (los pies no patinan)
    const stride = 1.9 + 1.7 * an.run;
    if (speed > .12) an.phase += dt * Math.PI * 2 * (speed / stride);
    const ph = an.phase, w = an.walk, r = an.run, sit = an.sit;
    const sP = Math.sin(ph), cP = Math.cos(ph);
    const idleBreath = Math.sin(now * 1.6 + an.phase * 0), sway = Math.sin(now * .45);
    const turning = Math.max(0, Math.min(1, (turn - .5) / 1.5)) * (1 - w) * (1 - sit);
    an.turnW = sm(an.turnW, turning, k);
    const tph = now * 5.2;     // pasitos al girar en el sitio
    // --- piernas ---
    const A = (.5 + .45 * r) * w, F = (.55 + 1.15 * r) * w;
    let thL = -A * sP, thR = A * sP;
    let knL = F * Math.max(0, cP) + .05 * w, knR = F * Math.max(0, -cP) + .05 * w;
    thL += Math.sin(tph) * .22 * an.turnW; thR -= Math.sin(tph) * .22 * an.turnW;
    knL += Math.max(0, Math.sin(tph)) * .25 * an.turnW; knR += Math.max(0, -Math.sin(tph)) * .25 * an.turnW;
    const lift = (1 - sit);
    thL = thL * lift + -1.52 * sit; thR = thR * lift + -1.52 * sit; knL = knL * lift + 1.52 * sit; knR = knR * lift + 1.52 * sit;
    // pequeño separador de rodillas al sentarse
    const hipZ = .04 * sit;
    // --- cadera, columna y cabeza ---
    const bob = (.016 + .03 * r) * Math.abs(Math.sin(ph)) * w - (.02 * r * w) + idleBreath * .003 * (1 - w) ;
    const lean = (.04 + .2 * r) * w + .04 * an.phoneW - (.06 * sit) + (.0 * an.trayW);
    const twist = (.14 + .22 * r) * sP * w;
    // --- brazos ---
    const swing = (.5 + .55 * r) * w;
    let uaL = swing * sP, uaR = -swing * sP, faL = -(.2 + .95 * r) * w - .12, faR = -(.2 + .95 * r) * w - .12;
    let azL = .06 + .03 * sway * (1 - w), azR = -(.06 + .03 * sway * (1 - w));
    const brth = Math.sin(now * 1.6) * .015;
    uaL += brth; uaR += brth;
    // sentado / mesa: antebrazos apoyados sobre las rodillas o la mesa
    if (sit > .01) { uaL = sm(uaL, -.45, sit); uaR = sm(uaR, -.45, sit); faL = sm(faL, -1.0, sit); faR = sm(faR, -1.0, sit); }
    // teléfono: brazo derecho levantado, izquierdo sostiene
    if (an.phoneW > .01) { const p = an.phoneW; uaR = sm(uaR, -1.0, p); faR = sm(faR, -1.55, p); azR = sm(azR, -.12, p); uaL = sm(uaL, -.2, p * .8); faL = sm(faL, -.7, p * .8); }
    // bandeja (camareros): brazo derecho flexionado con la bandeja a la altura del pecho, el izquierdo a la espalda
    if (an.trayW > .01) { const p = an.trayW; uaR = sm(uaR, -.55, p); faR = sm(faR, -1.45, p); azR = sm(azR, -.2, p); uaL = sm(uaL, .45 + .18 * sP * w, p); faL = sm(faL, -.5, p); azL = sm(azL, .18, p); }
    // reparto de cartas / gesto del crupier
    if (an.dealW > .01) { const p = an.dealW, c = Math.sin(now * 1.3), flick = Math.max(0, Math.sin(now * 2.6)); uaR = sm(uaR, -.55 - flick * .2, p); faR = sm(faR, -1.2 + flick * .5, p); uaL = sm(uaL, -.6, p); faL = sm(faL, -1.1, p); azR = sm(azR, -.25 + c * .08, p); azL = sm(azL, .25 - c * .08, p); }
    // interactuar: extender la mano hacia delante
    if (an.reach > .01) { const p = an.reach; uaR = sm(uaR, -1.35, p); faR = sm(faR, -.35, p); }
    // saludo
    if (u.wave > 0) { u.wave -= dt; const p = Math.min(1, u.wave * 3); uaR = sm(uaR, -2.5, p); faR = sm(faR, -.9 + Math.sin(now * 10) * .45, p); azR = sm(azR, -.4, p); }
    // --- cabeza ---
    const look = Math.sin(now * .37 + an.phase) * .18 * (1 - w) * (1 - an.phoneW);
    const headX = -.04 * w + .38 * an.phoneW + .1 * sit * 0 + Math.sin(now * .53) * .02;
    // suavizado de articulaciones
    const T_ = { thL, thR, knL, knR, uaL, uaR, faL, faR, azL, azR, lean, twist, bob, look, headX, hipZ, turnLean: (st.turn || 0) * .05 * (w + .3) };
    const jt = an.jt || (an.jt = { ...T_ }); const kk = 1 - Math.exp(-dt * (w > .3 ? 22 : 14));
    for (const key in T_) jt[key] = jt[key] + (T_[key] - jt[key]) * kk;
    const L = J.legs, Ar = J.arms;
    L[1].hp.rotation.set(jt.thL, 0, -jt.hipZ); L[0].hp.rotation.set(jt.thR, 0, jt.hipZ);
    L[1].kn.rotation.x = jt.knL; L[0].kn.rotation.x = jt.knR;
    // pies: se mantienen casi paralelos al suelo; despegan la punta al impulsarse
    L[1].an.rotation.x = -(jt.thL + jt.knL) * (1 - sit) * .78 + sit * -.1 + .2 * Math.max(0, -cP) * w * 0; L[0].an.rotation.x = -(jt.thR + jt.knR) * (1 - sit) * .78 + sit * -.1;
    Ar[1].sh.rotation.set(jt.uaL, 0, jt.azL); Ar[0].sh.rotation.set(jt.uaR, 0, jt.azR);
    Ar[1].el.rotation.x = jt.faL; Ar[0].el.rotation.x = jt.faR;
    J.hips.rotation.set(0, -jt.twist * .5, Math.sin(ph) * .035 * w + jt.turnLean * 0 + sway * .012 * (1 - w) * (1 - sit));
    J.spine.rotation.set(jt.lean, jt.twist * .9, -jt.turnLean + Math.sin(ph) * -.03 * w);
    J.neck.rotation.set(jt.headX * .5, jt.look * .5, 0); J.head.rotation.set(jt.headX * .5, jt.look * .5, 0);
    // altura: la cadera sube con el paso y baja al sentarse
    J.hips.position.y = .93 - sit * .36 * 0 + jt.bob - (sit ? 0 : 0);
    if (sit > .01) J.hips.position.y = .93 - sit * .42 + jt.bob;
    J.hips.position.z = -sit * .02;
    if (u.rainbow && Math.floor(now * 8) !== an.rb) { an.rb = Math.floor(now * 8); recolor(g, '#' + new T.Color().setHSL((now * .15) % 1, .85, .55).getHexString()); u.suitC = 'rainbow'; }
    // accesorios de mano
    u.tray.visible = an.trayW > .5; u.phone.visible = an.phoneW > .5;
    u.extras.forEach(e => {
      if (e.userData.pet) e.position.y = .35 + Math.abs(Math.sin(now * 5)) * .15;
      if (e.userData.fx && e.userData.fx !== 'aura') { const q = now * 2 + e.userData.i * 2.1; e.position.set(Math.cos(q) * .55, .9 + Math.sin(now * 3 + e.userData.i) * .4, Math.sin(q) * .55); }
    });
  }
  // Compatibilidad con el código anterior: animate(g, t, moving)
  function animate(g, t, moving) {
    const u = g.userData, an = u.anim, dt = an.last < 0 ? .016 : Math.min(.06, Math.max(.001, t - an.last)); an.last = t;
    update(g, dt, { speed: moving ? 2.4 : 0, turn: 0, pose: u.pose });
  }
  function carry(g, emoji) {
    const u = g.userData; u.carry = !!emoji;
    if (emoji) { u.trayEmoji.material.map = emojiTex(emoji); u.trayEmoji.material.needsUpdate = true; }
  }

  // ---------- Manos en primera persona (se muestran al usar el teléfono o interactuar) ----------
  function createHands(look, seed) {
    const a = appearance(seed), suitC = (look && look.color && look.color !== 'rainbow') ? look.color : '#8d99ae';
    const S = { sleeve: suitC, rolled: false, garter: false, cuffLinks: true, watch: true };
    const grp = new T.Group(), hands = [];
    [-1, 1].forEach(s => {
      const fb = Bag();
      fb.add(lathe([[.033, -.27], [.036, -.2], [.042, -.08], [.046, 0]], 14), suitC, true);
      fb.add(xf(new T.CylinderGeometry(.037, .037, .026, 14), [0, -.262, 0]), '#f3f1ee');
      fb.add(xf(new T.BoxGeometry(.072, .085, .026), [0, -.322, 0]), a.skin);
      for (let k = 0; k < 4; k++) fb.add(xf(new T.CapsuleGeometry(.0085, .05 + (k === 1 || k === 2 ? .008 : 0), 3, 5), [(k - 1.5) * .0185, -.39 - (k === 1 || k === 2 ? .004 : 0), .005], [-.28, 0, 0]), a.skin);
      fb.add(xf(new T.CapsuleGeometry(.0095, .042, 3, 5), [-s * .044, -.34, .012], [-.3, 0, -s * .75]), a.skin);
      const holder = new T.Group(); grp.add(holder);
      const m = fb.mesh(holder); m.frustumCulled = false;
      hands.push({ holder, s });
    });
    const ph = new T.Mesh(new T.BoxGeometry(.07, .146, .008), [0, 1, 2, 3, 4, 5].map(i => new T.MeshStandardMaterial({ color: i === 4 ? '#7fd0ff' : '#101015', metalness: .7, roughness: .25, emissive: i === 4 ? '#2a6a9a' : '#000' })));
    grp.add(ph); ph.position.set(.06, -.235, -.47); ph.rotation.set(-.3, -.08, .06);
    grp.visible = false;
    let w = 0, ww = 0;
    return {
      group: grp, phone: ph,
      update(dt, mode, t, moving) {      // mode: 'none' | 'phone' | 'reach'
        const target = mode === 'none' ? 0 : 1; w = sm(w, target, 1 - Math.exp(-dt * 9)); ww = sm(ww, moving ? 1 : 0, 1 - Math.exp(-dt * 6));
        grp.visible = w > .02; if (!grp.visible) return;
        const sway = Math.sin(t * 9) * .006 * ww, bob = Math.abs(Math.sin(t * 9)) * .008 * ww;
        const ph_ = mode === 'phone', rc = mode === 'reach';
        hands.forEach(({ holder, s }) => {
          const right = s < 0;
          // La mano cuelga hacia -y desde el codo; en el espacio de la cámara "delante" es -z (giro positivo en x = hacia delante)
          let px = right ? .15 : -.15, py = -.78 + w * .0, pz = -.2, rx = 1.3, rz = 0;
          if (ph_) { if (right) { px = .09; py = -.4; pz = -.13; rx = 1.95; rz = .0; } else { px = -.11; py = -.46; pz = -.1; rx = 1.7; rz = -.25; } }
          else if (rc) { if (right) { px = .13; py = -.15 - (1 - w) * .5; pz = -.2 - Math.sin(t * 7) * .02; rx = 1.38; } else { px = -.16; py = -.55; pz = -.2; rx = 1.3; } }
          else { py = -.78; }
          holder.position.set(px + sway, py + bob, pz); holder.rotation.set(rx, 0, rz);
        });
        ph.visible = ph_;
      },
    };
  }

  return { create, createStaff, setLook, animate, update, carry, sprite, emojiTex, createHands, appearance, recolor };
})();
