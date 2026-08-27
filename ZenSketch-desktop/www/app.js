// --- ESTADO GLOBAL DE LA APLICACIÓN ---
const state = {
    images: [],          // Lista original de archivos de imagen
    lista: null,         // Playlist de la sesión (src/nucleo/playlist.js)
    generacion: 0,       // Sube en cada cambio de imagen; descarta cargas tardías
    fallosSeguidos: 0,   // Imágenes rotas encadenadas, para no saltar sin fin
    
    // Temporizador
    duration: 60,        // Duración configurada en segundos (default 1m)
    timeLeft: 60,        // Tiempo restante en segundos, para la interfaz
    finPose: null,       // Instante en que se acaba la pose (performance.now)
    restanteMs: null,    // Lo que quedaba al pausar, para reanudar sin perder tiempo
    timerId: null,       // ID del intervalo activo
    isPlaying: false,    // Estado de reproducción del temporizador
    
    // Ayudas visuales
    gridType: 'none',    // 'none', 'thirds', 'grid2', 'grid4'
    mirrorH: false,      // Volteo horizontal
    mirrorV: false,      // Volteo vertical
    soundEnabled: true,  // Sonido activado
    
    // Tema
    theme: 'dark',       // 'dark' o 'light'

    // Capas visuales que compiten por la imagen: filtros acumulables (blur,
    // threshold, grayscale) y modos que la sustituyen (posterize, reveal).
    // Quién manda lo decide src/nucleo/capas.js, no el orden de los manejadores.
    capas: null,         // Se inicializa abajo con ZenSketch.capasApagadas()
    blurLevel: 12,
    posterizeLevel: 4,
    revealStep: 1,       // 1=Silueta, 2=Masas, 3=Detalle, 4=Completa

    // Superposiciones, que sí conviven con todo lo anterior
    imageToSketch: false,
    flowLines: false,
    
    // Gestión de memoria
    currentObjectURL: null,
    nombreActual: ''     // Nombre del archivo en pantalla, para los avisos
};

state.capas = ZenSketch.capasApagadas();

// --- SISTEMA DE TOASTS ---
function showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
}

// --- CONSTANTES DE DISEÑO ---
const RING_CIRCUMFERENCE = 2 * Math.PI * 52; // Radio de 52 -> aprox 326.72

// --- SELECTORES DOM ---
const elements = {
    folderUpload: document.getElementById('folder-upload'),
    folderUploadLanding: document.getElementById('folder-upload-landing'),
    filesUpload: document.getElementById('files-upload'),
    filesUploadLanding: document.getElementById('files-upload-landing'),
    landingScreen: document.getElementById('landing-screen'),
    imageViewer: document.getElementById('image-viewer'),
    activeImage: document.getElementById('active-image'),
    imageWrapper: document.getElementById('image-wrapper'),
    gridOverlay: document.getElementById('grid-overlay'),
    
    // Estadísticas
    statsPanel: document.getElementById('stats-panel'),
    currentIndexVal: document.getElementById('current-index-val'),
    percentVal: document.getElementById('percent-val'),
    sessionProgressBar: document.getElementById('session-progress-bar'),
    fileInfoText: document.getElementById('file-info-text'),
    
    // Temporizador
    timerText: document.getElementById('timer-text'),
    timerRing: document.getElementById('timer-ring'),
    presetBtns: document.querySelectorAll('.preset-btn'),
    customMin: document.getElementById('custom-min'),
    customSec: document.getElementById('custom-sec'),
    applyCustomTime: document.getElementById('apply-custom-time'),
    
    // Controles
    playbackPanel: document.getElementById('playback-panel'),
    prevBtn: document.getElementById('prev-btn'),
    playBtn: document.getElementById('play-btn'),
    nextBtn: document.getElementById('next-btn'),
    shuffleBtn: document.getElementById('shuffle-btn'),
    playIcon: document.getElementById('play-icon'),
    pauseIcon: document.getElementById('pause-icon'),
    
    // Opciones
    gridSelect: document.getElementById('grid-select'),
    mirrorHBtn: document.getElementById('mirror-h-btn'),
    mirrorVBtn: document.getElementById('mirror-v-btn'),
    soundToggle: document.getElementById('sound-toggle'),
    themeToggle: document.getElementById('theme-toggle'),

    // Deconstrucción y boceto
    filterBlur: document.getElementById('filter-blur'),
    blurLevelControl: document.getElementById('blur-level-control'),
    blurLevel: document.getElementById('blur-level'),
    blurLevelVal: document.getElementById('blur-level-val'),
    filterThreshold: document.getElementById('filter-threshold'),
    filterGrayscale: document.getElementById('filter-grayscale'),
    imageToSketchToggle: document.getElementById('image-to-sketch-toggle'),
    contourCanvas: document.getElementById('contour-canvas'),
    
    // Descomposición avanzada (Fase 2)
    filterPosterize: document.getElementById('filter-posterize'),
    posterizeControl: document.getElementById('posterize-control'),
    posterizeLevel: document.getElementById('posterize-level'),
    posterizeLevelVal: document.getElementById('posterize-level-val'),
    posterizeCanvas: document.getElementById('posterize-canvas'),
    progressiveRevealToggle: document.getElementById('progressive-reveal-toggle'),
    revealControl: document.getElementById('reveal-control'),
    revealStepBtns: document.querySelectorAll('.reveal-step-btn'),
    revealLevelText: document.getElementById('reveal-level-text'),
    flowLinesToggle: document.getElementById('flow-lines-toggle'),
    flowCanvas: document.getElementById('flow-canvas'),
    
    // UI responsive
    sidebarToggle: document.getElementById('sidebar-toggle'),
    sidebarBackdrop: document.getElementById('sidebar-backdrop'),
    sidebar: document.querySelector('.sidebar'),
    fullscreenBtn: document.getElementById('fullscreen-btn'),
    timerSection: document.querySelector('.timer-section')
};

