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
    
    // Rutina de sesión en marcha, si hay alguna
    rutina: null,
    idRutina: '',

    // Zoom y desplazamiento sobre la imagen
    zoom: 1,
    desplazamientoX: 0,
    desplazamientoY: 0,

    // Gestión de memoria
    currentObjectURL: null,
    nombreActual: ''     // Nombre del archivo en pantalla, para los avisos
};

state.capas = ZenSketch.capasApagadas();

// --- CONVERSOR DE HEIC, A DEMANDA ---
// Son 1,3 MB de libheif compilado: cargarlo al arrancar penalizaba cada sesión,
// incluso las que no tienen una sola foto de iPhone. Se trae la primera vez que
// hace falta y se reutiliza el resto de la sesión.

let promesaConversorHeic = null;

function cargarConversorHeic() {
    if (promesaConversorHeic) return promesaConversorHeic;

    promesaConversorHeic = new Promise((resolver, rechazar) => {
        const script = document.createElement('script');
        script.src = 'assets/heic2any.min.js';
        script.onload = () => {
            if (typeof window.heic2any === 'function') {
                resolver(window.heic2any);
            } else {
                rechazar(new Error('el conversor se cargó pero no se registró'));
            }
        };
        script.onerror = () => rechazar(new Error('no se encontró assets/heic2any.min.js'));
        document.head.appendChild(script);
    });

    return promesaConversorHeic;
}

// --- SISTEMA DE TOASTS ---
function showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';

        // Sin esto, un lector de pantalla no dice nunca que una imagen falló ni
        // que la rutina terminó: los avisos aparecían sólo para quien los ve.
        container.setAttribute('role', 'status');
        container.setAttribute('aria-live', 'polite');

        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // textContent y no innerHTML: los avisos llevan nombres de archivo, que son
    // texto que eligió otra persona y no marcado que deba interpretarse.
    const texto = document.createElement('span');
    texto.textContent = message;
    toast.appendChild(texto);
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
    // Rutina de sesión
    rutinaSelect: document.getElementById('rutina-select'),
    rutinaEstado: document.getElementById('rutina-estado'),
    rutinaBloque: document.getElementById('rutina-bloque'),
    rutinaPose: document.getElementById('rutina-pose'),
    rutinaBarra: document.getElementById('rutina-barra'),

    // Práctica acumulada
    practicaRacha: document.getElementById('practica-racha'),
    practicaHoy: document.getElementById('practica-hoy'),
    practicaTotal: document.getElementById('practica-total'),
    practicaPie: document.getElementById('practica-pie'),

    // Zoom
    avisoZoom: document.getElementById('aviso-zoom'),

    // Atajos de teclado
    capaAtajos: document.getElementById('capa-atajos'),
    cerrarAtajos: document.getElementById('cerrar-atajos'),

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

    anotarPoseTerminada();

    if (state.rutina) {
        setTimerDuration(state.rutina.reiniciar());
        marcarPresetActivo(state.duration);
        pintarProgresoDeRutina();
    }

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
        elements.fileInfoText.textContent = "Convirtiendo HEIC...";
        elements.activeImage.style.opacity = '0.5'; // Atenuar mientras convierte

        cargarConversorHeic()
            .then(convertir => convertir({
                blob: imageFile,
                toType: "image/jpeg",
                quality: 0.8
            }))
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
        // Carga estándar
        elements.activeImage.style.opacity = '1';
        state.currentObjectURL = URL.createObjectURL(imageFile);
        elements.activeImage.src = state.currentObjectURL;
        elements.fileInfoText.textContent = imageFile.name;
    }
    
    // Cada referencia empieza entera: conservar el zoom de la anterior desorienta
    state.zoom = 1;
    state.desplazamientoX = 0;
    state.desplazamientoY = 0;
    elements.imageWrapper.classList.remove('ampliada');

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

    anotarPoseTerminada();
    if (!avanzarRutina()) return;   // la rutina se acabó: no se pasa de imagen

    state.lista.avanzar();
    showImage();
    resetTimer();
}

function prevImage() {
    if (!state.lista) return;

    anotarPoseTerminada();

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
    elements.playBtn.setAttribute('aria-label', 'Pausar');
    elements.playBtn.setAttribute('aria-pressed', 'true');
    
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
    elements.playBtn.setAttribute('aria-label', 'Reproducir');
    elements.playBtn.setAttribute('aria-pressed', 'false');
    
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

/**
 * Un botón que conmuta tiene que decir en qué estado está, no sólo enseñarlo con
 * un color: aria-pressed es lo que hace que «Voltear en horizontal» se anuncie
 * como activado o desactivado.
 */
function marcarConmutador(boton, activo) {
    if (!boton) return;
    boton.classList.toggle('active', activo);
    boton.setAttribute('aria-pressed', String(activo));
}

function applyImageTransforms() {
    // Espejo y zoom en una sola transformación, aplicada a TODAS las capas que se
    // dibujan encima de la imagen: si alguna se queda fuera, el dibujo acaba
    // desencajado respecto al fondo. El orden importa —primero se desplaza, luego
    // se amplía y por último se voltea— para que el espejo no invierta el arrastre.
    const scaleX = state.mirrorH ? -1 : 1;
    const scaleY = state.mirrorV ? -1 : 1;
    const transformacion =
        `translate(${state.desplazamientoX}px, ${state.desplazamientoY}px) ` +
        `scale(${state.zoom}) scale(${scaleX}, ${scaleY})`;

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
        guardarPreferencias();
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
    guardarPreferencias();
});

