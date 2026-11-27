# 🛠️ Guía para el equipo — Casino UAB

- **Juego online**: https://casino-uab.onrender.com · **Proyector**: https://casino-uab.onrender.com/?pantalla
- **Código**: https://github.com/hector2919/casino-uab

## 1. Ponerlo en marcha en tu ordenador (2 min)
Necesitas [Node.js 18+](https://nodejs.org) y Git.
```bash
git clone https://github.com/hector2919/casino-uab.git
cd casino-uab
npm install
npm start                       # abre http://localhost:3000
```
Para probar tú solo una mesa sin un segundo jugador: `MIN_PLAYERS=1 npm start` (en Windows PowerShell: `$env:MIN_PLAYERS=1; npm start`).
Para jugar con 2 "jugadores", abre dos pestañas (una de ellas en incógnito).

## 2. Qué hay en cada archivo
| Archivo | Qué hace | Toca aquí si quieres… |
|---|---|---|
| `server.js` | Servidor: jugadores, mesas, premios, tienda (Socket.IO) | cambiar premios (`PRIZES`), monedas iniciales, artículos de la tienda (`SHOP`), mesas (`TABLES`) |
| `public/main.js` | Cliente: cámara en primera persona, controles, colisiones, interacciones, camareros, teléfono, tienda y pantallas de juego | controles, teléfono, cómo se comportan los camareros |
| `public/world.js` | Sala principal 3D: suelo, paredes, ruleta central, estaciones de juego, tienda, bar, tragaperras | cambiar la decoración o mover cosas |
| `public/classic.js` | Sala del Casino Clásico (blackjack, póquer, ruleta, billar, bingo) | añadir o cambiar mesas clásicas |
| `public/avatar3d.js` | Personajes 3D realistas (cuerpo, rostro, ropa, esqueleto y animaciones), personal del casino y manos en 1ª persona | cambiar el aspecto o las animaciones de los personajes |
| `public/sfx.js` | Efectos de sonido sintetizados | sonidos |
| `public/games.js` | Los minijuegos sencillos (uno por función) | arreglar o crear minijuegos |
| `public/arena.js` | Minijuego Tiroteo (shooter en primera persona) | cambiar el shooter |
| `public/style.css` | Estilos de toda la interfaz | colores, tamaños |
| `public/arcade.json` | Lista de juegos de otros grupos | añadir juegos al Arcade |

## 3. Tareas típicas
**Añadir un juego de otro grupo al Arcade** → edita `public/arcade.json`:
```json
[
  { "name": "Nombre del juego", "author": "Grupo X", "emoji": "🚀", "url": "https://su-juego.onrender.com" }
]
```
(Si su web no deja meterse dentro de otra página, el botón "Abrir aparte ↗" la abre en otra pestaña.)

**Añadir un artículo a la tienda** → en `server.js`, dentro de `SHOP`, añade una línea:
```js
h_pirata: { slot: 'hat', name: 'Pirata', value: '🏴‍☠️', price: 80 },
```
Slots: `color` (valor = color hex), `hat`, `face`, `pet` (valor = emoji), `fx` (`sparkle`, `aura`, `fire`).

**Crear un minijuego nuevo** (3 pasos):
1. `server.js` → añade la mesa en `TABLES` (id, nombre, emoji, posición x/y entre 100 y 900, color, duración `dur`, `desc` y `howto`).
2. `server.js` → en `score()` di cómo se ordena el resultado (`key`: menor = mejor) y el texto que se muestra (`txt`). Si necesita datos iguales para todos, añádelos en `makeParams()`.
3. `public/games.js` → crea la función con el mismo id: pinta la interfaz en `el` y llama **una vez** a `done(resultado)`.

**Añadir algo a la carta del bar** → en `server.js`, dentro de `BAR`:
```js
helado: { name: 'Helado', emoji: '🍦', price: 9, kind: 'Postre' },
```
(`kind` puede ser `Bebida`, `Comida` o `Postre`; aparece solo en el menú del teléfono y de la barra.)

**Cambiar un juego del casino clásico** → las mesas están en `public/classic.js` (decoración y zona) y su lógica de apuestas en `public/classic-games.js` (el servidor solo cobra y paga: `classic:bet` / `classic:settle`).

## 4. Cómo trabajar sin pisarnos
```bash
git pull                              # antes de empezar, baja lo último
git checkout -b mi-cambio             # tu rama
# ...cambios y pruebas en local...
git add -A && git commit -m "Qué he cambiado"
git push -u origin mi-cambio          # y abre un Pull Request en GitHub
```
Para ir rápido en el hackatón también vale hacer commit directo a `main`, pero **avisad por el grupo** y haced `git pull` antes.

**Cambiar la URL del código QR** → por defecto es la de Render (`RENDER_EXTERNAL_URL`). Para otra dirección, define la variable de entorno `PUBLIC_URL` (en Render: Environment). Si el servidor se abre desde localhost o una IP privada, el QR usa `https://casino-uab.onrender.com` (constante `DEFAULT_PUBLIC_URL` de `server.js`).

**Cambiar el aspecto de un personaje** → `appearance()` en `avatar3d.js` decide género, piel, peinado, ojos… a partir de la semilla (id del jugador). Los uniformes del personal están en `STAFF`.

## 5. Publicar los cambios (Render)
Render **no** se actualiza solo. Tras subir a `main`: entrar en el dashboard de Render (cuenta de Héctor) → servicio `casino-uab` → **Manual Deploy → Deploy latest commit**. Tarda ~1 min.
⚠️ Plan gratis: se duerme sin uso. Abrid la URL 2 min antes de presentar.

## 6. Usar IA para modificarlo
Abrid el repo con Claude Code / Cursor / Copilot y dad contexto, por ejemplo:
> "Es un juego multijugador en Node.js + Socket.IO desplegado en Render. El servidor está en server.js y los minijuegos en public/games.js. Añade un minijuego nuevo llamado X que consiste en Y, siguiendo el mismo patrón que los demás."

Pedid cambios pequeños, probadlos en local y guardad los prompts que funcionen (hay que explicarlos en la presentación).