// --- AUDIO SINTETIZADO (Campana de Meditación) ---
let _audioCtx = null;
function getAudioContext() {
    if (!_audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return null;
        _audioCtx = new AudioContextClass();
    }
    if (_audioCtx.state === 'suspended') {
        _audioCtx.resume();
    }
    return _audioCtx;
}

function playTimerChime() {
    if (!state.soundEnabled) return;
    
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        
        // Frecuencia fundamental del timbre de la campana (Nota A5)
        const fundamental = 880; 
        
        // Creamos múltiples osciladores para lograr un armónico metálico realista
        const partials = [1, 1.5, 2, 2.5, 3];
        const gainNode = ctx.createGain();
        gainNode.connect(ctx.destination);
        
        // Volumen inicial suave
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.02); // Ataque rápido
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.5); // Decaimiento largo (resonancia)
        
        partials.forEach((ratio, idx) => {
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            
            // Configuración de tipos de ondas combinadas
            osc.type = idx === 0 ? 'sine' : 'triangle';
            osc.frequency.value = fundamental * ratio;
            
            // Los armónicos más altos son más tenues
            oscGain.gain.value = 1 / (idx * 1.5 + 1);
            
            osc.connect(oscGain);
            oscGain.connect(gainNode);
            
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 2.5);
        });
    } catch (error) {
        console.warn('El navegador bloqueó o no soporta Web Audio API:', error);
    }
}

// --- LÓGICA DE MEZCLA Y SESIÓN ---
// El barajado, el recorrido de la tanda y el reconocimiento de formatos viven en
// src/nucleo/ y tienen pruebas propias. Aquí sólo se orquesta la interfaz.

function initSession(filesList) {
    state.images = ZenSketch.filtrarImagenes(filesList);

    if (state.images.length === 0) {
        showToast('No se encontraron imágenes válidas. Asegúrate de elegir archivos con extensiones correctas (.jpg, .png, .webp, .gif, .tiff, .bmp, .heic, .avif, etc.).', 'error', 5000);
        return;
    }

    state.lista = ZenSketch.crearPlaylist(state.images.length);
    
    // Habilitar paneles de control en UI
    elements.landingScreen.classList.add('hidden');
    elements.imageViewer.classList.remove('hidden');
    elements.statsPanel.classList.remove('disabled');
    elements.playbackPanel.classList.remove('disabled');

    // Cargar la primera imagen y arrancar
    showImage();
    resetTimer();
    startTimer();
}

function restartShuffle() {
    if (!state.lista) return;

    state.lista.rebarajar();

    showImage();
    resetTimer();
    startTimer();
}

// --- NAVEGACIÓN Y CARGA DE IMÁGENES ---
function showImage() {
    if (!state.lista || state.lista.total() === 0) return;

    const fileIndex = state.lista.imagenActual();
    const imageFile = state.images[fileIndex];

    // Testigo de esta carga: si el usuario pasa de imagen mientras una conversión
    // sigue en marcha, al resolver comprobará que ya no le toca y se apartará.
    state.generacion++;
    const generacion = state.generacion;
    state.nombreActual = imageFile.name;

    // Liberar memoria del ObjectURL anterior
    if (state.currentObjectURL) {
        URL.revokeObjectURL(state.currentObjectURL);
        state.currentObjectURL = null;
    }

    // Actualizar datos del índice en el panel de forma inmediata
    elements.currentIndexVal.textContent = `${state.lista.posicionActual()} / ${state.lista.total()}`;
    const percent = state.lista.porcentaje();
    elements.percentVal.textContent = `${percent}%`;
    elements.sessionProgressBar.style.width = `${percent}%`;

    // Procesar HEIC/HEIF si corresponde
    if (ZenSketch.necesitaConversionHeic(imageFile.name)) {
        if (typeof heic2any !== 'undefined') {
            elements.fileInfoText.textContent = "Convirtiendo HEIC...";
            elements.activeImage.style.opacity = '0.5'; // Atenuar mientras convierte

            heic2any({
                blob: imageFile,
                toType: "image/jpeg",
                quality: 0.8
            })
            .then(conversionResult => {
                const blob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;

                // El usuario ya pasó a otra imagen: esta conversión llega tarde y
                // pisaría lo que hay en pantalla, así que se descarta entera.
                if (generacion !== state.generacion) return;

                state.currentObjectURL = URL.createObjectURL(blob);
                elements.activeImage.src = state.currentObjectURL;
                elements.fileInfoText.textContent = imageFile.name;
                elements.activeImage.style.opacity = '1';
            })
            .catch(err => {
                if (generacion !== state.generacion) return;

                console.error("Error al convertir HEIC:", err);
                elements.activeImage.style.opacity = '1';
                saltarImagenRota(imageFile.name, 'no se pudo convertir');
            });
        } else {
            elements.fileInfoText.textContent = "HEIC no soportado sin conexión";
            elements.activeImage.removeAttribute('src');
        }
    } else {
        // Carga estándar
        elements.activeImage.style.opacity = '1';
        state.currentObjectURL = URL.createObjectURL(imageFile);
        elements.activeImage.src = state.currentObjectURL;
        elements.fileInfoText.textContent = imageFile.name;
    }
    
    // Aplicar transformaciones visuales activas
    applyImageTransforms();
    
    // Animación de entrada de imagen
    elements.activeImage.classList.remove('image-entering');
    void elements.activeImage.offsetWidth; // Force reflow
    elements.activeImage.classList.add('image-entering');
}