// Opciones adicionales (Cuadrícula, Espejo, Sonido)
elements.gridSelect.addEventListener('change', (e) => {
    state.gridType = e.target.value;
    updateGridOverlay();
    guardarPreferencias();
});

elements.mirrorHBtn.addEventListener('click', () => {
    state.mirrorH = !state.mirrorH;
    marcarConmutador(elements.mirrorHBtn, state.mirrorH);
    applyImageTransforms();
});

elements.mirrorVBtn.addEventListener('click', () => {
    state.mirrorV = !state.mirrorV;
    marcarConmutador(elements.mirrorVBtn, state.mirrorV);
    applyImageTransforms();
});

elements.soundToggle.addEventListener('change', (e) => {
    state.soundEnabled = e.target.checked;
    guardarPreferencias();
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
                marcarConmutador(elements.mirrorHBtn, state.mirrorH);
                applyImageTransforms();
            }
            break;
        case 'KeyV':
            if (state.images.length > 0) {
                state.mirrorV = !state.mirrorV;
                marcarConmutador(elements.mirrorVBtn, state.mirrorV);
                applyImageTransforms();
            }
            break;
        case 'KeyF':
            e.preventDefault();
            toggleFullscreen();
            break;
        case 'Digit0':
            if (state.images.length > 0) {
                e.preventDefault();
                reiniciarZoom();
            }
            break;
        case 'Escape':
            // Lo de más arriba se cierra primero: primero los atajos, luego el panel
            if (atajosVisibles()) {
                ocultarAtajos();
            } else if (elements.sidebar.classList.contains('open')) {
                toggleSidebar();
            }
            break;
        case 'Slash':
        case 'IntlRo':
            // La ? está en Shift + / en unos teclados y suelta en otros
            if (e.shiftKey || e.key === '?') {
                e.preventDefault();
                alternarAtajos();
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

// --- HISTORIAL DE PRÁCTICA ---
// Se guarda en IndexedDB y no en localStorage porque escribe en cada pose y no
// debe competir por el hilo principal con el temporizador. Los cálculos —racha,
// acumulados— viven en src/nucleo/historial.js y tienen pruebas propias.

const BASE_HISTORIAL = 'zensketch';
const ALMACEN_HISTORIAL = 'practica';
const REGISTRO_UNICO = 'dias';

let historialEnMemoria = {};
let escrituraPendiente = null;

function abrirBase() {
    return new Promise((resolver, rechazar) => {
        if (typeof indexedDB === 'undefined') {
            rechazar(new Error('sin IndexedDB'));
            return;
        }

        const peticion = indexedDB.open(BASE_HISTORIAL, 1);

        peticion.onupgradeneeded = () => {
            const base = peticion.result;
            if (!base.objectStoreNames.contains(ALMACEN_HISTORIAL)) {
                base.createObjectStore(ALMACEN_HISTORIAL);
            }
        };

        peticion.onsuccess = () => resolver(peticion.result);
        peticion.onerror = () => rechazar(peticion.error);
    });
}

async function cargarHistorial() {
    try {
        const base = await abrirBase();
        historialEnMemoria = await new Promise((resolver) => {
            const peticion = base
                .transaction(ALMACEN_HISTORIAL, 'readonly')
                .objectStore(ALMACEN_HISTORIAL)
                .get(REGISTRO_UNICO);

            peticion.onsuccess = () => resolver(peticion.result || {});
            peticion.onerror = () => resolver({});
        });
    } catch {
        // Navegación privada o almacenamiento bloqueado: la sesión funciona igual,
        // sólo que sin memoria de un día para otro.
        historialEnMemoria = {};
    }

    pintarPractica();
}

/**
 * Escribe el historial. Se agrupan las escrituras seguidas para no abrir una
 * transacción por cada pose de treinta segundos.
 */
function guardarHistorial() {
    clearTimeout(escrituraPendiente);

    escrituraPendiente = setTimeout(async () => {
        try {
            const base = await abrirBase();
            base.transaction(ALMACEN_HISTORIAL, 'readwrite')
                .objectStore(ALMACEN_HISTORIAL)
                .put(historialEnMemoria, REGISTRO_UNICO);
        } catch {
            // Sin dónde guardar: lo que hay en memoria sigue sirviendo esta sesión
        }
    }, 1000);
}

/**
 * Anota el tiempo que se ha estado dibujando la pose que termina. Se llama justo
 * antes de cambiar de imagen, contando lo que de verdad se estuvo delante y no la
 * duración configurada: saltar a los cinco segundos anota cinco segundos.
 */
function anotarPoseTerminada() {
    if (!state.lista) return;

    const dibujados = Math.max(0, state.duration - state.timeLeft);
    if (dibujados < 1) return;

    historialEnMemoria = ZenSketch.registrarPose(historialEnMemoria, {
        fecha: new Date(),
        segundos: dibujados
    });

    guardarHistorial();
    pintarPractica();
}

/** «1 día» y no «1 días»: el panel se lee muchas veces y el detalle se nota. */
function plural(cantidad, uno, varios) {
    return `${cantidad} ${cantidad === 1 ? uno : varios}`;
}

/** Vuelca el resumen al panel «Tu práctica». */
function pintarPractica() {
    if (!elements.practicaRacha) return;

    const r = ZenSketch.resumen(historialEnMemoria, new Date());

    elements.practicaRacha.textContent = r.rachaDias;
    elements.practicaHoy.textContent = r.minutosHoy;
    elements.practicaTotal.textContent = r.minutosTotales;

    if (r.imagenesTotales === 0) {
        elements.practicaPie.textContent = 'Aún no has dibujado nada aquí';
        return;
    }

    const dias = plural(r.diasActivos, 'día', 'días');

    elements.practicaPie.textContent = r.imagenesHoy > 0
        ? `${plural(r.imagenesHoy, 'referencia', 'referencias')} hoy · ${r.imagenesTotales} en ${dias}`
        : `${plural(r.imagenesTotales, 'referencia', 'referencias')} en ${dias}`;
}

// --- RUTINAS DE SESIÓN ---
// Bloques encadenados que van de poses cortas a poses largas. El temporizador
// cambia solo entre bloque y bloque, que es lo que antes había que hacer a mano
// justo cuando uno estaba concentrado.

function llenarSelectorDeRutinas() {
    for (const rutina of ZenSketch.PREDEFINIDAS) {
        const opcion = document.createElement('option');
        const minutos = Math.round(ZenSketch.duracionTotal(rutina.bloques) / 60);

        opcion.value = rutina.id;
        opcion.textContent = `${rutina.nombre} · ${minutos} min`;
        opcion.title = rutina.descripcion;

        elements.rutinaSelect.appendChild(opcion);
    }
}

function elegirRutina(id) {
    const definicion = ZenSketch.porId(id);

    if (!definicion) {
        state.rutina = null;
        state.idRutina = '';
        elements.rutinaEstado.classList.add('hidden');
        guardarPreferencias();
        return;
    }

    state.rutina = ZenSketch.crearRutina(definicion.bloques);
    state.idRutina = id;

    elements.rutinaEstado.classList.remove('hidden');
    setTimerDuration(state.rutina.duracionActual());
    marcarPresetActivo(state.duration);
    pintarProgresoDeRutina();
    guardarPreferencias();
}

function pintarProgresoDeRutina() {
    if (!state.rutina) return;

    const p = state.rutina.progreso();

    elements.rutinaBloque.textContent = p.terminada
        ? 'Sesión terminada'
        : `Bloque ${p.bloque} de ${p.totalBloques} · ${ZenSketch.formatearTiempo(p.duracion)}`;
    elements.rutinaPose.textContent = `${p.pose} / ${p.totalPoses}`;
    elements.rutinaBarra.style.width = `${Math.round((p.pose / p.totalPoses) * 100)}%`;
}

/**
 * Hace avanzar la rutina una pose. Devuelve false si con eso se acabó, para que
 * quien llama sepa que no hay que seguir pasando imágenes.
 */
function avanzarRutina() {
    if (!state.rutina) return true;

    const siguiente = state.rutina.avanzar();
    pintarProgresoDeRutina();

    if (siguiente === null) {
        pauseTimer();
        showToast('Rutina terminada. Buen trabajo.', 'success', 5000);
        return false;
    }

    setTimerDuration(siguiente);
    marcarPresetActivo(siguiente);
    return true;
}

// --- PREFERENCIAS QUE SE RECUERDAN ---
// Todo lo que el usuario elige se guarda al momento. Lo que no se guarda es el
// estado de la sesión: al volver, los archivos de la carpeta ya no están.

function preferenciasActuales() {
    return {
        duracion: state.duration,
        cuadricula: state.gridType,
        sonido: state.soundEnabled,
        nivelDesenfoque: state.blurLevel,
        nivelPosterizacion: state.posterizeLevel,
        rutina: state.idRutina || null
    };
}

function guardarPreferencias() {
    ZenSketch.guardar(preferenciasActuales());
}

/** Aplica las preferencias guardadas a la interfaz, al arrancar. */
function aplicarPreferencias() {
    const guardadas = ZenSketch.leer();

    setTimerDuration(guardadas.duracion);
    marcarPresetActivo(guardadas.duracion);

    state.gridType = guardadas.cuadricula;
    elements.gridSelect.value = guardadas.cuadricula;
    updateGridOverlay();

    state.soundEnabled = guardadas.sonido;
    elements.soundToggle.checked = guardadas.sonido;

    state.blurLevel = guardadas.nivelDesenfoque;
    elements.blurLevel.value = guardadas.nivelDesenfoque;
    elements.blurLevelVal.textContent = `${guardadas.nivelDesenfoque}px`;

    state.posterizeLevel = guardadas.nivelPosterizacion;
    elements.posterizeLevel.value = guardadas.nivelPosterizacion;
    elements.posterizeLevelVal.textContent = guardadas.nivelPosterizacion;

    if (guardadas.rutina) {
        elements.rutinaSelect.value = guardadas.rutina;
        elegirRutina(guardadas.rutina);
    }
}

/** Deja marcado el preset que coincide con la duración, si hay alguno. */
function marcarPresetActivo(segundos) {
    let alguno = false;

    elements.presetBtns.forEach((boton) => {
        const coincide = parseInt(boton.dataset.time, 10) === segundos;
        boton.classList.toggle('active', coincide);
        if (coincide) alguno = true;
    });

    return alguno;
}

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

// --- ARRANQUE ---
llenarSelectorDeRutinas();

elements.rutinaSelect.addEventListener('change', (e) => elegirRutina(e.target.value));

// Las preferencias se aplican después de tener los selectores llenos, para que una
// rutina guardada pueda seleccionarse.
aplicarPreferencias();

// El historial llega cuando llegue: la sesión no espera por él.
cargarHistorial();

// --- APLICACIÓN INSTALABLE ---
// Con el service worker, ZenSketch se instala y abre igual con red que sin ella.
// No existe sobre file://, y ahí tampoco hace falta.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('servicio.js').catch((error) => {
            console.warn('No se pudo registrar el service worker:', error);
        });
    });
}

