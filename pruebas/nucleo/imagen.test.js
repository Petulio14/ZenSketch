import { describe, test, expect } from 'vitest';
import imagen from '../../src/nucleo/imagen.js';

const { aLuminancia, sobel, posterizar, capasDeBoceto, trazosDeFlujo } = imagen;

/**
 * Construye un RGBA a partir de una rejilla de valores de gris escritos a mano.
 * Con mapas así de pequeños los bordes se saben de antemano y se pueden afirmar.
 */
function desdeRejilla(rejilla) {
    const alto = rejilla.length;
    const ancho = rejilla[0].length;
    const rgba = new Uint8ClampedArray(ancho * alto * 4);

    for (let y = 0; y < alto; y++) {
        for (let x = 0; x < ancho; x++) {
            const p = (y * ancho + x) * 4;
            const v = rejilla[y][x];
            rgba[p] = v;
            rgba[p + 1] = v;
            rgba[p + 2] = v;
            rgba[p + 3] = 255;
        }
    }

    return { rgba, ancho, alto };
}

/** Una franja negra vertical sobre blanco: los bordes están en x=2 y x=5. */
const FRANJA_VERTICAL = [
    [255, 255, 255, 0, 0, 0, 255, 255],
    [255, 255, 255, 0, 0, 0, 255, 255],
    [255, 255, 255, 0, 0, 0, 255, 255],
    [255, 255, 255, 0, 0, 0, 255, 255],
    [255, 255, 255, 0, 0, 0, 255, 255],
    [255, 255, 255, 0, 0, 0, 255, 255]
];

/**
 * Ruido reproducible. Sin semilla fija, una prueba sobre un campo revuelto
 * fallaría o pasaría según el día, que es peor que no tenerla.
 */
function ruido(n, semilla) {
    const salida = new Float32Array(n);
    let estado = semilla;

    for (let i = 0; i < n; i++) {
        estado = (estado * 1664525 + 1013904223) >>> 0;
        salida[i] = (estado / 4294967296) * 600 - 300;
    }

    return salida;
}

describe('luminancia', () => {
    test('el gris puro se mantiene', () => {
        const { rgba } = desdeRejilla([[0, 128, 255]]);
        expect(Array.from(aLuminancia(rgba))).toEqual([0, 128, 255]);
    });

    test('pesa los canales como los ve el ojo, no a partes iguales', () => {
        const rojo = new Uint8ClampedArray([255, 0, 0, 255]);
        const verde = new Uint8ClampedArray([0, 255, 0, 255]);
        const azul = new Uint8ClampedArray([0, 0, 255, 255]);

        expect(aLuminancia(rojo)[0]).toBe(76);    // 0,299
        expect(aLuminancia(verde)[0]).toBe(150);  // 0,587
        expect(aLuminancia(azul)[0]).toBe(29);    // 0,114
        expect(aLuminancia(verde)[0]).toBeGreaterThan(aLuminancia(azul)[0]);
    });

    test('devuelve un valor por pixel, no uno por canal', () => {
        const { rgba, ancho, alto } = desdeRejilla(FRANJA_VERTICAL);
        expect(aLuminancia(rgba).length).toBe(ancho * alto);
    });
});