/**
 * Una imagen que el navegador no puede dibujar no debe dejar la sesión en blanco
 * sin explicación: se avisa y se pasa a la siguiente. Si fallan todas seguidas se
 * para, en vez de recorrer la lista para siempre.
 */
function saltarImagenRota(nombre, motivo) {
    state.fallosSeguidos++;

    if (state.fallosSeguidos >= state.images.length) {
        pauseTimer();
        elements.fileInfoText.textContent = 'Ninguna imagen se pudo abrir';
        showToast('Ninguna de las imágenes cargadas se pudo abrir. Prueba con otra carpeta.', 'error', 6000);
        return;
    }

    showToast(`No se pudo abrir «${nombre}»: ${motivo}. Pasando a la siguiente.`, 'warning', 4000);
    nextImage();
}

function nextImage() {
    if (!state.lista) return;
    state.lista.avanzar();
    showImage();
    resetTimer();
}

function prevImage() {
    if (!state.lista) return;
    state.lista.retroceder();
    showImage();
    resetTimer();
}

// --- SISTEMA DEL TEMPORIZADOR ---
function updateTimerUI() {
    elements.timerText.textContent = ZenSketch.formatearTiempo(state.timeLeft);

    // Progreso del anillo circular (SVG stroke-dashoffset)
    const fraccion = ZenSketch.fraccionRestante(state.timeLeft, state.duration);
    elements.timerRing.style.strokeDashoffset = ZenSketch.desplazamientoAnillo(RING_CIRCUMFERENCE, fraccion);

    // Cambio dinámico de color del anillo a medida que se acaba el tiempo
    switch (ZenSketch.estadoAnillo(state.timeLeft, state.duration, state.isPlaying)) {
        case 'advertencia':
            elements.timerRing.style.stroke = '#f87171'; // Rojo suave de advertencia
            break;
        case 'pausa':
            elements.timerRing.style.stroke = '#fbbf24'; // Amarillo ámbar cuando está en pausa
            break;
        default:
            elements.timerRing.style.stroke = 'var(--primary-glow)'; // Color normal
    }

    // Animación de advertencia cuando quedan menos de 5 segundos
    if (elements.timerSection) {
        elements.timerSection.classList.toggle(
            'timer-warning',
            ZenSketch.enAvisoFinal(state.timeLeft, state.isPlaying)
        );
    }
}

function startTimer() {
    if (state.isPlaying || state.images.length === 0) return;
    
    state.isPlaying = true;
    elements.playIcon.classList.add('hidden');
    elements.pauseIcon.classList.remove('hidden');
    elements.playBtn.classList.add('paused');
    elements.playBtn.title = "Pausar (Espacio)";
    
    elements.timerRing.style.stroke = 'var(--primary-glow)';

    // Se fija el instante en que debe acabar la pose. Al reanudar de una pausa se
    // parte de lo que quedaba, no de la duración completa.
    const restante = state.restanteMs !== null ? state.restanteMs : state.duration * 1000;
    state.finPose = performance.now() + restante;
    state.restanteMs = null;

    // El intervalo va más fino que un segundo: no lleva la cuenta, sólo pregunta
    // cuánto falta, así que la campana no puede llegar tarde ni desfasarse.
    state.timerId = setInterval(() => {
        const ahora = performance.now();

        if (ZenSketch.haTerminado(state.finPose, ahora)) {
            state.timeLeft = 0;
            updateTimerUI();
            playTimerChime();
            nextImage();
            return;
        }

        state.timeLeft = ZenSketch.restanteEn(state.finPose, ahora);
        updateTimerUI();
    }, 200);

    updateTimerUI();
}

function pauseTimer() {
    if (!state.isPlaying) return;
    
    state.isPlaying = false;
    clearInterval(state.timerId);

    // Guardar lo que quedaba para que reanudar no regale ni robe tiempo
    state.restanteMs = state.finPose !== null
        ? ZenSketch.restanteMs(state.finPose, performance.now())
        : null;

    elements.playIcon.classList.remove('hidden');
    elements.pauseIcon.classList.add('hidden');
    elements.playBtn.classList.remove('paused');
    elements.playBtn.title = "Reproducir (Espacio)";
    
    updateTimerUI();
}

function togglePlayPause() {
    if (state.images.length === 0) return;
    if (state.isPlaying) {
        pauseTimer();
    } else {
        startTimer();
    }
}

function resetTimer() {
    state.finPose = null;
    state.restanteMs = null;
    state.timeLeft = state.duration;
    updateTimerUI();
    
    if (state.isPlaying) {
        clearInterval(state.timerId);
        state.isPlaying = false;
        startTimer();
    }
}

function setTimerDuration(seconds) {
    state.duration = seconds;
    state.finPose = null;
    state.restanteMs = null;
    state.timeLeft = seconds;
    
    // Sincronizar UI de Inputs personalizados si corresponde
    elements.customMin.value = Math.floor(seconds / 60);
    elements.customSec.value = seconds % 60;
    
    updateTimerUI();
    
    if (state.isPlaying) {
        clearInterval(state.timerId);
        state.isPlaying = false;
        startTimer();
    }
}

// --- AYUDAS VISUALES Y FILTROS ---

/**
 * Rectángulo que ocupa realmente la imagen dentro de su contenedor. El cálculo
 * de object-fit: contain vive en src/nucleo/geometria.js, donde está probado;
 * hasta ahora estaba copiado en tres funciones de este archivo.
 */
function medidasDeImagen(img) {
    if (!img || !img.complete) return null;

    return ZenSketch.dimensionesRenderizadas({
        anchoContenedor: img.clientWidth,
        altoContenedor: img.clientHeight,
        anchoNatural: img.naturalWidth,
        altoNatural: img.naturalHeight
    });
}