// --- DÓNDE SE CALCULA: TRABAJADOR O HILO PRINCIPAL ---
// El trabajador quita de en medio el 84 % del coste de Sobel, pero no siempre está
// disponible: abriendo index.html con doble clic (file://) el navegador no deja
// crearlo. En ese caso se calcula aquí mismo, igual que antes, y lo único que se
// pierde es el paralelismo. Nunca se pierde la función.

const calculadora = (function () {
    let trabajador = null;
    let siguienteId = 1;
    const pendientes = new Map();

    try {
        trabajador = new Worker('src/nucleo/trabajador-imagen.js');

        trabajador.onmessage = (evento) => {
            const { id, resultado, error } = evento.data;
            const espera = pendientes.get(id);
            if (!espera) return;

            pendientes.delete(id);
            if (error) espera.rechazar(new Error(error));
            else espera.resolver(resultado);
        };

        trabajador.onerror = () => {
            // Si el trabajador se cae, se sigue calculando en el hilo principal
            console.warn('El trabajador de imagen falló; se calculará en el hilo principal.');
            for (const espera of pendientes.values()) espera.rechazar(new Error('trabajador caído'));
            pendientes.clear();
            trabajador = null;
        };
    } catch {
        trabajador = null;   // file:// y navegadores que no lo permiten
    }

    return {
        disponible() {
            return trabajador !== null;
        },

        /** Encarga una tarea. Los buffers de `transferibles` dejan de ser nuestros. */
        encargar(tarea, datos, transferibles) {
            if (!trabajador) return Promise.reject(new Error('sin trabajador'));

            const id = siguienteId++;
            return new Promise((resolver, rechazar) => {
                pendientes.set(id, { resolver, rechazar });
                trabajador.postMessage({ id, tarea, datos }, transferibles || []);
            });
        }
    };
})();