describe('operador Sobel', () => {
    test('una imagen lisa no tiene un solo borde', () => {
        const { rgba, ancho, alto } = desdeRejilla([
            [128, 128, 128, 128],
            [128, 128, 128, 128],
            [128, 128, 128, 128],
            [128, 128, 128, 128]
        ]);
        const { magnitud, maximo } = sobel(aLuminancia(rgba), ancho, alto);

        expect(maximo).toBe(0);
        expect(Array.from(magnitud).every((v) => v === 0)).toBe(true);
    });

    test('encuentra los dos bordes de una franja vertical, y no otros', () => {
        const { rgba, ancho, alto } = desdeRejilla(FRANJA_VERTICAL);
        const { magnitud } = sobel(aLuminancia(rgba), ancho, alto);

        const fila = 3;
        const enX = (x) => magnitud[fila * ancho + x];

        expect(enX(2)).toBeGreaterThan(0);   // paso de blanco a negro
        expect(enX(5)).toBeGreaterThan(0);   // paso de negro a blanco
        expect(enX(1)).toBe(0);              // blanco liso
        expect(enX(4)).toBe(0);              // negro liso
    });

    test('un borde vertical se ve en la derivada horizontal, no en la vertical', () => {
        const { rgba, ancho, alto } = desdeRejilla(FRANJA_VERTICAL);
        const { gx, gy } = sobel(aLuminancia(rgba), ancho, alto);
        const i = 3 * ancho + 2;

        expect(Math.abs(gx[i])).toBeGreaterThan(0);
        expect(gy[i]).toBe(0);
    });

    test('girar la imagen un cuarto de vuelta intercambia las derivadas', () => {
        const franjaHorizontal = [
            [255, 255, 255, 255, 255, 255],
            [255, 255, 255, 255, 255, 255],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [255, 255, 255, 255, 255, 255],
            [255, 255, 255, 255, 255, 255]
        ];
        const { rgba, ancho, alto } = desdeRejilla(franjaHorizontal);
        const { gx, gy } = sobel(aLuminancia(rgba), ancho, alto);
        const i = 1 * ancho + 3;

        expect(gx[i]).toBe(0);
        expect(Math.abs(gy[i])).toBeGreaterThan(0);
    });

    test('el marco de un pixel se queda a cero: el kernel de 3×3 no cabe', () => {
        const { rgba, ancho, alto } = desdeRejilla(FRANJA_VERTICAL);
        const { magnitud } = sobel(aLuminancia(rgba), ancho, alto);

        for (let x = 0; x < ancho; x++) {
            expect(magnitud[x]).toBe(0);                       // fila de arriba
            expect(magnitud[(alto - 1) * ancho + x]).toBe(0);  // fila de abajo
        }
        for (let y = 0; y < alto; y++) {
            expect(magnitud[y * ancho]).toBe(0);               // columna izquierda
            expect(magnitud[y * ancho + ancho - 1]).toBe(0);   // columna derecha
        }
    });

    test('el máximo es de verdad el mayor de las magnitudes', () => {
        const { rgba, ancho, alto } = desdeRejilla(FRANJA_VERTICAL);
        const { magnitud, maximo } = sobel(aLuminancia(rgba), ancho, alto);

        expect(maximo).toBe(Math.max(...magnitud));
    });
});

describe('posterización', () => {
    test('con dos niveles todo cae a negro o a blanco', () => {
        const entrada = new Uint8ClampedArray([0, 60, 100, 255, 140, 200, 255, 255]);
        const salida = posterizar(entrada, 2);

        for (let i = 0; i < salida.length; i += 4) {
            expect([0, 255]).toContain(salida[i]);
            expect([0, 255]).toContain(salida[i + 1]);
            expect([0, 255]).toContain(salida[i + 2]);
        }
    });

    test('más niveles conservan más matices', () => {
        const entrada = new Uint8ClampedArray([100, 100, 100, 255]);

        expect(posterizar(entrada, 2)[0]).toBe(0);
        expect(posterizar(entrada, 8)[0]).toBeGreaterThan(0);
    });

    test('deja todo opaco, para que tape la imagen de debajo', () => {
        const entrada = new Uint8ClampedArray([10, 20, 30, 0]);
        expect(posterizar(entrada, 4)[3]).toBe(255);
    });

    test('no modifica los datos que recibe', () => {
        const entrada = new Uint8ClampedArray([100, 100, 100, 255]);
        posterizar(entrada, 4);
        expect(Array.from(entrada)).toEqual([100, 100, 100, 255]);
    });
});

describe('capas del modo boceto', () => {
    const AZUL = { r: 56, g: 189, b: 248 };
    const GRAFITO = { r: 51, g: 65, b: 85 };

    test('lo que no llega al umbral queda transparente', () => {
        const magnitud = new Float32Array([10, 200]);
        const { base, grafito } = capasDeBoceto(magnitud, 200, 35, AZUL, GRAFITO);

        expect(base[3]).toBe(0);        // 10 no llega a 35
        expect(grafito[3]).toBe(0);
        expect(base[7]).toBeGreaterThan(0);
        expect(grafito[7]).toBeGreaterThan(0);
    });

    test('el grafito pinta más fuerte que el trazo de construcción', () => {
        const magnitud = new Float32Array([200]);
        const { base, grafito } = capasDeBoceto(magnitud, 200, 35, AZUL, GRAFITO);

        expect(grafito[3]).toBeGreaterThan(base[3]);
    });

    test('un borde más marcado se pinta más opaco', () => {
        const magnitud = new Float32Array([60, 200]);
        const { grafito } = capasDeBoceto(magnitud, 200, 35, AZUL, GRAFITO);

        expect(grafito[7]).toBeGreaterThan(grafito[3]);
    });

    test('usa los colores que se le pasan, para poder seguir al tema', () => {
        const magnitud = new Float32Array([200]);
        const { base, grafito } = capasDeBoceto(magnitud, 200, 35, AZUL, GRAFITO);

        expect([base[0], base[1], base[2]]).toEqual([56, 189, 248]);
        expect([grafito[0], grafito[1], grafito[2]]).toEqual([51, 65, 85]);
    });

    test('un máximo de cero no provoca una división por cero', () => {
        const magnitud = new Float32Array([0, 0]);
        const { grafito } = capasDeBoceto(magnitud, 0, 35, AZUL, GRAFITO);

        expect(Array.from(grafito).every((v) => v === 0)).toBe(true);
    });
});

