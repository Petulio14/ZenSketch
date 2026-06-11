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
    activeFilters: {
        blur: false,
        threshold: false,
        grayscale: false
    },
    blurLevel: 12,
    imageToSketch: false,
    
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
    filterBlur: document.getElementById('filter-blur'),
    blurLevelControl: document.getElementById('blur-level-control'),
    blurLevel: document.getElementById('blur-level'),
    blurLevelVal: document.getElementById('blur-level-val'),
    filterThreshold: document.getElementById('filter-threshold'),
    filterGrayscale: document.getElementById('filter-grayscale'),
    imageToSketchToggle: document.getElementById('image-to-sketch-toggle'),
    contourCanvas: document.getElementById('contour-canvas')
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
    if (elements.contourCanvas) {
        elements.contourCanvas.style.transform = `scale(${scaleX}, ${scaleY})`;
    }
    if (elements.gridOverlay) {
        elements.gridOverlay.style.transform = `scale(${scaleX}, ${scaleY})`;
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
    const img = elements.activeImage;
    if (img && img.complete && img.naturalWidth > 0) {
        const containerWidth = img.clientWidth;
        const containerHeight = img.clientHeight;
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;
        
        if (containerWidth > 0 && containerHeight > 0) {
            const scale = Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight);
            const renderedWidth = Math.round(naturalWidth * scale);
            const renderedHeight = Math.round(naturalHeight * scale);
            
            const offsetX = Math.round((containerWidth - renderedWidth) / 2);
            const offsetY = Math.round((containerHeight - renderedHeight) / 2);
            
            elements.gridOverlay.style.left = offsetX + 'px';
            elements.gridOverlay.style.top = offsetY + 'px';
            elements.gridOverlay.style.width = renderedWidth + 'px';
            elements.gridOverlay.style.height = renderedHeight + 'px';
        }
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

// --- FILTROS DE DECONSTRUCCIÓN ---

function applyVisualFilters() {
    let filterString = '';
    
    if (state.activeFilters.blur) {
        filterString += `blur(${state.blurLevel}px) `;
    }
    
    if (state.activeFilters.threshold) {
        filterString += 'grayscale(100%) contrast(400%) ';
    } else if (state.activeFilters.grayscale) {
        filterString += 'grayscale(100%) ';
    }
    
    elements.activeImage.style.filter = filterString.trim() || 'none';
}

// --- VINCULACIÓN DE MANEJADORES DE DECONSTRUCCIÓN ---

// Filtros de abstracción
elements.filterBlur.addEventListener('change', (e) => {
    state.activeFilters.blur = e.target.checked;
    elements.blurLevelControl.classList.toggle('hidden', !e.target.checked);
    applyVisualFilters();
});

elements.blurLevel.addEventListener('input', (e) => {
    state.blurLevel = parseInt(e.target.value, 10);
    elements.blurLevelVal.textContent = `${state.blurLevel}px`;
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

// Ajustar contornos en carga de imagen y redimensionar ventana
elements.activeImage.addEventListener('load', () => {
    if (state.imageToSketch) {
        updateImageContours();
    }
    updateGridOverlay();
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
    
    // Calcular las dimensiones reales de la imagen renderizada con object-fit: contain
    const containerWidth = img.clientWidth;
    const containerHeight = img.clientHeight;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    
    if (containerWidth === 0 || containerHeight === 0) return;
    
    const scale = Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight);
    const renderedWidth = Math.round(naturalWidth * scale);
    const renderedHeight = Math.round(naturalHeight * scale);
    
    // Calcular el offset para centrar el canvas sobre la imagen visible
    const offsetX = Math.round((containerWidth - renderedWidth) / 2);
    const offsetY = Math.round((containerHeight - renderedHeight) / 2);
    
    // Posicionar y dimensionar el canvas exactamente sobre la imagen renderizada
    canvas.width = renderedWidth;
    canvas.height = renderedHeight;
    canvas.style.left = offsetX + 'px';
    canvas.style.top = offsetY + 'px';
    canvas.style.width = renderedWidth + 'px';
    canvas.style.height = renderedHeight + 'px';
    
    // Crear un canvas temporal para procesamiento a resolución balanceada (max 800px para fluidez instantánea)
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    const maxDimension = 800;
    let procWidth = naturalWidth;
    let procHeight = naturalHeight;
    
    if (procWidth > maxDimension || procHeight > maxDimension) {
        if (procWidth > procHeight) {
            procHeight = Math.round((procHeight * maxDimension) / procWidth);
            procWidth = maxDimension;
        } else {
            procWidth = Math.round((procWidth * maxDimension) / procHeight);
            procHeight = maxDimension;
        }
    }
    
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
