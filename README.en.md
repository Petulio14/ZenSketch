# 🎨 ZenSketch — Smart Drawing Practice

**[Español](README.md)** · **English**

**ZenSketch** is a premium tool for artists, illustrators and students who want to sharpen their analytical drawing, gesture sketching and form deconstruction — in an environment with nothing in it to distract them.

Load whole folders of references and practise endlessly with a smart timer, visual abstraction filters, adaptive grids and advanced image decomposition tools.

> **100 % local and private** — everything is processed on your own machine. No servers,
> no accounts, no tracking. **And you can check it:** open your browser's network panel
> and reload; you won't see a single request leaving `localhost`. The typeface and the
> HEIC converter live in `assets/`, and a Content Security Policy forbids the browser
> from asking a third party for anything, even if someone tried to make it.

---

## ✨ Main Features

### 📂 Loading and Managing Images
- **Load entire folders** or individual files
- **Drag & drop** — drop images **or whole folders**, subfolders included
- **Supported formats**: JPG, PNG, WebP, GIF, BMP, AVIF, SVG, HEIC and HEIF
- **TIFF is not supported**: no browser decodes it. Files the browser can't open are
  reported and skipped, instead of leaving you with a blank screen
- **Automatic HEIC/HEIF conversion** to JPEG for display

### 🔄 Smart Playlist
- **Fisher-Yates** shuffle for genuinely even randomness
- When a round ends, it reshuffles without repeating the image you just saw
- Free navigation forwards and backwards
- Re-shuffle button to start the order over

### ⏳ Timer with a Zen Bell
- Quick presets: **30s, 1m, 2m, 5m, 10m**
- Custom timer (minutes + seconds)
- Animated circular progress ring that shifts colour as time runs out
- Warning animation over the last 5 seconds
- **Meditation bell** synthesised with the Web Audio API (realistic harmonics)
- Automatic advance to the next image when time is up

### 📐 Adaptive Grids
- **Rule of thirds** — classic composition
- **2×2 grid** — basic division
- **4×4 grid** — detailed analysis
- They reposition themselves to match the image's real outline, not the window's

### 🪞 Mirror Flip
- **Horizontal (H)** and **vertical (V)**, instantly
- Catches proportion errors and trains fresh perspectives

### 🌓 Themes
- **Dark mode (Zen)** — built for long sessions without eye strain
- **Light mode (Paper)** — the feel of a sketchbook
- Remembered automatically with `localStorage`

---

## 🔁 Sustained Practice

- **Session routines** — chained blocks that climb from short poses to long ones
  (10×30 s, then 5×2 min, then 2×10 min). The timer moves between blocks on its own,
  so you don't have to touch anything right when you'd found your concentration
- **History** — minutes drawn, references seen and your **day streak**. Stored on your
  machine, in IndexedDB. The streak survives if you practised yesterday
- **Preferences that stick** — duration, grid, sound, filters and routine come back
  exactly as you left them
- **Installable and offline** — install it as an app; it opens the same with or
  without a network

---

## 🔍 Zoom and Panning

- **Mouse wheel** to zoom, up to 6×
- **Drag** to move around a zoomed image
- **Double-click** or the **`0` key** to return to 100 %
- Every new reference starts out whole

---

## 🔬 Visual Deconstruction

A full real-time abstraction panel for reading structure, light and volume:

### Basic Filters

| Filter | What it does |
|---|---|
| ✏️ **Image to Sketch** | Two-layer Sobel engine: construction chalk (blue/pink) + contour graphite. Hides the photo and shows only the structure |
| 💧 **Blur** | A 1px-to-30px slider, to concentrate on large masses of colour and light |
| 🌗 **Value Masses** | Reduces the image to pure black and white, to analyse the light/shadow composition |
| 🩶 **Greyscale** | Drops saturation so you can study tonal value relationships |

### Advanced Decomposition

