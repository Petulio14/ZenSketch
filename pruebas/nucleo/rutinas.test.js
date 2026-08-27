import { describe, test, expect } from 'vitest';
import rutinas from '../../src/nucleo/rutinas.js';

const { PREDEFINIDAS, totalDePoses, duracionTotal, porId, crearRutina } = rutinas;

const CLASICA = [
    { duracion: 30, repeticiones: 10 },
    { duracion: 120, repeticiones: 5 },
    { duracion: 600, repeticiones: 2 }
];

describe('rutinas predefinidas', () => {
    test('todas tienen identificador, nombre y bloques con sentido', () => {
        for (const rutina of PREDEFINIDAS) {
            expect(rutina.id).toBeTruthy();
            expect(rutina.nombre).toBeTruthy();
            expect(rutina.bloques.length).toBeGreaterThan(0);

            for (const bloque of rutina.bloques) {
                expect(bloque.duracion).toBeGreaterThan(0);
                expect(bloque.repeticiones).toBeGreaterThan(0);
            }
        }
    });

    test('los identificadores no se repiten', () => {
        const ids = PREDEFINIDAS.map((r) => r.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    test('se encuentran por identificador', () => {
        expect(porId('clasica').nombre).toBe('Sesión clásica');
        expect(porId('no-existe')).toBeNull();
    });

    test('la sesión clásica va de menos a más tiempo', () => {
        const duraciones = porId('clasica').bloques.map((b) => b.duracion);
        const ordenadas = [...duraciones].sort((a, b) => a - b);
        expect(duraciones).toEqual(ordenadas);
    });
});

describe('cuentas de una rutina', () => {
    test('suma las poses de todos los bloques', () => {
        expect(totalDePoses(CLASICA)).toBe(17);
    });

    test('suma el tiempo total', () => {
        // 10×30 + 5×120 + 2×600 = 300 + 600 + 1200
        expect(duracionTotal(CLASICA)).toBe(2100);
    });

    test('una rutina sin bloques dura cero', () => {
        expect(totalDePoses([])).toBe(0);
        expect(duracionTotal([])).toBe(0);
    });
});

describe('recorrido de una rutina', () => {
    test('empieza por la duración del primer bloque', () => {
        const r = crearRutina(CLASICA);
        expect(r.duracionActual()).toBe(30);
        expect(r.terminada()).toBe(false);
    });

    test('mantiene la duración durante todo el bloque', () => {
        const r = crearRutina(CLASICA);
        for (let i = 1; i < 10; i++) {
            expect(r.avanzar()).toBe(30);
        }
    });

    test('cambia de duración al pasar de bloque, sin tocar nada a mano', () => {
        const r = crearRutina(CLASICA);
        for (let i = 1; i < 10; i++) r.avanzar();

        expect(r.avanzar()).toBe(120);   // pose 11: empieza el segundo bloque
    });

    test('llega al último bloque y termina donde debe', () => {
        const r = crearRutina(CLASICA);
        for (let i = 1; i < 17; i++) r.avanzar();

        expect(r.duracionActual()).toBe(600);
        expect(r.terminada()).toBe(false);

        expect(r.avanzar()).toBeNull();
        expect(r.terminada()).toBe(true);
    });

    test('reiniciar vuelve al principio', () => {
        const r = crearRutina(CLASICA);
        for (let i = 0; i < 12; i++) r.avanzar();

        expect(r.reiniciar()).toBe(30);
        expect(r.terminada()).toBe(false);
    });

    test('los bloques vacíos se descartan en vez de atascar el avance', () => {
        const r = crearRutina([
            { duracion: 30, repeticiones: 0 },
            { duracion: 60, repeticiones: 2 }
        ]);

        expect(r.duracionActual()).toBe(60);
        expect(r.progreso().totalPoses).toBe(2);
    });
});

describe('progreso de la sesión', () => {
    test('dice por qué pose y por qué bloque va', () => {
        const r = crearRutina(CLASICA);
        const inicio = r.progreso();

        expect(inicio.pose).toBe(1);
        expect(inicio.totalPoses).toBe(17);
        expect(inicio.bloque).toBe(1);
        expect(inicio.totalBloques).toBe(3);
        expect(inicio.dentroDelBloque).toBe(1);
        expect(inicio.posesDelBloque).toBe(10);
        expect(inicio.duracion).toBe(30);
    });

    test('la posición dentro del bloque se reinicia en cada bloque', () => {
        const r = crearRutina(CLASICA);
        for (let i = 0; i < 10; i++) r.avanzar();

        const p = r.progreso();
        expect(p.pose).toBe(11);
        expect(p.bloque).toBe(2);
        expect(p.dentroDelBloque).toBe(1);
        expect(p.posesDelBloque).toBe(5);
    });

    test('al terminar lo dice y no se pasa de la cuenta', () => {
        const r = crearRutina(CLASICA);
        for (let i = 0; i < 20; i++) r.avanzar();

        const p = r.progreso();
        expect(p.terminada).toBe(true);
        expect(p.pose).toBe(17);
        expect(p.duracion).toBeNull();
    });
});
