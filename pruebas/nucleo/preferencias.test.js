import { describe, test, expect } from 'vitest';
import preferencias from '../../src/nucleo/preferencias.js';

const { CLAVE, POR_DEFECTO, normalizar, leer, guardar } = preferencias;

/** Almacenamiento de mentira, con la misma forma que localStorage. */
function almacenFalso(contenidoInicial = {}) {
    const datos = { ...contenidoInicial };
    return {
        getItem: (k) => (k in datos ? datos[k] : null),
        setItem: (k, v) => { datos[k] = String(v); },
        _datos: datos
    };
}

/** Almacenamiento que se niega a guardar, como en navegación privada. */
function almacenBloqueado() {
    return {
        getItem() { throw new Error('bloqueado'); },
        setItem() { throw new Error('bloqueado'); }
    };
}

describe('normalización', () => {
    test('sin nada guardado devuelve los valores de fábrica', () => {
        expect(normalizar(null)).toEqual(POR_DEFECTO);
        expect(normalizar(undefined)).toEqual(POR_DEFECTO);
        expect(normalizar('vaya cosa')).toEqual(POR_DEFECTO);
    });

    test('conserva lo que sí es válido', () => {
        const salida = normalizar({ duracion: 120, cuadricula: 'thirds', sonido: false });

        expect(salida.duracion).toBe(120);
        expect(salida.cuadricula).toBe('thirds');
        expect(salida.sonido).toBe(false);
    });

    test('descarta una cuadrícula que no existe', () => {
        expect(normalizar({ cuadricula: 'hexagonal' }).cuadricula).toBe('none');
    });

    test('rechaza duraciones imposibles', () => {
        expect(normalizar({ duracion: 0 }).duracion).toBe(60);
        expect(normalizar({ duracion: -30 }).duracion).toBe(60);
        expect(normalizar({ duracion: 999999 }).duracion).toBe(60);
        expect(normalizar({ duracion: 'diez' }).duracion).toBe(60);
    });

    test('mantiene los niveles dentro del rango de sus deslizadores', () => {
        expect(normalizar({ nivelDesenfoque: 99 }).nivelDesenfoque).toBe(12);
        expect(normalizar({ nivelDesenfoque: 25 }).nivelDesenfoque).toBe(25);
        expect(normalizar({ nivelPosterizacion: 1 }).nivelPosterizacion).toBe(4);
        expect(normalizar({ nivelPosterizacion: 6 }).nivelPosterizacion).toBe(6);
    });

    test('sonido sólo acepta un booleano de verdad, no un valor que parezca cierto', () => {
        expect(normalizar({ sonido: 'sí' }).sonido).toBe(true);   // cae al de fábrica
        expect(normalizar({ sonido: 0 }).sonido).toBe(true);
        expect(normalizar({ sonido: false }).sonido).toBe(false);
    });

    test('devuelve siempre el juego completo, aunque falten claves', () => {
        expect(Object.keys(normalizar({ duracion: 30 })).sort()).toEqual(Object.keys(POR_DEFECTO).sort());
    });
});

describe('lectura y escritura', () => {
    test('lo guardado se vuelve a leer igual', () => {
        const almacen = almacenFalso();
        guardar({ duracion: 300, cuadricula: 'grid4', sonido: false }, almacen);

        const leidas = leer(almacen);
        expect(leidas.duracion).toBe(300);
        expect(leidas.cuadricula).toBe('grid4');
        expect(leidas.sonido).toBe(false);
    });

    test('un almacenamiento con basura no rompe nada', () => {
        const almacen = almacenFalso({ [CLAVE]: '{esto no es json' });
        expect(leer(almacen)).toEqual(POR_DEFECTO);
    });

    test('un almacenamiento con un valor manipulado se sanea al leer', () => {
        const almacen = almacenFalso({ [CLAVE]: JSON.stringify({ duracion: -5, cuadricula: 'raro' }) });
        const leidas = leer(almacen);

        expect(leidas.duracion).toBe(60);
        expect(leidas.cuadricula).toBe('none');
    });

    test('en navegación privada se devuelve lo de fábrica en vez de fallar', () => {
        expect(() => leer(almacenBloqueado())).not.toThrow();
        expect(leer(almacenBloqueado())).toEqual(POR_DEFECTO);
    });

    test('guardar avisa si no pudo, sin lanzar', () => {
        expect(guardar(POR_DEFECTO, almacenBloqueado())).toBe(false);
        expect(guardar(POR_DEFECTO, almacenFalso())).toBe(true);
    });

    test('nunca escribe un valor inválido, aunque se lo pidan', () => {
        const almacen = almacenFalso();
        guardar({ duracion: -1, cuadricula: 'hexagonal' }, almacen);

        expect(JSON.parse(almacen._datos[CLAVE]).duracion).toBe(60);
        expect(JSON.parse(almacen._datos[CLAVE]).cuadricula).toBe('none');
    });
});
