// --- ESTADO GLOBAL DE LA APLICACIÓN ---
const state = {
    images: [],          // Lista original de archivos de imagen
    playlist: [],        // Índices en orden aleatorio (ej: [4, 1, 0, 3, 2])
    currentIndex: -1,    // Índice actual en la 'playlist'
    
    // Temporizador
    duration: 60,        // Duración configurada en segundos (default 1m)
    timeLeft: 60,        // Tiempo restante en segundos
    timerId: null,       // ID del intervalo activo
    isPlaying: false,    // Estado de reproducción del temporizador
    
    // Ayudas visuales
    gridType: 'none',    // 'none', 'thirds', 'grid2', 'grid4'
    mirrorH: false,      // Volteo horizontal
    mirrorV: false,      // Volteo vertical
    soundEnabled: true,  // Sonido activado
    
    // Tema
    theme: 'dark',       // 'dark' o 'light'

    // Deconstrucción y boceto
    sketchMode: false,
    brushColor: '#38bdf8',
    brushSize: 4,
    sketchOpacity: 0.8,
    isEraser: false,
    activeFilters: {
        blur: false,
        threshold: false,
        grayscale: false
    },
    
    // Gestión de memoria
    currentObjectURL: null
};

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
    sketchToggle: document.getElementById('sketch-toggle'),
    brushControls: document.getElementById('brush-controls'),
    brushSize: document.getElementById('brush-size'),
    brushSizeVal: document.getElementById('brush-size-val'),
    sketchOpacity: document.getElementById('sketch-opacity'),
    sketchOpacityVal: document.getElementById('sketch-opacity-val'),
    eraserBtn: document.getElementById('eraser-btn'),
    clearSketchBtn: document.getElementById('clear-sketch-btn'),
    filterBlur: document.getElementById('filter-blur'),
    filterThreshold: document.getElementById('filter-threshold'),
    filterGrayscale: document.getElementById('filter-grayscale'),
    sketchCanvas: document.getElementById('sketch-canvas')
};

// --- AUDIO SINTETIZADO (Campana de Meditación) ---
function playTimerChime() {
    if (!state.soundEnabled) return;
    
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        
        const ctx = new AudioContext();
        
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

// --- LÓGICA DE MEZCLA Y SESIÓN (Shuffle) ---
// Mezcla de Fisher-Yates para asegurar aleatoriedad perfecta
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function initSession(filesList) {
    // Filtrar archivos de imagen válidos con la gama completa solicitada
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'tiff', 'tif', 'bmp', 'heic', 'heif', 'avif', 'svg'];
    state.images = Array.from(filesList).filter(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        return validExtensions.includes(ext) || file.type.startsWith('image/');
    });

    if (state.images.length === 0) {
        alert('No se encontraron imágenes válidas en la selección. Asegúrate de elegir archivos con extensiones correctas (.jpg, .png, .webp, .gif, .tiff, .bmp, .heic, .avif, etc.).');
        return;
    }

    // Crear la playlist con índices aleatorios
    const indices = Array.from({ length: state.images.length }, (_, i) => i);
    state.playlist = shuffleArray(indices);
    state.currentIndex = 0;
    
    // Habilitar paneles de control en UI
    elements.landingScreen.classList.add('hidden');
    elements.imageViewer.classList.remove('hidden');
    elements.statsPanel.classList.remove('disabled');
    elements.playbackPanel.classList.remove('disabled');

    // Cargar la primera imagen y arrancar
    showImage(state.currentIndex);
    resetTimer();
    startTimer();
}

function restartShuffle() {
    if (state.images.length === 0) return;
    
    const indices = Array.from({ length: state.images.length }, (_, i) => i);
    state.playlist = shuffleArray(indices);
    state.currentIndex = 0;
    
    showImage(state.currentIndex);
    resetTimer();
    startTimer();
}