function applyImageTransforms() {
    // Configuración espejo. Se aplica a TODAS las capas que se dibujan encima de
    // la imagen: si alguna se queda fuera, voltear con posterización o líneas de
    // flujo activas dejaba el dibujo al revés respecto al fondo.
    const scaleX = state.mirrorH ? -1 : 1;
    const scaleY = state.mirrorV ? -1 : 1;
    const transformacion = `scale(${scaleX}, ${scaleY})`;

    const capas = [
        elements.activeImage,
        elements.contourCanvas,
        elements.posterizeCanvas,
        elements.flowCanvas,
        elements.gridOverlay
    ];

    for (const capa of capas) {
        if (capa) capa.style.transform = transformacion;
    }
}

function updateGridOverlay() {
    elements.gridOverlay.innerHTML = '';
    elements.gridOverlay.className = 'grid-overlay'; // Reset clases
    
    if (state.gridType === 'none') {
        elements.gridOverlay.classList.add('hidden');
        return;
    }
    
    elements.gridOverlay.classList.remove('hidden');
    
    // Ajustar tamaño y posición según la imagen activa renderizada (object-fit: contain)
    // Ajustar tamaño y posición a la imagen realmente visible
    const medidas = medidasDeImagen(elements.activeImage);
    if (medidas) {
        elements.gridOverlay.style.left = medidas.x + 'px';
        elements.gridOverlay.style.top = medidas.y + 'px';
        elements.gridOverlay.style.width = medidas.ancho + 'px';
        elements.gridOverlay.style.height = medidas.alto + 'px';
    }
    
    let gridClass = '';
    let cellCount = 0;
    
    switch (state.gridType) {
        case 'thirds':
            gridClass = 'grid-thirds';
            cellCount = 9;
            break;
        case 'grid2':
            gridClass = 'grid-2x2';
            cellCount = 4;
            break;
        case 'grid4':
            gridClass = 'grid-4x4';
            cellCount = 16;
            break;
    }
    
    elements.gridOverlay.classList.add(gridClass);
    
    // Crear celdas de cuadrícula
    for (let i = 0; i < cellCount; i++) {
        const cell = document.createElement('div');
        elements.gridOverlay.appendChild(cell);
    }
}

// --- MANEJADORES DE EVENTOS ---

// Configuración de la carpeta
function handleFolderSelection(event) {
    const files = event.target.files;
    if (files && files.length > 0) {
        initSession(files);
    }
}

// Vinculación de entradas (Ambos selectores: carpeta y archivos múltiples)
elements.folderUpload.addEventListener('change', handleFolderSelection);
elements.folderUploadLanding.addEventListener('change', handleFolderSelection);
elements.filesUpload.addEventListener('change', handleFolderSelection);
elements.filesUploadLanding.addEventListener('change', handleFolderSelection);

// Botones de control de flujo
elements.playBtn.addEventListener('click', togglePlayPause);
elements.nextBtn.addEventListener('click', nextImage);
elements.prevBtn.addEventListener('click', prevImage);
elements.shuffleBtn.addEventListener('click', restartShuffle);

// Presets del temporizador
elements.presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        elements.presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const seconds = parseInt(btn.dataset.time, 10);
        setTimerDuration(seconds);
    });
});

// Temporizador personalizado
elements.applyCustomTime.addEventListener('click', () => {
    const totalSeconds = ZenSketch.duracionDesdeCampos(elements.customMin.value, elements.customSec.value);

    if (totalSeconds === null) {
        showToast('Introduce un tiempo mayor a 0 segundos.', 'warning');
        return;
    }
    
    // Quitar active de presets puesto que ahora es un tiempo custom
    elements.presetBtns.forEach(b => b.classList.remove('active'));
    
    setTimerDuration(totalSeconds);
});

// Opciones adicionales (Cuadrícula, Espejo, Sonido)
elements.gridSelect.addEventListener('change', (e) => {
    state.gridType = e.target.value;
    updateGridOverlay();
});

elements.mirrorHBtn.addEventListener('click', () => {
    state.mirrorH = !state.mirrorH;
    elements.mirrorHBtn.classList.toggle('active', state.mirrorH);
    applyImageTransforms();
});

elements.mirrorVBtn.addEventListener('click', () => {
    state.mirrorV = !state.mirrorV;
    elements.mirrorVBtn.classList.toggle('active', state.mirrorV);
    applyImageTransforms();
});

elements.soundToggle.addEventListener('change', (e) => {
    state.soundEnabled = e.target.checked;
});

// --- ATAJOS DE TECLADO ---
// Uno solo para toda la aplicación: antes había dos manejadores registrados por
// separado, con guardas distintas sobre qué campo tenía el foco (defecto D-09).
window.addEventListener('keydown', (e) => {
    // No robar teclas mientras se escribe en el temporizador o se elige cuadrícula
    const foco = document.activeElement;
    if (foco && (foco.tagName === 'INPUT' || foco.tagName === 'SELECT')) return;

    switch (e.code) {
        case 'Space':
            e.preventDefault();
            togglePlayPause();
            break;
        case 'ArrowRight':
            e.preventDefault();
            if (state.images.length > 0) nextImage();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            if (state.images.length > 0) prevImage();
            break;
        case 'KeyH':
            if (state.images.length > 0) {
                state.mirrorH = !state.mirrorH;
                elements.mirrorHBtn.classList.toggle('active', state.mirrorH);
                applyImageTransforms();
            }
            break;
        case 'KeyV':
            if (state.images.length > 0) {
                state.mirrorV = !state.mirrorV;
                elements.mirrorVBtn.classList.toggle('active', state.mirrorV);
                applyImageTransforms();
            }
            break;
        case 'KeyF':
            e.preventDefault();
            toggleFullscreen();
            break;
        case 'Escape':
            // Cerrar el panel lateral en móvil
            if (elements.sidebar.classList.contains('open')) {
                toggleSidebar();
            }
            break;
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
        case 'Digit4':
            // Los peldaños del revelado progresivo, cuando está encendido
            if (state.capas.reveal) {
                e.preventDefault();
                fijarPeldanoRevelado(parseInt(e.code.replace('Digit', ''), 10));
            }
            break;
    }
});

