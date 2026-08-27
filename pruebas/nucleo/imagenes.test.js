import { describe, test, expect } from 'vitest';
import imagenes from '../../src/nucleo/imagenes.js';

const { extensionDe, esImagenSoportada, filtrarImagenes, necesitaConversionHeic } = imagenes;

const archivo = (name, type = '') => ({ name, type });

describe('extensión del archivo', () => {
    test('la devuelve en minúsculas', () => {
        expect(extensionDe('Retrato.JPG')).toBe('jpg');
        expect(extensionDe('boceto.webp')).toBe('webp');
    });

    test('se queda con la última, no con la primera', () => {
        expect(extensionDe('estudio.v2.final.png')).toBe('png');
    });

    test('devuelve cadena vacía cuando no hay extensión', () => {
        expect(extensionDe('sinpunto')).toBe('');
        expect(extensionDe('.oculto')).toBe('');
        expect(extensionDe(undefined)).toBe('');
    });
});

describe('reconocimiento de imágenes', () => {
    test('acepta los formatos de la lista', () => {
        expect(esImagenSoportada(archivo('a.jpg'))).toBe(true);
        expect(esImagenSoportada(archivo('a.png'))).toBe(true);
        expect(esImagenSoportada(archivo('a.avif'))).toBe(true);
    });

    test('acepta lo que el sistema declara como imagen aunque el nombre no ayude', () => {
        expect(esImagenSoportada(archivo('captura', 'image/png'))).toBe(true);
    });

    test('rechaza los formatos que el navegador no sabe dibujar', () => {
        // Antes entraban en la sesión y se quedaban en blanco, sin avisar (D-05).
        expect(esImagenSoportada(archivo('escaneo.tiff'))).toBe(false);
        expect(esImagenSoportada(archivo('escaneo.tif'))).toBe(false);
    });

    test('mantiene BMP, que sí se dibuja sin ayuda', () => {
        expect(esImagenSoportada(archivo('captura.bmp'))).toBe(true);
    });

    test('rechaza lo que no es una imagen', () => {
        expect(esImagenSoportada(archivo('apuntes.pdf'))).toBe(false);
        expect(esImagenSoportada(archivo('notas.txt', 'text/plain'))).toBe(false);
        expect(esImagenSoportada(null)).toBe(false);
    });

    test('filtra una carpeta entera quedándose sólo con las imágenes', () => {
        const carpeta = [
            archivo('01.jpg'),
            archivo('.DS_Store'),
            archivo('leeme.txt', 'text/plain'),
            archivo('02.PNG')
        ];
        expect(filtrarImagenes(carpeta).map((f) => f.name)).toEqual(['01.jpg', '02.PNG']);
    });

    test('una carpeta sin imágenes da una lista vacía, no un error', () => {
        expect(filtrarImagenes([])).toEqual([]);
        expect(filtrarImagenes(null)).toEqual([]);
    });
});

describe('formatos de Apple', () => {
    test('detecta los que hay que convertir antes de mostrar', () => {
        expect(necesitaConversionHeic('IMG_0042.HEIC')).toBe(true);
        expect(necesitaConversionHeic('foto.heif')).toBe(true);
    });

    test('deja pasar los demás sin conversión', () => {
        expect(necesitaConversionHeic('foto.jpg')).toBe(false);
    });
});
