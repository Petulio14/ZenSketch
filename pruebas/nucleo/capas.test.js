import { describe, test, expect } from 'vitest';
import capas from '../../src/nucleo/capas.js';

const { capasApagadas, resolver, apagadasPor, filtroCss, peldanoRevelado } = capas;

describe('convivencia de capas', () => {
    test('los filtros acumulables se suman entre ellos', () => {
        let estado = resolver(capasApagadas(), 'blur', true);
        estado = resolver(estado, 'grayscale', true);

        expect(estado.blur).toBe(true);
        expect(estado.grayscale).toBe(true);
    });

    test('un modo que sustituye la imagen apaga los filtros', () => {
        let estado = resolver(capasApagadas(), 'blur', true);
        estado = resolver(estado, 'grayscale', true);
        estado = resolver(estado, 'reveal', true);

        expect(estado.reveal).toBe(true);
        expect(estado.blur).toBe(false);
        expect(estado.grayscale).toBe(false);
    });

    test('los dos modos no pueden estar encendidos a la vez', () => {
        let estado = resolver(capasApagadas(), 'posterize', true);
        estado = resolver(estado, 'reveal', true);

        expect(estado.reveal).toBe(true);
        expect(estado.posterize).toBe(false);
    });

    test('encender un filtro apaga el modo que estuviera puesto', () => {
        let estado = resolver(capasApagadas(), 'posterize', true);
        estado = resolver(estado, 'blur', true);

        expect(estado.blur).toBe(true);
        expect(estado.posterize).toBe(false);
    });

    test('apagar una capa no toca a las demás', () => {
        let estado = resolver(capasApagadas(), 'blur', true);
        estado = resolver(estado, 'grayscale', true);
        estado = resolver(estado, 'blur', false);

        expect(estado.blur).toBe(false);
        expect(estado.grayscale).toBe(true);
    });

    test('no modifica el estado que recibe', () => {
        const original = resolver(capasApagadas(), 'blur', true);
        resolver(original, 'reveal', true);

        expect(original.blur).toBe(true);
    });
});

describe('capas que hay que limpiar en pantalla', () => {
    test('informa de las que el cambio ha apagado', () => {
        const antes = resolver(resolver(capasApagadas(), 'blur', true), 'grayscale', true);
        const despues = resolver(antes, 'posterize', true);

        expect(apagadasPor(antes, despues).sort()).toEqual(['blur', 'grayscale']);
    });

    test('no informa de nada cuando sólo se suma una capa', () => {
        const antes = resolver(capasApagadas(), 'blur', true);
        const despues = resolver(antes, 'grayscale', true);

        expect(apagadasPor(antes, despues)).toEqual([]);
    });
});

describe('cadena de CSS filter', () => {
    test('sin filtros devuelve «none», que es lo que espera el navegador', () => {
        expect(filtroCss(capasApagadas(), 12)).toBe('none');
    });

    test('el desenfoque usa el nivel elegido', () => {
        const estado = resolver(capasApagadas(), 'blur', true);
        expect(filtroCss(estado, 20)).toBe('blur(20px)');
    });

    test('el umbral no encadena la escala de grises dos veces', () => {
        let estado = resolver(capasApagadas(), 'threshold', true);
        estado = resolver(estado, 'grayscale', true);

        expect(filtroCss(estado, 12)).toBe('grayscale(100%) contrast(400%)');
    });

    test('combina desenfoque y escala de grises en ese orden', () => {
        let estado = resolver(capasApagadas(), 'blur', true);
        estado = resolver(estado, 'grayscale', true);

        expect(filtroCss(estado, 8)).toBe('blur(8px) grayscale(100%)');
    });
});

describe('peldaños del revelado progresivo', () => {
    test('cada nivel tiene etiqueta y filtro propios', () => {
        expect(peldanoRevelado(1).etiqueta).toContain('Silueta');
        expect(peldanoRevelado(4).filtro).toBe('none');
    });

    test('un nivel fuera de rango cae en el primero en vez de romper', () => {
        expect(peldanoRevelado(9)).toEqual(peldanoRevelado(1));
        expect(peldanoRevelado(undefined)).toEqual(peldanoRevelado(1));
    });
});