// --- PÍXELES DE LA IMAGEN ACTUAL, UNA SOLA VEZ ---
// Cada filtro volvía a dibujar la imagen en un lienzo temporal y a convertirla a
// gris desde cero. Con el boceto y las líneas de flujo encendidos eso eran dos
// decodificaciones y dos pasadas de Sobel por cada cambio de imagen, y otras tantas
// cada vez que se movía el borde de la ventana. Ahora se calcula una vez por imagen
// y se guarda; redimensionar sólo vuelve a dibujar.

let cacheDePixeles = { generacion: -1, porTamano: new Map() };

/**
 * Datos de la imagen actual reducidos a un tamaño manejable. Devuelve siempre la
 * misma entrada mientras no se cambie de imagen, para que la luminancia y el Sobel
 * se puedan guardar dentro.
 *
 * @param {number} maxDimension lado mayor al que se reduce antes de procesar
 * @returns {{rgba: Uint8ClampedArray, ancho: number, alto: number}|null}
 */
function pixelesProcesados(maxDimension) {
    const img = elements.activeImage;
    if (!img || !img.complete || img.naturalWidth === 0) return null;

    if (cacheDePixeles.generacion !== state.generacion) {
        cacheDePixeles = { generacion: state.generacion, porTamano: new Map() };
    }

    const guardado = cacheDePixeles.porTamano.get(maxDimension);
    if (guardado) return guardado;

    const proceso = ZenSketch.tamanoDeProceso(img.naturalWidth, img.naturalHeight, maxDimension);
    const lienzo = document.createElement('canvas');
    lienzo.width = proceso.ancho;
    lienzo.height = proceso.alto;

    let rgba;
    try {
        const contexto = lienzo.getContext('2d');
        contexto.drawImage(img, 0, 0, proceso.ancho, proceso.alto);
        rgba = contexto.getImageData(0, 0, proceso.ancho, proceso.alto).data;
    } catch (error) {
        console.warn('No se pudieron leer los píxeles de la imagen:', error);
        return null;
    }

    const entrada = {
        rgba,
        ancho: proceso.ancho,
        alto: proceso.alto,
        gris: null,
        bordes: null,
        boceto: null,    // capas ya calculadas, con el tema con el que se hicieron
        trazos: null     // polilíneas de las líneas de flujo
    };
    cacheDePixeles.porTamano.set(maxDimension, entrada);
    return entrada;
}

