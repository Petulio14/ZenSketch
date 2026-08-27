import { describe, test, expect } from 'vitest';
import playlist from '../../src/nucleo/playlist.js';
import { barajadorEnSecuencia } from './ayudas.js';

const { crearPlaylist } = playlist;

describe('recorrido de una tanda', () => {
    test('empieza en la primera imagen', () => {
        const p = crearPlaylist(5, { barajador: barajadorEnSecuencia([[3, 1, 4, 0, 2]]) });
        expect(p.imagenActual()).toBe(3);
        expect(p.posicionActual()).toBe(1);
        expect(p.total()).toBe(5);
    });

    test('avanza de una en una', () => {
        const p = crearPlaylist(3, { barajador: barajadorEnSecuencia([[2, 0, 1]]) });
        expect(p.avanzar()).toBe(0);
        expect(p.posicionActual()).toBe(2);
        expect(p.avanzar()).toBe(1);
        expect(p.posicionActual()).toBe(3);
    });

    test('retroceder desde la primera lleva a la última, no fuera de la lista', () => {
        const p = crearPlaylist(4, { barajador: barajadorEnSecuencia([[0, 1, 2, 3]]) });
        expect(p.retroceder()).toBe(3);
        expect(p.posicionActual()).toBe(4);
    });

    test('el porcentaje recorre la tanda de extremo a extremo', () => {
        const p = crearPlaylist(4, { barajador: barajadorEnSecuencia([[0, 1, 2, 3]]) });
        expect(p.porcentaje()).toBe(25);
        p.avanzar();
        expect(p.porcentaje()).toBe(50);
        p.avanzar();
        p.avanzar();
        expect(p.porcentaje()).toBe(100);
    });

    test('reiniciar la mezcla vuelve al principio de una tanda nueva', () => {
        const p = crearPlaylist(3, { barajador: barajadorEnSecuencia([[0, 1, 2], [1, 2, 0]]) });
        p.avanzar();
        expect(p.rebarajar()).toBe(1);
        expect(p.posicionActual()).toBe(1);
    });
});

describe('cierre de ciclo', () => {
    test('al agotar la tanda abre otra y vuelve a la posición 1', () => {
        const p = crearPlaylist(3, { barajador: barajadorEnSecuencia([[0, 1, 2], [1, 0, 2]]) });
        p.avanzar();
        p.avanzar();
        p.avanzar();
        expect(p.posicionActual()).toBe(1);
        expect(p.total()).toBe(3);
    });

    // --- DEFECTO D-02 ---
    // En rojo a propósito. La tanda [0,1,2] termina mostrando la imagen 2, así que
    // la tanda siguiente no debería empezar por ella: el barajador tiene preparado
    // [1,2,0] como alternativa. Hoy la guarda compara contra `undefined` y se queda
    // con [2,0,1], repitiendo la imagen dos veces seguidas. Se corrige en la fase 2.
    test('la tanda nueva no empieza con la imagen que acaba de verse', () => {
        const p = crearPlaylist(3, {
            barajador: barajadorEnSecuencia([[0, 1, 2], [2, 0, 1], [1, 2, 0]])
        });

        p.avanzar();
        p.avanzar();
        expect(p.imagenActual()).toBe(2);

        expect(p.avanzar()).not.toBe(2);
    });

    test('con azar real, mil cierres de ciclo no repiten ni una vez', () => {
        const p = crearPlaylist(5);
        let repeticiones = 0;

        for (let vuelta = 0; vuelta < 1000; vuelta++) {
            let ultima = p.imagenActual();
            for (let paso = 1; paso < 5; paso++) {
                ultima = p.avanzar();
            }
            if (p.avanzar() === ultima) repeticiones++;
        }

        expect(repeticiones).toBe(0);
    });

    test('con una sola imagen no se queda colgada intentando evitarla', () => {
        const p = crearPlaylist(1);
        expect(p.avanzar()).toBe(0);
        expect(p.avanzar()).toBe(0);
    });
});
