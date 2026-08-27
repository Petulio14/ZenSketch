import { describe, test, expect } from 'vitest';
import geometria from '../../src/nucleo/geometria.js';

const { dimensionesRenderizadas, tamanoDeProceso } = geometria;

describe('rectángulo real de la imagen', () => {
    test('una imagen apaisada deja margen arriba y abajo', () => {
        const r = dimensionesRenderizadas({
            anchoContenedor: 800, altoContenedor: 800,
            anchoNatural: 1000, altoNatural: 500
        });
        expect(r).toEqual({ ancho: 800, alto: 400, x: 0, y: 200, escala: 0.8 });
    });

    test('una imagen vertical deja margen a los lados', () => {
        const r = dimensionesRenderizadas({
            anchoContenedor: 800, altoContenedor: 800,
            anchoNatural: 500, altoNatural: 1000
        });
        expect(r.ancho).toBe(400);
        expect(r.alto).toBe(800);
        expect(r.x).toBe(200);
        expect(r.y).toBe(0);
    });

    test('una imagen más pequeña que el contenedor tampoco se amplía de más', () => {
        const r = dimensionesRenderizadas({
            anchoContenedor: 1000, altoContenedor: 1000,
            anchoNatural: 400, altoNatural: 400
        });
        expect(r.escala).toBe(2.5);
        expect(r.ancho).toBe(1000);
    });

    test('devuelve null mientras no haya medidas, en vez de dividir por cero', () => {
        expect(dimensionesRenderizadas(null)).toBeNull();
        expect(dimensionesRenderizadas({
            anchoContenedor: 0, altoContenedor: 0, anchoNatural: 100, altoNatural: 100
        })).toBeNull();
        expect(dimensionesRenderizadas({
            anchoContenedor: 800, altoContenedor: 800, anchoNatural: 0, altoNatural: 0
        })).toBeNull();
    });
});

describe('tamaño de proceso de los filtros', () => {
    test('reduce la dimensión mayor al máximo y conserva la proporción', () => {
        expect(tamanoDeProceso(4000, 3000, 800)).toEqual({ ancho: 800, alto: 600 });
        expect(tamanoDeProceso(3000, 4000, 800)).toEqual({ ancho: 600, alto: 800 });
    });

    test('no amplía una imagen que ya cabe', () => {
        expect(tamanoDeProceso(300, 200, 800)).toEqual({ ancho: 300, alto: 200 });
    });
});