| Tool | What it does |
|---|---|
| 🎨 **Smart Posterisation** | Reduces the image to 2–8 colour levels. Ideal for simplifying values and seeing masses of form |
| 👁️ **Progressive Reveal** | Four levels: silhouette → value masses → mid detail → full image. Trains progressive observation |
| 〰️ **Flow Lines** | Draws lines that follow the direction tangent to the image's edges, showing the movement and energy of the composition |

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|:---|:---|
| `Space` | Pause / resume the timer |
| `→` Right arrow | Next image |
| `←` Left arrow | Previous image |
| `H` | Horizontal mirror flip |
| `V` | Vertical mirror flip |
| `F` | Fullscreen |
| `1` `2` `3` `4` | Progressive reveal levels (when it's on) |
| `Mouse wheel` | Zoom the image, up to 6× |
| `0` | Back to 100 % |
| `?` | Show or hide this list, without leaving the session |
| `Esc` | Close the shortcuts, or the side panel |

---

## 🚀 How to Run It

### Option 1: Double-click (the fastest)
Run `start.bat` and the app opens straight in your browser.

### Option 2: Open the HTML directly
Double-click `index.html` to open it in your browser of choice.

### Option 3: Local server
For a proper development experience:

```bash
# With Node.js
npx -y serve -l 3000 -s --open

# With Python
python -m http.server 8000
```

Or run `serve.bat` to do it automatically.

### Option 4: Desktop application (.exe)
The `ZenSketch-desktop/dist/ZenSketch-Windows/` folder holds a portable executable:

```
ZenSketch-Windows/
├── ZenSketch.exe      (~1.7 MB)
└── resources.neu      (~145 KB)
```

Double-click `ZenSketch.exe` and the app opens as a native desktop program.
Requires **WebView2** (preinstalled on Windows 10/11).

---

## 📁 Project Layout

```
ZenSketch/
├── index.html              # Main UI structure
├── styles.css              # Styles, themes and animations
├── app.js                  # Interface: events, canvas and painting
├── src/
│   ├── tema-inicial.js     # Applies the saved theme before the first paint
│   └── nucleo/             # DOM-free logic, with tests of its own
│       ├── barajar.js      #   Fisher-Yates, plus the variant that avoids repeats
│       ├── playlist.js     #   Which image is next, and when to reshuffle
│       ├── temporizador.js #   Countdown against a target instant
│       ├── imagenes.js     #   Which files count as a reference
│       ├── geometria.js    #   The image's real rectangle, and processing resolution
│       ├── capas.js        #   Which visual layer wins when several compete
│       ├── imagen.js       #   Sobel, posterisation and flow lines
│       ├── preferencias.js #   What you chose, sanitised before it's applied
│       ├── historial.js    #   Minutes, references and the day streak
│       ├── rutinas.js      #   The chained blocks of a session
│       └── trabajador-imagen.js  # The Worker that runs imagen.js
├── pruebas/nucleo/         # The tests for all of the above
├── assets/
│   ├── heic2any.min.js     # HEIC converter (MIT), loaded on demand
│   └── fuentes/            # Outfit as woff2 (OFL)
├── herramientas/
│   └── empaquetar.mjs      # Generates ZenSketch-desktop/www/ from the root
├── manifest.webmanifest    # So it can be installed as an app
├── servicio.js             # Service worker: works offline
├── LICENSE                 # MIT
├── TERCEROS.md             # Third-party attribution
├── start.bat               # Quick launcher (opens in a browser)
├── serve.bat               # Launcher with a local server
└── ZenSketch-desktop/      # Desktop version (Neutralinojs)
    ├── neutralino.config.json
    ├── www/                # Packaged copy of the web files
    ├── bin/                # Framework binaries (not versioned)
    └── dist/               # Compiled executables (not versioned)
```

> The source and the documentation are written in Spanish — file names, functions and
> comments included. This translation covers the README; the code itself stays in the
> language it was written in.

> `bin/` and `dist/` are not in the repository. After cloning, the desktop version
> needs `neu update` inside `ZenSketch-desktop/` before it can be built.

---

## 🛠️ Technologies

| Technology | Used for |
|---|---|
| **HTML5 & CSS3** | Structure, custom styling with CSS variables, fluid animations, responsive layout |
| **Vanilla JavaScript (ES6+)** | Application logic, state handling, DOM manipulation |
| **HTML5 Canvas** | Pixel processing: edge detection (Sobel), posterisation, flow lines |
| **Web Audio API** | Sound synthesis: sine and triangle oscillators for the meditation bell |
| **Neutralinojs** | Packaging as a lightweight desktop app (~1.7 MB) |
| **Outfit** | Typeface, served from `assets/fuentes/` (OFL licence) |
| **heic2any** | Converting iPhone photos, served from `assets/` (MIT licence) |
| **Vitest + ESLint** | Core tests and static analysis, for development only |
| **Web Worker** | Sobel and posterisation off the interface thread |
| **IndexedDB** | Practice history, on your machine |
| **Service Worker** | Installable and usable offline |

---

## 📋 Requirements

- **A modern browser**: recent Chrome, Edge, Firefox or Safari
- **For the .exe**: Windows 10/11 with WebView2 (preinstalled by default)
- **Network**: none needed, not even the first time
- **Nothing else to use it**: no Node.js, no npm, no installation

---

## 🔒 What Leaves Your Machine

Nothing. And that isn't a statement of intent: `index.html` carries a Content Security
Policy that the browser enforces.

```
default-src 'none'; script-src 'self' file: 'unsafe-eval'; style-src 'self' file:;
font-src 'self' file:; img-src 'self' file: blob: data:; connect-src 'self' blob:;
worker-src 'self' file: blob:; base-uri 'none'; form-action 'none'
```

The `file:` scheme is there so that opening `index.html` with a double-click keeps
working: in that case `'self'` doesn't always match, depending on the browser. It is
not a door to the network.

Your images are never uploaded anywhere: they're read as `blob:` from disk and
processed inside the browser. `connect-src 'self'` means the application cannot open
a connection to anywhere at all, even if someone added code that tried to.

`'unsafe-eval'` is there for one specific reason: the HEIC converter is libheif
compiled with Emscripten, and it builds functions with `new Function`. It opens no
door to the network — `connect-src` takes care of that — and the converter isn't even
loaded until a HEIC photo shows up.

---

## ♿ Accessibility

- Every control has an accessible name; decorative icons are marked so they aren't
  announced
- Toggle buttons report their state (`aria-pressed`), not just their colour
- Focus is visible when navigating by keyboard, and the whole app runs without a mouse
- Announcements are read aloud; the clock is **not**, so it doesn't read every second
- `prefers-reduced-motion` is respected
- Text can be selected and copied

Press <kbd>?</kbd> at any time to see the shortcuts.

---

## 🧪 Development

```bash
npm install
npm run verificar     # linter + tests + desktop copy up to date
npm run probar:ver    # tests running while you edit
npm run empaquetar    # regenerates ZenSketch-desktop/www/ from the root
```

The logic that doesn't touch the DOM lives in [`src/nucleo/`](src/nucleo/) and has its
own tests in `pruebas/nucleo/`. It's explained in [`src/nucleo/LEEME.md`](src/nucleo/LEEME.md).

**Don't edit `ZenSketch-desktop/www/` by hand.** It's a copy generated by
`npm run empaquetar`, which also injects the Neutralino client and opens its local
websocket in the security policy. `npm run verificar` fails if the copy has drifted
from the root — which is what stops the two versions from quietly ending up behaving
differently.

---

## 📄 Licence

ZenSketch is released under the [MIT](LICENSE) licence.

It incorporates other people's work — the Outfit typeface, the Lucide icons, the
heic2any converter and the Neutralinojs framework — each under its own licence. They
are all listed in [`TERCEROS.md`](TERCEROS.md).

---

Built with ❤️ for artists chasing absolute focus in their daily practice. Happy drawing! ✍️🎨