/** Luminancia de esos píxeles, calculada la primera vez que se pide. */
function luminanciaDe(pixeles) {
    if (!pixeles.gris) {
        pixeles.gris = ZenSketch.aLuminancia(pixeles.rgba);
    }
    return pixeles.gris;
}

/** Sobel de esos píxeles. Lo comparten el modo boceto y las líneas de flujo. */
function bordesDe(pixeles) {
    if (!pixeles.bordes) {
        pixeles.bordes = ZenSketch.sobel(luminanciaDe(pixeles), pixeles.ancho, pixeles.alto);
    }
    return pixeles.bordes;
}

/** Coloca un lienzo justo encima de la imagen visible. */
function colocarLienzo(canvas, medidas) {
    canvas.width = medidas.ancho;
    canvas.height = medidas.alto;
    canvas.style.left = medidas.x + 'px';
    canvas.style.top = medidas.y + 'px';
    canvas.style.width = medidas.ancho + 'px';
    canvas.style.height = medidas.alto + 'px';
}

/** Convierte un RGBA suelto en un lienzo que se pueda escalar al dibujarlo. */
function lienzoDesdeRgba(rgba, ancho, alto) {
    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    lienzo.getContext('2d').putImageData(new ImageData(rgba, ancho, alto), 0, 0);
    return lienzo;
}

/** Colores de las dos tintas del boceto, según el tema. */
function tintasDeBoceto() {
    const claro = document.body.classList.contains('light-theme');
    return {
        construccion: claro ? { r: 56, g: 189, b: 248 } : { r: 244, g: 114, b: 182 },
        grafito: claro ? { r: 51, g: 65, b: 85 } : { r: 226, g: 232, b: 240 }
    };
}

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
    guardarPreferencias();
});

// Ajustar las superposiciones cuando la imagen termina de cargar
elements.activeImage.addEventListener('load', () => {
    state.fallosSeguidos = 0;   // esta sí se pudo abrir

    aplicarCapas();
    ajustarCapasAlTamano();
});

// Una imagen que el navegador no sabe dibujar deja de fallar en silencio
elements.activeImage.addEventListener('error', () => {
    if (!elements.activeImage.getAttribute('src')) return;   // limpieza intencionada
    saltarImagenRota(state.nombreActual, 'el navegador no puede mostrar ese formato');
});

/** Vuelve a encajar todas las capas sobre la imagen visible. */
function ajustarCapasAlTamano() {
    updateGridOverlay();

    if (state.imageToSketch) updateImageContours();
    if (state.capas.posterize) applyPosterization();
    if (state.flowLines) drawFlowLines();
}

// Arrastrar el borde de la ventana dispara decenas de eventos por segundo. Antes
// había dos manejadores registrados por separado y ninguno esperaba: cada uno
// relanzaba el procesamiento entero. Ahora se atiende sólo cuando el usuario
// suelta, y los píxeles ya están calculados de antes.
let ajusteEnEspera = null;

window.addEventListener('resize', () => {
    clearTimeout(ajusteEnEspera);
    ajusteEnEspera = setTimeout(ajustarCapasAlTamano, 120);
});




/**
 * Modo boceto: dos tintas superpuestas sobre los bordes que encuentra Sobel, una
 * de construcción y otra de grafito. El cálculo vive en src/nucleo/imagen.js y se
 * hace una sola vez por imagen y tema; redimensionar sólo vuelve a pintarlo.
 */
