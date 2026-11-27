// 🃏 Casino clásico: juegos contra la banca con apuestas de monedas
// El servidor descuenta la apuesta (classic:bet) y paga apuesta × multiplicador (classic:settle)
const CLASSIC = (() => {
  const g = id => document.getElementById(id);
  const BETS = [5, 10, 25, 50];
  let bet = 10;
  const sfx = n => { try { SFX[n](); } catch (e) {} };
  const card = c => `<span class="ccard ${'♥♦'.includes(c.s) ? 'red' : ''}">${c.r}${c.s}</span>`;
  const deck = () => { const d = []; for (const s of '♠♥♦♣') for (const r of ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']) d.push({ r, s }); return d.sort(() => Math.random() - .5); };

  function shell(id, title, rules, start) {
    g('gTitle').textContent = title; g('gTimer').textContent = '';
    const body = g('gBody');
    body.innerHTML = `<div class="howto">${rules}</div>
      <p class="ready">Apuesta</p><div class="bets">${BETS.map(b => `<button data-b="${b}" class="${b === bet ? 'on' : ''}">🪙 ${b}</button>`).join('')}</div>
      <div id="cg" style="width:100%;display:flex;flex-direction:column;align-items:center;gap:12px"></div>
      <button class="ghostBtn" id="cClose">Salir de la mesa</button>`;
    body.querySelectorAll('.bets button').forEach(b => b.onclick = () => { bet = +b.dataset.b; body.querySelectorAll('.bets button').forEach(x => x.classList.toggle('on', x === b)); });
    g('cClose').onclick = () => g('game').classList.remove('on');
    g('game').classList.add('on');
    if (document.pointerLockElement) document.exitPointerLock();
    start(g('cg'));
  }
  // Cobra la apuesta y ejecuta el juego; al acabar paga apuesta × mult
  function play(cb) {
    socket.emit('classic:bet', bet, ok => { if (!ok) return; sfx('click'); cb(bet); });
  }
  function settle(game, mult, el, msg) {
    socket.emit('classic:settle', { game, mult });
    const won = Math.floor(bet * mult);
    el.insertAdjacentHTML('beforeend', `<div class="cres ${mult >= 1 ? 'w' : 'l'}">${msg}<br>${mult > 1 ? `+${won} 🪙` : mult === 1 ? 'Recuperas la apuesta' : `-${bet} 🪙`}</div>`);
    sfx(mult > 1 ? 'win' : 'tick');
  }

  // ---- Blackjack ----
  function bj(el) {
    el.innerHTML = `<button class="gold" id="go">🃏 Repartir</button>`;
    g('go').onclick = () => play(() => {
      const d = deck(), you = [d.pop(), d.pop()], dealer = [d.pop(), d.pop()];
      const val = h => { let v = 0, a = 0; h.forEach(c => { v += c.r === 'A' ? 11 : 'JQK'.includes(c.r) ? 10 : +c.r; if (c.r === 'A') a++; }); while (v > 21 && a) { v -= 10; a--; } return v; };
      const draw = (hide) => {
        el.innerHTML = `<p>Crupier: ${hide ? card(dealer[0]) + '<span class="ccard back">🂠</span>' : dealer.map(card).join('') + ` <b>${val(dealer)}</b>`}</p>
          <p>Tú: ${you.map(card).join('')} <b>${val(you)}</b></p><div class="row" id="acts"></div>`;
      };
      const finish = () => {
        while (val(dealer) < 17) dealer.push(d.pop());
        draw(false);
        const y = val(you), c = val(dealer);
        if (y > 21) settle('Blackjack', 0, el, '💥 Te has pasado');
        else if (y === 21 && you.length === 2) settle('Blackjack', 2.5, el, '🃏 ¡BLACKJACK!');
        else if (c > 21 || y > c) settle('Blackjack', 2, el, '🏆 ¡Ganas a la banca!');
        else if (y === c) settle('Blackjack', 1, el, '🤝 Empate');
        else settle('Blackjack', 0, el, '😞 Gana la banca');
        el.insertAdjacentHTML('beforeend', `<button class="gold" id="again">Otra mano</button>`); g('again').onclick = () => bj(el);
      };
      draw(true);
      if (val(you) === 21) return finish();
      const acts = () => {
        g('acts').innerHTML = `<button class="gold" id="hit">➕ Pedir</button><button class="gold" id="st">✋ Plantarse</button>`;
        g('hit').onclick = () => { you.push(d.pop()); sfx('click'); if (val(you) >= 21) finish(); else { draw(true); acts(); } };
        g('st').onclick = finish;
      };
      acts();
    });
  }

  // ---- Ruleta ----
  function ruleta(el) {
    const RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    el.innerHTML = `<p>¿A qué apuestas?</p><div class="opts3">
      <button data-c="rojo" style="background:#c1121f">🔴 Rojo ×2</button><button data-c="negro" style="background:#111">⚫ Negro ×2</button>
      <button data-c="par">Par ×2</button><button data-c="impar">Impar ×2</button>
      <button data-c="bajo">1-18 ×2</button><button data-c="alto">19-36 ×2</button></div>
      <p>…o a un número (×36): <input id="num" type="number" min="0" max="36" placeholder="0-36" style="width:80px;padding:6px;border-radius:8px"> <button class="gold" id="numGo">Apostar</button></p>
      <div class="wheel" id="wh">🎡</div>`;
    const spin = choice => play(() => {
      const n = Math.floor(Math.random() * 37), wh = g('wh');
      el.querySelectorAll('button').forEach(b => b.disabled = true);
      let k = 0; const iv = setInterval(() => { wh.textContent = Math.floor(Math.random() * 37); sfx('tick'); if (++k > 18) { clearInterval(iv); end(); } }, 90);
      const end = () => {
        const col = n === 0 ? 'verde' : RED.includes(n) ? 'rojo' : 'negro';
        wh.innerHTML = `<span style="color:${col === 'rojo' ? '#ff4d5a' : col === 'verde' ? '#2dc653' : '#fff'}">${n}</span>`;
        const ok = typeof choice === 'number' ? n === choice
          : choice === 'rojo' ? col === 'rojo' : choice === 'negro' ? col === 'negro' : choice === 'par' ? n && n % 2 === 0 : choice === 'impar' ? n % 2 === 1 : choice === 'bajo' ? n >= 1 && n <= 18 : n >= 19;
        settle('Ruleta', ok ? (typeof choice === 'number' ? 36 : 2) : 0, el, ok ? `🎉 ¡Sale el ${n} ${col}!` : `Sale el ${n} ${col}`);
        el.insertAdjacentHTML('beforeend', `<button class="gold" id="again">Otra tirada</button>`); g('again').onclick = () => ruleta(el);
      };
    });
    el.querySelectorAll('.opts3 button').forEach(b => b.onclick = () => spin(b.dataset.c));
    g('numGo').onclick = () => { const v = Math.floor(+g('num').value); if (v >= 0 && v <= 36 && g('num').value !== '') spin(v); };
  }

  // ---- Póquer (video póquer: cambia cartas una vez) ----
  function poker(el) {
    el.innerHTML = `<button class="gold" id="go">♠️ Repartir 5 cartas</button>`;
    g('go').onclick = () => play(() => {
      const d = deck(), hand = Array.from({ length: 5 }, () => d.pop()), hold = [0, 0, 0, 0, 0];
      const show = () => {
        el.innerHTML = `<p>Toca las cartas que quieres <b>guardar</b> y cambia el resto</p><div class="row">${hand.map((c, i) => `<span data-i="${i}" class="ccard big ${'♥♦'.includes(c.s) ? 'red' : ''} ${hold[i] ? 'hold' : ''}">${c.r}${c.s}</span>`).join('')}</div><button class="gold" id="draw">🔄 Cambiar</button>`;
        el.querySelectorAll('.ccard').forEach(c => c.onclick = () => { hold[+c.dataset.i] ^= 1; show(); });
        g('draw').onclick = () => {
          hand.forEach((c, i) => { if (!hold[i]) hand[i] = d.pop(); });
          const order = 'A23456789TJQK'.split(''), rv = c => c.r === '10' ? 'T' : c.r;
          const counts = {}; hand.forEach(c => counts[rv(c)] = (counts[rv(c)] || 0) + 1);
          const cv = Object.values(counts).sort((a, b) => b - a), flush = hand.every(c => c.s === hand[0].s);
          const idx = hand.map(c => order.indexOf(rv(c))).sort((a, b) => a - b);
          const straight = cv[0] === 1 && (idx[4] - idx[0] === 4 || idx.join() === '0,9,10,11,12');
          let res = ['Nada', 0];
          if (straight && flush) res = ['Escalera de color', 50]; else if (cv[0] === 4) res = ['Póquer', 25]; else if (cv[0] === 3 && cv[1] === 2) res = ['Full', 9];
          else if (flush) res = ['Color', 6]; else if (straight) res = ['Escalera', 5]; else if (cv[0] === 3) res = ['Trío', 4]; else if (cv[0] === 2 && cv[1] === 2) res = ['Doble pareja', 3]; else if (cv[0] === 2) res = ['Pareja', 2];
          el.innerHTML = `<div class="row">${hand.map(c => card(c).replace('ccard', 'ccard big')).join('')}</div>`;
          settle('Póquer', res[1], el, res[1] ? `♠️ ${res[0]} (×${res[1]})` : 'Sin jugada');
          el.insertAdjacentHTML('beforeend', `<button class="gold" id="again">Otra mano</button>`); g('again').onclick = () => poker(el);
        };
      };
      show();
    });
    el.insertAdjacentHTML('beforeend', `<p style="font-size:.8rem;opacity:.8">Pareja ×2 · Doble pareja ×3 · Trío ×4 · Escalera ×5 · Color ×6 · Full ×9 · Póquer ×25 · Escalera de color ×50</p>`);
  }

  // ---- Billar: para la barra de potencia en la zona verde ----
  function billar(el) {
    el.innerHTML = `<p>Para la potencia en la zona <b style="color:#2dc653">verde</b> para meter la bola 🎱 (×2). Zona dorada: ×4</p>
      <div class="pbar"><div class="pz"></div><div class="pz2"></div><div class="pc" id="pc"></div></div><button class="gold" id="go">🎱 Tirar</button>`;
    let x = 0, dir = 1, iv = null;
    g('go').onclick = () => {
      if (!iv) return play(() => { g('go').textContent = '✋ ¡Golpear!'; iv = setInterval(() => { x += dir * 2.2; if (x >= 100 || x <= 0) dir *= -1; g('pc').style.left = x + '%'; }, 16); });
      clearInterval(iv); iv = 'done'; g('go').disabled = true;
      const gold = x >= 47 && x <= 53, green = x >= 38 && x <= 62;
      settle('Billar', gold ? 4 : green ? 2 : 0, el, gold ? '🎱 ¡Tacada perfecta!' : green ? '🎱 ¡Dentro!' : '😬 Fallaste la tronera');
      el.insertAdjacentHTML('beforeend', `<button class="gold" id="again">Otra tacada</button>`); g('again').onclick = () => billar(el);
    };
  }

  // ---- Bingo: cartón de 9 números (1-30), salen 15 bolas ----
  function bingo(el) {
    el.innerHTML = `<button class="gold" id="go">🎲 Comprar cartón</button><p style="font-size:.8rem;opacity:.8">5-6 aciertos ×1 · 7 ×2 · 8 ×5 · ¡BINGO (9)! ×20</p>`;
    g('go').onclick = () => play(() => {
      const nums = []; while (nums.length < 9) { const n = 1 + Math.floor(Math.random() * 30); if (!nums.includes(n)) nums.push(n); }
      nums.sort((a, b) => a - b);
      const pool = Array.from({ length: 30 }, (_, i) => i + 1).sort(() => Math.random() - .5).slice(0, 15);
      el.innerHTML = `<div class="bcard">${nums.map(n => `<span id="b${n}">${n}</span>`).join('')}</div><div class="wheel" id="ball">…</div><p id="bl"></p>`;
      let i = 0, hits = 0;
      const iv = setInterval(() => {
        const n = pool[i++]; g('ball').textContent = n; sfx('tick');
        if (nums.includes(n)) { hits++; g('b' + n).classList.add('hit'); }
        g('bl').textContent = `Bola ${i}/15 · ${hits} aciertos`;
        if (i >= 15) {
          clearInterval(iv);
          const mult = hits === 9 ? 20 : hits === 8 ? 5 : hits === 7 ? 2 : hits >= 5 ? 1 : 0;
          settle('Bingo', mult, el, hits === 9 ? '🎉 ¡¡BINGO!!' : `${hits} aciertos`);
          el.insertAdjacentHTML('beforeend', `<button class="gold" id="again">Otro cartón</button>`); g('again').onclick = () => bingo(el);
        }
      }, 450);
    });
  }

  const RULES = {
    bj: ['🃏 Blackjack', 'Acércate a 21 sin pasarte. El crupier pide hasta 17. Ganar ×2 · Blackjack ×2,5 · Empate recuperas.', bj],
    ruleta: ['🎡 Ruleta', 'Apuesta a color, par/impar, mitad (×2) o a un número exacto (×36).', ruleta],
    poker: ['♠️ Póquer', 'Video póquer: recibes 5 cartas, guardas las que quieras y cambias el resto una vez.', poker],
    billar: ['🎱 Billar', 'Para la barra de potencia en el momento justo para meter la bola.', billar],
    bingo: ['🎲 Bingo', 'Compra un cartón de 9 números. Salen 15 bolas del 1 al 30. Cuantos más aciertos, más premio.', bingo],
  };
  const api = { open(id) { const r = RULES[id]; if (r) shell(id, r[0], r[1], r[2]); } };
  Object.keys(RULES).forEach(k => api[k] = true);
  return api;
})();
window.CLASSIC = CLASSIC;
