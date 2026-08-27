# 🎨 ZenSketch — Práctica de Dibujo Inteligente

**ZenSketch** es una herramienta premium diseñada para artistas, ilustradores y estudiantes que desean mejorar sus habilidades de dibujo analítico, bocetado rápido y deconstrucción de formas en un entorno libre de distracciones.

Carga carpetas completas de referencias y practica de forma infinita con un temporizador inteligente, filtros de abstracción visual, cuadrículas adaptativas y herramientas avanzadas de descomposición de imagen.

> **100% local y privado** — Todo se procesa en tu equipo. Sin servidores, sin cuentas, sin rastreo.

---

## ✨ Características Principales

### 📂 Carga y Gestión de Imágenes
- **Carga de carpetas completas** o archivos individuales
- **Drag & Drop** — Arrastra imágenes directamente al viewport
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
| `Esc` | Cerrar sidebar (en móvil) |
| `1` `2` `3` `4` | Niveles de revelado progresivo (cuando está activo) |

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
├── app.js                  # Lógica completa de la aplicación
├── start.bat               # Lanzador rápido (abre en navegador)
├── serve.bat               # Lanzador con servidor local
├── README.md               # Este archivo
└── ZenSketch-desktop/      # Versión de escritorio (Neutralinojs)
    ├── neutralino.config.json
    ├── www/                # Archivos web empaquetados
    ├── bin/                # Binarios del framework
    └── dist/               # Ejecutables compilados
        └── ZenSketch-Windows/
            ├── ZenSketch.exe
            └── resources.neu
```

---

## 🛠️ Tecnologías

| Tecnología | Uso |
|---|---|
| **HTML5 & CSS3** | Estructura, estilos personalizados con variables CSS, animaciones fluidas, diseño responsive |
| **JavaScript Vanilla (ES6+)** | Lógica de aplicación, control de estado, manipulación del DOM |
| **HTML5 Canvas** | Procesamiento de píxeles: detección de bordes (Sobel), posterización, líneas de flujo |
| **Web Audio API** | Síntesis de sonido: osciladores sinusoidales y triangulares para campana de meditación |
| **Neutralinojs** | Empaquetado como aplicación de escritorio ligera (~1.7 MB) |
| **Google Fonts (Outfit)** | Tipografía moderna y legible |

---

## 📋 Requisitos

- **Navegador moderno**: Chrome, Edge, Firefox o Safari (versiones recientes)
- **Para el .exe**: Windows 10/11 con WebView2 (preinstalado por defecto)
- **Sin dependencias**: No requiere Node.js, npm ni instalación para la versión web

---

Desarrollado con ❤️ para artistas que buscan la concentración absoluta en su práctica diaria. ¡Feliz dibujo! ✍️🎨