async function updateImageContours() {
    const img = elements.activeImage;
    const canvas = elements.contourCanvas;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');

    if (!state.imageToSketch || !img.complete || img.naturalWidth === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    const medidas = medidasDeImagen(img);
    if (!medidas) return;

    const pixeles = pixelesProcesados(800);
    if (!pixeles) return;

    const tintas = tintasDeBoceto();
    const tema = state.theme;

    // ¿Hay que rehacerlo? Sólo si es otra imagen o el tema cambió de tinta.
    if (!pixeles.boceto || pixeles.boceto.tema !== tema) {
        const generacion = state.generacion;
        const capas = await capasDeBocetoDe(pixeles, tintas);

        // Mientras se calculaba, el usuario pasó a otra imagen
        if (generacion !== state.generacion || !capas) return;

        pixeles.boceto = {
            tema,
            construccion: lienzoDesdeRgba(capas.base, pixeles.ancho, pixeles.alto),
            grafito: lienzoDesdeRgba(capas.grafito, pixeles.ancho, pixeles.alto)
        };
    }

    // Puede haberse apagado mientras tanto
    if (!state.imageToSketch) return;

    colocarLienzo(canvas, medidas);
    ctx.clearRect(0, 0, medidas.ancho, medidas.alto);

    // La capa de construcción va un pixel más ancha por cada lado: al desbordar
    // ligeramente el contorno de grafito, el trazo parece buscado a mano.
    ctx.globalAlpha = 0.55;
    ctx.drawImage(
        pixeles.boceto.construccion, 0, 0, pixeles.ancho, pixeles.alto,
        -1, -1, medidas.ancho + 2, medidas.alto + 2
    );

    ctx.globalAlpha = 1;
    ctx.drawImage(
        pixeles.boceto.grafito, 0, 0, pixeles.ancho, pixeles.alto,
        0, 0, medidas.ancho, medidas.alto
    );
}

const UMBRAL_DE_BORDE = 35;

/** Encarga las capas del boceto al trabajador; si no lo hay, las calcula aquí. */
async function capasDeBocetoDe(pixeles, tintas) {
    if (calculadora.disponible()) {
        try {
            // Se envía una copia: el original se queda para la posterización, que
            // trabaja sobre los mismos píxeles en color.
            const copia = new Uint8ClampedArray(pixeles.rgba);
            return await calculadora.encargar('boceto', {
                rgba: copia,
                ancho: pixeles.ancho,
                alto: pixeles.alto,
                umbral: UMBRAL_DE_BORDE,
                construccion: tintas.construccion,
                grafito: tintas.grafito
            }, [copia.buffer]);
        } catch (error) {
            console.warn('El trabajador no pudo con el boceto; se calcula aquí:', error);
        }
    }

    const { magnitud, maximo } = bordesDe(pixeles);
    return ZenSketch.capasDeBoceto(
        magnitud, maximo, UMBRAL_DE_BORDE, tintas.construccion, tintas.grafito
    );
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

    if (!state.capas.posterize) {
        limpiarPosterizacion();
        return;
    }

    const medidas = medidasDeImagen(elements.activeImage);
    if (!medidas) return;

    const pixeles = pixelesProcesados(800);
    if (!pixeles) return;

    colocarLienzo(canvas, medidas);
    canvas.style.display = 'block';

    const plano = ZenSketch.posterizar(pixeles.rgba, state.posterizeLevel);
    const lienzo = lienzoDesdeRgba(plano, pixeles.ancho, pixeles.alto);

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, medidas.ancho, medidas.alto);
    ctx.drawImage(lienzo, 0, 0, pixeles.ancho, pixeles.alto, 0, 0, medidas.ancho, medidas.alto);
}

elements.posterizeLevel.addEventListener('input', (e) => {
    state.posterizeLevel = parseInt(e.target.value, 10);
    elements.posterizeLevelVal.textContent = state.posterizeLevel;
    if (state.capas.posterize) {
        applyPosterization();
    }
    guardarPreferencias();
});

// --- 2.2: REVELADO PROGRESIVO ---
// Los cuatro peldaños y su filtro viven en src/nucleo/capas.js.

elements.revealStepBtns.forEach(boton => {
    boton.addEventListener('click', () => {
        fijarPeldanoRevelado(parseInt(boton.dataset.step, 10));
    });
});

// --- 2.3: LÍNEAS DE FLUJO (Flow Lines) ---
/**
 * Líneas de flujo: trazos que siguen la tangente al borde, que es la dirección en
 * la que «corre» la forma. Las polilíneas no dependen del tema, así que se calculan
 * una vez por imagen; el color se pone al pintar.
 */
async function drawFlowLines() {
    const canvas = elements.flowCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (!state.flowLines) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.classList.remove('active');
        return;
    }

    const medidas = medidasDeImagen(elements.activeImage);
    if (!medidas) return;

    const pixeles = pixelesProcesados(400);
    if (!pixeles) return;

    if (!pixeles.trazos) {
        const generacion = state.generacion;
        const trazos = await trazosDeFlujoDe(pixeles);

        if (generacion !== state.generacion || !trazos) return;
        pixeles.trazos = trazos;
    }

    if (!state.flowLines) return;

    colocarLienzo(canvas, medidas);
    canvas.classList.add('active');

    const escalaX = medidas.ancho / pixeles.ancho;
    const escalaY = medidas.alto / pixeles.alto;
    const claro = document.body.classList.contains('light-theme');

    ctx.clearRect(0, 0, medidas.ancho, medidas.alto);
    ctx.lineCap = 'round';

    for (const trazo of pixeles.trazos) {
        const opacidad = 0.15 + trazo.intensidad * 0.5;

        ctx.beginPath();
        ctx.strokeStyle = claro
            ? `rgba(99, 102, 241, ${opacidad})`
            : `rgba(168, 85, 247, ${opacidad})`;
        ctx.lineWidth = 1.5 + trazo.intensidad * 1.5;

        const [primeroX, primeroY] = trazo.puntos[0];
        ctx.moveTo(primeroX * escalaX, primeroY * escalaY);

        for (let i = 1; i < trazo.puntos.length; i++) {
            ctx.lineTo(trazo.puntos[i][0] * escalaX, trazo.puntos[i][1] * escalaY);
        }

        ctx.stroke();
    }
}