describe('líneas de flujo', () => {
    test('una imagen lisa no produce ni un trazo', () => {
        const ancho = 60;
        const alto = 60;
        const ceros = new Float32Array(ancho * alto);

        expect(trazosDeFlujo(ceros, ceros, ancho, alto)).toEqual([]);
    });

    test('un borde produce trazos, y cada uno tiene su recorrido', () => {
        const ancho = 60;
        const alto = 60;
        const gx = new Float32Array(ancho * alto).fill(300);
        const gy = new Float32Array(ancho * alto);

        const trazos = trazosDeFlujo(gx, gy, ancho, alto);

        expect(trazos.length).toBeGreaterThan(0);
        expect(trazos[0].puntos.length).toBeGreaterThan(1);
        expect(trazos[0].intensidad).toBeGreaterThan(0);
    });

    test('el trazo sigue la tangente al borde, no el gradiente', () => {
        // Gradiente apuntando a la derecha: el trazo debe correr en vertical.
        const ancho = 60;
        const alto = 60;
        const gx = new Float32Array(ancho * alto).fill(300);
        const gy = new Float32Array(ancho * alto);

        const [primero] = trazosDeFlujo(gx, gy, ancho, alto);
        const [x0, y0] = primero.puntos[0];
        const [x1, y1] = primero.puntos[primero.puntos.length - 1];

        expect(Math.abs(x1 - x0)).toBeLessThan(0.001);
        expect(Math.abs(y1 - y0)).toBeGreaterThan(1);
    });

    test('la intensidad se satura en 1 por muy fuerte que sea el borde', () => {
        const ancho = 40;
        const alto = 40;
        const gx = new Float32Array(ancho * alto).fill(99999);
        const gy = new Float32Array(ancho * alto);

        expect(trazosDeFlujo(gx, gy, ancho, alto)[0].intensidad).toBe(1);
    });

    test('un paso de rejilla más ancho da menos trazos', () => {
        const ancho = 120;
        const alto = 120;
        const gx = new Float32Array(ancho * alto).fill(300);
        const gy = new Float32Array(ancho * alto);

        const finos = trazosDeFlujo(gx, gy, ancho, alto, { paso: 8 });
        const gruesos = trazosDeFlujo(gx, gy, ancho, alto, { paso: 24 });

        expect(finos.length).toBeGreaterThan(gruesos.length);
    });

    test('ningún trazo se sale de la imagen', () => {
        const ancho = 60;
        const alto = 60;
        const gx = new Float32Array(ancho * alto).fill(300);
        const gy = new Float32Array(ancho * alto).fill(300);

        for (const trazo of trazosDeFlujo(gx, gy, ancho, alto)) {
            for (const [x, y] of trazo.puntos) {
                expect(x).toBeGreaterThan(-2);
                expect(y).toBeGreaterThan(-2);
                expect(x).toBeLessThan(ancho + 2);
                expect(y).toBeLessThan(alto + 2);
            }
        }
    });

    // Lo que sigue es lo que separa unas líneas que siguen la forma de una maraña
    // de rayas cortas. La primera versión pasaba las pruebas de arriba y aun así
    // llenaba la imagen de trazos que no seguían nada.

    test('ningún trazo se dobla sobre sí mismo', () => {
        // Con un campo revuelto, la tangente cambia mucho de un paso a otro. La
        // tangente vale igual en los dos sentidos, y quedarse con el equivocado
        // hacía que el trazo volviera por donde había venido: de ahí el aspecto
        // de garabato.
        const ancho = 90;
        const alto = 90;
        const gx = ruido(ancho * alto, 7);
        const gy = ruido(ancho * alto, 91);

        const trazos = trazosDeFlujo(gx, gy, ancho, alto);
        expect(trazos.length).toBeGreaterThan(0);

        for (const { puntos } of trazos) {
            for (let i = 0; i + 2 < puntos.length; i++) {
                const ax = puntos[i + 1][0] - puntos[i][0];
                const ay = puntos[i + 1][1] - puntos[i][1];
                const bx = puntos[i + 2][0] - puntos[i + 1][0];
                const by = puntos[i + 2][1] - puntos[i + 1][1];

                expect(ax * bx + ay * by).toBeGreaterThan(0);
            }
        }
    });

    test('el ruido de fondo no dibuja nada si hay un borde de verdad', () => {
        // Un umbral fijo dejaba pasar cualquier textura floja. El de ahora se mide
        // contra el borde más fuerte de la propia imagen.
        const ancho = 60;
        const alto = 60;
        const gx = new Float32Array(ancho * alto).fill(20);   // textura de fondo
        const gy = new Float32Array(ancho * alto);

        for (let y = 0; y < alto; y++) {
            for (let x = 22; x <= 26; x++) gx[y * ancho + x] = 400;   // el borde
        }

        const trazos = trazosDeFlujo(gx, gy, ancho, alto);
        expect(trazos.length).toBeGreaterThan(0);

        for (const { puntos } of trazos) {
            for (const [x] of puntos) {
                expect(x).toBeGreaterThan(20);
                expect(x).toBeLessThan(28);
            }
        }
    });

    test('los trazos no se amontonan unos sobre otros', () => {
        // Antes salía un trazo por cada punto de la rejilla, todos encima del
        // mismo borde. Ahora el primero que pasa ocupa el sitio.
        const ancho = 120;
        const alto = 120;
        const gx = new Float32Array(ancho * alto).fill(300);
        const gy = new Float32Array(ancho * alto);

        const separacion = 7.2;   // el valor por omisión: paso 12 x 0,6
        const trazos = trazosDeFlujo(gx, gy, ancho, alto);
        expect(trazos.length).toBeGreaterThan(0);

        // Dos trazos no comparten ni un cuadro de la rejilla de ocupación: es lo
        // que impide que se dibujen uno encima de otro sobre el mismo borde.
        const dueno = new Map();

        for (let i = 0; i < trazos.length; i++) {
            for (const [x, y] of trazos[i].puntos) {
                const celda = `${Math.floor(x / separacion)},${Math.floor(y / separacion)}`;
                if (dueno.has(celda)) expect(dueno.get(celda)).toBe(i);
                dueno.set(celda, i);
            }
        }
    });

    test('un contorno muy fuerte no apaga la estructura de dentro', () => {
        // Con un umbral proporcional al borde más fuerte, el contorno de una
        // figura recortada contra el fondo se llevaba todo el margen y los
        // pliegues de dentro —lo que de verdad interesa dibujar— desaparecían.
        const ancho = 120;
        const alto = 120;
        const gx = new Float32Array(ancho * alto).fill(10);   // fondo liso
        const gy = new Float32Array(ancho * alto);

        for (let y = 0; y < alto; y++) {
            for (let x = 22; x <= 26; x++) gx[y * ancho + x] = 600;   // el contorno
            for (let x = 58; x <= 86; x++) gx[y * ancho + x] = 60;    // los pliegues
        }

        const trazos = trazosDeFlujo(gx, gy, ancho, alto);
        const dentroDe = (min, max) => trazos.some(
            ({ puntos }) => puntos.every(([x]) => x > min && x < max)
        );

        expect(dentroDe(20, 28)).toBe(true);   // el contorno
        expect(dentroDe(56, 88)).toBe(true);   // y también los pliegues
    });

    test('los trazos demasiado cortos se descartan', () => {
        const ancho = 90;
        const alto = 90;
        const gx = ruido(ancho * alto, 3);
        const gy = ruido(ancho * alto, 29);

        for (const { puntos } of trazosDeFlujo(gx, gy, ancho, alto)) {
            expect(puntos.length).toBeGreaterThanOrEqual(5);
        }
    });

    test('un trazo puede crecer hacia los dos lados de su semilla', () => {
        // Creciendo sólo hacia delante los trazos quedaban colgando del punto de
        // partida en vez de recorrer el borde entero.
        const ancho = 60;
        const alto = 60;
        const gx = new Float32Array(ancho * alto).fill(300);
        const gy = new Float32Array(ancho * alto);

        const [primero] = trazosDeFlujo(gx, gy, ancho, alto, { paso: 24 });
        const alturas = primero.puntos.map(([, y]) => y);

        // La semilla está en y=24; el trazo la deja por encima y por debajo.
        expect(Math.min(...alturas)).toBeLessThan(24);
        expect(Math.max(...alturas)).toBeGreaterThan(24);
    });
});