// --- SISTEMA DE TEMA (Claro / Oscuro) ---
// El tema ya lo aplica el script en línea de index.html, antes del primer pintado,
// para que no haya un destello del tema equivocado. Aquí sólo se lee de la clase
// que ese script dejó puesta, en vez de volver a deducirlo de localStorage.

function initTheme() {
    state.theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
}

function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';

    document.body.classList.toggle('light-theme', state.theme === 'light');
    localStorage.setItem('theme', state.theme);

    // Redibujar contornos si están activos para adaptar colores de tiza/grafito
    if (state.imageToSketch) {
        updateImageContours();
    }
}

// Vinculación de eventos de tema
elements.themeToggle.addEventListener('click', toggleTheme);

// Inicializar anillo del temporizador al cargar
elements.timerRing.style.strokeDasharray = RING_CIRCUMFERENCE;
elements.timerRing.style.strokeDashoffset = 0;
updateTimerUI();

// Inicializar tema
initTheme();

// --- CAPAS VISUALES ---
// Un único punto decide qué se ve y deja la interfaz diciendo la verdad. Antes
// los filtros y el revelado progresivo escribían los dos sobre style.filter y
// ganaba el último, con los interruptores encendidos sin efecto (defecto D-08).

// Qué interruptor y qué sub-panel corresponden a cada capa
const CONTROLES_DE_CAPA = {
    blur: { casilla: () => elements.filterBlur, panel: () => elements.blurLevelControl },
    threshold: { casilla: () => elements.filterThreshold },
    grayscale: { casilla: () => elements.filterGrayscale },
    posterize: { casilla: () => elements.filterPosterize, panel: () => elements.posterizeControl },
    reveal: { casilla: () => elements.progressiveRevealToggle, panel: () => elements.revealControl }
};

/** Vuelca state.capas sobre la pantalla: interruptores, filtros y lienzos. */
function aplicarCapas() {
    const capas = state.capas;

    // 1. Los controles reflejan siempre lo que de verdad está actuando
    for (const [nombre, control] of Object.entries(CONTROLES_DE_CAPA)) {
        const casilla = control.casilla();
        if (casilla) casilla.checked = capas[nombre];

        const panel = control.panel && control.panel();
        if (panel) panel.classList.toggle('hidden', !capas[nombre]);
    }

    // 2. Qué se dibuja sobre la imagen
    elements.activeImage.style.filter = capas.reveal
        ? ZenSketch.peldanoRevelado(state.revealStep).filtro
        : ZenSketch.filtroCss(capas, state.blurLevel);

    // 3. La posterización no filtra la imagen: la sustituye por su propio lienzo
    elements.activeImage.style.opacity = capas.posterize ? '0' : '1';

    if (capas.posterize) {
        applyPosterization();
    } else {
        limpiarPosterizacion();
    }
}

/** Enciende o apaga una capa, apagando lo que dejaría de tener efecto. */
function cambiarCapa(nombre, activa) {
    state.capas = ZenSketch.resolver(state.capas, nombre, activa);

    // El revelado siempre empieza por la silueta
    if (nombre === 'reveal' && activa) {
        fijarPeldanoRevelado(1);
        return;
    }

    aplicarCapas();
}

/** Coloca el revelado progresivo en uno de sus cuatro peldaños. */
function fijarPeldanoRevelado(nivel) {
    state.revealStep = nivel;

    elements.revealStepBtns.forEach(boton => {
        boton.classList.toggle('active', parseInt(boton.dataset.step, 10) === nivel);
    });
    elements.revealLevelText.textContent = ZenSketch.peldanoRevelado(nivel).etiqueta;

    aplicarCapas();
}

// --- VINCULACIÓN DE MANEJADORES DE DECONSTRUCCIÓN ---

for (const nombre of ZenSketch.FILTROS.concat(ZenSketch.MODOS)) {
    const casilla = CONTROLES_DE_CAPA[nombre].casilla();
    if (casilla) {
        casilla.addEventListener('change', (e) => cambiarCapa(nombre, e.target.checked));
    }
}

elements.blurLevel.addEventListener('input', (e) => {
    state.blurLevel = parseInt(e.target.value, 10);
    elements.blurLevelVal.textContent = `${state.blurLevel}px`;
    aplicarCapas();
});

// Ajustar las superposiciones cuando la imagen termina de cargar
elements.activeImage.addEventListener('load', () => {
    state.fallosSeguidos = 0;   // esta sí se pudo abrir

    updateGridOverlay();
    aplicarCapas();

    if (state.imageToSketch) {
        updateImageContours();
    }
    if (state.flowLines) {
        drawFlowLines();
    }
});

// Una imagen que el navegador no sabe dibujar deja de fallar en silencio
elements.activeImage.addEventListener('error', () => {
    if (!elements.activeImage.getAttribute('src')) return;   // limpieza intencionada
    saltarImagenRota(state.nombreActual, 'el navegador no puede mostrar ese formato');
});

window.addEventListener('resize', () => {
    if (state.imageToSketch) {
        updateImageContours();
    }
    updateGridOverlay();
});




