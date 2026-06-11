# 🎨 ZenSketch — Práctica de Dibujo Inteligente y Minimalista

¡Bienvenido a **ZenSketch**! Una herramienta premium y ultra-fluida diseñada para artistas, ilustradores y estudiantes que desean mejorar sus habilidades de dibujo analítico, bocetado rápido y deconstrucción de formas en un entorno libre de distracciones.

ZenSketch te permite cargar carpetas completas de referencias y practicar de forma infinita con un temporizador inteligente, filtros de abstracción visual de última generación y cuadrículas adaptativas.

---

## ✨ Características Principales

*   **⚡ Carga Local Inteligente**: Arrastra o selecciona carpetas enteras de referencias. Todo se procesa localmente en tu navegador para una privacidad total y velocidad instantánea.
*   **🔄 Playlist Infinita sin Repetición**: Algoritmo de mezcla *Fisher-Yates* que baraja tus imágenes de manera aleatoria y, al terminar el ciclo, vuelve a mezclar asegurando que no se repitan de inmediato.
*   **⏳ Temporizador con Campana Zen**: Duraciones configurables con accesos rápidos (30s, 1m, 2m, 5m, 10m) y personalizado. Al agotarse el tiempo, suena una campana de meditación rica en armónicos generada mediante síntesis con la **Web Audio API** y pasa automáticamente a la siguiente referencia.
*   **🖼️ Ajuste de Pantalla Perfecto**: Las imágenes se adaptan de forma óptima a tu viewport conservando su relación de aspecto original (cero deformaciones).
*   **🪞 Volteo Espejo Instantáneo**: Rota la imagen horizontal o verticalmente para detectar errores de proporción y entrenar el cerebro con nuevas perspectivas.
*   **📐 Cuadrículas Inteligentes Adaptativas**: Regla de tercios, 2x2 y 4x4 que se reposicionan y redimensionan automáticamente para **ajustarse exactamente al contorno de la imagen**, sin importar la proporción de la pantalla.
*   **🌓 Estética Premium Premium**: Interfaz moderna con temas Oscuro (Zen) y Claro (Papel), micro-animaciones fluidas y controles deslizantes personalizados.

---

## 🔬 Deconstrucción Visual y Filtros Avanzados

Para ayudarte a entender mejor la estructura, la luz y los volúmenes de tus referencias, ZenSketch incluye un panel de abstracción en tiempo real:

1.  **✏️ Imagen a Boceto (Sin Fondo)**:
    Un motor de procesamiento en el cliente que simula el método de dibujo tradicional a dos capas:
    *   *Capa de construcción (Boceto base)*: Líneas suaves en tiza azul o rosa para definir las masas.
    *   *Capa de grafito*: Líneas oscuras y definidas de contorno preciso basadas en un operador Sobel.
    *   ¡Oculta la foto real y quédate solo con la estructura de dibujo!
2.  **💧 Desenfoque (Blur) Regulable**:
    Deslizador interactivo de 1px a 30px que difumina los detalles para que puedas concentrarte en las masas grandes de color, luz y sombra.
3.  **🌗 Masa de Valores (Threshold)**:
    Convierte la imagen en bloques gráficos puros de blanco y negro, ideal para analizar la composición de luz y sombra.
4.  **🩶 Escala de Grises**:
    Elimina la saturación para enfocar tu estudio en las relaciones de valores tonales.

---

## ⌨️ Atajos de Teclado Rápidos

Agiliza tu flujo de práctica con las teclas rápidas incorporadas:

| Tecla | Acción |
| :--- | :--- |
| `Espacio` | Pausa / Reanuda el temporizador |
| `Flecha Derecha` | Siguiente imagen (reinicia el temporizador) |
| `Flecha Izquierda` | Imagen anterior (reinicia el temporizador) |
| `H` | Volteo Espejo Horizontal |
| `V` | Volteo Espejo Vertical |

---

## 🛠️ Tecnologías y Estructura

ZenSketch está construido como una aplicación web nativa (Vanilla) de alto rendimiento, libre de frameworks pesados y dependencias externas innecesarias:

*   **HTML5 & CSS3 Avanzado**: Estilos personalizados con variables CSS, animaciones suaves y maquetación responsive.
*   **Javascript Vanilla (ES6+)**: Lógica limpia, control de estado ligero y manipulación directa del DOM.
*   **HTML5 Canvas**: Procesamiento de píxeles interactivo para la detección de bordes artísticos.
*   **Web Audio API**: Generación de ondas sinusoidales y triangulares para simular de forma realista el decaimiento armónico de una campana metálica.

---

## 🚀 Cómo Usarlo

Al no requerir compilación ni dependencias, puedes iniciarlo inmediatamente de dos maneras:

### Opción 1: Abrir Directamente (Sin Servidor)
Simplemente haz doble clic en el archivo `index.html` para abrirlo en tu navegador favorito. ¡Funciona al 100% incluso sin conexión a Internet!

### Opción 2: Usar un Servidor Local
Para una experiencia de desarrollo óptima, puedes levantar un servidor HTTP ligero en el directorio del proyecto:

*   **Con Node.js** (usando `npx`):
    ```bash
    npx http-server -p 8000
    ```
*   **Con Python**:
    ```bash
    python -m http.server 8000
    ```

Luego abre [http://localhost:8000](http://localhost:8000) en tu navegador.

---

Desarrollado con ❤️ para artistas que buscan la concentración absoluta en su práctica diaria. ¡Feliz dibujo! ✍️🎨
