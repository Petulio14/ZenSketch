// --- SERVICE WORKER: ZENSKETCH SIN CONEXIÓN ---
// Guarda el armazón de la aplicación en la primera visita. A partir de ahí abre
// igual con red que sin ella, que es coherente con lo que promete: todo pasa en
// tu equipo.
//
// No se registra al abrir index.html con doble clic: los service workers no
// existen sobre file://. Ahí no hace falta, porque ya no hay red de por medio.

const VERSION = 'zensketch-v2';

// El armazón: lo que hace falta para que la aplicación arranque y funcione.
const ARMAZON = [
    './',
    'index.html',
    'styles.css',
    'app.js',
    'manifest.webmanifest',
    'src/tema-inicial.js',
    'src/nucleo/barajar.js',
    'src/nucleo/playlist.js',
    'src/nucleo/temporizador.js',
    'src/nucleo/imagenes.js',
    'src/nucleo/geometria.js',
    'src/nucleo/capas.js',
    'src/nucleo/imagen.js',
    'src/nucleo/preferencias.js',
    'src/nucleo/historial.js',
    'src/nucleo/rutinas.js',
    'src/nucleo/trabajador-imagen.js',
    'assets/fuentes/outfit-latin-300-normal.woff2',
    'assets/fuentes/outfit-latin-400-normal.woff2',
    'assets/fuentes/outfit-latin-500-normal.woff2',
    'assets/fuentes/outfit-latin-600-normal.woff2',
    'assets/fuentes/outfit-latin-700-normal.woff2',
    'assets/icono-200.png'
];

self.addEventListener('install', (evento) => {
    evento.waitUntil(
        caches.open(VERSION)
            // addAll falla entero si un solo archivo falla, así que se piden uno a
            // uno: que falte una tipografía no debe dejar la aplicación sin guardar.
            .then((cache) => Promise.all(
                ARMAZON.map((recurso) => cache.add(recurso).catch(() => null))
            ))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (evento) => {
    evento.waitUntil(
        caches.keys()
            .then((nombres) => Promise.all(
                nombres.filter((n) => n !== VERSION).map((n) => caches.delete(n))
            ))
            .then(() => self.clients.claim())
    );
});

/**
 * Lo que se pide y desde dónde se sirve.
 *
 * El armazón —HTML, CSS y JavaScript— va primero a la red y sólo cae a lo guardado
 * si no hay conexión. Con la estrategia contraria, una corrección quedaba enterrada
 * bajo la copia vieja hasta que alguien se acordara de subir el número de versión,
 * que es justo el fallo que nadie recuerda cometer.
 *
 * Lo de `assets/` va al revés: tipografías, icono y el conversor de HEIC no cambian
 * de una versión a otra, así que se sirven de lo guardado y no se vuelven a pedir.
 */
function esArmazon(url) {
    return !url.pathname.includes('/assets/');
}

self.addEventListener('fetch', (evento) => {
    const peticion = evento.request;
    if (peticion.method !== 'GET') return;

    const url = new URL(peticion.url);
    if (url.origin !== self.location.origin) return;

    evento.respondWith(
        esArmazon(url) ? redPrimero(peticion) : guardadoPrimero(peticion)
    );
});

/** Intenta la red; si no hay, tira de lo guardado. */
function redPrimero(peticion) {
    return fetch(peticion)
        .then((respuesta) => {
            guardarCopia(peticion, respuesta);
            return respuesta;
        })
        .catch(() => caches.match(peticion).then((guardado) => {
            if (guardado) return guardado;

            // Sin red y sin copia: si lo que se pedía era una página, se sirve la
            // portada, que es lo que hay guardado desde la instalación.
            if (peticion.mode === 'navigate') return caches.match('index.html');
            return Response.error();
        }));
}

/** Sirve lo guardado; si no está, lo pide y se lo queda. */
function guardadoPrimero(peticion) {
    return caches.match(peticion).then((guardado) => {
        if (guardado) return guardado;

        return fetch(peticion).then((respuesta) => {
            guardarCopia(peticion, respuesta);
            return respuesta;
        });
    });
}

function guardarCopia(peticion, respuesta) {
    if (!respuesta || !respuesta.ok || respuesta.type !== 'basic') return;

    const copia = respuesta.clone();
    caches.open(VERSION).then((cache) => cache.put(peticion, copia));
}
