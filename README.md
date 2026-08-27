# 🎨 ZenSketch — Práctica de Dibujo Inteligente

**ZenSketch** es una herramienta premium diseñada para artistas, ilustradores y estudiantes que desean mejorar sus habilidades de dibujo analítico, bocetado rápido y deconstrucción de formas en un entorno libre de distracciones.

Carga carpetas completas de referencias y practica de forma infinita con un temporizador inteligente, filtros de abstracción visual, cuadrículas adaptativas y herramientas avanzadas de descomposición de imagen.

> **100 % local y privado** — Todo se procesa en tu equipo. Sin servidores, sin cuentas,
> sin rastreo. **Y se puede comprobar:** abre el panel de red del navegador y recarga;
> no verás ni una petición fuera de `localhost`. La tipografía y el conversor de HEIC
> viven en `assets/`, y una política de seguridad de contenido le prohíbe al navegador
> pedir nada a un tercero aunque alguien lo intentara.

---

## ✨ Características Principales

### 📂 Carga y Gestión de Imágenes
- **Carga de carpetas completas** o archivos individuales
- **Drag & Drop** — Arrastra imágenes **o carpetas enteras**, con sus subcarpetas
- **Formatos soportados**: JPG, PNG, WebP, GIF, BMP, AVIF, SVG, HEIC y HEIF
- **TIFF no está soportado**: ningún navegador lo decodifica. Los archivos que el
  navegador no pueda abrir se avisan y se saltan, en vez de dejar la pantalla en blanco
- **Conversión HEIC/HEIF** automática a JPEG para visualización

### 🔄 Playlist Inteligente
- Algoritmo de mezcla **Fisher-Yates** para aleatoriedad perfecta
- Al terminar el ciclo, vuelve a barajar sin repetir la última imagen
- Navegación libre hacia adelante y atrás
- Botón de re-mezcla para reiniciar el orden

### ⏳ Temporizador con Campana Zen
- Presets rápidos: **30s, 1m, 2m, 5m, 10m**
- Temporizador personalizado (minutos + segundos)
- Anillo de progreso circular animado con cambio de color
- Animación de advertencia en los últimos 5 segundos
- **Campana de meditación** sintetizada con la Web Audio API (armónicos realistas)
- Avance automático a la siguiente imagen al terminar

### 📐 Cuadrículas Adaptativas
- **Regla de tercios** — Composición clásica
- **Cuadrícula 2×2** — División básica
- **Cuadrícula 4×4** — Análisis detallado
- Se reposicionan automáticamente para ajustarse al contorno real de la imagen

### 🪞 Volteo Espejo
- **Horizontal (H)** y **Vertical (V)** instantáneo
- Detecta errores de proporción y entrena nuevas perspectivas

### 🌓 Temas
- **Modo Oscuro (Zen)** — Diseñado para sesiones largas sin fatiga visual
- **Modo Claro (Papel)** — Simula el entorno de un cuaderno de dibujo
- Persistencia automática con `localStorage`

---

## 🔁 Práctica sostenida

- **Rutinas de sesión** — bloques encadenados que van de poses cortas a largas
  (10×30 s, luego 5×2 min, luego 2×10 min). El temporizador cambia solo entre
  bloques, sin tener que tocar nada justo cuando estabas concentrado
- **Historial** — minutos dibujados, referencias y **racha de días seguidos**.
  Guardado en tu equipo, en IndexedDB. La racha sigue viva si practicaste ayer
- **Preferencias que se recuerdan** — duración, cuadrícula, sonido, filtros y
  rutina vuelven tal como los dejaste
- **Instalable y sin conexión** — se instala como aplicación y abre igual con red
  que sin ella

---

## 🔍 Zoom y desplazamiento

- **Rueda del ratón** para ampliar, hasta 6×
- **Arrastrar** para moverte por la imagen ampliada
- **Doble clic** o la **tecla 0** para volver al 100 %
- Cada referencia nueva empieza entera

---

## 🔬 Deconstrucción Visual

Panel completo de abstracción en tiempo real para entender estructura, luz y volúmenes:

### Filtros Básicos

| Filtro | Descripción |
|---|---|
| ✏️ **Imagen a Boceto** | Motor Sobel de dos capas: tiza de construcción (azul/rosa) + grafito de contorno. Oculta la foto y muestra solo la estructura |
| 💧 **Desenfoque (Blur)** | Deslizador de 1px a 30px para concentrarte en masas grandes de color y luz |
| 🌗 **Masa de Valores** | Convierte la imagen en blanco y negro puro para analizar composición de luz/sombra |
| 🩶 **Escala de Grises** | Elimina saturación para estudiar relaciones de valores tonales |

### Descomposición Avanzada