function updateImageContours() {
    const img = elements.activeImage;
    const canvas = elements.contourCanvas;
    if (!canvas || !img) return;
    
    const ctx = canvas.getContext('2d');
    
    // Si la imagen no está cargada o no hay modo boceto activo, limpiar y retornar
    if (!state.imageToSketch || !img.complete || img.naturalWidth === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }
    
    const medidas = medidasDeImagen(img);
    if (!medidas) return;

    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    const renderedWidth = medidas.ancho;
    const renderedHeight = medidas.alto;

    // Posicionar y dimensionar el canvas exactamente sobre la imagen renderizada
    canvas.width = renderedWidth;
    canvas.height = renderedHeight;
    canvas.style.left = medidas.x + 'px';
    canvas.style.top = medidas.y + 'px';
    canvas.style.width = renderedWidth + 'px';
    canvas.style.height = renderedHeight + 'px';
    
    // Crear un canvas temporal para procesamiento a resolución balanceada (max 800px para fluidez instantánea)
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    const proceso = ZenSketch.tamanoDeProceso(naturalWidth, naturalHeight, 800);
    const procWidth = proceso.ancho;
    const procHeight = proceso.alto;

    tempCanvas.width = procWidth;
    tempCanvas.height = procHeight;
    
    try {
        tempCtx.drawImage(img, 0, 0, procWidth, procHeight);
    } catch (e) {
        console.warn('Error al leer imagen de contornos (CORS/Carga):', e);
        return;
    }
    
    let imgData;
    try {
        imgData = tempCtx.getImageData(0, 0, procWidth, procHeight);
    } catch (e) {
        console.warn('Seguridad CORS bloqueó acceso a pixeles para contornos:', e);
        return;
    }
    
    const data = imgData.data;
    
    // 1. Convertir a escala de grises (luminancia)
    const gray = new Uint8Array(procWidth * procHeight);
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        gray[i/4] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }
    
    // 2. Operador Sobel para gradientes horizontales y verticales
    const edges = new Float32Array(procWidth * procHeight);
    let maxVal = 0;
    
    for (let y = 1; y < procHeight - 1; y++) {
        for (let x = 1; x < procWidth - 1; x++) {
            const idx = y * procWidth + x;
            
            // Kernel Sobel Horizontal
            const gx = 
                -1 * gray[(y-1)*procWidth + (x-1)] + 1 * gray[(y-1)*procWidth + (x+1)] +
                -2 * gray[y*procWidth + (x-1)]     + 2 * gray[y*procWidth + (x+1)] +
                -1 * gray[(y+1)*procWidth + (x-1)] + 1 * gray[(y+1)*procWidth + (x+1)];
                
            // Kernel Sobel Vertical
            const gy = 
                -1 * gray[(y-1)*procWidth + (x-1)] - 2 * gray[(y-1)*procWidth + x] - 1 * gray[(y-1)*procWidth + (x+1)] +
                1 * gray[(y+1)*procWidth + (x-1)] + 2 * gray[(y+1)*procWidth + x] + 1 * gray[(y+1)*procWidth + (x+1)];
                
            const val = Math.hypot(gx, gy);
            edges[idx] = val;
            if (val > maxVal) maxVal = val;
        }
    }
    
    // 3. Renderizar boceto artístico de dos capas (Boceto de construcción + Grafito detallado)
    const isLight = document.body.classList.contains('light-theme');
    
    // Colores para la tinta de grafito principal
    const graphiteColor = isLight ? { r: 51, g: 65, b: 85 } : { r: 226, g: 232, b: 240 };
    // Colores para la tinta del boceto de construcción base (azul para tema claro, rosa para tema oscuro)
    const baseColor = isLight ? { r: 56, g: 189, b: 248 } : { r: 244, g: 114, b: 182 };
    
    // Umbral de borde
    const threshold = 35;
    
    // Buffer para la capa de boceto base (azul/rosa suave, ligeramente desenfocado o expandido)
    const baseOutCanvas = document.createElement('canvas');
    baseOutCanvas.width = procWidth;
    baseOutCanvas.height = procHeight;
    const baseCtx = baseOutCanvas.getContext('2d');
    const baseImgData = baseCtx.createImageData(procWidth, procHeight);
    const baseData = baseImgData.data;
    
    // Buffer para la capa de grafito detallada
    const graphOutCanvas = document.createElement('canvas');
    graphOutCanvas.width = procWidth;
    graphOutCanvas.height = procHeight;
    const graphCtx = graphOutCanvas.getContext('2d');
    const graphImgData = graphCtx.createImageData(procWidth, procHeight);
    const graphData = graphImgData.data;
    
    for (let i = 0; i < edges.length; i++) {
        const idx = i * 4;
        const val = edges[i];
        
        if (val > threshold) {
            // Intensidad proporcional al gradiente
            const pct = val / (maxVal || 1);
            
            // Capa Base: Trazos de construcción suaves
            baseData[idx] = baseColor.r;
            baseData[idx+1] = baseColor.g;
            baseData[idx+2] = baseColor.b;
            baseData[idx+3] = Math.min(255, Math.round(pct * 140));
            
            // Capa Grafito: Contorno final limpio y oscuro
            graphData[idx] = graphiteColor.r;
            graphData[idx+1] = graphiteColor.g;
            graphData[idx+2] = graphiteColor.b;
            graphData[idx+3] = Math.min(255, Math.round(pct * 230));
        } else {
            baseData[idx+3] = 0;
            graphData[idx+3] = 0;
        }
    }
    
    baseCtx.putImageData(baseImgData, 0, 0);
    graphCtx.putImageData(graphImgData, 0, 0);
    
    ctx.clearRect(0, 0, renderedWidth, renderedHeight);
    
    // Dibujar capa 1 (Boceto de construcción) con un ligero escalado/desenfoque para simular volumen
    ctx.globalAlpha = 0.55;
    ctx.drawImage(baseOutCanvas, 0, 0, procWidth, procHeight, -1, -1, renderedWidth + 2, renderedHeight + 2);
    
    // Dibujar capa 2 (Grafito detallado) exactamente en su posición
    ctx.globalAlpha = 1.0;
    ctx.drawImage(graphOutCanvas, 0, 0, procWidth, procHeight, 0, 0, renderedWidth, renderedHeight);
}

