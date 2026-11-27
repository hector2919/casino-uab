// ¡DERRAPA! · Mini motor WebGL2 sin dependencias.
// Matemáticas, geometría generada por código, texturas de canvas, sombras, luces puntuales, niebla y partículas.
(function () {
'use strict';

// ======================= Matemáticas (matrices 4x4 en columnas) =======================
const M4 = {
  ident() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  mul(a, b, o = new Float32Array(16)) {
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  },
  persp(fovy, asp, n, f) {
    const t = 1 / Math.tan(fovy / 2), m = new Float32Array(16);
    m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = 2 * f * n / (n - f);
    return m;
  },
  ortho(l, r, b, t, n, f) {
    const m = M4.ident();
    m[0] = 2 / (r - l); m[5] = 2 / (t - b); m[10] = -2 / (f - n);
    m[12] = -(r + l) / (r - l); m[13] = -(t + b) / (t - b); m[14] = -(f + n) / (f - n);
    return m;
  },
  lookAt(e, c, u = [0, 1, 0]) {
    let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2];
    let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
    let xx = u[1] * zz - u[2] * zy, xy = u[2] * zx - u[0] * zz, xz = u[0] * zy - u[1] * zx;
    l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    const m = new Float32Array(16);
    m[0] = xx; m[1] = yx; m[2] = zx; m[4] = xy; m[5] = yy; m[6] = zy; m[8] = xz; m[9] = yz; m[10] = zz;
    m[12] = -(xx * e[0] + xy * e[1] + xz * e[2]); m[13] = -(yx * e[0] + yy * e[1] + yz * e[2]);
    m[14] = -(zx * e[0] + zy * e[1] + zz * e[2]); m[15] = 1;
    return m;
  },
  // Traslación · rotY · rotX · rotZ · escala (lo típico para colocar objetos)
  compose(tx, ty, tz, ry = 0, rx = 0, rz = 0, s = 1, o = new Float32Array(16)) {
    const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx), cz = Math.cos(rz), sz = Math.sin(rz);
    // R = Ry * Rx * Rz
    const r00 = cy * cz + sy * sx * sz, r01 = -cy * sz + sy * sx * cz, r02 = sy * cx;
    const r10 = cx * sz, r11 = cx * cz, r12 = -sx;
    const r20 = -sy * cz + cy * sx * sz, r21 = sy * sz + cy * sx * cz, r22 = cy * cx;
    const sv = Array.isArray(s) ? s : [s, s, s];
    o[0] = r00 * sv[0]; o[1] = r10 * sv[0]; o[2] = r20 * sv[0]; o[3] = 0;
    o[4] = r01 * sv[1]; o[5] = r11 * sv[1]; o[6] = r21 * sv[1]; o[7] = 0;
    o[8] = r02 * sv[2]; o[9] = r12 * sv[2]; o[10] = r22 * sv[2]; o[11] = 0;
    o[12] = tx; o[13] = ty; o[14] = tz; o[15] = 1;
    return o;
  },
  invert(m) {
    const a = m, o = new Float32Array(16);
    const b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4];
    const b03 = a[1] * a[6] - a[2] * a[5], b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6];
    const b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12], b08 = a[8] * a[15] - a[11] * a[12];
    const b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
    let d = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!d) return M4.ident(); d = 1 / d;
    o[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * d; o[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * d;
    o[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * d; o[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * d;
    o[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * d; o[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * d;
    o[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * d; o[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * d;
    o[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * d; o[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * d;
    o[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * d; o[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * d;
    o[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * d; o[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * d;
    o[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * d; o[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * d;
    return o;
  },
  apply(m, x, y, z) { // punto
    return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
  },
  applyDir(m, x, y, z) {
    const v = [m[0] * x + m[4] * y + m[8] * z, m[1] * x + m[5] * y + m[9] * z, m[2] * x + m[6] * y + m[10] * z];
    const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l];
  },
};

function hex(c) {
  if (Array.isArray(c)) return c;
  const n = parseInt(c.replace('#', ''), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}

// ======================= Geometría generada por código =======================
// Cada vértice: posición, normal, color (rgb) + "e" (emisivo: 0..0.5 siempre encendido, 0.5..1 solo de noche) y uv.
class Geo {
  constructor() { this.p = []; this.n = []; this.c = []; this.uv = []; this.i = []; this.vc = 0; }
  v(x, y, z, nx, ny, nz, col, e = 0, u = 0, w = 0) {
    this.p.push(x, y, z); this.n.push(nx, ny, nz); this.c.push(col[0], col[1], col[2], e); this.uv.push(u, w);
    return this.vc++;
  }
  tri(a, b, c) { this.i.push(a, b, c); }
  // Cuadrilátero a-b-c-d (en orden) con normal calculada
  quad(a, b, c, d, col, e = 0, uv = [[0, 0], [1, 0], [1, 1], [0, 1]], nrm) {
    col = hex(col);
    let n = nrm;
    if (!n) {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
      n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
      const l = Math.hypot(n[0], n[1], n[2]) || 1; n = [n[0] / l, n[1] / l, n[2] / l];
    }
    const i0 = this.v(...a, ...n, col, e, ...uv[0]), i1 = this.v(...b, ...n, col, e, ...uv[1]);
    const i2 = this.v(...c, ...n, col, e, ...uv[2]), i3 = this.v(...d, ...n, col, e, ...uv[3]);
    this.i.push(i0, i1, i2, i0, i2, i3);
  }
  // Caja centrada en (x,y,z). opts.top: color de la tapa; opts.uv: repetir textura
  box(x, y, z, sx, sy, sz, col, e = 0, opts = {}) {
    const hx = sx / 2, hy = sy / 2, hz = sz / 2, c = hex(col), top = opts.top ? hex(opts.top) : c, bot = opts.bottom ? hex(opts.bottom) : c;
    const P = (a, b, d) => [x + a * hx, y + b * hy, z + d * hz];
    const uvs = opts.uv ? [[0, 0], [opts.uv[0], 0], [opts.uv[0], opts.uv[1]], [0, opts.uv[1]]] : undefined;
    this.quad(P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1), c, e, uvs, [0, 0, 1]);     // +z
    this.quad(P(1, -1, -1), P(-1, -1, -1), P(-1, 1, -1), P(1, 1, -1), c, e, uvs, [0, 0, -1]); // -z
    this.quad(P(1, -1, 1), P(1, -1, -1), P(1, 1, -1), P(1, 1, 1), c, e, uvs, [1, 0, 0]);      // +x
    this.quad(P(-1, -1, -1), P(-1, -1, 1), P(-1, 1, 1), P(-1, 1, -1), c, e, uvs, [-1, 0, 0]); // -x
    if (!opts.noTop) this.quad(P(-1, 1, 1), P(1, 1, 1), P(1, 1, -1), P(-1, 1, -1), top, opts.topE ?? e, uvs, [0, 1, 0]);
    if (!opts.noBottom) this.quad(P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1), bot, e, uvs, [0, -1, 0]);
    return this;
  }
  // Cilindro: eje 'y' (vertical) o 'z' (ruedas)
  cyl(x, y, z, r, h, seg, col, e = 0, axis = 'y', capCol, r2) {
    const c = hex(col), cc = capCol ? hex(capCol) : c, rt = r2 ?? r;
    const map = axis === 'y' ? (a, b, d) => [x + a, y + b, z + d] : axis === 'z' ? (a, b, d) => [x + a, y + d, z + b] : (a, b, d) => [x + b, y + a, z + d];
    const nmap = axis === 'y' ? (a, b, d) => [a, b, d] : axis === 'z' ? (a, b, d) => [a, d, b] : (a, b, d) => [b, a, d];
    for (let k = 0; k < seg; k++) {
      const a0 = k / seg * Math.PI * 2, a1 = (k + 1) / seg * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const n0 = nmap(c0, 0, s0), n1 = nmap(c1, 0, s1);
      const i0 = this.v(...map(c0 * r, -h / 2, s0 * r), ...n0, c, e), i1 = this.v(...map(c1 * r, -h / 2, s1 * r), ...n1, c, e);
      const i2 = this.v(...map(c1 * rt, h / 2, s1 * rt), ...n1, c, e), i3 = this.v(...map(c0 * rt, h / 2, s0 * rt), ...n0, c, e);
      this.i.push(i0, i1, i2, i0, i2, i3);
      const tn = nmap(0, 1, 0), bn = nmap(0, -1, 0);
      if (rt > 0) { const t0 = this.v(...map(0, h / 2, 0), ...tn, cc, e), t1 = this.v(...map(c0 * rt, h / 2, s0 * rt), ...tn, cc, e), t2 = this.v(...map(c1 * rt, h / 2, s1 * rt), ...tn, cc, e); this.i.push(t0, t1, t2); }
      const b0 = this.v(...map(0, -h / 2, 0), ...bn, cc, e), b1 = this.v(...map(c1 * r, -h / 2, s1 * r), ...bn, cc, e), b2 = this.v(...map(c0 * r, -h / 2, s0 * r), ...bn, cc, e); this.i.push(b0, b1, b2);
    }
    return this;
  }
  cone(x, y, z, r, h, seg, col, e = 0) { return this.cyl(x, y + h / 2, z, r, h, seg, col, e, 'y', col, 0); }
  sphere(x, y, z, r, seg, col, e = 0, sy = 1) {
    const c = hex(col), rings = Math.max(3, seg >> 1), base = this.vc;
    for (let j = 0; j <= rings; j++) {
      const t = j / rings * Math.PI, st = Math.sin(t), ct = Math.cos(t);
      for (let k = 0; k <= seg; k++) {
        const p = k / seg * Math.PI * 2, nx = st * Math.cos(p), nz = st * Math.sin(p);
        this.v(x + nx * r, y + ct * r * sy, z + nz * r, nx, ct, nz, c, e);
      }
    }
    for (let j = 0; j < rings; j++) for (let k = 0; k < seg; k++) {
      const a = base + j * (seg + 1) + k, b = a + seg + 1;
      this.i.push(a, b, a + 1, b, b + 1, a + 1);
    }
    return this;
  }
  // Añade otra geometría transformada por una matriz
  add(g, m) {
    const base = this.vc;
    for (let k = 0; k < g.vc; k++) {
      const p = m ? M4.apply(m, g.p[k * 3], g.p[k * 3 + 1], g.p[k * 3 + 2]) : [g.p[k * 3], g.p[k * 3 + 1], g.p[k * 3 + 2]];
      const n = m ? M4.applyDir(m, g.n[k * 3], g.n[k * 3 + 1], g.n[k * 3 + 2]) : [g.n[k * 3], g.n[k * 3 + 1], g.n[k * 3 + 2]];
      this.p.push(...p); this.n.push(...n);
      this.c.push(g.c[k * 4], g.c[k * 4 + 1], g.c[k * 4 + 2], g.c[k * 4 + 3]); this.uv.push(g.uv[k * 2], g.uv[k * 2 + 1]);
    }
    for (const i of g.i) this.i.push(i + base);
    this.vc += g.vc;
    return this;
  }
}

// ======================= Shaders =======================
const MAX_LIGHTS = 32;
const VS_MAIN = `#version 300 es
in vec3 aPos; in vec3 aNrm; in vec4 aCol; in vec2 aUv;
uniform mat4 uModel, uVP, uLVP;
out vec3 vPos; out vec3 vNrm; out vec4 vCol; out vec2 vUv; out vec4 vLs;
void main() {
  vec4 w = uModel * vec4(aPos, 1.0);
  vPos = w.xyz; vNrm = mat3(uModel) * aNrm; vCol = aCol; vUv = aUv; vLs = uLVP * w;
  gl_Position = uVP * w;
}`;
const FS_MAIN = `#version 300 es
precision highp float; precision highp sampler2DShadow;
in vec3 vPos; in vec3 vNrm; in vec4 vCol; in vec2 vUv; in vec4 vLs;
uniform vec3 uSunDir, uSunCol, uSkyAmb, uGndAmb, uFogCol, uCam, uTint;
uniform float uFogDen, uNightGlow, uSpec, uShine, uShadowK, uAlpha, uEmisMul, uTexOn, uTime, uShadowTexel, uRim;
uniform vec2 uUvScroll;
uniform sampler2D uTex; uniform sampler2DShadow uShadow;
uniform int uNL; uniform vec4 uLP[${MAX_LIGHTS}]; uniform vec3 uLC[${MAX_LIGHTS}];
out vec4 outCol;
float shadowF() {
  vec3 p = vLs.xyz / vLs.w * 0.5 + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) return 1.0;
  float s = 0.0;
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++)
    s += texture(uShadow, vec3(p.xy + vec2(x, y) * uShadowTexel, p.z - 0.0012));
  return s / 9.0;
}
void main() {
  float sh = mix(1.0, shadowF(), uShadowK);
  vec3 n = normalize(vNrm);
  vec3 base = vCol.rgb * uTint;
  if (uTexOn > 0.5) base *= texture(uTex, vUv + uUvScroll * uTime).rgb;
  float e = vCol.a;
  float em = (e <= 0.5 ? e * 2.0 : (e - 0.5) * 2.0 * uNightGlow) * uEmisMul;
  vec3 V = normalize(uCam - vPos);
  float ndl = max(dot(n, uSunDir), 0.0);
  vec3 amb = mix(uGndAmb, uSkyAmb, n.y * 0.5 + 0.5);
  vec3 col = base * (amb + uSunCol * ndl * sh);
  vec3 H = normalize(uSunDir + V);
  col += uSunCol * pow(max(dot(n, H), 0.0), uShine) * uSpec * sh;
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (i >= uNL) break;
    vec3 L = uLP[i].xyz - vPos; float d = length(L), r = uLP[i].w;
    if (d > r) continue;
    L /= d;
    float att = (1.0 - d / r); att *= att;
    vec3 h = normalize(L + V);
    col += uLC[i] * att * (base * max(dot(n, L), 0.0) + pow(max(dot(n, h), 0.0), uShine) * uSpec * 2.5);
  }
  col += base * em * 1.7;
  col += uRim * pow(1.0 - max(dot(n, V), 0.0), 3.0) * uSkyAmb;
  float f = 1.0 - exp(-uFogDen * length(uCam - vPos));
  col = mix(col, uFogCol, clamp(f, 0.0, 1.0));
  outCol = vec4(col, uAlpha);
}`;
const VS_DEPTH = `#version 300 es
in vec3 aPos; uniform mat4 uModel, uLVP;
void main() { gl_Position = uLVP * uModel * vec4(aPos, 1.0); }`;
const FS_DEPTH = `#version 300 es
precision mediump float; out vec4 o; void main() { o = vec4(1.0); }`;
// Sin luz: estelas, haces de faros, burbujas de escudo
const VS_FLAT = `#version 300 es
in vec3 aPos; in vec4 aCol; uniform mat4 uModel, uVP; out vec4 vCol; out vec3 vPos;
void main() { vec4 w = uModel * vec4(aPos, 1.0); vPos = w.xyz; vCol = aCol; gl_Position = uVP * w; }`;
const FS_FLAT = `#version 300 es
precision highp float; in vec4 vCol; in vec3 vPos; uniform vec4 uMul; uniform vec3 uFogCol, uCam; uniform float uFogDen; out vec4 o;
void main() { float f = clamp(1.0 - exp(-uFogDen * length(uCam - vPos)), 0.0, 1.0); o = vCol * uMul; o.rgb = mix(o.rgb, uFogCol * o.a, f * 0.7); }`;
// Partículas (puntos con borde suave)
const VS_PART = `#version 300 es
in vec3 aPos; in vec4 aCol; in float aSize; uniform mat4 uVP; uniform float uScale; out vec4 vCol;
void main() { gl_Position = uVP * vec4(aPos, 1.0); vCol = aCol; gl_PointSize = clamp(aSize * uScale / gl_Position.w, 1.0, 256.0); }`;
const FS_PART = `#version 300 es
precision mediump float; in vec4 vCol; uniform float uSoft; out vec4 o;
void main() { vec2 c = gl_PointCoord * 2.0 - 1.0; float d = dot(c, c); if (d > 1.0) discard;
  float a = mix(1.0, pow(1.0 - d, 1.5), uSoft); o = vec4(vCol.rgb, vCol.a * a); }`;
// Cielo procedimental
const VS_SKY = `#version 300 es
in vec2 aPos; out vec2 vP; void main() { vP = aPos; gl_Position = vec4(aPos, 0.9999, 1.0); }`;
const FS_SKY = `#version 300 es
precision highp float; in vec2 vP; uniform mat4 uInvVP; uniform vec3 uZen, uHor, uGnd, uBand, uSunDir, uSunCol, uCam;
uniform float uBandK, uStars, uTime, uClouds, uSunSize; out vec4 o;
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = hash(vec3(i, 1.0)), b = hash(vec3(i + vec2(1, 0), 1.0)), c = hash(vec3(i + vec2(0, 1), 1.0)), d = hash(vec3(i + vec2(1, 1), 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
void main() {
  vec4 a = uInvVP * vec4(vP, -1.0, 1.0), b = uInvVP * vec4(vP, 1.0, 1.0);
  vec3 d = normalize(b.xyz / b.w - a.xyz / a.w);
  float h = d.y;
  vec3 c = h > 0.0 ? mix(uHor, uZen, pow(clamp(h, 0.0, 1.0), 0.45)) : mix(uHor, uGnd, clamp(-h * 5.0, 0.0, 1.0));
  c = mix(c, uBand, exp(-abs(h) * 9.0) * uBandK);
  float sd = max(dot(d, uSunDir), 0.0);
  c += uSunCol * (smoothstep(1.0 - uSunSize, 1.0 - uSunSize * 0.6, sd) * 3.0 + pow(sd, 10.0) * 0.45 + pow(sd, 120.0) * 0.6);
  if (h > 0.0) {
    vec2 q = d.xz / (h + 0.08) * 2.2 + vec2(uTime * 0.01, 0.0);
    float cl = noise(q) * 0.55 + noise(q * 2.3) * 0.3 + noise(q * 5.1) * 0.15;
    cl = smoothstep(0.5, 0.85, cl) * uClouds * smoothstep(0.0, 0.25, h);
    c = mix(c, mix(uHor, vec3(1.0), 0.6) + uSunCol * 0.15, cl);
    vec3 sq = floor(d * 380.0); float s = hash(sq);
    float tw = 0.6 + 0.4 * sin(uTime * 3.0 + s * 60.0);
    c += step(0.9965, s) * uStars * tw * smoothstep(0.02, 0.2, h) * vec3(1.0, 0.95, 1.0);
  }
  o = vec4(c, 1.0);
}`;

function compile(gl, vs, fs, attribs) {
  const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) + '\n' + s); return sh; };
  const p = gl.createProgram();
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
  attribs.forEach((a, i) => gl.bindAttribLocation(p, i, a));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); const name = info.name.replace(/\[0\]$/, ''); u[name] = gl.getUniformLocation(p, info.name); }
  return { p, u };
}

// ======================= Motor =======================
class Engine {
  constructor(canvas) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 no disponible');
    this.gl = gl; this.canvas = canvas;
    this.main = compile(gl, VS_MAIN, FS_MAIN, ['aPos', 'aNrm', 'aCol', 'aUv']);
    this.depth = compile(gl, VS_DEPTH, FS_DEPTH, ['aPos']);
    this.flat = compile(gl, VS_FLAT, FS_FLAT, ['aPos', 'aNrm', 'aCol']);
    this.part = compile(gl, VS_PART, FS_PART, ['aPos', 'aCol', 'aSize']);
    this.sky = compile(gl, VS_SKY, FS_SKY, ['aPos']);
    this.aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    // Mapa de sombras
    this.SHADOW = 2048;
    this.shadowTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, this.SHADOW, this.SHADOW);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    this.shadowFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowTex, 0);
    gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // Textura blanca por defecto
    this.white = this.texture((() => { const c = document.createElement('canvas'); c.width = c.height = 2; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 2, 2); return c; })());
    // Triángulo de pantalla completa para el cielo
    this.skyVao = gl.createVertexArray(); gl.bindVertexArray(this.skyVao);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    this.lightPos = new Float32Array(MAX_LIGHTS * 4); this.lightCol = new Float32Array(MAX_LIGHTS * 3); this.nLights = 0;
  }

  mesh(geo, dynamic = false) {
    const gl = this.gl, m = { vao: gl.createVertexArray(), count: geo.i.length, bufs: [] };
    gl.bindVertexArray(m.vao);
    const attr = (i, data, size) => {
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
      gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, size, gl.FLOAT, false, 0, 0); m.bufs.push(b);
    };
    attr(0, geo.p, 3); attr(1, geo.n, 3); attr(2, geo.c, 4); attr(3, geo.uv, 2);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(geo.i), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return m;
  }

  // Buffer dinámico de triángulos sin luz (posición + color rgba)
  flatBuffer(maxVerts) {
    const gl = this.gl, fb = { vao: gl.createVertexArray(), data: new Float32Array(maxVerts * 7), max: maxVerts, count: 0 };
    gl.bindVertexArray(fb.vao);
    fb.buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, fb.buf);
    gl.bufferData(gl.ARRAY_BUFFER, fb.data.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 28, 12);
    gl.disableVertexAttribArray(1); gl.vertexAttrib3f(1, 0, 1, 0);
    gl.bindVertexArray(null);
    return fb;
  }
  uploadFlat(fb, count) { const gl = this.gl; fb.count = count; gl.bindBuffer(gl.ARRAY_BUFFER, fb.buf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, fb.data, 0, count * 7); }

  // Buffer de partículas (posición, color, tamaño)
  pointBuffer(max) {
    const gl = this.gl, pb = { vao: gl.createVertexArray(), data: new Float32Array(max * 8), max, count: 0 };
    gl.bindVertexArray(pb.vao);
    pb.buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pb.buf);
    gl.bufferData(gl.ARRAY_BUFFER, pb.data.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 32, 28);
    gl.bindVertexArray(null);
    return pb;
  }
  uploadPoints(pb, count) { const gl = this.gl; pb.count = count; if (!count) return; gl.bindBuffer(gl.ARRAY_BUFFER, pb.buf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, pb.data, 0, count * 8); }

  texture(canvas, repeat = true) {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    if (this.aniso) gl.texParameterf(gl.TEXTURE_2D, this.aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
    return t;
  }

  resize(scale) {
    const c = this.canvas, w = Math.max(1, Math.round(c.clientWidth * scale)), h = Math.max(1, Math.round(c.clientHeight * scale));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  }

  // ---- Pasada de sombras ----
  beginShadow(lvp) {
    const gl = this.gl;
    this.lvp = lvp;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo);
    gl.viewport(0, 0, this.SHADOW, this.SHADOW);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
    gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(2, 4);
    gl.useProgram(this.depth.p);
    gl.uniformMatrix4fv(this.depth.u.uLVP, false, lvp);
  }
  shadowDraw(mesh, model) {
    const gl = this.gl;
    gl.uniformMatrix4fv(this.depth.u.uModel, false, model);
    gl.bindVertexArray(mesh.vao); gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_INT, 0);
  }
  endShadow() { const gl = this.gl; gl.disable(gl.POLYGON_OFFSET_FILL); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }

  // ---- Pasada principal ----
  begin(cam, env, time) {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.vp = cam.vp; this.cam = cam; this.env = env; this.time = time;
    // Cielo
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
    const s = this.sky; gl.useProgram(s.p);
    gl.uniformMatrix4fv(s.u.uInvVP, false, M4.invert(cam.vp));
    gl.uniform3fv(s.u.uZen, env.zen); gl.uniform3fv(s.u.uHor, env.hor); gl.uniform3fv(s.u.uGnd, env.fog);
    gl.uniform3fv(s.u.uBand, env.band); gl.uniform1f(s.u.uBandK, env.bandK);
    gl.uniform3fv(s.u.uSunDir, env.sunDir); gl.uniform3fv(s.u.uSunCol, env.sunDisc);
    gl.uniform1f(s.u.uStars, env.stars); gl.uniform1f(s.u.uTime, time); gl.uniform1f(s.u.uClouds, env.clouds);
    gl.uniform1f(s.u.uSunSize, env.sunSize);
    gl.bindVertexArray(this.skyVao); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.CULL_FACE);
    // Uniformes comunes del sombreado principal
    const m = this.main, u = m.u; gl.useProgram(m.p);
    gl.uniformMatrix4fv(u.uVP, false, cam.vp); gl.uniformMatrix4fv(u.uLVP, false, this.lvp || M4.ident());
    gl.uniform3fv(u.uSunDir, env.sunDir); gl.uniform3fv(u.uSunCol, env.sunCol);
    gl.uniform3fv(u.uSkyAmb, env.skyAmb); gl.uniform3fv(u.uGndAmb, env.gndAmb);
    gl.uniform3fv(u.uFogCol, env.fog); gl.uniform1f(u.uFogDen, env.fogDen);
    gl.uniform3fv(u.uCam, cam.eye); gl.uniform1f(u.uNightGlow, env.nightGlow);
    gl.uniform1f(u.uShadowK, env.shadowK); gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uShadowTexel, 1 / this.SHADOW);
    gl.uniform1i(u.uNL, this.nLights);
    gl.uniform4fv(u.uLP, this.lightPos); gl.uniform3fv(u.uLC, this.lightCol);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.shadowTex); gl.uniform1i(u.uShadow, 1);
    gl.activeTexture(gl.TEXTURE0); gl.uniform1i(u.uTex, 0);
  }
  setLights(list) { // [{p:[x,y,z], r, c:[r,g,b]}]
    const n = Math.min(MAX_LIGHTS, list.length);
    for (let i = 0; i < n; i++) {
      const L = list[i];
      this.lightPos.set([L.p[0], L.p[1], L.p[2], L.r], i * 4); this.lightCol.set(L.c, i * 3);
    }
    this.nLights = n;
  }
  // Dibuja una malla con el sombreado principal. o: {tex, tint, spec, shine, emis, alpha, scroll, rim}
  draw(mesh, model, o = {}) {
    const gl = this.gl, u = this.main.u;
    gl.uniformMatrix4fv(u.uModel, false, model);
    gl.uniform3fv(u.uTint, o.tint || [1, 1, 1]);
    gl.uniform1f(u.uSpec, o.spec ?? this.env.spec * 0.3); gl.uniform1f(u.uShine, o.shine ?? 24);
    gl.uniform1f(u.uEmisMul, o.emis ?? 1); gl.uniform1f(u.uAlpha, o.alpha ?? 1); gl.uniform1f(u.uRim, o.rim ?? 0);
    gl.uniform2fv(u.uUvScroll, o.scroll || [0, 0]);
    gl.uniform1f(u.uTexOn, o.tex ? 1 : 0);
    gl.bindTexture(gl.TEXTURE_2D, o.tex || this.white);
    gl.bindVertexArray(mesh.vao); gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_INT, 0);
  }
  // Triángulos sin luz con mezcla (aditiva o normal)
  drawFlat(fbOrMesh, model, mul = [1, 1, 1, 1], additive = false, indexed = false) {
    const gl = this.gl, f = this.flat, u = f.u;
    gl.useProgram(f.p);
    gl.uniformMatrix4fv(u.uVP, false, this.vp); gl.uniformMatrix4fv(u.uModel, false, model);
    gl.uniform4fv(u.uMul, mul); gl.uniform3fv(u.uFogCol, this.env.fog); gl.uniform3fv(u.uCam, this.cam.eye); gl.uniform1f(u.uFogDen, this.env.fogDen);
    gl.enable(gl.BLEND); gl.depthMask(false);
    if (additive) gl.blendFunc(gl.SRC_ALPHA, gl.ONE); else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(fbOrMesh.vao);
    if (indexed) gl.drawElements(gl.TRIANGLES, fbOrMesh.count, gl.UNSIGNED_INT, 0);
    else if (fbOrMesh.count) gl.drawArrays(gl.TRIANGLES, 0, fbOrMesh.count);
    gl.depthMask(true); gl.disable(gl.BLEND);
    gl.useProgram(this.main.p);
  }
  drawPoints(pb, additive, soft = 1) {
    if (!pb.count) return;
    const gl = this.gl, p = this.part, u = p.u;
    gl.useProgram(p.p);
    gl.uniformMatrix4fv(u.uVP, false, this.vp);
    gl.uniform1f(u.uScale, this.canvas.height * this.cam.proj[5] * 0.5);
    gl.uniform1f(u.uSoft, soft);
    gl.enable(gl.BLEND); gl.depthMask(false);
    if (additive) gl.blendFunc(gl.SRC_ALPHA, gl.ONE); else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(pb.vao); gl.drawArrays(gl.POINTS, 0, pb.count);
    gl.depthMask(true); gl.disable(gl.BLEND);
    gl.useProgram(this.main.p);
  }
}

window.DERRAPA3D = { M4, Geo, Engine, hex, MAX_LIGHTS };
})();
