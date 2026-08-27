// --- NÚCLEO: GEOMETRÍA DE LA IMAGEN RENDERIZADA ---
// Con object-fit: contain la imagen no llena su contenedor: queda centrada y
// sobra margen en un eje. Cuadrícula, contornos, posterización y líneas de flujo
// necesitan ese rectángulo exacto para encajar encima. Antes este cálculo estaba
// copiado en tres sitios de app.js.

(function (raiz) {
    'use strict';

    /**
     * Rectángulo que ocupa realmente la imagen dentro de su contenedor.
     *
     * @param {{anchoContenedor: number, altoContenedor: number,
     *          anchoNatural: number, altoNatural: number}} medidas
     * @returns {{ancho: number, alto: number, x: number, y: number, escala: number}|null}
     *          null si todavía no hay medidas utilizables (imagen sin cargar)
     */
    function dimensionesRenderizadas(medidas) {
        if (!medidas) return null;

        const { anchoContenedor, altoContenedor, anchoNatural, altoNatural } = medidas;

        if (!anchoContenedor || !altoContenedor) return null;
        if (!anchoNatural || !altoNatural) return null;

        const escala = Math.min(anchoContenedor / anchoNatural, altoContenedor / altoNatural);
        const ancho = Math.round(anchoNatural * escala);
        const alto = Math.round(altoNatural * escala);

        return {
            ancho,
            alto,
            x: Math.round((anchoContenedor - ancho) / 2),
            y: Math.round((altoContenedor - alto) / 2),
            escala
        };
    }

    /**
     * Tamaño al que conviene procesar los píxeles: los algoritmos de Sobel y
     * posterización no necesitan la resolución completa, y limitarla es lo que
     * mantiene la respuesta inmediata.
     *
     * @returns {{ancho: number, alto: number}}
     */
    function tamanoDeProceso(anchoNatural, altoNatural, maximo) {
        let ancho = anchoNatural;
        let alto = altoNatural;

        if (ancho > maximo || alto > maximo) {
            if (ancho > alto) {
                alto = Math.round((alto * maximo) / ancho);
                ancho = maximo;
            } else {
                ancho = Math.round((ancho * maximo) / alto);
                alto = maximo;
            }
        }

        return { ancho, alto };
    }

    const api = { dimensionesRenderizadas, tamanoDeProceso };

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    } else {
        raiz.ZenSketch = Object.assign(raiz.ZenSketch || {}, api);
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