// --- NAVEGACIÓN Y CARGA DE IMÁGENES ---
function showImage(index) {
    if (state.playlist.length === 0) return;
    
    // Asegurar que el índice esté dentro del rango
    if (index >= state.playlist.length) {
        // Si llegamos al final, volvemos a barajar para una sesión infinita sin repetición inmediata
        const currentImageIndex = state.playlist[state.currentIndex];
        let newIndices;
        do {
            newIndices = shuffleArray(Array.from({ length: state.images.length }, (_, i) => i));
        } while (newIndices[0] === currentImageIndex && state.images.length > 1); // Evitar que la primera de la nueva tanda sea igual a la última
        
        state.playlist = newIndices;
        state.currentIndex = 0;
        index = 0;
    } else if (index < 0) {
        // En caso de ir hacia atrás del inicio, ir al final
        state.currentIndex = state.playlist.length - 1;
        index = state.playlist.length - 1;
    }

    const fileIndex = state.playlist[index];
    const imageFile = state.images[fileIndex];

    // Liberar memoria del ObjectURL anterior
    if (state.currentObjectURL) {
        URL.revokeObjectURL(state.currentObjectURL);
        state.currentObjectURL = null;
    }

    const ext = imageFile.name.split('.').pop().toLowerCase();

    // Actualizar datos del índice en el panel de forma inmediata
    elements.currentIndexVal.textContent = `${index + 1} / ${state.playlist.length}`;
    const percent = Math.round(((index + 1) / state.playlist.length) * 100);
    elements.percentVal.textContent = `${percent}%`;
    elements.sessionProgressBar.style.width = `${percent}%`;

    // Procesar HEIC/HEIF si corresponde
    if (ext === 'heic' || ext === 'heif') {
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
                state.currentObjectURL = URL.createObjectURL(blob);
                elements.activeImage.src = state.currentObjectURL;
                elements.fileInfoText.textContent = imageFile.name;
                elements.activeImage.style.opacity = '1';
            })
            .catch(err => {
                console.error("Error al convertir HEIC:", err);
                elements.fileInfoText.textContent = "Error al convertir: " + imageFile.name;
                elements.activeImage.src = "";
                elements.activeImage.style.opacity = '1';
            });
        } else {
            elements.fileInfoText.textContent = "HEIC no soportado localmente (Offline)";
            elements.activeImage.src = "";
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
}

function nextImage() {
    state.currentIndex++;
    showImage(state.currentIndex);
    resetTimer();
}

function prevImage() {
    state.currentIndex--;
    showImage(state.currentIndex);
    resetTimer();
}

// --- SISTEMA DEL TEMPORIZADOR ---
function updateTimerUI() {
    // Texto MM:SS
    const mins = Math.floor(state.timeLeft / 60).toString().padStart(2, '0');
    const secs = (state.timeLeft % 60).toString().padStart(2, '0');
    elements.timerText.textContent = `${mins}:${secs}`;
    
    // Progreso del anillo circular (SVG stroke-dashoffset)
    const ratio = state.timeLeft / state.duration;
    const offset = RING_CIRCUMFERENCE * (1 - ratio);
    elements.timerRing.style.strokeDashoffset = offset;
    
    // Cambio dinámico de color del anillo a medida que se acaba el tiempo
    if (ratio <= 0.15) {
        elements.timerRing.style.stroke = '#f87171'; // Rojo suave de advertencia
    } else if (!state.isPlaying) {
        elements.timerRing.style.stroke = '#fbbf24'; // Amarillo ámbar cuando está en pausa
    } else {
        elements.timerRing.style.stroke = 'var(--primary-glow)'; // Color normal
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

    state.timerId = setInterval(() => {
        if (state.timeLeft > 0) {
            state.timeLeft--;
            updateTimerUI();
        } else {
            // El tiempo llegó a cero
            clearInterval(state.timerId);
            state.isPlaying = false;
            playTimerChime();
            nextImage();
            startTimer(); // Continuar con la siguiente
        }
    }, 1000);
    
    updateTimerUI();
}

function pauseTimer() {
    if (!state.isPlaying) return;
    
    state.isPlaying = false;
    clearInterval(state.timerId);
    
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
function applyImageTransforms() {
    // Configuración espejo
    let scaleX = state.mirrorH ? -1 : 1;
    let scaleY = state.mirrorV ? -1 : 1;
    elements.activeImage.style.transform = `scale(${scaleX}, ${scaleY})`;
    elements.sketchCanvas.style.transform = `scale(${scaleX}, ${scaleY})`;
}

function updateGridOverlay() {
    elements.gridOverlay.innerHTML = '';
    elements.gridOverlay.className = 'grid-overlay'; // Reset clases
    
    if (state.gridType === 'none') {
        elements.gridOverlay.classList.add('hidden');
        return;
    }
    
    elements.gridOverlay.classList.remove('hidden');
    
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
    const mins = parseInt(elements.customMin.value, 10) || 0;
    const secs = parseInt(elements.customSec.value, 10) || 0;
    const totalSeconds = (mins * 60) + secs;
    
    if (totalSeconds <= 0) {
        alert('Por favor introduce un tiempo mayor a 0 segundos.');
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
window.addEventListener('keydown', (e) => {
    // Si el usuario está escribiendo en los inputs del temporizador personalizado, no activar atajos
    if (document.activeElement.tagName === 'INPUT') return;
    
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
    }
});

// --- SISTEMA DE TEMA (Claro / Oscuro) ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    state.theme = savedTheme;
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
}

function toggleTheme() {
    if (state.theme === 'dark') {
        state.theme = 'light';
        document.body.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
    } else {
        state.theme = 'dark';
        document.body.classList.remove('light-theme');
        localStorage.setItem('theme', 'dark');
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

// --- LÓGICA DE DIBUJO Y FILTROS DE DECONSTRUCCIÓN ---

let isDrawing = false;
let lastX = 0;
let lastY = 0;

function startDrawing(e) {
    if (!state.sketchMode) return;
    isDrawing = true;
    const coords = getEventCoords(e);
    lastX = coords.x;
    lastY = coords.y;
}

function draw(e) {
    if (!isDrawing || !state.sketchMode) return;
    
    const canvas = elements.sketchCanvas;
    const ctx = canvas.getContext('2d');
    const coords = getEventCoords(e);
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(coords.x, coords.y);
    
    if (state.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = state.brushSize * 2.5;
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = state.brushColor;
        ctx.lineWidth = state.brushSize;
    }
    
    ctx.stroke();
    
    lastX = coords.x;
    lastY = coords.y;
}

function stopDrawing() {
    isDrawing = false;
}

function getEventCoords(e) {
    const canvas = elements.sketchCanvas;
    const rect = canvas.getBoundingClientRect();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    let x = (clientX - rect.left) * (canvas.width / rect.width);
    let y = (clientY - rect.top) * (canvas.height / rect.height);
    
    // Ajustar coordenadas si la imagen está espejada
    if (state.mirrorH) {
        x = canvas.width - x;
    }
    if (state.mirrorV) {
        y = canvas.height - y;
    }
    
    return { x, y };
}

function clearCanvas() {
    const canvas = elements.sketchCanvas;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function resizeCanvas() {
    const canvas = elements.sketchCanvas;
    const img = elements.activeImage;
    
    if (!canvas || !img) return;
    
    const width = img.clientWidth;
    const height = img.clientHeight;
    
    if (width === 0 || height === 0) return;
    
    // Guardar contenido temporal
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0);
    
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, width, height);
}

function applyVisualFilters() {
    let filterString = '';
    
    if (state.activeFilters.blur) {
        filterString += 'blur(12px) ';
    }
    
    if (state.activeFilters.threshold) {
        filterString += 'grayscale(100%) contrast(400%) ';
    } else if (state.activeFilters.grayscale) {
        filterString += 'grayscale(100%) ';
    }
    
    elements.activeImage.style.filter = filterString.trim() || 'none';
}

// --- VINCULACIÓN DE MANEJADORES DE DECONSTRUCCIÓN ---

// Activar/desactivar dibujo
elements.sketchToggle.addEventListener('change', (e) => {
    state.sketchMode = e.target.checked;
    elements.brushControls.classList.toggle('hidden', !state.sketchMode);
    elements.sketchCanvas.classList.toggle('active', state.sketchMode);
    if (state.sketchMode) {
        resizeCanvas();
    }
});

// Selección de color de pincel
document.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        state.brushColor = dot.dataset.color;
        
        state.isEraser = false;
        elements.eraserBtn.classList.remove('active');
    });
});