// Vinculación de toggle Imagen a Boceto (Sin fondo)
elements.imageToSketchToggle.addEventListener('change', (e) => {
    state.imageToSketch = e.target.checked;
    elements.imageWrapper.classList.toggle('image-to-sketch', state.imageToSketch);
    
    if (state.imageToSketch) {
        updateImageContours();
    } else {
        const canvas = elements.contourCanvas;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
});

// =====================================================
// === FASE 2: DESCOMPOSICIÓN AVANZADA DE IMÁGENES ===
// =====================================================

// --- UTILIDAD: Calcular dimensiones renderizadas de la imagen ---
function getRenderedImageDimensions() {
    const img = elements.activeImage;
    const medidas = medidasDeImagen(img);
    if (!medidas) return null;

    return {
        renderedWidth: medidas.ancho,
        renderedHeight: medidas.alto,
        offsetX: medidas.x,
        offsetY: medidas.y,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        scale: medidas.escala
    };
}

// --- UTILIDAD: Obtener datos de imagen procesados a resolución manejable ---
function getProcessedImageData(maxDimension = 600) {
    const img = elements.activeImage;
    if (!img || !img.complete || img.naturalWidth === 0) return null;
    
    const proceso = ZenSketch.tamanoDeProceso(img.naturalWidth, img.naturalHeight, maxDimension);
    const procWidth = proceso.ancho;
    const procHeight = proceso.alto;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = procWidth;
    tempCanvas.height = procHeight;
    
    try {
        tempCtx.drawImage(img, 0, 0, procWidth, procHeight);
        const imgData = tempCtx.getImageData(0, 0, procWidth, procHeight);
        return { data: imgData.data, width: procWidth, height: procHeight, canvas: tempCanvas, ctx: tempCtx };
    } catch (e) {
        console.warn('Error al procesar imagen (CORS):', e);
        return null;
    }
}

// --- 2.1: POSTERIZACIÓN INTELIGENTE ---
/** Borra el lienzo de posterización y lo aparta. */
function limpiarPosterizacion() {
    const canvas = elements.posterizeCanvas;
    if (!canvas) return;

    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.display = 'none';
}

function applyPosterization() {
    const canvas = elements.posterizeCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (!state.capas.posterize) {
        limpiarPosterizacion();
        return;
    }

    const dims = getRenderedImageDimensions();
    if (!dims) return;
    
    const processed = getProcessedImageData(800);
    if (!processed) return;
    
    // Posicionar el canvas
    canvas.width = dims.renderedWidth;
    canvas.height = dims.renderedHeight;
    canvas.style.left = dims.offsetX + 'px';
    canvas.style.top = dims.offsetY + 'px';
    canvas.style.width = dims.renderedWidth + 'px';
    canvas.style.height = dims.renderedHeight + 'px';
    canvas.style.display = 'block';
    
    const levels = state.posterizeLevel;
    const data = processed.data;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = processed.width;
    outCanvas.height = processed.height;
    const outCtx = outCanvas.getContext('2d');
    const outData = outCtx.createImageData(processed.width, processed.height);
    const out = outData.data;
    
    const step = 255 / (levels - 1);
    
    for (let i = 0; i < data.length; i += 4) {
        // Posterizar cada canal
        out[i]     = Math.round(Math.round(data[i] / step) * step);
        out[i + 1] = Math.round(Math.round(data[i + 1] / step) * step);
        out[i + 2] = Math.round(Math.round(data[i + 2] / step) * step);
        out[i + 3] = 255;
    }
    
    outCtx.putImageData(outData, 0, 0);
    ctx.clearRect(0, 0, dims.renderedWidth, dims.renderedHeight);
    ctx.drawImage(outCanvas, 0, 0, processed.width, processed.height, 0, 0, dims.renderedWidth, dims.renderedHeight);
}

elements.posterizeLevel.addEventListener('input', (e) => {
    state.posterizeLevel = parseInt(e.target.value, 10);
    elements.posterizeLevelVal.textContent = state.posterizeLevel;
    if (state.capas.posterize) {
        applyPosterization();
    }
});

// --- 2.2: REVELADO PROGRESIVO ---
// Los cuatro peldaños y su filtro viven en src/nucleo/capas.js.

elements.revealStepBtns.forEach(boton => {
    boton.addEventListener('click', () => {
        fijarPeldanoRevelado(parseInt(boton.dataset.step, 10));
    });
});

// --- 2.3: LÍNEAS DE FLUJO (Flow Lines) ---
function drawFlowLines() {
    const canvas = elements.flowCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (!state.flowLines) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.classList.remove('active');
        return;
    }
    
    const dims = getRenderedImageDimensions();
    if (!dims) return;
    
    const processed = getProcessedImageData(400);
    if (!processed) return;
    
    // Posicionar el canvas
    canvas.width = dims.renderedWidth;
    canvas.height = dims.renderedHeight;
    canvas.style.left = dims.offsetX + 'px';
    canvas.style.top = dims.offsetY + 'px';
    canvas.style.width = dims.renderedWidth + 'px';
    canvas.style.height = dims.renderedHeight + 'px';
    canvas.classList.add('active');
    
    const { data, width, height } = processed;
    
    // Convertir a escala de grises
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        gray[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }
    
    // Calcular gradientes con Sobel
    const gradX = new Float32Array(width * height);
    const gradY = new Float32Array(width * height);
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            gradX[idx] = -gray[(y-1)*width+(x-1)] + gray[(y-1)*width+(x+1)]
                        - 2*gray[y*width+(x-1)] + 2*gray[y*width+(x+1)]
                        - gray[(y+1)*width+(x-1)] + gray[(y+1)*width+(x+1)];
            gradY[idx] = -gray[(y-1)*width+(x-1)] - 2*gray[(y-1)*width+x] - gray[(y-1)*width+(x+1)]
                        + gray[(y+1)*width+(x-1)] + 2*gray[(y+1)*width+x] + gray[(y+1)*width+(x+1)];
        }
    }
    
    // Dibujar líneas de flujo siguiendo la dirección perpendicular al gradiente
    ctx.clearRect(0, 0, dims.renderedWidth, dims.renderedHeight);
    
    const isLight = document.body.classList.contains('light-theme');
    const scaleX = dims.renderedWidth / width;
    const scaleY = dims.renderedHeight / height;
    
    // Muestreo espacial para las líneas
    const gridStep = 12;
    const lineLength = 30;
    const steps = 15;
    
    for (let gy = gridStep; gy < height - gridStep; gy += gridStep) {
        for (let gx = gridStep; gx < width - gridStep; gx += gridStep) {
            const idx = gy * width + gx;
            const mag = Math.hypot(gradX[idx], gradY[idx]);
            
            if (mag < 15) continue; // Ignorar zonas planas
            
            // Intensidad del trazo basada en la magnitud del gradiente
            const intensity = Math.min(1, mag / 200);
            
            ctx.beginPath();
            ctx.strokeStyle = isLight 
                ? `rgba(99, 102, 241, ${0.15 + intensity * 0.5})`
                : `rgba(168, 85, 247, ${0.15 + intensity * 0.5})`;
            ctx.lineWidth = 1.5 + intensity * 1.5;
            ctx.lineCap = 'round';
            
            // Trazar una línea corta siguiendo el flujo
            let cx = gx, cy = gy;
            ctx.moveTo(cx * scaleX, cy * scaleY);
            
            for (let s = 0; s < steps; s++) {
                // Recalcular dirección en cada paso
                const ix = Math.round(cx);
                const iy = Math.round(cy);
                if (ix < 1 || ix >= width - 1 || iy < 1 || iy >= height - 1) break;
                
                const pi = iy * width + ix;
                const localAngle = Math.atan2(gradY[pi], gradX[pi]) + Math.PI / 2;
                
                cx += Math.cos(localAngle) * (lineLength / steps);
                cy += Math.sin(localAngle) * (lineLength / steps);
                
                ctx.lineTo(cx * scaleX, cy * scaleY);
            }
            
            ctx.stroke();
        }
    }
}

