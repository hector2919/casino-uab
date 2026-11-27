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


## 🎨 Rediseño visual (rama `feature/visual-redesign`)

El casino pasa a verse **en primera persona**, con estética de casino de Las Vegas (neón azul/violeta/rosa/dorado, suelo pulido con reflejos, ruleta gigante en el centro). Las **reglas de los 7 minijuegos y el multijugador no han cambiado**.

| Zona | Qué hay |
|---|---|
| **Sala principal** | Entrada con alfombra roja · tienda VIP al fondo · bar en la esquina derecha · 6 estaciones de juego (una por minijuego, 7 con el Tiroteo) alrededor · tragaperras, arcade y lounge |
| **Centro** | Gran estructura con ruleta colgante. Dentro hay un **ascensor** al Casino Clásico |
| **Casino clásico** | Otra sala (verde, burdeos y dorado): blackjack, póquer, ruleta, billar y bingo, con crupieres, fichas y cartas. *De momento son ambientación (aún no se juegan).* |
| **Teléfono** | Tecla **T** / botón 📱: cartera, carta del bar, pedidos, inventario y mapa |
| **Bar** | Pide en la barra o desde el teléfono. Se cobra con monedas ficticias y un camarero te lleva el pedido |

**Controles:** `WASD` andar · ratón para mirar (clic en la pantalla) · `Shift` correr · `E` interactuar (también sentarse en sillas y taburetes) · `T` teléfono · `V` cambiar de perspectiva. En móvil: joystick a la izquierda y deslizar a la derecha para mirar.

**Perspectiva:** primera persona (con manos al usar el teléfono o interactuar) o tercera persona (cámara sobre el hombro, rueda del ratón para acercar/alejar y que no atraviesa paredes ni columnas). Botón 👁️/🧍 arriba a la derecha. Cambiar de vista no mueve al personaje ni interrumpe la partida.

**Personajes:** modelos humanos originales generados por código (sin archivos externos): rostro, peinados, ropa con tejido, esqueleto y animaciones de caminar, correr, girar, sentarse, usar el teléfono, llevar bandeja y repartir cartas. Cada jugador tiene una apariencia propia (se deriva de su id, así que todos ven lo mismo).

**QR:** botón de QR abajo a la izquierda → ventana con el código, la URL pública y «Copiar enlace». La URL sale de `GET /public-url` (variable `PUBLIC_URL`, o `RENDER_EXTERNAL_URL` que Render define solo; nunca localhost).
**Calidad gráfica** (botón ✨ arriba a la derecha): alta (bloom + reflejos), media y baja. En móvil arranca en baja y el juego baja solo de nivel si va lento.

Cambios mínimos en `server.js` (todos aditivos): nueva distribución de mesas/tienda/arcade, ruta `/jsm` para los efectos 3D, `room` de cada jugador (sala principal o clásica) y los eventos `bar:order` / `order:arrived` con la carta `BAR`.

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
