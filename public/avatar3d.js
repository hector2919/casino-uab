// 🧍 Personajes 3D estilizados (cuerpo con curvas, traje, cabeza redondeada) con capas de personalización.
// Misma API que antes: create, setLook, animate, sprite, emojiTex. Nuevo: createStaff (camareros, crupieres…).
const AV = (() => {
  const T = THREE;
  const texCache = {};
  // Textura con un emoji dibujado en un canvas
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
  const SKINS = ['#f3d0b3', '#e6b48d', '#cf9569', '#a8714a', '#7d4e31', '#5b3722'];
  const HAIRS = ['#15110e', '#2b1a10', '#4a2c17', '#7a5230', '#c8a45a', '#2a2a30'];
  const hash = s => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
  const cap = (r, l) => new T.CapsuleGeometry(r, l, 5, 12);
  const GEO = {};   // geometrías compartidas
  const geo = (k, f) => GEO[k] || (GEO[k] = f());

  // opts: { seed, outfit, pants, shirt, tie, vest, hair, skin, staff }
  function create(look, opts = {}) {
    const h = hash(opts.seed ?? Math.random());
    const skinC = opts.skin || SKINS[h % SKINS.length], hairC = opts.hair || HAIRS[(h >> 3) % HAIRS.length];
    const suit = new T.MeshStandardMaterial({ color: opts.outfit || '#8d99ae', roughness: .55, metalness: .08 });
    const pants = new T.MeshStandardMaterial({ color: opts.pants || '#1b1b26', roughness: .7 });
    const shirt = new T.MeshStandardMaterial({ color: opts.shirt || '#f4f4f8', roughness: .6 });
    const skin = new T.MeshStandardMaterial({ color: skinC, roughness: .6 });
    const hair = new T.MeshStandardMaterial({ color: hairC, roughness: .5 });
    const dark = new T.MeshStandardMaterial({ color: '#0b0b10', roughness: .35, metalness: .3 });
    const accent = new T.MeshStandardMaterial({ color: opts.tie || '#c1121f', roughness: .4, emissive: opts.tie || '#c1121f', emissiveIntensity: .15 });
    const M = (g, m, x = 0, y = 0, z = 0, p) => { const o = new T.Mesh(g, m); o.position.set(x, y, z); p && p.add(o); return o; };

    const g = new T.Group();
    const body = new T.Group(); g.add(body);
    // Torso (chaqueta) + camisa en el cuello + corbata/pajarita
    const torso = M(geo('torso', () => cap(.2, .46)), suit, 0, 1.22, 0, body); torso.scale.set(1.28, 1, .78);
    const chest = M(geo('chest', () => new T.BoxGeometry(.14, .34, .02)), shirt, 0, 1.3, .15, body);
    M(geo('tie', () => new T.BoxGeometry(.055, .24, .02)), accent, 0, 1.25, .162, body);
    const belt = M(geo('belt', () => new T.CylinderGeometry(.215, .215, .05, 18)), dark, 0, .93, 0, body); belt.scale.set(1.28, 1, .78);
    if (opts.vest) { const v = M(geo('vest', () => cap(.205, .3)), new T.MeshStandardMaterial({ color: opts.vest, roughness: .5 }), 0, 1.17, .02, body); v.scale.set(1.3, 1, .8); }
    // Cabeza
    const head = new T.Group(); head.position.y = 1.7; body.add(head);
    M(geo('neck', () => new T.CylinderGeometry(.055, .065, .12, 12)), skin, 0, 1.56, 0, body);
    const skull = M(geo('skull', () => new T.SphereGeometry(.125, 24, 18)), skin, 0, 0, 0, head); skull.scale.set(1, 1.18, 1.05);
    const hairCap = M(geo('hair', () => new T.SphereGeometry(.134, 24, 14, 0, Math.PI * 2, 0, Math.PI * .56)), hair, 0, .012, -.012, head); hairCap.scale.set(1, 1.16, 1.08);
    for (const s of [-1, 1]) {
      M(geo('eye', () => new T.SphereGeometry(.021, 10, 8)), new T.MeshBasicMaterial({ color: '#fff' }), s * .045, .02, .115, head);
      M(geo('pupil', () => new T.SphereGeometry(.011, 8, 6)), new T.MeshBasicMaterial({ color: '#111' }), s * .045, .02, .133, head);
      M(geo('ear', () => new T.SphereGeometry(.027, 8, 8)), skin, s * .125, -.01, 0, head);
    }
    M(geo('nose', () => new T.SphereGeometry(.018, 8, 6)), skin, 0, -.012, .13, head);
    const smile = M(geo('smile', () => new T.TorusGeometry(.03, .0055, 6, 12, Math.PI)), dark, 0, -.055, .118, head); smile.rotation.z = Math.PI;
    // Brazos y piernas (pivotan en hombro y cadera)
    const arms = [-1, 1].map(s => {
      const a = new T.Group(); a.position.set(s * .31, 1.48, 0); body.add(a);
      M(geo('arm', () => cap(.062, .46)), suit, 0, -.3, 0, a);
      M(geo('cuff', () => new T.CylinderGeometry(.052, .052, .04, 10)), shirt, 0, -.55, 0, a);
      M(geo('hand', () => new T.SphereGeometry(.05, 10, 8)), skin, 0, -.62, 0, a);
      return a;
    });
    const legs = [-1, 1].map(s => {
      const l = new T.Group(); l.position.set(s * .115, .92, 0); body.add(l);
      M(geo('leg', () => cap(.082, .62)), pants, 0, -.42, 0, l);
      M(geo('shoe', () => new T.BoxGeometry(.12, .07, .27)), dark, 0, -.86, .05, l);
      return l;
    });
    // Sombra suave en el suelo
    const shadow = new T.Mesh(geo('shadow', () => new T.CircleGeometry(.5, 20)), new T.MeshBasicMaterial({ color: 0, transparent: true, opacity: .4, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = .02; g.add(shadow);
    // Bandeja (camareros)
    const tray = new T.Group(); tray.visible = false; tray.position.set(.18, 1.28, .46); body.add(tray);
    M(geo('trayD', () => new T.CylinderGeometry(.2, .2, .02, 20)), new T.MeshStandardMaterial({ color: '#d9d9e0', metalness: .9, roughness: .2 }), 0, 0, 0, tray);
    const trayEmoji = sprite('🍹', .34); trayEmoji.position.y = .2; tray.add(trayEmoji);

    g.userData = { suit, skin, head, body, arms, legs, tray, trayEmoji, extras: [], look: null, phase: Math.random() * 6, carry: false, wave: 0, fixedOutfit: !!opts.outfit };
    setLook(g, look || {});
    return g;
  }

  const FX_EMOJI = { sparkle: '✨', fire: '🔥', aura: '🌟' };
  function setLook(g, look) {
    const u = g.userData;
    if (u.look && JSON.stringify(u.look) === JSON.stringify(look)) return;
    u.look = { ...look };
    u.extras.forEach(e => e.parent && e.parent.remove(e)); u.extras = [];
    if (!u.fixedOutfit) {
      u.rainbow = look.color === 'rainbow';
      if (!u.rainbow) u.suit.color.set(look.color || '#8d99ae');
    }
    u.suit.emissive = new T.Color(look.fx === 'aura' ? 0x553300 : 0x000000);
    const add = (parent, obj) => { parent.add(obj); u.extras.push(obj); return obj; };
    if (look.hat) { const s = add(u.head, sprite(look.hat, .5)); s.position.set(0, .2, 0); }
    if (look.face) { const s = add(u.head, sprite(look.face, .3)); s.position.set(0, .02, .15); }
    if (look.pet) { const s = add(g, sprite(look.pet, .55)); s.position.set(.75, .35, 0); s.userData.pet = true; }
    if (look.fx) {
      for (let i = 0; i < (look.fx === 'aura' ? 1 : 3); i++) {
        const s = add(g, sprite(FX_EMOJI[look.fx], look.fx === 'aura' ? 2.3 : .36));
        s.material = s.material.clone(); s.material.opacity = look.fx === 'aura' ? .3 : 1;
        s.userData.fx = look.fx; s.userData.i = i; s.position.y = 1;
      }
    }
  }

  // Personal del casino: camarero, bartender, crupier, tendero
  const STAFF = {
    waiter:     { outfit: '#14141c', pants: '#0d0d12', tie: '#e0b040', vest: '#1d1d2b' },
    bartender:  { outfit: '#3a0c1e', pants: '#14080d', tie: '#ffb703', vest: '#5a1030' },
    dealer:     { outfit: '#0f4a3a', pants: '#0a0a0a', tie: '#e63946', vest: '#0b2f26' },
    shopkeeper: { outfit: '#3b1a78', pants: '#17092f', tie: '#ffd166', vest: '#5a2aa8' },
  };
  function createStaff(kind, seed) { return create({}, { ...STAFF[kind], seed: seed ?? kind + Math.random() }); }

  // Animación: andar balanceando brazos y piernas; reposo con respiración
  function animate(g, t, moving) {
    const u = g.userData, s = moving ? Math.sin(t * 9 + u.phase) * .65 : 0;
    u.arms[0].rotation.x = u.carry ? -.2 : s; u.arms[1].rotation.x = u.carry ? -1.35 : -s;
    if (u.wave > 0) { u.arms[1].rotation.x = -2.6 + Math.sin(t * 10) * .25; u.wave -= .016; }
    u.legs[0].rotation.x = -s; u.legs[1].rotation.x = s;
    u.body.position.y = moving ? Math.abs(Math.sin(t * 9 + u.phase)) * .035 : Math.sin(t * 1.6 + u.phase) * .006;
    u.head.rotation.z = moving ? 0 : Math.sin(t * .8 + u.phase) * .03;
    if (u.rainbow) u.suit.color.setHSL((t * .15) % 1, .85, .55);
    u.extras.forEach(e => {
      if (e.userData.pet) e.position.y = .35 + Math.abs(Math.sin(t * 5)) * .15;
      if (e.userData.fx && e.userData.fx !== 'aura') {
        const a = t * 2 + e.userData.i * 2.1;
        e.position.set(Math.cos(a) * .55, .9 + Math.sin(t * 3 + e.userData.i) * .4, Math.sin(a) * .55);
      }
    });
  }
  function carry(g, emoji) {
    const u = g.userData; u.carry = !!emoji; u.tray.visible = !!emoji;
    if (emoji) { u.trayEmoji.material.map = emojiTex(emoji); u.trayEmoji.material.needsUpdate = true; }
  }
  return { create, createStaff, setLook, animate, carry, sprite, emojiTex };
})();
