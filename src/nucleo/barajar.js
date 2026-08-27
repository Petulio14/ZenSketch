// --- NÚCLEO: MEZCLA ALEATORIA ---
// Estas funciones no tocan el DOM ni el estado global: son puras y comprobables.
// El archivo se carga igual como <script> clásico en el navegador (incluso desde
// file://) que con require() desde las pruebas. Ver src/nucleo/LEEME.md.

(function (raiz) {
    'use strict';

    /**
     * Mezcla de Fisher-Yates. Devuelve una copia nueva; no modifica la lista original.
     * @param {Array} lista
     * @returns {Array} copia mezclada
     */
    function barajar(lista) {
        const copia = [...lista];
        for (let i = copia.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copia[i], copia[j]] = [copia[j], copia[i]];
        }
        return copia;
    }

    /**
     * Baraja repitiendo hasta que el primer elemento no sea el prohibido, para que
     * una tanda nueva no empiece con la misma imagen con la que terminó la anterior.
     *
     * Con una sola imagen no hay alternativa posible, así que se devuelve tal cual
     * en vez de girar para siempre.
     *
     * @param {Array} lista
     * @param {*} primeroProhibido valor que no debe quedar en la posición 0
     * @param {Function} [barajador] inyectable para poder probar sin azar
     * @returns {Array}
     */
    function barajarEvitando(lista, primeroProhibido, barajador = barajar) {
        if (lista.length <= 1) return barajador(lista);

        let intento;
        do {
            intento = barajador(lista);
        } while (intento[0] === primeroProhibido);
        return intento;
    }

    /**
     * Lista de índices 0..n-1, que es lo que se baraja para formar una tanda.
     * @param {number} n
     * @returns {number[]}
     */
    function indices(n) {
        return Array.from({ length: n }, (_, i) => i);
    }

    const api = { barajar, barajarEvitando, indices };

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    } else {
        raiz.ZenSketch = Object.assign(raiz.ZenSketch || {}, api);
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
