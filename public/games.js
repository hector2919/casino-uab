// Los 4 minijuegos. Cada uno pinta su interfaz en `el` y llama a done(resultado) una sola vez.
const GAMES = {
  // 🚦 Semáforo: pulsa al ponerse verde (pulsar en rojo = descalificado)
  reflejos(el, p, done, timer) {
    let t0 = 0, over = false;
    el.innerHTML = `<div class="pad red" id="pad">ESPERA…<small>Pulsa SOLO cuando se ponga verde</small></div>`;
    const pad = el.querySelector('#pad');
    const tGo = setTimeout(() => { pad.className = 'pad green'; pad.innerHTML = '¡¡YA!!'; t0 = performance.now();
      setTimeout(() => finish(9999), 2500); }, p.delay);
    const finish = v => { if (over) return; over = true; clearTimeout(tGo); done(v); };
    pad.addEventListener('pointerdown', e => {
      e.preventDefault(); if (over) return;
      if (!t0) { pad.className = 'pad grey'; pad.innerHTML = '¡DEMASIADO PRONTO!<small>😬</small>'; finish(-1); }
      else { const ms = Math.round(performance.now() - t0); pad.innerHTML = `${ms} ms<small>Esperando al resto…</small>`; finish(ms); }
    });
  },

  // 👊 Machacabotones: máximo de pulsaciones en 5 segundos
  clicks(el, p, done, timer) {
    let n = 0, over = false;
    el.innerHTML = `<div class="num" id="n">0</div><button class="big-btn" id="b">👊</button><p>¡Machaca el botón!</p>`;
    const nEl = el.querySelector('#n');
    el.querySelector('#b').addEventListener('pointerdown', e => { e.preventDefault(); if (!over) { n++; nEl.textContent = n; } });
    timer(5000, () => { over = true; el.querySelector('p').textContent = 'Esperando al resto…'; done(n); });
  },

  // ⏱️ Stop 7,77: el reloj se oculta a los 3 s; párlo lo más cerca de 7,77 s
  stop(el, p, done, timer) {
    const t0 = performance.now(); let over = false;
    el.innerHTML = `<p>Objetivo: <b style="color:#ffd166">7,77 s</b></p><div class="num" id="n">0,00</div><button class="big-btn" id="b">✋</button><p id="h">El reloj desaparece a los 3 s…</p>`;
    const nEl = el.querySelector('#n');
    const iv = setInterval(() => {
      const s = (performance.now() - t0) / 1000;
      nEl.textContent = s < 3 ? s.toFixed(2).replace('.', ',') : '?,??';
      if (s > 12) stopIt();
    }, 30);
    const stopIt = () => {
      if (over) return; over = true; clearInterval(iv);
      const ms = Math.round(performance.now() - t0);
      nEl.textContent = (ms / 1000).toFixed(2).replace('.', ',');
      el.querySelector('#h').textContent = `Te has desviado ${(Math.abs(ms - 7770) / 1000).toFixed(2).replace('.', ',')} s`;
      done(ms);
    };
    el.querySelector('#b').addEventListener('pointerdown', e => { e.preventDefault(); stopIt(); });
  },

  // 🧮 Cálculo rápido: 5 operaciones, cuenta aciertos y tiempo
  calculo(el, p, done, timer) {
    const t0 = performance.now(); let i = 0, ok = 0, over = false;
    const show = () => {
      const q = p.qs[i];
      el.innerHTML = `<p>Pregunta ${i + 1}/5 · ✅ ${ok}</p><div class="q">${q.q}</div><div class="opts">${q.opts.map(o => `<button>${o}</button>`).join('')}</div>`;
      el.querySelectorAll('.opts button').forEach(b => b.addEventListener('pointerdown', e => {
        e.preventDefault(); if (over) return;
        if (+b.textContent === q.a) ok++;
        if (++i < 5) show(); else end();
      }));
    };
    const end = () => { if (over) return; over = true; el.innerHTML = `<div class="num">${ok}/5</div><p>Esperando al resto…</p>`; done({ c: ok, ms: Math.round(performance.now() - t0) }); };
    timer(29000, end);
    show();
  },

  // 🧠 Memoria: mira la secuencia de 6 colores y repítela
  memoria(el, p, done, timer) {
    const cols = ['#e63946', '#2a9d8f', '#ffd166', '#4361ee'];
    let i = 0, over = false, t0 = 0, input = false;
    el.innerHTML = `<p id="h">👀 Mira la secuencia…</p><div class="simon">${cols.map((c, k) => `<button data-k="${k}" style="background:${c}"></button>`).join('')}</div><p id="prog"></p>`;
    const btns = [...el.querySelectorAll('.simon button')];
    const flash = (k, ms = 380) => { btns[k].classList.add('lit'); setTimeout(() => btns[k].classList.remove('lit'), ms); };
    p.seq.forEach((k, j) => setTimeout(() => flash(k), 600 + j * 650));
    setTimeout(() => { input = true; t0 = performance.now(); el.querySelector('#h').textContent = '👉 ¡Tu turno! Repite la secuencia'; }, 600 + p.seq.length * 650);
    const end = () => { if (over) return; over = true; el.querySelector('#h').textContent = `${i}/6 aciertos · Esperando al resto…`; done({ c: i, ms: Math.round(performance.now() - (t0 || performance.now())) }); };
    btns.forEach(b => b.addEventListener('pointerdown', e => {
      e.preventDefault(); if (!input || over) return;
      const k = +b.dataset.k; flash(k, 150);
      if (k === p.seq[i]) { i++; el.querySelector('#prog').textContent = '✅'.repeat(i); if (i === p.seq.length) end(); }
      else { b.style.outline = '4px solid #fff'; end(); }
    }));
    timer(24000, end);
  },

  // 🎯 Dianas: toca las 10 dianas lo antes posible
  dianas(el, p, done, timer) {
    let i = 0, over = false; const t0 = performance.now();
    el.innerHTML = `<p id="h">🎯 0/10</p><div class="field"><button class="target">🎯</button></div>`;
    const tg = el.querySelector('.target');
    const place = () => { const [x, y] = p.pos[i]; tg.style.left = x + '%'; tg.style.top = y + '%'; };
    const end = () => { if (over) return; over = true; tg.remove(); el.querySelector('#h').textContent = `${i}/10 en ${((performance.now() - t0) / 1000).toFixed(1).replace('.', ',')} s · Esperando al resto…`; done({ h: i, ms: Math.round(performance.now() - t0) }); };
    tg.addEventListener('pointerdown', e => { e.preventDefault(); if (over) return; i++; el.querySelector('#h').textContent = `🎯 ${i}/10`; if (i >= 10) end(); else place(); });
    place();
    timer(19000, end);
  },
};
