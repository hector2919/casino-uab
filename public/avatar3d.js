// Personajes 3D tipo "bloque" (cabeza, torso, brazos y piernas) con capas de personalización
const AV = (() => {
  const texCache = {};
  // Textura con un emoji o texto dibujado en un canvas
  function emojiTex(txt, size = 128) {
    if (texCache[txt]) return texCache[txt];
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'); x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `${size * .8}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif`;
    x.fillText(txt, size / 2, size / 2 + size * .05);
    const t = new THREE.CanvasTexture(c); texCache[txt] = t; return t;
  }
  function sprite(txt, scale) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex(txt), transparent: true, depthWrite: false }));
    s.scale.set(scale, scale, 1); return s;
  }
  // Cara (ojos + sonrisa)
  let faceTex;
  function getFace() {
    if (faceTex) return faceTex;
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.beginPath(); x.ellipse(42, 54, 14, 18, 0, 0, 7); x.ellipse(86, 54, 14, 18, 0, 0, 7); x.fill();
    x.fillStyle = '#111'; x.beginPath(); x.arc(45, 58, 8, 0, 7); x.arc(89, 58, 8, 0, 7); x.fill();
    x.strokeStyle = '#111'; x.lineWidth = 7; x.lineCap = 'round'; x.beginPath(); x.arc(64, 78, 22, .3, Math.PI - .3); x.stroke();
    faceTex = new THREE.CanvasTexture(c); return faceTex;
  }
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);

  function create(look) {
    const g = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0x8d99ae, roughness: .5 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2b2d42, roughness: .7 });
    const head = new THREE.Group(); head.position.y = 2.05;
    const headMesh = box(.8, .8, .8, skin); head.add(headMesh);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(.78, .78), new THREE.MeshBasicMaterial({ map: getFace(), transparent: true }));
    face.position.z = .401; head.add(face);
    const torso = box(1, 1, .55, skin); torso.position.y = 1.15;
    const armL = new THREE.Group(), armR = new THREE.Group();
    [armL, armR].forEach((a, i) => { const m = box(.35, .95, .35, skin); m.position.y = -.4; a.add(m); a.position.set(i ? .7 : -.7, 1.6, 0); });
    const legL = new THREE.Group(), legR = new THREE.Group();
    [legL, legR].forEach((l, i) => { const m = box(.42, .7, .45, dark); m.position.y = -.35; l.add(m); l.position.set(i ? .24 : -.24, .66, 0); });
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(.75, 20), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: .35, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = .02;
    const body = new THREE.Group(); body.add(head, torso, armL, armR, legL, legR);
    g.add(shadow, body);
    g.userData = { skin, head, body, armL, armR, legL, legR, extras: [], look: null, phase: Math.random() * 6 };
    setLook(g, look);
    return g;
  }

  const FX_EMOJI = { sparkle: '✨', fire: '🔥', aura: '🌟' };
  function setLook(g, look) {
    const u = g.userData;
    if (u.look && JSON.stringify(u.look) === JSON.stringify(look)) return;
    u.look = { ...look };
    u.extras.forEach(e => e.parent.remove(e)); u.extras = [];
    u.rainbow = look.color === 'rainbow';
    if (!u.rainbow) u.skin.color.set(look.color || '#8d99ae');
    u.skin.emissive = new THREE.Color(look.fx === 'aura' ? 0x664400 : 0x000000);
    const add = (parent, obj) => { parent.add(obj); u.extras.push(obj); return obj; };
    if (look.hat) { const s = add(u.head, sprite(look.hat, 1.1)); s.position.set(0, .7, 0); }
    if (look.face) { const s = add(u.head, sprite(look.face, .95)); s.position.set(0, .02, .45); }
    if (look.pet) { const s = add(g, sprite(look.pet, .9)); s.position.set(1.3, .7, 0); s.userData.pet = true; }
    if (look.fx) {
      for (let i = 0; i < (look.fx === 'aura' ? 1 : 3); i++) {
        const s = add(g, sprite(FX_EMOJI[look.fx], look.fx === 'aura' ? 3.2 : .6));
        s.material = s.material.clone(); s.material.opacity = look.fx === 'aura' ? .35 : 1;
        s.userData.fx = look.fx; s.userData.i = i; s.position.y = 1.3;
      }
    }
  }

  // Animación: andar balanceando brazos y piernas
  function animate(g, t, moving) {
    const u = g.userData, s = moving ? Math.sin(t * 12 + u.phase) * .7 : 0;
    u.armL.rotation.x = s; u.armR.rotation.x = -s; u.legL.rotation.x = -s; u.legR.rotation.x = s;
    u.body.position.y = moving ? Math.abs(Math.sin(t * 12 + u.phase)) * .12 : Math.sin(t * 2 + u.phase) * .03;
    if (u.rainbow) u.skin.color.setHSL((t * .15) % 1, .9, .6);
    u.extras.forEach(e => {
      if (e.userData.pet) e.position.y = .7 + Math.abs(Math.sin(t * 5)) * .3;
      if (e.userData.fx && e.userData.fx !== 'aura') {
        const a = t * 2 + e.userData.i * 2.1;
        e.position.set(Math.cos(a) * 1, 1.2 + Math.sin(t * 3 + e.userData.i) * .6, Math.sin(a) * 1);
      }
    });
  }
  return { create, setLook, animate, sprite, emojiTex };
})();
