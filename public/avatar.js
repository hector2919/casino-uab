// Dibuja un avatar con todas sus capas de personalización
function bodyColor(look, t) {
  return look.color === 'rainbow' ? `hsl(${(t / 8) % 360},90%,60%)` : look.color;
}

function drawAvatar(ctx, look, x, y, r, t, opt = {}) {
  const bob = Math.sin(t / 180 + (opt.seed || 0)) * (opt.moving ? 3 : 1);
  y += bob;
  // Efectos traseros
  if (look.fx === 'aura') {
    const g = ctx.createRadialGradient(x, y, r * .6, x, y, r * 2.2);
    g.addColorStop(0, '#ffd166cc'); g.addColorStop(1, '#ffd16600');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.2 + Math.sin(t / 200) * 3, 0, 7); ctx.fill();
  }
  if (look.fx === 'fire') {
    for (let i = 0; i < 6; i++) {
      const a = t / 300 + i, fy = y + r * .6 - ((t / 4 + i * 40) % (r * 2.4));
      ctx.globalAlpha = .7; ctx.font = `${r * .8}px serif`; ctx.textAlign = 'center';
      ctx.fillText('🔥', x + Math.sin(a * 2) * r, fy + r);
    }
    ctx.globalAlpha = 1;
  }
  // Sombra
  ctx.fillStyle = '#0006'; ctx.beginPath(); ctx.ellipse(x, y + r * 1.05 - bob, r * .9, r * .3, 0, 0, 7); ctx.fill();
  // Cuerpo
  const c = bodyColor(look, t);
  const g2 = ctx.createRadialGradient(x - r * .35, y - r * .4, r * .2, x, y, r);
  g2.addColorStop(0, '#ffffff88'); g2.addColorStop(.35, c); g2.addColorStop(1, c);
  ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.lineWidth = opt.me ? 3 : 2; ctx.strokeStyle = opt.me ? '#ffd166' : '#000a'; ctx.stroke();
  // Ojos
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - r * .33, y - r * .1, r * .22, 0, 7); ctx.arc(x + r * .33, y - r * .1, r * .22, 0, 7); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(x - r * .3, y - r * .07, r * .11, 0, 7); ctx.arc(x + r * .36, y - r * .07, r * .11, 0, 7); ctx.fill();
  // Sonrisa
  ctx.strokeStyle = '#111'; ctx.lineWidth = Math.max(1.5, r * .08);
  ctx.beginPath(); ctx.arc(x, y + r * .2, r * .3, .2, Math.PI - .2); ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // Cara
  if (look.face) { ctx.font = `${r * 1.15}px serif`; ctx.fillText(look.face, x, y - r * .05); }
  // Sombrero
  if (look.hat) { ctx.font = `${r * 1.2}px serif`; ctx.fillText(look.hat, x, y - r * 1.05); }
  // Mascota
  if (look.pet) { ctx.font = `${r * .95}px serif`; ctx.fillText(look.pet, x + r * 1.45, y + r * .55 + Math.sin(t / 140) * 4); }
  // Brillos
  if (look.fx === 'sparkle') {
    ctx.font = `${r * .55}px serif`;
    for (let i = 0; i < 3; i++) {
      const a = t / 500 + i * 2.1;
      ctx.globalAlpha = .5 + .5 * Math.sin(t / 150 + i);
      ctx.fillText('✨', x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r * 1.6);
    }
    ctx.globalAlpha = 1;
  }
  // Nombre
  if (opt.name) {
    ctx.font = `700 ${Math.max(11, r * .62)}px Inter, sans-serif`;
    const label = opt.name + (opt.coins != null ? `  🪙${opt.coins}` : '');
    const w = ctx.measureText(label).width + 12;
    ctx.fillStyle = opt.me ? '#ffd166ee' : '#000b';
    roundRect(ctx, x - w / 2, y + r * 1.25, w, r * .95, 6); ctx.fill();
    ctx.fillStyle = opt.me ? '#2a0610' : '#fff';
    ctx.fillText(label, x, y + r * 1.25 + r * .5);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