| Herramienta | Descripción |
|---|---|
| 🎨 **Posterización Inteligente** | Reduce la imagen a 2-8 niveles de color. Ideal para simplificar valores y ver masas de forma |
| 👁️ **Revelado Progresivo** | 4 niveles: Silueta → Masas de valor → Detalle medio → Imagen completa. Entrena la observación progresiva |
| 〰️ **Líneas de Flujo** | Dibuja líneas que siguen la dirección tangente a los bordes de la imagen. Visualiza el movimiento y la energía de la composición |

---

## ⌨️ Atajos de Teclado

| Tecla | Acción |
|:---|:---|
| `Espacio` | Pausa / Reanudar temporizador |
| `→` Flecha Derecha | Siguiente imagen |
| `←` Flecha Izquierda | Imagen anterior |
| `H` | Volteo espejo horizontal |
| `V` | Volteo espejo vertical |
| `F` | Pantalla completa |
| `1` `2` `3` `4` | Niveles de revelado progresivo (cuando está activo) |
| `Rueda del ratón` | Ampliar la imagen, hasta 6× |
| `0` | Volver al 100 % |
| `?` | Mostrar u ocultar esta lista, sin salir de la sesión |
| `Esc` | Cerrar los atajos o el panel lateral |

---

## 🚀 Cómo Usarlo

### Opción 1: Doble clic (la más rápida)
Ejecuta el archivo `start.bat` y la app se abrirá directamente en tu navegador.

### Opción 2: Abrir el HTML directamente
Haz doble clic en `index.html` para abrirlo en tu navegador favorito.

### Opción 3: Servidor local
Para una experiencia de desarrollo óptima:

```bash
# Con Node.js
npx -y serve -l 3000 -s --open

# Con Python
python -m http.server 8000
```

O ejecuta `serve.bat` para hacerlo automáticamente.

### Opción 4: Aplicación de Escritorio (.exe)
La carpeta `ZenSketch-desktop/dist/ZenSketch-Windows/` contiene un ejecutable portable:

```
ZenSketch-Windows/
├── ZenSketch.exe      (~1.7 MB)
└── resources.neu      (~145 KB)
```

Doble clic en `ZenSketch.exe` y la app se abre como programa de escritorio nativo.
Requiere **WebView2** (viene preinstalado en Windows 10/11).

---

## 📁 Estructura del Proyecto

```
ZenSketch/
├── index.html              # Estructura principal de la UI
├── styles.css              # Estilos, temas y animaciones
├── app.js                  # Interfaz: eventos, canvas y pintado
├── src/
│   ├── tema-inicial.js     # Aplica el tema guardado antes del primer pintado
│   └── nucleo/             # Lógica sin DOM, con pruebas propias
│       ├── barajar.js      #   Fisher-Yates y la variante que evita repetir
│       ├── playlist.js     #   Qué imagen toca y cuándo se rebaraja
│       ├── temporizador.js #   Cuenta atrás contra un instante objetivo
│       ├── imagenes.js     #   Qué archivos valen como referencia
│       ├── geometria.js    #   Rectángulo real de la imagen y resolución de proceso
│       ├── capas.js        #   Qué capa visual manda cuando varias compiten
│       ├── imagen.js       #   Sobel, posterización y líneas de flujo
│       ├── preferencias.js #   Lo que elegiste, saneado antes de aplicarlo
│       ├── historial.js    #   Minutos, referencias y racha de días
│       ├── rutinas.js      #   Bloques encadenados de una sesión
│       └── trabajador-imagen.js  # El Worker que ejecuta imagen.js
├── pruebas/nucleo/         # Las pruebas de todo lo anterior
├── assets/
│   ├── heic2any.min.js     # Conversor HEIC (MIT), a demanda
│   └── fuentes/            # Outfit en woff2 (OFL)
├── herramientas/
│   └── empaquetar.mjs      # Genera ZenSketch-desktop/www/ desde la raíz
├── manifest.webmanifest    # Para instalarlo como aplicación
├── servicio.js             # Service worker: funciona sin conexión
├── LICENSE                 # MIT
├── TERCEROS.md             # Atribución de los componentes de terceros
├── start.bat               # Lanzador rápido (abre en navegador)
├── serve.bat               # Lanzador con servidor local
└── ZenSketch-desktop/      # Versión de escritorio (Neutralinojs)
    ├── neutralino.config.json
    ├── www/                # Copia de los archivos web, empaquetada
    ├── bin/                # Binarios del framework (no versionados)
    └── dist/               # Ejecutables compilados (no versionados)
```

> `bin/` y `dist/` no están en el repositorio. Tras clonar, la versión de escritorio
> necesita `neu update` dentro de `ZenSketch-desktop/` antes de poder compilarse.

