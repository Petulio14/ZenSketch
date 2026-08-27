# El núcleo comprobable

Aquí vive la lógica de ZenSketch que **no toca el DOM**: barajar la tanda, decidir
qué imagen toca, contar el tiempo, reconocer formatos y calcular dónde queda la
imagen dentro de su contenedor.

Está separada por una razón concreta: mientras vivía dentro de `app.js`, mezclada
con manejadores de eventos, no había forma de comprobarla. Dos defectos de tres
caracteres sobrevivieron meses ahí dentro.

## Cómo se carga

Cada archivo funciona en dos sitios sin ningún paso de compilación:

- **En el navegador**, `index.html` lo carga como `<script>` clásico y el módulo se
  cuelga de `window.ZenSketch`. Esto es lo que permite que ZenSketch siga
  abriéndose con doble clic sobre `index.html`, sin servidor ni instalación.
- **En las pruebas**, Node lo carga con `require()` y recibe el mismo objeto.

De ahí el envoltorio del final de cada archivo:

```js
if (typeof module === 'object' && module.exports) {
    module.exports = api;              // Node y Vitest
} else {
    raiz.ZenSketch = Object.assign(raiz.ZenSketch || {}, api);   // navegador
}
```

Si añades un módulo nuevo, copia ese envoltorio y añade su `<script>` a
`index.html` **antes** de `app.js`, y también a `ZenSketch-desktop/www/index.html`.

## Qué hay

| Archivo | De qué responde |
|---|---|
| `barajar.js` | Fisher-Yates y la variante que evita empezar por un valor concreto |
| `playlist.js` | Qué imagen toca, avanzar, retroceder y abrir una tanda nueva al cerrar el ciclo |
| `temporizador.js` | Cuenta atrás, formato MM:SS, tiempo personalizado y estado del anillo |
| `imagenes.js` | Qué archivos valen como referencia y cuáles hay que convertir |
| `geometria.js` | Rectángulo real de la imagen con `object-fit: contain`, y resolución de proceso de los filtros |
| `capas.js` | Qué capa visual manda cuando varias compiten por la misma imagen |

## Reglas de la casa

- **Sin DOM.** Si una función necesita `document`, no pertenece aquí: pásale los
  valores ya leídos, como hace `medidasDeImagen()` en `app.js`.
- **Sin estado global.** El estado que haga falta se guarda en un cierre, como en
  `crearPlaylist()`.
- **Azar inyectable.** Lo que dependa de `Math.random` acepta un barajador por
  parámetro para poder probarlo sin sorpresas.
- **Una función que decide si un dato es aceptable se escribe aquí**, no dentro
  del manejador que la usa.

## Decisiones que conviene no deshacer

**El temporizador no cuenta ticks.** Fija el instante en que debe acabar la pose y
en cada latido pregunta cuánto falta. Contar ticks acumulaba un segundo de más por
pose y se desfasaba cuando el navegador frena los intervalos de una pestaña que no
está a la vista.

**La tanda nueva mira al final de la anterior.** `abrirTandaNueva()` lee
`tanda[tanda.length - 1]`, no la posición actual, que en ese punto ya se salió del
rango. Leerla de ahí era lo que dejaba la guarda contra repeticiones sin efecto.

**Las capas se resuelven antes de dibujar.** Ningún manejador escribe sobre
`style.filter` por su cuenta: `capas.resolver()` decide qué queda encendido y
`aplicarCapas()` en `app.js` lo vuelca de una vez, interruptores incluidos. Así la
interfaz no puede quedarse diciendo que un filtro está puesto cuando no hace nada.

## Comprobar

```bash
npm run verificar
```

Encadena el linter y las pruebas. Para trabajar con las pruebas en marcha:

```bash
npm run probar:ver
```
