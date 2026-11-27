# 🎰 Casino UAB

Juego multijugador online en tiempo real para el hackatón de *Tecnologies Intel·ligents i Arquitectura d'Empresa* (UAB).

Cada jugador entra desde su móvil, mueve su avatar 3D (estilo bloques) por un casino en 3D y va a una de las **7 mesas** para jugar contra los que estén allí:

| Mesa | Cómo se gana |
|---|---|
| 🚦 Semáforo | Pulsar lo antes posible cuando se pone verde (pulsar en rojo = último) |
| 👊 Machacabotones | Más pulsaciones en 5 segundos |
| ⏱️ Stop 7,77 | Parar el reloj lo más cerca de 7,77 s (se oculta a los 3 s) |
| 🧮 Cálculo rápido | Más aciertos en 5 operaciones; desempata el tiempo |
| 🧠 Memoria | Repetir una secuencia de 6 colores |
| 🎯 Dianas | Tocar 10 dianas en el menor tiempo |
| 🔫 Tiroteo | Shooter en primera persona de 60 s con tu avatar: gana quien más bajas haga |

Antes de cada partida hay 10 s con las instrucciones y una cuenta atrás.

**Arcade**: zona con los juegos de otros grupos. Para añadir uno, edita `public/arcade.json` con su nombre, autor, emoji y URL pública.

Premios por posición: 🥇 50 · 🥈 30 · 🥉 20 · 4º 10 · resto 5 monedas. Con las monedas se compran en la **tienda** colores, gorros, complementos, mascotas y efectos para el avatar (todos empiezan con la misma skin gris).

Modo proyector: abre `/?pantalla` en el ordenador de clase para ver la sala entera, el QR para entrar y el ranking de los más ricos.

## Arquitectura

```
 Móviles (navegador)                         Render (Node.js)
 ┌──────────────────────┐   WebSocket   ┌──────────────────────────────┐
 │ index.html + Three.js│◄────────────►│ server.js                    │
 │ main.js  (sala, UI)  │  Socket.IO   │  · Express sirve /public     │
 │ games.js (6 juegos)  │              │  · Estado: jugadores, mesas, │
 │ avatar3d.js (skins)  │              │    monedas, tienda           │
 └──────────────────────┘              │  · Difunde el mundo 15 Hz    │
                                       └──────────────────────────────┘
```

- El cliente envía su posición (`move`), empezar mesa (`table:start`), resultado (`game:result`) y compras (`shop`).
- El servidor es la fuente de verdad: decide quién está en cada mesa, ordena resultados, reparte monedas y valida compras.

## Ejecutar en local

```bash
npm install
npm start          # http://localhost:3000
```

## Desplegar en Render (gratis)

1. render.com → **New + → Web Service** → conectar este repositorio.
2. Runtime: **Node** · Build command: `npm install` · Start command: `node server.js` · Plan: **Free**.
3. Deploy. La URL pública será `https://<nombre>.onrender.com`.
4. ⚠️ El plan gratuito se duerme si no se usa: ábrelo un par de minutos antes de presentar.
