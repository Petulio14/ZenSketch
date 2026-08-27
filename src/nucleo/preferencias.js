// --- NÚCLEO: PREFERENCIAS QUE SOBREVIVEN A LA RECARGA ---
// Hasta ahora sólo se recordaba el tema. Quien practica todos los días con poses
// de 30 segundos y regla de tercios tenía que reconfigurarlo todos los días.
//
// Lo que se guarda es lo que el usuario eligió, no el estado de la sesión: la
// carpeta cargada y por qué imagen iba no se recuerdan a propósito, porque los
// archivos ya no están al volver.

(function (raiz) {
    'use strict';

    const CLAVE = 'zensketch:preferencias';

    const POR_DEFECTO = {
        duracion: 60,
        cuadricula: 'none',
        sonido: true,
        nivelDesenfoque: 12,
        nivelPosterizacion: 4,
        rutina: null
    };

    const CUADRICULAS = ['none', 'thirds', 'grid2', 'grid4'];

    function enteroEntre(valor, minimo, maximo, respaldo) {
        const numero = parseInt(valor, 10);
        if (!Number.isFinite(numero) || numero < minimo || numero > maximo) return respaldo;
        return numero;
    }

    /**
     * Deja unas preferencias en un estado utilizable, venga lo que venga. Un
     * almacenamiento manipulado a mano, de una versión anterior o a medio escribir
     * no debe poder dejar la aplicación inservible: lo que no se entiende se
     * sustituye por su valor de fábrica.
     *
     * @param {*} crudas lo que había guardado
     * @returns {Object} preferencias completas y válidas
     */
    function normalizar(crudas) {
        const entrada = (crudas && typeof crudas === 'object') ? crudas : {};

        return {
            duracion: enteroEntre(entrada.duracion, 1, 99 * 60 + 59, POR_DEFECTO.duracion),
            cuadricula: CUADRICULAS.includes(entrada.cuadricula)
                ? entrada.cuadricula
                : POR_DEFECTO.cuadricula,
            sonido: typeof entrada.sonido === 'boolean' ? entrada.sonido : POR_DEFECTO.sonido,
            nivelDesenfoque: enteroEntre(entrada.nivelDesenfoque, 1, 30, POR_DEFECTO.nivelDesenfoque),
            nivelPosterizacion: enteroEntre(entrada.nivelPosterizacion, 2, 8, POR_DEFECTO.nivelPosterizacion),
            rutina: typeof entrada.rutina === 'string' ? entrada.rutina : POR_DEFECTO.rutina
        };
    }

    /**
     * Lee las preferencias guardadas. Nunca lanza: en navegación privada o con el
     * almacenamiento bloqueado devuelve los valores de fábrica.
     *
     * @param {Storage} [almacen] inyectable para las pruebas
     */
    function leer(almacen) {
        const donde = almacen || (typeof localStorage !== 'undefined' ? localStorage : null);
        if (!donde) return normalizar(null);

        try {
            return normalizar(JSON.parse(donde.getItem(CLAVE)));
        } catch {
            return normalizar(null);
        }
    }

    /**
     * Guarda las preferencias ya normalizadas. Devuelve si se pudo.
     * @returns {boolean}
     */
    function guardar(preferencias, almacen) {
        const donde = almacen || (typeof localStorage !== 'undefined' ? localStorage : null);
        if (!donde) return false;

        try {
            donde.setItem(CLAVE, JSON.stringify(normalizar(preferencias)));
            return true;
        } catch {
            return false;   // cuota llena o almacenamiento bloqueado
        }
    }

    const api = { CLAVE, POR_DEFECTO, CUADRICULAS, normalizar, leer, guardar };

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    } else {
        raiz.ZenSketch = Object.assign(raiz.ZenSketch || {}, api);
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
