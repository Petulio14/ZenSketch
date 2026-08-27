// --- NÚCLEO: PROCESAMIENTO DE PÍXELES ---
// Sobel, posterización y líneas de flujo, sobre arreglos tipados y sin tocar el
// DOM. Estaban dentro de los manejadores de app.js, mezclados con el posicionado
// de lienzos, y por eso no había forma de comprobarlos. Aquí entran píxeles y
// salen píxeles o coordenadas; quien dibuja es app.js.
//
// Al no depender de canvas, este archivo puede ejecutarse igual dentro de un Web
// Worker que en el hilo principal.

(function (raiz) {
    'use strict';

    /**
     * Luminancia perceptual de cada pixel, con los coeficientes de la Rec. 601.
     * El ojo no pesa igual los tres canales: el verde manda y el azul casi no cuenta.
     *
     * @param {Uint8ClampedArray} rgba datos de un ImageData
     * @returns {Uint8Array} un valor por pixel
     */
    function aLuminancia(rgba) {
        const gris = new Uint8Array(rgba.length / 4);

        for (let i = 0; i < rgba.length; i += 4) {
            gris[i / 4] = Math.round(
                0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]
            );
        }

        return gris;
    }

    /**
     * Operador Sobel: derivada aproximada en horizontal y en vertical.
     * El borde de la imagen se queda a cero, porque el kernel de 3×3 no cabe.
     *
     * @param {Uint8Array} gris
     * @param {number} ancho
     * @param {number} alto
     * @returns {{gx: Float32Array, gy: Float32Array, magnitud: Float32Array, maximo: number}}
     */
    function sobel(gris, ancho, alto) {
        const total = ancho * alto;
        const gx = new Float32Array(total);
        const gy = new Float32Array(total);
        const magnitud = new Float32Array(total);
        let maximo = 0;

        for (let y = 1; y < alto - 1; y++) {
            for (let x = 1; x < ancho - 1; x++) {
                const i = y * ancho + x;

                const arribaIzq = gris[(y - 1) * ancho + (x - 1)];
                const arriba = gris[(y - 1) * ancho + x];
                const arribaDer = gris[(y - 1) * ancho + (x + 1)];
                const izq = gris[y * ancho + (x - 1)];
                const der = gris[y * ancho + (x + 1)];
                const abajoIzq = gris[(y + 1) * ancho + (x - 1)];
                const abajo = gris[(y + 1) * ancho + x];
                const abajoDer = gris[(y + 1) * ancho + (x + 1)];

                const dx = -arribaIzq + arribaDer - 2 * izq + 2 * der - abajoIzq + abajoDer;
                const dy = -arribaIzq - 2 * arriba - arribaDer + abajoIzq + 2 * abajo + abajoDer;

                gx[i] = dx;
                gy[i] = dy;

                const fuerza = Math.hypot(dx, dy);
                magnitud[i] = fuerza;
                if (fuerza > maximo) maximo = fuerza;
            }
        }

        return { gx, gy, magnitud, maximo };
    }

    /**
     * Reduce cada canal a un número fijo de niveles. Es lo que convierte un
     * degradado continuo en manchas planas, que es como se lee el valor al dibujar.
     *
     * @param {Uint8ClampedArray} rgba
     * @param {number} niveles entre 2 y 8
     * @returns {Uint8ClampedArray} datos nuevos; los recibidos no se tocan
     */
    function posterizar(rgba, niveles) {
        const salida = new Uint8ClampedArray(rgba.length);
        const escalon = 255 / (niveles - 1);

        for (let i = 0; i < rgba.length; i += 4) {
            salida[i] = Math.round(Math.round(rgba[i] / escalon) * escalon);
            salida[i + 1] = Math.round(Math.round(rgba[i + 1] / escalon) * escalon);
            salida[i + 2] = Math.round(Math.round(rgba[i + 2] / escalon) * escalon);
            salida[i + 3] = 255;
        }

        return salida;
    }

    /**
     * Las dos tintas del modo boceto: un trazo de construcción suave y encima el
     * contorno de grafito. La opacidad de cada pixel sigue la fuerza del borde, que
     * es lo que hace que el dibujo tenga trazos gruesos y trazos apenas insinuados.
     *
     * @returns {{base: Uint8ClampedArray, grafito: Uint8ClampedArray}} dos RGBA
     */
    function capasDeBoceto(magnitud, maximo, umbral, colorBase, colorGrafito) {
        const base = new Uint8ClampedArray(magnitud.length * 4);
        const grafito = new Uint8ClampedArray(magnitud.length * 4);
        const techo = maximo || 1;

        for (let i = 0; i < magnitud.length; i++) {
            if (magnitud[i] <= umbral) continue;   // fuera del borde: transparente

            const p = i * 4;
            const fuerza = magnitud[i] / techo;

            base[p] = colorBase.r;
            base[p + 1] = colorBase.g;
            base[p + 2] = colorBase.b;
            base[p + 3] = Math.min(255, Math.round(fuerza * 140));

            grafito[p] = colorGrafito.r;
            grafito[p + 1] = colorGrafito.g;
            grafito[p + 2] = colorGrafito.b;
            grafito[p + 3] = Math.min(255, Math.round(fuerza * 230));
        }

        return { base, grafito };
    }

    /**
     * Traza las líneas de flujo: desde una rejilla de puntos de partida se avanza
     * en la dirección perpendicular al gradiente, que es la tangente al borde. Es
     * lo que revela hacia dónde «corre» la forma, que es lo que se dibuja primero.
     *
     * Devuelve polilíneas en coordenadas de la imagen procesada. Quien las escala
     * y les pone color es app.js, que es quien sabe del tema y del lienzo.
     *
     * @returns {Array<{puntos: number[][], intensidad: number}>}
     */
    function trazosDeFlujo(gx, gy, ancho, alto, opciones = {}) {
        const paso = opciones.paso || 12;
        const largo = opciones.largo || 30;
        const pasos = opciones.pasos || 15;
        const magnitudMinima = opciones.magnitudMinima || 15;
        const avance = largo / pasos;

        const trazos = [];

        for (let y = paso; y < alto - paso; y += paso) {
            for (let x = paso; x < ancho - paso; x += paso) {
                const i = y * ancho + x;
                const fuerza = Math.hypot(gx[i], gy[i]);

                if (fuerza < magnitudMinima) continue;   // zona plana, nada que seguir

                const puntos = [[x, y]];
                let cx = x;
                let cy = y;

                for (let s = 0; s < pasos; s++) {
                    const ix = Math.round(cx);
                    const iy = Math.round(cy);
                    if (ix < 1 || ix >= ancho - 1 || iy < 1 || iy >= alto - 1) break;

                    // Perpendicular al gradiente en este punto, recalculada en cada
                    // paso: así el trazo se curva siguiendo la forma.
                    const j = iy * ancho + ix;
                    const angulo = Math.atan2(gy[j], gx[j]) + Math.PI / 2;

                    cx += Math.cos(angulo) * avance;
                    cy += Math.sin(angulo) * avance;

                    puntos.push([cx, cy]);
                }

                trazos.push({ puntos, intensidad: Math.min(1, fuerza / 200) });
            }
        }

        return trazos;
    }

    const api = { aLuminancia, sobel, posterizar, capasDeBoceto, trazosDeFlujo };

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    } else {
        raiz.ZenSketch = Object.assign(raiz.ZenSketch || {}, api);
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