elements.flowLinesToggle.addEventListener('change', (e) => {
    state.flowLines = e.target.checked;
    
    if (state.flowLines) {
        drawFlowLines();
    } else {
        const ctx = elements.flowCanvas.getContext('2d');
        ctx.clearRect(0, 0, elements.flowCanvas.width, elements.flowCanvas.height);
        elements.flowCanvas.classList.remove('active');
    }
});

// El ajuste al cambiar de imagen lo hace ya el manejador de 'load' de más
// arriba, que era el segundo registrado sobre el mismo elemento (defecto D-09).

window.addEventListener('resize', () => {
    if (state.capas.posterize) {
        applyPosterization();
    }
    if (state.flowLines) {
        drawFlowLines();
    }
});


// =====================================================
// === FASE 4: MEJORAS DE UX ===
// =====================================================

// --- SIDEBAR RESPONSIVE ---
function toggleSidebar() {
    elements.sidebar.classList.toggle('open');
    elements.sidebarBackdrop.classList.toggle('show');
}

if (elements.sidebarToggle) {
    elements.sidebarToggle.addEventListener('click', toggleSidebar);
}
if (elements.sidebarBackdrop) {
    elements.sidebarBackdrop.addEventListener('click', toggleSidebar);
}

// --- SECCIONES COLAPSABLES ---
document.querySelectorAll('.section-title[data-section]').forEach(title => {
    title.addEventListener('click', () => {
        const section = title.closest('.control-section');
        if (section) {
            section.classList.toggle('section-collapsed');
        }
    });
});

// --- PANTALLA COMPLETA ---
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.warn('Error al entrar en pantalla completa:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

if (elements.fullscreenBtn) {
    elements.fullscreenBtn.addEventListener('click', toggleFullscreen);
}

// Los atajos de pantalla completa, Escape y 1-4 están en el único manejador de
// teclado de más arriba.

// --- DRAG & DROP ---
const zonaSoltado = document.querySelector('.viewport');
if (zonaSoltado) {
    zonaSoltado.addEventListener('dragover', (e) => {
        e.preventDefault();
        zonaSoltado.style.outline = '3px dashed var(--primary-glow)';
        zonaSoltado.style.outlineOffset = '-10px';
    });
    
    zonaSoltado.addEventListener('dragleave', () => {
        zonaSoltado.style.outline = '';
        zonaSoltado.style.outlineOffset = '';
    });
    
    zonaSoltado.addEventListener('drop', (e) => {
        e.preventDefault();
        zonaSoltado.style.outline = '';
        zonaSoltado.style.outlineOffset = '';
        
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            initSession(files);
            showToast(`${files.length} archivo(s) cargado(s)`, 'success');
        }
    });
}