---

## 🛠️ Tecnologías

| Tecnología | Uso |
|---|---|
| **HTML5 & CSS3** | Estructura, estilos personalizados con variables CSS, animaciones fluidas, diseño responsive |
| **JavaScript Vanilla (ES6+)** | Lógica de aplicación, control de estado, manipulación del DOM |
| **HTML5 Canvas** | Procesamiento de píxeles: detección de bordes (Sobel), posterización, líneas de flujo |
| **Web Audio API** | Síntesis de sonido: osciladores sinusoidales y triangulares para campana de meditación |
| **Neutralinojs** | Empaquetado como aplicación de escritorio ligera (~1.7 MB) |
| **Outfit** | Tipografía, servida desde `assets/fuentes/` (licencia OFL) |
| **heic2any** | Conversión de fotos de iPhone, servida desde `assets/` (licencia MIT) |
| **Vitest + ESLint** | Pruebas del núcleo y análisis estático, sólo para desarrollar |
| **Web Worker** | Sobel y posterización fuera del hilo de la interfaz |
| **IndexedDB** | Historial de práctica, en tu equipo |
| **Service Worker** | Instalable y utilizable sin conexión |

---

## 📋 Requisitos

- **Navegador moderno**: Chrome, Edge, Firefox o Safari (versiones recientes)
- **Para el .exe**: Windows 10/11 con WebView2 (preinstalado por defecto)
- **Sin conexión**: no hace falta ninguna, ni la primera vez
- **Para usarlo no hace falta nada más**: ni Node.js, ni npm, ni instalación

---

## 🔒 Qué sale de tu equipo

Nada. Y no es una declaración de intenciones: `index.html` lleva una política de
seguridad de contenido que el navegador impone.

```
default-src 'none'; script-src 'self' file: 'unsafe-eval'; style-src 'self' file:;
font-src 'self' file:; img-src 'self' file: blob: data:; connect-src 'self' blob:;
worker-src 'self' blob:; base-uri 'none'; form-action 'none'
```

El esquema `file:` está para que abrir `index.html` con doble clic siga funcionando:
en ese caso `'self'` no siempre casa, según el navegador. No es una puerta a la red.

Las imágenes no se suben a ningún sitio: se leen como `blob:` desde el disco y se
procesan en el propio navegador. `connect-src 'self'` significa que la aplicación no
puede abrir una conexión a ninguna parte, aunque alguien añadiera código para hacerlo.

`'unsafe-eval'` está por un motivo concreto: el conversor de HEIC es libheif compilado
con Emscripten, y construye funciones con `new Function`. No abre ninguna puerta a la
red —de eso se ocupa `connect-src`— y el conversor ni siquiera se carga hasta que
aparece una foto en HEIC.

---

## ♿ Accesibilidad

- Todos los controles tienen nombre accesible; los iconos decorativos están
  marcados para que no se anuncien
- Los botones que conmutan informan de su estado (`aria-pressed`), no sólo con color
- El foco se ve al navegar con teclado, y la aplicación se opera entera sin ratón
- Los avisos se anuncian en voz alta; el reloj **no**, para no leer cada segundo
- Se respeta `prefers-reduced-motion`
- El texto se puede seleccionar y copiar

Pulsa <kbd>?</kbd> en cualquier momento para ver los atajos.

---

## 🧪 Para desarrollar

```bash
npm install
npm run verificar     # linter + pruebas + copia de escritorio al día
npm run probar:ver    # pruebas en marcha mientras editas
npm run empaquetar    # regenera ZenSketch-desktop/www/ desde la raíz
```

La lógica que no toca el DOM vive en [`src/nucleo/`](src/nucleo/) y tiene pruebas
propias en `pruebas/nucleo/`. Está explicado en [`src/nucleo/LEEME.md`](src/nucleo/LEEME.md).

**No edites `ZenSketch-desktop/www/` a mano.** Es una copia generada por
`npm run empaquetar`, que además inyecta el cliente de Neutralino y le abre el
websocket local en la política de seguridad. `npm run verificar` falla si la copia
se ha separado de la raíz, que es lo que impide que las dos versiones acaben
comportándose distinto.

---

## 📄 Licencia

ZenSketch se publica bajo la licencia [MIT](LICENSE).

Incorpora trabajo de otras personas —la tipografía Outfit, los iconos de Lucide, el
conversor heic2any y el framework Neutralinojs—, cada una con su propia licencia.
Están recogidas en [`TERCEROS.md`](TERCEROS.md).

---

Desarrollado con ❤️ para artistas que buscan la concentración absoluta en su práctica diaria. ¡Feliz dibujo! ✍️🎨