/** Encarga las polilíneas al trabajador; si no lo hay, las calcula aquí. */
async function trazosDeFlujoDe(pixeles) {
    if (calculadora.disponible()) {
        try {
            const copia = new Uint8ClampedArray(pixeles.rgba);
            const salida = await calculadora.encargar('flujo', {
                rgba: copia,
                ancho: pixeles.ancho,
                alto: pixeles.alto
            }, [copia.buffer]);
            return salida.trazos;
        } catch (error) {
            console.warn('El trabajador no pudo con las líneas de flujo; se calculan aquí:', error);
        }
    }

    const { gx, gy } = bordesDe(pixeles);
    return ZenSketch.trazosDeFlujo(gx, gy, pixeles.ancho, pixeles.alto);
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

// El segundo manejador de resize desapareció: lo cubre ajustarCapasAlTamano().


// =====================================================
// === FASE 4: MEJORAS DE UX ===
// =====================================================

// --- SIDEBAR RESPONSIVE ---
function toggleSidebar() {
    const abierto = elements.sidebar.classList.toggle('open');
    elements.sidebarBackdrop.classList.toggle('show', abierto);

    if (elements.sidebarToggle) {
        elements.sidebarToggle.setAttribute('aria-expanded', String(abierto));
    }
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

// El estado real lo manda el navegador, no el botón: se puede salir con Escape
document.addEventListener('fullscreenchange', () => {
    if (!elements.fullscreenBtn) return;
    elements.fullscreenBtn.setAttribute('aria-pressed', String(!!document.fullscreenElement));
});

// Los atajos de pantalla completa, Escape y 1-4 están en el único manejador de
// teclado de más arriba.

// --- PANEL DE ATAJOS ---
// Los atajos estaban sólo en la pantalla de bienvenida, y desaparecían justo
// cuando empezaban a hacer falta. Con la tecla ? vuelven en cualquier momento.

let focoAntesDeLosAtajos = null;

function atajosVisibles() {
    return elements.capaAtajos && !elements.capaAtajos.classList.contains('hidden');
}

function mostrarAtajos() {
    if (!elements.capaAtajos) return;

    focoAntesDeLosAtajos = document.activeElement;
    elements.capaAtajos.classList.remove('hidden');

    // El foco entra en el diálogo; si no, tabular seguiría recorriendo lo de detrás
    if (elements.cerrarAtajos) elements.cerrarAtajos.focus();
}

function ocultarAtajos() {
    if (!elements.capaAtajos) return;

    elements.capaAtajos.classList.add('hidden');

    // Y vuelve de donde salió, que es lo que espera quien navega con teclado
    if (focoAntesDeLosAtajos && focoAntesDeLosAtajos.focus) {
        focoAntesDeLosAtajos.focus();
    }
    focoAntesDeLosAtajos = null;
}

function alternarAtajos() {
    if (atajosVisibles()) ocultarAtajos();
    else mostrarAtajos();
}

if (elements.cerrarAtajos) {
    elements.cerrarAtajos.addEventListener('click', ocultarAtajos);
}

if (elements.capaAtajos) {
    // Pinchar fuera del panel también cierra
    elements.capaAtajos.addEventListener('click', (e) => {
        if (e.target === elements.capaAtajos) ocultarAtajos();
    });
}

// --- ZOOM Y DESPLAZAMIENTO SOBRE LA IMAGEN ---
// Estudiar un detalle sin salir de la sesión. La rueda amplía, arrastrar mueve y
// un doble clic devuelve la imagen a su sitio.

const ZOOM_MINIMO = 1;
const ZOOM_MAXIMO = 6;

let avisoZoomEnEspera = null;

function fijarZoom(nuevoZoom, mostrarAviso = true) {
    state.zoom = Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, nuevoZoom));

    // Al volver al 100 % la imagen se recentra sola: dejarla desplazada y sin
    // ampliar sólo consigue que parezca que se ha perdido.
    if (state.zoom === ZOOM_MINIMO) {
        state.desplazamientoX = 0;
        state.desplazamientoY = 0;
    }

    elements.imageWrapper.classList.toggle('ampliada', state.zoom > ZOOM_MINIMO);
    applyImageTransforms();

    if (mostrarAviso) anunciarZoom();
}

function anunciarZoom() {
    if (!elements.avisoZoom) return;

    elements.avisoZoom.textContent = `${Math.round(state.zoom * 100)} %`;
    elements.avisoZoom.classList.add('visible');

    clearTimeout(avisoZoomEnEspera);
    avisoZoomEnEspera = setTimeout(() => {
        elements.avisoZoom.classList.remove('visible');
    }, 900);
}

function reiniciarZoom() {
    state.desplazamientoX = 0;
    state.desplazamientoY = 0;
    fijarZoom(ZOOM_MINIMO);
}