// Grosor del pincel
elements.brushSize.addEventListener('input', (e) => {
    state.brushSize = parseInt(e.target.value, 10);
    elements.brushSizeVal.textContent = `${state.brushSize}px`;
});

// Opacidad del lienzo
elements.sketchOpacity.addEventListener('input', (e) => {
    const opacityPct = parseInt(e.target.value, 10);
    state.sketchOpacity = opacityPct / 100;
    elements.sketchOpacityVal.textContent = `${opacityPct}%`;
    elements.sketchCanvas.style.opacity = state.sketchOpacity;
});

// Alternar borrador
elements.eraserBtn.addEventListener('click', () => {
    state.isEraser = !state.isEraser;
    elements.eraserBtn.classList.toggle('active', state.isEraser);
});

// Limpiar lienzo
elements.clearSketchBtn.addEventListener('click', clearCanvas);

// Filtros de abstracción
elements.filterBlur.addEventListener('change', (e) => {
    state.activeFilters.blur = e.target.checked;
    applyVisualFilters();
});

elements.filterThreshold.addEventListener('change', (e) => {
    state.activeFilters.threshold = e.target.checked;
    applyVisualFilters();
});

elements.filterGrayscale.addEventListener('change', (e) => {
    state.activeFilters.grayscale = e.target.checked;
    applyVisualFilters();
});

// Eventos del Canvas
elements.sketchCanvas.addEventListener('mousedown', startDrawing);
elements.sketchCanvas.addEventListener('mousemove', draw);
window.addEventListener('mouseup', stopDrawing);

elements.sketchCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startDrawing(e);
}, { passive: false });

elements.sketchCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    draw(e);
}, { passive: false });

window.addEventListener('touchend', stopDrawing);

// Ajustar canvas en carga de imagen y redimensionar ventana
elements.activeImage.addEventListener('load', () => {
    clearCanvas();
    resizeCanvas();
});

window.addEventListener('resize', resizeCanvas);
