// --- NÚCLEO: QUÉ CAPA VISUAL MANDA ---
// Antes, el revelado progresivo y los filtros básicos escribían los dos sobre
// style.filter: ganaba el último en ejecutarse y los interruptores se quedaban
// encendidos sin efecto, mintiendo sobre lo que se veía en pantalla (defecto D-08).
// Aquí se decide de una vez cuál manda, y la interfaz refleja esa decisión.

(function (raiz) {
    'use strict';

    // Filtros que se acumulan sobre la imagen: pueden convivir entre ellos.
    const FILTROS = ['blur', 'threshold', 'grayscale'];

    // Modos que sustituyen la imagen entera: sólo puede haber uno, y desplazan
    // a los filtros porque no se aplican sobre el mismo pixel.
    const MODOS = ['posterize', 'reveal'];

    /** Estado de partida: nada encendido. */
    function capasApagadas() {
        const estado = {};
        for (const capa of FILTROS.concat(MODOS)) {
            estado[capa] = false;
        }
        return estado;
    }

    /**
     * Aplica un cambio del usuario y devuelve el estado resultante de todas las
     * capas, apagando lo que dejaría de tener efecto.
     *
     * @param {Object} estado situación actual de cada capa
     * @param {string} capa la que acaba de tocarse
     * @param {boolean} activa si se enciende o se apaga
     * @returns {Object} estado nuevo; el recibido no se modifica
     */
    function resolver(estado, capa, activa) {
        const resultado = Object.assign(capasApagadas(), estado);

        if (!activa) {
            resultado[capa] = false;
            return resultado;
        }

        if (MODOS.includes(capa)) {
            // Un modo se queda solo: apaga el otro modo y los filtros.
            for (const otro of MODOS.concat(FILTROS)) {
                resultado[otro] = false;
            }
        } else if (FILTROS.includes(capa)) {
            // Un filtro no puede convivir con un modo que sustituye la imagen.
            for (const modo of MODOS) {
                resultado[modo] = false;
            }
        }

        resultado[capa] = true;
        return resultado;
    }

    /**
     * Capas que estaban encendidas y el cambio ha apagado. Es lo que hay que
     * limpiar en pantalla y desmarcar en la interfaz.
     *
     * @returns {string[]}
     */
    function apagadasPor(estadoAnterior, estadoNuevo) {
        return Object.keys(estadoNuevo).filter(
            (capa) => estadoAnterior[capa] && !estadoNuevo[capa]
        );
    }

    /**
     * Cadena de CSS `filter` para los filtros acumulables encendidos.
     * Devuelve 'none' cuando no hay ninguno, que es lo que espera el navegador.
     */
    function filtroCss(estado, nivelDesenfoque) {
        const partes = [];

        if (estado.blur) {
            partes.push(`blur(${nivelDesenfoque}px)`);
        }

        // El umbral ya lleva su propia desaturación, así que absorbe la escala de
        // grises en lugar de encadenarla dos veces.
        if (estado.threshold) {
            partes.push('grayscale(100%)', 'contrast(400%)');
        } else if (estado.grayscale) {
            partes.push('grayscale(100%)');
        }

        return partes.length > 0 ? partes.join(' ') : 'none';
    }

    // Cada peldaño del revelado progresivo, del contorno desnudo a la imagen tal cual.
    const PELDANOS_REVELADO = {
        1: { etiqueta: 'Nivel 1 — Solo Silueta', filtro: 'blur(18px) contrast(300%) grayscale(100%) brightness(1.1)' },
        2: { etiqueta: 'Nivel 2 — Masas de Valor', filtro: 'blur(8px) contrast(200%) grayscale(80%)' },
        3: { etiqueta: 'Nivel 3 — Detalle Medio', filtro: 'blur(3px) contrast(130%) grayscale(40%)' },
        4: { etiqueta: 'Nivel 4 — Imagen Completa', filtro: 'none' }
    };

    function peldanoRevelado(nivel) {
        return PELDANOS_REVELADO[nivel] || PELDANOS_REVELADO[1];
    }

    const api = {
        FILTROS,
        MODOS,
        PELDANOS_REVELADO,
        capasApagadas,
        resolver,
        apagadasPor,
        filtroCss,
        peldanoRevelado
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    } else {
        raiz.ZenSketch = Object.assign(raiz.ZenSketch || {}, api);
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
