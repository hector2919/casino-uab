// ¡DERRAPA! · Vista 2D clásica (la original). Se usa si el ordenador no tiene WebGL2 o si se pulsa "Vista 2D".
(function () {
'use strict';
class Render2D {
  constructor(cv) { this.cv = cv; this.ctx = cv.getContext('2d'); this.T = null; this.bg = null; }
  setTrack(T) { this.T = T; this.cv.width = T.W; this.cv.height = T.H; this.bg = this.drawTrack(); }

  // ---------- Circuito pintado una sola vez en un canvas aparte ----------
  drawTrack() {
    const T = this.T, c = document.createElement('canvas'); c.width = T.W; c.height = T.H;
    const g = c.getContext('2d');
    for (let x = 0; x < T.W; x += 80) { g.fillStyle = (x / 80) % 2 ? '#3f8f3a' : '#47a042'; g.fillRect(x, 0, 80, T.H); }
    const near = (x, y) => T.pts.some(p => Math.hypot(p[0] - x, p[1] - y) < T.HALF_W + 45);
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * T.W, y = Math.random() * T.H;
      if (near(x, y)) continue;
      g.fillStyle = '#0003'; g.beginPath(); g.arc(x + 5, y + 6, 18, 0, 7); g.fill();
      g.fillStyle = '#2e6b2b'; g.beginPath(); g.arc(x, y, 18, 0, 7); g.fill();
      g.fillStyle = '#3a8235'; g.beginPath(); g.arc(x - 5, y - 5, 10, 0, 7); g.fill();
    }
    const path = () => { g.beginPath(); T.pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); };
    g.lineJoin = g.lineCap = 'round';
    path(); g.lineWidth = T.HALF_W * 2 + 18; g.strokeStyle = '#fff'; g.stroke();
    path(); g.setLineDash([22, 22]); g.strokeStyle = '#e8433c'; g.stroke(); g.setLineDash([]);
    path(); g.lineWidth = T.HALF_W * 2; g.strokeStyle = '#5a5d66'; g.stroke();
    path(); g.lineWidth = T.HALF_W * 2 - 14; g.strokeStyle = '#62656e'; g.stroke();
    path(); g.lineWidth = 3; g.setLineDash([26, 30]); g.strokeStyle = '#ffffff55'; g.stroke(); g.setLineDash([]);
    // plataformas de turbo
    for (const p of T.pads || []) {
      g.save(); g.translate(p.x, p.y); g.rotate(p.a);
      g.fillStyle = '#ff9f1a'; g.fillRect(-T.padLen / 2, -T.padW / 2, T.padLen, T.padW);
      g.fillStyle = '#fff3'; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(k * 16 - 6, -14); g.lineTo(k * 16 + 6, 0); g.lineTo(k * 16 - 6, 14); g.lineTo(k * 16 - 1, 0); g.fill(); }
      g.restore();
    }
    const [a, b] = [T.pts[0], T.pts[1]];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    g.save(); g.translate(a[0], a[1]); g.rotate(ang);
    const sq = 12;
    for (let y = -T.HALF_W, r = 0; y < T.HALF_W; y += sq, r++)
      for (let k = 0; k < 2; k++) { g.fillStyle = (r + k) % 2 ? '#fff' : '#111'; g.fillRect(-sq + k * sq, y, sq, sq); }
    g.restore();
    return c;
  }

  drawKart(p, t) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.rotate(p.a + (p.spin ? t * 0.025 : 0));
    ctx.fillStyle = '#0005'; ctx.beginPath(); ctx.ellipse(3, 4, 22, 15, 0, 0, 7); ctx.fill();
    if (p.boost) {
      ctx.fillStyle = '#ffd43b'; ctx.shadowColor = '#ff7a1a'; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.moveTo(-18, -6); ctx.lineTo(-36 - Math.random() * 16, 0); ctx.lineTo(-18, 6); ctx.fill();
      ctx.shadowBlur = 0;
    }
    if (p.drift >= 0) {
      ctx.fillStyle = ['#ddd', '#4dabf7', '#ff922b'][p.drift];
      for (let i = 0; i < 5; i++) for (const s of [-1, 1])
        ctx.fillRect(-20 - Math.random() * 14, s * 13 + (Math.random() - .5) * 8, 3, 3);
    }
    ctx.fillStyle = '#111';
    for (const [x, y] of [[-12, -13], [-12, 13], [11, -12], [11, 12]]) ctx.fillRect(x - 6, y - 4, 12, 8);
    ctx.fillStyle = p.color; ctx.strokeStyle = '#0008'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(-17, -10, 36, 20, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff8'; ctx.fillRect(10, -7, 6, 14);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-3, 0, 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#222'; ctx.fillRect(0, -4, 4, 8);
    if (p.br) { ctx.fillStyle = '#ff2020'; ctx.fillRect(-19, -9, 3, 5); ctx.fillRect(-19, 4, 3, 5); }
    ctx.restore();
    if (p.shield) {
      ctx.strokeStyle = '#74c0fc'; ctx.lineWidth = 3; ctx.fillStyle = '#74c0fc33';
      ctx.beginPath(); ctx.arc(p.x, p.y, 28 + Math.sin(t / 120) * 2, 0, 7); ctx.fill(); ctx.stroke();
    }
    ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = '#000a'; ctx.strokeText(p.name, p.x, p.y - 30);
    ctx.fillStyle = '#fff'; ctx.fillText(p.name, p.x, p.y - 30);
  }
  drawBox(x, y, t) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t / 500) * 0.4);
    const hue = (t / 8) % 360;
    ctx.fillStyle = `hsla(${hue},90%,60%,.85)`; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(-14, -14, 28, 28, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('?', 0, 1);
    ctx.restore();
  }
  drawOil([x, y]) {
    const ctx = this.ctx;
    ctx.fillStyle = '#111c'; ctx.beginPath(); ctx.ellipse(x, y, 20, 15, 0.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#6a3fb855'; ctx.beginPath(); ctx.ellipse(x - 5, y - 3, 8, 5, 0.4, 0, 7); ctx.fill();
  }
  drawMissile([x, y, a]) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(-24 - Math.random() * 10, 0); ctx.lineTo(-10, 4); ctx.fill();
    ctx.fillStyle = '#e8433c'; ctx.beginPath(); ctx.roundRect(-11, -5, 20, 10, 5); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(4, -5, 3, 10);
    ctx.restore();
  }
  frame(S, t) {
    if (!this.bg) return;
    const ctx = this.ctx;
    ctx.drawImage(this.bg, 0, 0);
    // de noche oscurecemos un poco la vista 2D
    if (S && S.ambient === 'night') { ctx.fillStyle = '#10063088'; ctx.fillRect(0, 0, this.cv.width, this.cv.height); }
    else if (S && S.ambient === 'sunset') { ctx.fillStyle = '#ff6a0026'; ctx.fillRect(0, 0, this.cv.width, this.cv.height); }
    if (!S) return;
    S.boxes.forEach((on, i) => on && this.drawBox(this.T.boxes[i].x, this.T.boxes[i].y, t));
    S.hazards.forEach(h => this.drawOil(h));
    S.missiles.forEach(m => this.drawMissile(m));
    [...S.players].reverse().forEach(p => this.drawKart(p, t));
  }
}
window.Render2D = Render2D;
})();
