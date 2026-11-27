# 🏁 ¡DERRAPA!

Carreras de karts multijugador en tiempo real para el casino virtual: el **proyector** muestra el circuito en **3D** y cada **móvil** es el mando.

- Pantalla (proyector): `https://TU-APP.onrender.com/`
- Mando (móvil): escanea el QR de la pantalla, o abre `https://TU-APP.onrender.com/play.html`

## Cómo se juega

Al entrar, cada jugador elige su modo de control (se puede cambiar en cualquier momento con ⚙️ sin salir de la carrera):

| Modo | Para quién | Controles |
|---|---|---|
| 🟢 **Fácil** (por defecto) | Primera vez | Acelera solo · ◀ ▶ grandes · Freno · Derrape · Objeto. Opcional: *ayuda de dirección* (si no tocas ◀ ▶, el kart sigue la curva suavemente) |
| 🎮 **Manual** | Quien quiere control total | ◀ ▶ · Acelerar · Freno · Derrape (también acelera) · Objeto |
| 📱 **Giroscopio** | Volante de verdad | Inclina el móvil · acelera solo · calibrar · sensibilidad · invertir |

- **DERRAPE** (mantener): giras más cerrado y cargas un mini-turbo. La barra del móvil pasa de blanco → azul → naranja; suéltalo para salir disparado.
- **Plataformas naranjas** en el asfalto: turbo gratis.
- **FRENO**: frena fuerte; si mantienes parado, marcha atrás (para salir de un atasco).
- Pasa por las **cajas ?** para conseguir un objeto y toca el botón amarillo para usarlo:

| Objeto | Efecto |
|---|---|
| ⚡ Nitro (a veces x3) | Acelerón de 1,2 s |
| 🛢️ Aceite | Deja una mancha detrás; quien la pisa trompea |
| 🚀 Misil | Persigue al kart que va justo delante |
| 🛡️ Escudo | Te protege de un golpe durante 8 s |

Quien va último recibe mejores objetos; quien va primero, más aceite y escudos.
3 vueltas. La carrera termina cuando todos llegan o 20 s después del ganador. Después sale el **podio** con trofeos y confeti, y **🔁 Nueva carrera** vuelve a empezar con los mismos móviles conectados.

El mando muestra posición, vuelta, velocidad, carga del turbo y el objeto disponible, vibra (Android) con golpes, turbos y vueltas, permite pulsar varios botones a la vez y deslizar el dedo de ◀ a ▶, y no deja botones "enganchados" al soltar.

## Panel del anfitrión (proyector)

- **¡SALIDA!** / **🔁 NUEVA CARRERA** · **A la parrilla** · **+ Bot / − Bots** (para probar sin móviles).
- **Ambiente**: 🕒 Auto (hora real de España, zona `Europe/Madrid`), ☀️ Día, 🌇 Atardecer, 🌃 Noche. Lo decide el **servidor**, así todos ven lo mismo.
  - Día 07:00–16:59 · Atardecer 17:00–19:59 · Noche 20:00–06:59.
- **Cámara**: 🎥 Todos (encuadra a todos los pilotos), 🏎️ Líder (persecución), 🌍 Vista (panorámica).
- **🔊 Sonido** (motores, derrapes, frenos, turbo, golpes; se puede silenciar) · **Vista 2D/3D** · pantalla completa.
- Atajos de teclado: `1`-`4` ambiente · `C` cámara · `M` sonido · `V` 2D/3D · `F` pantalla completa.

## Arquitectura

```
 Móviles (play.html)                         Servidor Node.js (Render)                     Proyector (index.html)
 {steer, throttle, brake, drift, item} -->  Socket.IO → game.js (física 60 Hz)  --estado 30/s + sucesos-->  WebGL 3D
                                     <--posición, vuelta, objeto, velocidad, turbo--
```

- **Backend** (sin cambios de tecnología): Node.js + Express + Socket.IO. El servidor es la autoridad: física, derrapes, objetos, choques, vueltas, vuelta rápida y ambiente. Envía también "sucesos" (`pick`, `hit`, `turbo`, `pad`, `bump`, `lap`, `finish`…) que el proyector usa para partículas, sonidos y avisos.
- **Proyector**: motor WebGL2 propio y ligero (`public/js/engine.js`, ~500 líneas, **sin dependencias ni CDN**): sombras, luces de neón, niebla, cielo procedural, partículas. Todo el decorado (karts, gradas con público, casinos, ruleta, dados, fichas, palmeras) se genera con código. La posición de los karts se interpola para que se vea fluido a 60 fps aunque lleguen 30 estados/s, y la resolución se adapta sola si el ordenador va justo.
- Si el ordenador no tiene WebGL2, se usa automáticamente la **vista 2D original**.
- **Despliegue**: Render (plan gratuito con WebSockets y HTTPS; el HTTPS es necesario para que el móvil deje leer el giroscopio). No hay dependencias nuevas.

| Archivo | Qué hace |
|---|---|
| `game.js` | Circuito, física (acelerador, freno, derrape, asistencia), plataformas de turbo, objetos, bots, vueltas, vuelta rápida, ambiente por hora |
| `server.js` | Sirve las páginas y el QR, recibe los mandos y emite el estado |
| `public/index.html` | Pantalla del proyector: HUD, cuenta atrás, avisos, podio, panel del anfitrión |
| `public/play.html` | Mando del móvil (3 modos) |
| `public/js/engine.js` | Mini motor WebGL2 (matemáticas, geometría, sombras, luces, partículas) |
| `public/js/world3d.js` | Escena 3D: circuito, decorado de casino, karts, ambientes, cámara y efectos |
| `public/js/render2d.js` | Vista 2D clásica (respaldo) |
| `public/js/sfx.js` | Sonidos sintetizados con Web Audio |

## Ejecutar en local

```bash
npm install
npm start
```
Abre `http://localhost:3000` en el ordenador. El QR apunta a la IP de tu wifi, así que los móviles conectados a la misma red pueden entrar.
En local (sin HTTPS) el giroscopio no funciona en iPhone: usad el modo Fácil. Con **+ Bot** puedes probar sin móviles. En el ordenador, `play.html` también se puede manejar con el teclado (flechas, espacio = derrape, X = objeto, Z = freno).

## Desplegar en Render

1. Sube el proyecto a un repositorio de GitHub.
2. En render.com: **New → Web Service** → conecta el repositorio.
3. Build command: `npm install` · Start command: `npm start` · Plan: **Free**.
4. Abre la URL que te dan. ⚠️ En el plan gratuito se duerme: **ábrela 5 minutos antes de presentar**.

## Para la presentación

1. Abre el proyector a pantalla completa (`F`) y deja el ambiente en 🕒 Auto.
2. Para enseñar los tres ambientes, pulsa `2`, `3` y `4` (cambian con una transición suave); vuelve a `1` al terminar.
3. La cámara 🏎️ Líder queda muy bien en una carrera con pocos jugadores; con muchos, 🎥 Todos.

## Cosas fáciles de cambiar

- Circuito: lista `CTRL` en `game.js` (el 3D se adapta solo).
- Vueltas, velocidades, agarre, freno, turbo de plataformas: constantes al principio de `game.js`. Posición de las plataformas: `PADS`.
- Colores e iluminación de cada ambiente: `PRESETS` al principio de `public/js/world3d.js`.
- Si el volante gira al revés en algún móvil: ⚙️ → **Invertir giro**.
