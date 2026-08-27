// --- NÚCLEO: HISTORIAL DE PRÁCTICA ---
// Lo que convierte una herramienta en una práctica es poder mirar atrás. Aquí se
// lleva la cuenta de cuánto se ha dibujado, cuántas referencias y cuántos días
// seguidos. Todo por día: no se guarda qué imagen era ni de dónde salió.
//
// Estas funciones no tocan IndexedDB; reciben y devuelven datos. Quien los guarda
// es app.js, y eso es lo que permite probar la racha sin abrir una base de datos.

(function (raiz) {
    'use strict';

    const UN_DIA = 24 * 60 * 60 * 1000;

    /**
     * Fecha en formato AAAA-MM-DD, en hora local. Se usa la local y no UTC porque
     * la racha es un hecho del calendario de quien dibuja: practicar a las once de
     * la noche cuenta para ese día, no para el siguiente.
     */
    function diaDe(fecha) {
        const d = fecha instanceof Date ? fecha : new Date(fecha);
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const dia = String(d.getDate()).padStart(2, '0');
        return `${d.getFullYear()}-${mes}-${dia}`;
    }

    /** Distancia en días de calendario entre dos claves AAAA-MM-DD. */
    function diasEntre(claveA, claveB) {
        const a = new Date(claveA + 'T00:00:00');
        const b = new Date(claveB + 'T00:00:00');
        return Math.round((b - a) / UN_DIA);
    }

    /**
     * Suma una pose terminada al historial. Devuelve un historial nuevo; el que se
     * recibe no se modifica.
     *
     * @param {Object} historial mapa de día -> {segundos, imagenes}
     * @param {{fecha: Date|string, segundos: number}} pose
     */
    function registrarPose(historial, pose) {
        const segundos = Math.max(0, Math.round(pose.segundos) || 0);
        if (segundos === 0) return { ...historial };

        const dia = diaDe(pose.fecha);
        const anterior = historial[dia] || { segundos: 0, imagenes: 0 };

        return {
            ...historial,
            [dia]: {
                segundos: anterior.segundos + segundos,
                imagenes: anterior.imagenes + 1
            }
        };
    }

    /**
     * Días seguidos practicando, contando hacia atrás. La racha sigue viva si se
     * practicó hoy o ayer: quien dibuja por la mañana no debería ver su racha rota
     * durante todo el día siguiente hasta que vuelva a sentarse.
     *
     * @returns {number}
     */
    function rachaDeDias(historial, hoy) {
        const claveHoy = diaDe(hoy);
        const dias = Object.keys(historial).filter((d) => historial[d].segundos > 0).sort();
        if (dias.length === 0) return 0;

        const ultimo = dias[dias.length - 1];
        const distancia = diasEntre(ultimo, claveHoy);

        if (distancia > 1) return 0;   // se rompió: hace más de un día que no se practica
        if (distancia < 0) return 0;   // fechas del futuro: no se cuentan

        let racha = 1;
        for (let i = dias.length - 1; i > 0; i--) {
            if (diasEntre(dias[i - 1], dias[i]) !== 1) break;
            racha++;
        }

        return racha;
    }

    /**
     * Lo que se enseña en el panel: hoy, el acumulado y la racha.
     * @returns {{minutosHoy, imagenesHoy, minutosTotales, imagenesTotales, rachaDias, diasActivos}}
     */
    function resumen(historial, hoy) {
        const claveHoy = diaDe(hoy);
        const deHoy = historial[claveHoy] || { segundos: 0, imagenes: 0 };

        let segundosTotales = 0;
        let imagenesTotales = 0;
        let diasActivos = 0;

        for (const dia of Object.keys(historial)) {
            const registro = historial[dia];
            if (registro.segundos <= 0) continue;
            segundosTotales += registro.segundos;
            imagenesTotales += registro.imagenes;
            diasActivos++;
        }

        return {
            minutosHoy: Math.floor(deHoy.segundos / 60),
            imagenesHoy: deHoy.imagenes,
            minutosTotales: Math.floor(segundosTotales / 60),
            imagenesTotales,
            rachaDias: rachaDeDias(historial, hoy),
            diasActivos
        };
    }

    /**
     * Recorta el historial a los últimos días, para que no crezca sin fin.
     * @param {number} [dias=400]
     */
    function podar(historial, hoy, dias = 400) {
        const claveHoy = diaDe(hoy);
        const recortado = {};

        for (const dia of Object.keys(historial)) {
            if (diasEntre(dia, claveHoy) <= dias) {
                recortado[dia] = historial[dia];
            }
        }

        return recortado;
    }

    const api = { diaDe, diasEntre, registrarPose, rachaDeDias, resumen, podar };

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    } else {
        raiz.ZenSketch = Object.assign(raiz.ZenSketch || {}, api);
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
