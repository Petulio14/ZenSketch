import { describe, test, expect } from 'vitest';
import historial from '../../src/nucleo/historial.js';

const { diaDe, diasEntre, registrarPose, rachaDeDias, resumen, podar } = historial;

/** Una fecha local concreta, sin sorpresas de zona horaria. */
const dia = (aaaa, mm, dd, hora = 12) => new Date(aaaa, mm - 1, dd, hora, 0, 0);

describe('días de calendario', () => {
    test('la clave es la fecha local, no la UTC', () => {
        expect(diaDe(dia(2026, 8, 27))).toBe('2026-08-27');
        expect(diaDe(dia(2026, 1, 5))).toBe('2026-01-05');
    });

    test('dibujar a las once de la noche cuenta para ese día', () => {
        expect(diaDe(dia(2026, 8, 27, 23))).toBe('2026-08-27');
    });

    test('la distancia entre días cruza meses y años', () => {
        expect(diasEntre('2026-08-27', '2026-08-28')).toBe(1);
        expect(diasEntre('2026-08-31', '2026-09-01')).toBe(1);
        expect(diasEntre('2025-12-31', '2026-01-01')).toBe(1);
        expect(diasEntre('2026-02-28', '2026-03-01')).toBe(1);   // 2026 no es bisiesto
    });
});

describe('registrar poses', () => {
    test('la primera pose del día abre el registro', () => {
        const h = registrarPose({}, { fecha: dia(2026, 8, 27), segundos: 60 });
        expect(h['2026-08-27']).toEqual({ segundos: 60, imagenes: 1 });
    });

    test('las siguientes se acumulan', () => {
        let h = registrarPose({}, { fecha: dia(2026, 8, 27), segundos: 30 });
        h = registrarPose(h, { fecha: dia(2026, 8, 27), segundos: 120 });

        expect(h['2026-08-27']).toEqual({ segundos: 150, imagenes: 2 });
    });

    test('cada día lleva su cuenta', () => {
        let h = registrarPose({}, { fecha: dia(2026, 8, 26), segundos: 60 });
        h = registrarPose(h, { fecha: dia(2026, 8, 27), segundos: 90 });

        expect(h['2026-08-26'].segundos).toBe(60);
        expect(h['2026-08-27'].segundos).toBe(90);
    });

    test('una pose de cero segundos no cuenta como imagen dibujada', () => {
        const h = registrarPose({}, { fecha: dia(2026, 8, 27), segundos: 0 });
        expect(h['2026-08-27']).toBeUndefined();
    });

    test('no modifica el historial que recibe', () => {
        const original = registrarPose({}, { fecha: dia(2026, 8, 27), segundos: 60 });
        registrarPose(original, { fecha: dia(2026, 8, 27), segundos: 60 });

        expect(original['2026-08-27'].imagenes).toBe(1);
    });
});

describe('racha de días', () => {
    const hoy = dia(2026, 8, 27);

    function conDias(...claves) {
        const h = {};
        for (const c of claves) h[c] = { segundos: 60, imagenes: 1 };
        return h;
    }

    test('sin historial no hay racha', () => {
        expect(rachaDeDias({}, hoy)).toBe(0);
    });

    test('practicar hoy y sólo hoy es racha de uno', () => {
        expect(rachaDeDias(conDias('2026-08-27'), hoy)).toBe(1);
    });

    test('cuenta los días seguidos hacia atrás', () => {
        expect(rachaDeDias(conDias('2026-08-25', '2026-08-26', '2026-08-27'), hoy)).toBe(3);
    });

    test('un hueco corta la racha ahí', () => {
        expect(rachaDeDias(conDias('2026-08-20', '2026-08-21', '2026-08-26', '2026-08-27'), hoy)).toBe(2);
    });

    test('sigue viva si se practicó ayer pero hoy todavía no', () => {
        // Quien dibuja por la mañana no debe ver su racha rota durante todo el día
        expect(rachaDeDias(conDias('2026-08-25', '2026-08-26'), hoy)).toBe(2);
    });

    test('se rompe si hace dos días que no se practica', () => {
        expect(rachaDeDias(conDias('2026-08-24', '2026-08-25'), hoy)).toBe(0);
    });

    test('cruza el cambio de mes', () => {
        const primeroDeSeptiembre = dia(2026, 9, 1);
        expect(rachaDeDias(conDias('2026-08-30', '2026-08-31', '2026-09-01'), primeroDeSeptiembre)).toBe(3);
    });

    test('un día registrado sin tiempo no sostiene la racha', () => {
        const h = { '2026-08-26': { segundos: 0, imagenes: 0 }, '2026-08-27': { segundos: 60, imagenes: 1 } };
        expect(rachaDeDias(h, hoy)).toBe(1);
    });
});

describe('resumen para el panel', () => {
    const hoy = dia(2026, 8, 27);

    test('separa lo de hoy del acumulado', () => {
        let h = registrarPose({}, { fecha: dia(2026, 8, 26), segundos: 600 });
        h = registrarPose(h, { fecha: dia(2026, 8, 27), segundos: 300 });
        h = registrarPose(h, { fecha: dia(2026, 8, 27), segundos: 300 });

        const r = resumen(h, hoy);
        expect(r.minutosHoy).toBe(10);
        expect(r.imagenesHoy).toBe(2);
        expect(r.minutosTotales).toBe(20);
        expect(r.imagenesTotales).toBe(3);
        expect(r.diasActivos).toBe(2);
        expect(r.rachaDias).toBe(2);
    });

    test('un historial vacío da ceros y no falla', () => {
        expect(resumen({}, hoy)).toEqual({
            minutosHoy: 0, imagenesHoy: 0, minutosTotales: 0,
            imagenesTotales: 0, rachaDias: 0, diasActivos: 0
        });
    });

    test('los minutos se redondean hacia abajo: 59 s no son un minuto', () => {
        const h = registrarPose({}, { fecha: hoy, segundos: 59 });
        expect(resumen(h, hoy).minutosHoy).toBe(0);
    });
});

describe('poda', () => {
    const hoy = dia(2026, 8, 27);

    test('se queda con lo reciente y suelta lo muy viejo', () => {
        const h = {
            '2020-01-01': { segundos: 60, imagenes: 1 },
            '2026-08-01': { segundos: 60, imagenes: 1 },
            '2026-08-27': { segundos: 60, imagenes: 1 }
        };
        const recortado = podar(h, hoy, 400);

        expect(recortado['2020-01-01']).toBeUndefined();
        expect(recortado['2026-08-01']).toBeDefined();
        expect(recortado['2026-08-27']).toBeDefined();
    });

    test('no toca el historial que recibe', () => {
        const h = { '2020-01-01': { segundos: 60, imagenes: 1 } };
        podar(h, hoy, 400);
        expect(h['2020-01-01']).toBeDefined();
    });
});
