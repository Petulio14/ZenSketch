// --- NÚCLEO: RECONOCIMIENTO DE ARCHIVOS DE IMAGEN ---

(function (raiz) {
    'use strict';

    // Sin tiff ni tif: ningún navegador los decodifica, así que aceptarlos sólo
    // conseguía colar en la sesión imágenes que se veían en blanco. BMP sí se
    // queda, porque Chrome, Firefox y Safari lo muestran sin ayuda.
    const EXTENSIONES_SOPORTADAS = [
        'jpg', 'jpeg', 'png', 'webp', 'gif',
        'bmp', 'heic', 'heif', 'avif', 'svg'
    ];

    /** Extensión en minúsculas, o cadena vacía si el nombre no tiene punto. */
    function extensionDe(nombre) {
        if (typeof nombre !== 'string') return '';
        const punto = nombre.lastIndexOf('.');
        if (punto < 1) return '';
        return nombre.slice(punto + 1).toLowerCase();
    }

    /**
     * ¿Vale este archivo como referencia de dibujo? Se acepta por extensión
     * conocida o porque el propio sistema lo declara como imagen.
     * @param {{name: string, type?: string}} archivo
     */
    function esImagenSoportada(archivo) {
        if (!archivo) return false;
        const extension = extensionDe(archivo.name);
        if (EXTENSIONES_SOPORTADAS.includes(extension)) return true;
        return typeof archivo.type === 'string' && archivo.type.startsWith('image/');
    }

    /** Filtra una FileList o un array quedándose sólo con imágenes. */
    function filtrarImagenes(lista) {
        return Array.from(lista || []).filter(esImagenSoportada);
    }

    /** Los formatos de Apple hay que convertirlos antes de poder mostrarlos. */
    function necesitaConversionHeic(nombre) {
        const extension = extensionDe(nombre);
        return extension === 'heic' || extension === 'heif';
    }

    const api = {
        EXTENSIONES_SOPORTADAS,
        extensionDe,
        esImagenSoportada,
        filtrarImagenes,
        necesitaConversionHeic
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    } else {
        raiz.ZenSketch = Object.assign(raiz.ZenSketch || {}, api);
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
