import { describe, test, expect } from 'vitest';
import barajar from '../../src/nucleo/barajar.js';
import { barajadorEnSecuencia } from './ayudas.js';

const { barajar: mezclar, barajarEvitando, indices } = barajar;

describe('mezcla de Fisher-Yates', () => {
    test('no modifica la lista original', () => {
        const original = [1, 2, 3, 4, 5];
        mezclar(original);
        expect(original).toEqual([1, 2, 3, 4, 5]);
    });

    test('conserva todos los elementos', () => {
        const resultado = mezclar([1, 2, 3, 4, 5]);
        expect([...resultado].sort()).toEqual([1, 2, 3, 4, 5]);
    });

    test('aguanta la lista vacía y la de un solo elemento', () => {
        expect(mezclar([])).toEqual([]);
        expect(mezclar([7])).toEqual([7]);
    });

    test('reparte cada elemento por todas las posiciones', () => {
        const vistos = new Set();
        for (let i = 0; i < 200; i++) {
            vistos.add(mezclar([0, 1, 2]).join(''));
        }
        expect(vistos.size).toBe(6);
    });
});

describe('mezcla evitando un primer elemento', () => {
    test('descarta los órdenes que empiezan por el valor prohibido', () => {
        const barajador = barajadorEnSecuencia([[2, 0, 1], [0, 1, 2]]);
        expect(barajarEvitando([0, 1, 2], 2, barajador)).toEqual([0, 1, 2]);
    });

    test('acepta el primer orden válido sin dar más vueltas', () => {
        const barajador = barajadorEnSecuencia([[1, 0, 2]]);
        expect(barajarEvitando([0, 1, 2], 2, barajador)).toEqual([1, 0, 2]);
    });

    test('con un solo elemento devuelve la lista aunque esté prohibido', () => {
        expect(barajarEvitando([4], 4)).toEqual([4]);
    });
});

describe('generación de índices', () => {
    test('produce 0..n-1', () => {
        expect(indices(4)).toEqual([0, 1, 2, 3]);
        expect(indices(0)).toEqual([]);
    });
});
