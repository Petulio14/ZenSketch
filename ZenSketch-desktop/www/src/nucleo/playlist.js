// --- NÚCLEO: PLAYLIST DE SESIÓN ---
// Gobierna qué imagen toca y cuándo se rebaraja. No conoce el DOM.

(function (raiz) {
    'use strict';

    const dep = (typeof module === 'object' && module.exports)
        ? require('./barajar.js')
        : raiz.ZenSketch;

    const { barajar, barajarEvitando, indices } = dep;

    /**
     * Crea la playlist de una sesión: una tanda barajada de índices que, al
     * agotarse, se vuelve a barajar para que la práctica no termine nunca.
     *
     * @param {number} numImagenes
     * @param {{barajador?: Function}} [opciones] barajador inyectable para las pruebas
     */
    function crearPlaylist(numImagenes, opciones = {}) {
        const barajador = opciones.barajador || barajar;

        let tanda = barajador(indices(numImagenes));
        let posicion = 0;

        function abrirTandaNueva() {
            // La última imagen de la tanda que acaba de terminar: la nueva no debe
            // empezar por ella, o se vería dos veces seguidas. Se lee del final de
            // la lista y no de `posicion`, que en este punto ya se salió del rango.
            const ultimaMostrada = tanda[tanda.length - 1];

            tanda = barajarEvitando(indices(numImagenes), ultimaMostrada, barajador);
            posicion = 0;
        }

        return {
            /** Índice del archivo que toca mostrar. */
            imagenActual() {
                return tanda[posicion];
            },

            /** Posición dentro de la tanda, empezando en 1 (para la interfaz). */
            posicionActual() {
                return posicion + 1;
            },

            total() {
                return tanda.length;
            },

            /** Porcentaje de la tanda ya recorrido, redondeado. */
            porcentaje() {
                if (tanda.length === 0) return 0;
                return Math.round(((posicion + 1) / tanda.length) * 100);
            },

            avanzar() {
                posicion++;
                if (posicion >= tanda.length) {
                    abrirTandaNueva();
                }
                return this.imagenActual();
            },

            retroceder() {
                posicion--;
                if (posicion < 0) {
                    posicion = tanda.length - 1;
                }
                return this.imagenActual();
            },

            /** Reinicia el orden desde cero, como el botón «Reiniciar Mezcla». */
            rebarajar() {
                tanda = barajador(indices(numImagenes));
                posicion = 0;
                return this.imagenActual();
            },

            /** Copia de la tanda actual; sólo para pruebas y depuración. */
            tandaActual() {
                return [...tanda];
            }
        };
    }

    const api = { crearPlaylist };

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    } else {
        raiz.ZenSketch = Object.assign(raiz.ZenSketch || {}, api);
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
