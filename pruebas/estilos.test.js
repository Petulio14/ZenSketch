import { readFileSync } from 'node:fs';
import { describe, test, expect } from 'vitest';

// Estas son las únicas pruebas que miran la hoja de estilos, y existen por un
// defecto concreto: durante un tiempo el espejo no volteaba nada. app.js escribía
// bien el «transform» en línea —se veía en el inspector— y el navegador seguía
// aplicando otro. La culpa era de @keyframes imageEnter, que animaba «transform»
// con animation-fill-mode: forwards; una propiedad animada gana al estilo en
// línea, y con «forwards» sigue ganando cuando la animación ya terminó.
//
// El linter no ve esto y las pruebas del núcleo tampoco: la lógica era correcta,
// lo que fallaba era quién manda en la cascada. De ahí que se compruebe aquí.

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

/** Los bloques @keyframes de la hoja, por nombre. */
function keyframes(hoja) {
    const bloques = {};
    const patron = /@keyframes\s+([\w-]+)\s*\{/g;
    let encontrado;

    while ((encontrado = patron.exec(hoja)) !== null) {
        let profundidad = 0;
        let i = patron.lastIndex - 1;

        do {
            if (hoja[i] === '{') profundidad++;
            else if (hoja[i] === '}') profundidad--;
            i++;
        } while (profundidad > 0 && i < hoja.length);

        bloques[encontrado[1]] = hoja.slice(patron.lastIndex, i - 1);
    }

    return bloques;
}

/** Las animaciones declaradas sobre un selector, por su nombre. */
function animacionesDe(hoja, selector) {
    const nombres = [];
    const escapado = selector.replace(/[.#]/g, '\\$&');
    const patron = new RegExp(`${escapado}\\s*\\{([^}]*)\\}`, 'g');
    let encontrado;

    while ((encontrado = patron.exec(hoja)) !== null) {
        const declarada = /animation(?:-name)?\s*:\s*([^;]+)/.exec(encontrado[1]);
        if (declarada) nombres.push(declarada[1].trim().split(/\s+/)[0]);
    }

    return nombres;
}

describe('la hoja de estilos no le pisa el transform a app.js', () => {
    const bloques = keyframes(css);

    test('applyImageTransforms escribe transform en línea', () => {
        // Si esto deja de ser verdad, la prueba de abajo ya no protege nada.
        expect(app).toMatch(/capa\.style\.transform = transformacion/);
    });

    test('la animación de entrada de la imagen no toca transform', () => {
        const nombres = animacionesDe(css, '.image-entering');

        expect(nombres.length).toBeGreaterThan(0);

        for (const nombre of nombres) {
            expect(bloques[nombre]).toBeDefined();
            expect(bloques[nombre]).not.toMatch(/[^-]transform\s*:/);
        }
    });

    test('ninguna capa que app.js transforma recibe una animación con transform', () => {
        // Las mismas capas que enumera applyImageTransforms, más la clase que se
        // le añade a la imagen al entrar.
        const capas = [
            '#active-image',
            '.image-entering',
            '.contour-canvas',
            '.posterize-canvas',
            '.flow-canvas',
            '.grid-overlay'
        ];

        for (const capa of capas) {
            for (const nombre of animacionesDe(css, capa)) {
                expect(
                    bloques[nombre],
                    `@keyframes ${nombre}, usada por ${capa}, no existe`
                ).toBeDefined();

                expect(
                    /[^-]transform\s*:/.test(bloques[nombre]),
                    `@keyframes ${nombre} anima transform y ${capa} lo lleva en línea`
                ).toBe(false);
            }
        }
    });
});