if (elements.imageWrapper) {
    elements.imageWrapper.addEventListener('wheel', (e) => {
        if (!state.lista) return;
        e.preventDefault();

        // Un paso proporcional: ampliar se siente igual de rápido a cualquier nivel
        const paso = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        fijarZoom(state.zoom * paso);
    }, { passive: false });

    elements.imageWrapper.addEventListener('dblclick', () => {
        if (!state.lista) return;
        reiniciarZoom();
    });

    let arrastre = null;

    elements.imageWrapper.addEventListener('pointerdown', (e) => {
        if (state.zoom <= ZOOM_MINIMO || !state.lista) return;

        arrastre = {
            puntero: e.pointerId,
            x: e.clientX - state.desplazamientoX,
            y: e.clientY - state.desplazamientoY
        };

        elements.imageWrapper.setPointerCapture(e.pointerId);
        elements.imageWrapper.classList.add('arrastrando');
    });

    elements.imageWrapper.addEventListener('pointermove', (e) => {
        if (!arrastre || e.pointerId !== arrastre.puntero) return;

        state.desplazamientoX = e.clientX - arrastre.x;
        state.desplazamientoY = e.clientY - arrastre.y;
        applyImageTransforms();
    });

    const soltarArrastre = (e) => {
        if (!arrastre || e.pointerId !== arrastre.puntero) return;

        arrastre = null;
        elements.imageWrapper.classList.remove('arrastrando');
    };

    elements.imageWrapper.addEventListener('pointerup', soltarArrastre);
    elements.imageWrapper.addEventListener('pointercancel', soltarArrastre);
}

// --- DRAG & DROP ---

/**
 * Saca los archivos de lo que se ha soltado. Soltar una carpeta es lo primero que
 * la gente intenta, y `dataTransfer.files` la deja fuera: hay que recorrer el árbol
 * de entradas. Si el navegador no ofrece esa API, se cae a la lista plana.
 *
 * @returns {Promise<File[]>}
 */
async function archivosSoltados(dataTransfer) {
    const entradas = [];

    if (dataTransfer.items && dataTransfer.items[0] && dataTransfer.items[0].webkitGetAsEntry) {
        for (const elemento of dataTransfer.items) {
            const entrada = elemento.webkitGetAsEntry();
            if (entrada) entradas.push(entrada);
        }
    }

    if (entradas.length === 0) {
        return Array.from(dataTransfer.files || []);
    }

    // Topes compartidos por todo el recorrido. Sin ellos, un árbol enorme —o un
    // lector que nunca dice que ha terminado— deja la aplicación colgada sin que
    // se vea nada en pantalla.
    const recorrido = { archivos: [], tandas: 0 };

    await Promise.all(entradas.map((entrada) => recorrerEntrada(entrada, recorrido)));

    if (recorrido.archivos.length >= LIMITE_DE_ARCHIVOS) {
        showToast(
            `Se cargaron las primeras ${LIMITE_DE_ARCHIVOS} imágenes de la carpeta.`,
            'warning', 5000
        );
    }

    return recorrido.archivos;
}

// Una sesión de práctica no necesita más, y el tope es lo que garantiza que
// soltar una carpeta siempre termine.
const LIMITE_DE_ARCHIVOS = 5000;
const LIMITE_DE_TANDAS = 2000;
const PROFUNDIDAD_MAXIMA = 8;

/** Recorre una entrada soltada; si es carpeta, baja por ella. */
function recorrerEntrada(entrada, recorrido, profundidad = 0) {
    if (profundidad > PROFUNDIDAD_MAXIMA) return Promise.resolve();
    if (recorrido.archivos.length >= LIMITE_DE_ARCHIVOS) return Promise.resolve();
    if (recorrido.tandas >= LIMITE_DE_TANDAS) return Promise.resolve();

    if (entrada.isFile) {
        return new Promise((resolver) => {
            entrada.file(
                (archivo) => { recorrido.archivos.push(archivo); resolver(); },
                () => resolver()
            );
        });
    }

    if (!entrada.isDirectory) return Promise.resolve();

    const lector = entrada.createReader();

    // readEntries devuelve tandas: hay que seguir pidiendo hasta que venga vacía.
    // El contador de tandas es la red de seguridad para cuando eso no llega.
    return new Promise((resolver) => {
        const siguienteTanda = () => {
            if (recorrido.tandas >= LIMITE_DE_TANDAS ||
                recorrido.archivos.length >= LIMITE_DE_ARCHIVOS) {
                resolver();
                return;
            }

            recorrido.tandas++;

            lector.readEntries(async (tanda) => {
                if (tanda.length === 0) { resolver(); return; }

                await Promise.all(
                    tanda.map((hija) => recorrerEntrada(hija, recorrido, profundidad + 1))
                );
                siguienteTanda();
            }, () => resolver());
        };

        siguienteTanda();
    });
}

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
    
    zonaSoltado.addEventListener('drop', async (e) => {
        e.preventDefault();
        zonaSoltado.style.outline = '';
        zonaSoltado.style.outlineOffset = '';

        const archivos = await archivosSoltados(e.dataTransfer);

        if (archivos.length > 0) {
            initSession(archivos);
            showToast(`${archivos.length} archivo(s) cargado(s)`, 'success');
        }
    });
}

