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
     * Valor del campo entre pixel y pixel, interpolando los cuatro vecinos. Con
     * el vecino más próximo la dirección saltaba de golpe al cruzar la frontera
     * de un pixel y el trazo salía dentado.
     */
    function muestrear(campo, ancho, x, y) {
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const fx = x - x0;
        const fy = y - y0;
        const i = y0 * ancho + x0;

        return campo[i] * (1 - fx) * (1 - fy)
            + campo[i + 1] * fx * (1 - fy)
            + campo[i + ancho] * (1 - fx) * fy
            + campo[i + ancho + 1] * fx * fy;
    }

    /**
     * Traza las líneas de flujo: desde una rejilla de puntos de partida se avanza
     * en la dirección perpendicular al gradiente, que es la tangente al borde. Es
     * lo que revela hacia dónde «corre» la forma, que es lo que se dibuja primero.
     *
     * La primera versión llenaba la imagen de rayas cortas que no seguían nada, y
     * hacían falta cuatro cosas para que dejaran de parecer echadas al azar:
     *
     *   1. Las líneas salen sólo de la parte más marcada de la imagen, medida
     *      sobre el reparto de la propia imagen. Con un umbral fijo, el grano de
     *      cualquier foto lo superaba y se dibujaba como si fuera una forma.
     *   2. Las semillas se ordenan de más fuerte a más floja, así el sitio se lo
     *      quedan los bordes de verdad y no lo que caiga cerca.
     *   3. La tangente se corrige de signo en cada paso. El gradiente se invierte
     *      al cruzar un borde, y sin esto el trazo se doblaba sobre sí mismo.
     *   4. El trazo crece hacia los dos lados y se descarta si sale corto: una
     *      línea que sigue una forma se ve; un rabito de tres píxeles, no.
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
        const fraccionSemillas = opciones.fraccionSemillas || 0.15;
        const separacion = opciones.separacion || Math.max(2, paso * 0.6);
        const minimoPuntos = opciones.minimoPuntos || 5;

        const avance = largo / pasos;
        const mitad = Math.max(1, Math.round(pasos / 2));

        // --- Las semillas, y contra qué se las compara ---
        const semillas = [];

        for (let y = paso; y < alto - paso; y += paso) {
            for (let x = paso; x < ancho - paso; x += paso) {
                const i = y * ancho + x;
                semillas.push({ x, y, fuerza: Math.hypot(gx[i], gy[i]) });
            }
        }

        semillas.sort((a, b) => b.fuerza - a.fuerza);

        // Sólo dibuja la parte más marcada de la imagen, medida sobre la propia
        // imagen. Un umbral fijo no vale para las dos cosas a la vez: el que deja
        // pasar los bordes suaves de una foto plana llena de líneas el grano de
        // cualquier otra. Comparar cada punto con el reparto de su imagen sí.
        //
        // Se probó también un umbral proporcional al borde más fuerte, y salía
        // peor: en una figura recortada contra el fondo, ese contorno se lleva
        // todo el margen y los pliegues de dentro —que es lo que interesa
        // dibujar— se quedaban fuera.
        const corte = semillas.length === 0
            ? 0
            : semillas[Math.min(semillas.length - 1, Math.floor(semillas.length * fraccionSemillas))].fuerza;

        const umbral = Math.max(magnitudMinima, corte);

        // --- Quién ocupa cada trozo de imagen ---
        // Sin esto los trazos se amontonaban unos sobre otros en el mismo borde,
        // que es la otra mitad de la sensación de maraña.
        const columnas = Math.ceil(ancho / separacion);
        const filas = Math.ceil(alto / separacion);
        const duenos = new Int32Array(columnas * filas).fill(-1);

        function celda(x, y) {
            const cx = Math.floor(x / separacion);
            const cy = Math.floor(y / separacion);
            if (cx < 0 || cy < 0 || cx >= columnas || cy >= filas) return -1;
            return cy * columnas + cx;
        }

        /** Camina desde la semilla en uno de los dos sentidos de la tangente. */
        function caminar(semilla, sentido, id) {
            const puntos = [];
            let cx = semilla.x;
            let cy = semilla.y;
            let dx = 0;
            let dy = 0;

            for (let s = 0; s < mitad; s++) {
                if (cx < 1 || cy < 1 || cx >= ancho - 1 || cy >= alto - 1) break;

                const vx = muestrear(gx, ancho, cx, cy);
                const vy = muestrear(gy, ancho, cx, cy);
                const fuerza = Math.hypot(vx, vy);

                // Donde el campo se apaga ya no queda forma que seguir: lo que se
                // dibujaba a partir de ahí era ruido con aspecto de línea.
                if (fuerza < umbral * 0.5) break;

                let tx = -vy / fuerza;
                let ty = vx / fuerza;

                if (s === 0) {
                    tx *= sentido;
                    ty *= sentido;
                } else if (tx * dx + ty * dy < 0) {
                    // La tangente vale igual en los dos sentidos; se toma el que
                    // continúa el trazo, no el que lo devuelve por donde vino.
                    tx = -tx;
                    ty = -ty;
                }

                dx = tx;
                dy = ty;

                const donde = celda(cx, cy);
                if (donde === -1) break;
                if (duenos[donde] !== -1 && duenos[donde] !== id) break;
                duenos[donde] = id;

                puntos.push([cx, cy]);
                cx += tx * avance;
                cy += ty * avance;
            }

            return puntos;
        }

        const trazos = [];
        let siguienteId = 0;

        for (const semilla of semillas) {
            if (semilla.fuerza < umbral) continue;

            const donde = celda(semilla.x, semilla.y);
            if (donde === -1 || duenos[donde] !== -1) continue;

            const id = siguienteId++;
            const atras = caminar(semilla, -1, id);
            const alante = caminar(semilla, 1, id);
            if (atras.length === 0) continue;

            // Los dos recorridos salen de la semilla: se da la vuelta al de atrás
            // y se pegan, sin repetirla en medio.
            atras.reverse();
            const puntos = atras.concat(alante.slice(1));

            if (puntos.length < minimoPuntos) continue;

            trazos.push({ puntos, intensidad: Math.min(1, semilla.fuerza / 200) });
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
