import { describe, test, expect } from 'vitest';
import temporizador from '../../src/nucleo/temporizador.js';

const {
    instanteFin,
    restanteMs,
    restanteEn,
    haTerminado,
    ticksHastaTerminar,
    formatearTiempo,
    duracionDesdeCampos,
    fraccionRestante,
    desplazamientoAnillo,
    estadoAnillo,
    enAvisoFinal
} = temporizador;

describe('cuenta atrás', () => {
    const ARRANQUE = 1000;

    test('fija el final a partir del arranque y la duración', () => {
        expect(instanteFin(ARRANQUE, 30)).toBe(31000);
        expect(instanteFin(0, 600)).toBe(600000);
    });

    test('el reloj enseña la duración completa durante el primer segundo', () => {
        const fin = instanteFin(ARRANQUE, 30);
        expect(restanteEn(fin, ARRANQUE)).toBe(30);
        expect(restanteEn(fin, ARRANQUE + 1)).toBe(30);
        expect(restanteEn(fin, ARRANQUE + 999)).toBe(30);
    });

    test('baja de segundo justo al cumplirse cada uno', () => {
        const fin = instanteFin(ARRANQUE, 30);
        expect(restanteEn(fin, ARRANQUE + 1000)).toBe(29);
        expect(restanteEn(fin, ARRANQUE + 29000)).toBe(1);
    });

    test('nunca muestra tiempo negativo aunque el aviso llegue tarde', () => {
        const fin = instanteFin(ARRANQUE, 30);
        expect(restanteEn(fin, ARRANQUE + 45000)).toBe(0);
        expect(restanteMs(fin, ARRANQUE + 45000)).toBe(0);
    });

    test('la campana no suena mientras quede tiempo', () => {
        const fin = instanteFin(ARRANQUE, 30);
        expect(haTerminado(fin, ARRANQUE)).toBe(false);
        expect(haTerminado(fin, ARRANQUE + 29999)).toBe(false);
    });

    // --- DEFECTO D-01 ---
    // Con el modelo anterior, que contaba ticks, la cuenta llegaba a cero y
    // todavía hacía falta un tick más para reaccionar: una pose de 30 s duraba 31.
    test('una pose de 30 s termina a los 30 s, no a los 31', () => {
        expect(ticksHastaTerminar(30)).toBe(30);
    });

    test('todos los presets duran lo que anuncian', () => {
        for (const preset of [30, 60, 120, 300, 600]) {
            expect(ticksHastaTerminar(preset)).toBe(preset);
        }
    });

    test('una pausa larga no adelanta ni retrasa el final', () => {
        // Se pausa a los 10 s y se reanuda un minuto después con lo que quedaba.
        const fin = instanteFin(ARRANQUE, 30);
        const quedaban = restanteMs(fin, ARRANQUE + 10000);
        expect(quedaban).toBe(20000);

        const finTrasReanudar = ARRANQUE + 70000 + quedaban;
        expect(haTerminado(finTrasReanudar, ARRANQUE + 70000 + 19999)).toBe(false);
        expect(haTerminado(finTrasReanudar, ARRANQUE + 70000 + 20000)).toBe(true);
    });
});

describe('formato de tiempo', () => {
    test('siempre dos cifras por lado', () => {
        expect(formatearTiempo(0)).toBe('00:00');
        expect(formatearTiempo(5)).toBe('00:05');
        expect(formatearTiempo(65)).toBe('01:05');
        expect(formatearTiempo(600)).toBe('10:00');
    });

    test('un valor negativo se muestra como cero, no como «-1:-1»', () => {
        expect(formatearTiempo(-3)).toBe('00:00');
    });
});

describe('temporizador personalizado', () => {
    test('suma minutos y segundos', () => {
        expect(duracionDesdeCampos('1', '30')).toBe(90);
        expect(duracionDesdeCampos('0', '45')).toBe(45);
        expect(duracionDesdeCampos('10', '0')).toBe(600);
    });

    test('rechaza el tiempo vacío o nulo en vez de aplicar cero', () => {
        expect(duracionDesdeCampos('0', '0')).toBeNull();
        expect(duracionDesdeCampos('', '')).toBeNull();
        expect(duracionDesdeCampos('abc', 'def')).toBeNull();
    });
});

describe('anillo de progreso', () => {
    test('la fracción va de 1 a 0 y no se sale de ahí', () => {
        expect(fraccionRestante(60, 60)).toBe(1);
        expect(fraccionRestante(30, 60)).toBe(0.5);
        expect(fraccionRestante(0, 60)).toBe(0);
        expect(fraccionRestante(90, 60)).toBe(1);
    });

    test('no divide por cero cuando aún no hay duración', () => {
        expect(fraccionRestante(0, 0)).toBe(0);
    });

    test('el trazo se vacía a medida que se agota el tiempo', () => {
        const circunferencia = 2 * Math.PI * 52;
        expect(desplazamientoAnillo(circunferencia, 1)).toBe(0);
        expect(desplazamientoAnillo(circunferencia, 0)).toBeCloseTo(circunferencia);
    });

    test('avisa en el último 15 %, marca la pausa y calla el resto del tiempo', () => {
        expect(estadoAnillo(5, 60, true)).toBe('advertencia');
        expect(estadoAnillo(40, 60, false)).toBe('pausa');
        expect(estadoAnillo(40, 60, true)).toBe('normal');
    });

    test('la animación de aviso sólo aparece en marcha y en los últimos 5 s', () => {
        expect(enAvisoFinal(3, true)).toBe(true);
        expect(enAvisoFinal(3, false)).toBe(false);
        expect(enAvisoFinal(0, true)).toBe(false);
        expect(enAvisoFinal(20, true)).toBe(false);
    });
});
