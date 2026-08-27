// --- NÚCLEO: ARITMÉTICA DEL TEMPORIZADOR ---
// La cuenta atrás y el anillo de progreso, sin setInterval ni DOM de por medio.

(function (raiz) {
    'use strict';

    // La pose no se mide contando ticks, sino contra el instante en que debe
    // acabar. Contar ticks acumulaba un segundo de más por pose (defecto D-01) y
    // además se desfasaba cuando el navegador frena los intervalos de una pestaña
    // que no está a la vista. Todos los instantes vienen en milisegundos, tal como
    // los da performance.now().

    /** Instante en que se acaba una pose que empieza ahora. */
    function instanteFin(ahora, duracionSegundos) {
        return ahora + (duracionSegundos * 1000);
    }

    /** Milisegundos que faltan para el final. Nunca negativo. */
    function restanteMs(fin, ahora) {
        return Math.max(0, fin - ahora);
    }

    /**
     * Segundos que muestra el reloj. Se redondea hacia arriba para que una pose
     * de 30 s enseñe «00:30» durante su primer segundo y no «00:29».
     */
    function restanteEn(fin, ahora) {
        return Math.ceil(restanteMs(fin, ahora) / 1000);
    }

    /** ¿Se acabó la pose? */
    function haTerminado(fin, ahora) {
        return restanteMs(fin, ahora) === 0;
    }

    /**
     * A los cuántos segundos suena la campana. Se obtiene recorriendo la misma
     * regla que usa el temporizador, para que no puedan separarse nunca.
     */
    function ticksHastaTerminar(duracion) {
        const fin = instanteFin(0, duracion);
        let segundos = 0;
        while (!haTerminado(fin, segundos * 1000)) {
            segundos++;
        }
        return segundos;
    }

    /**
     * Formatea segundos como MM:SS.
     * @param {number} segundos
     * @returns {string}
     */
    function formatearTiempo(segundos) {
        const seguros = Math.max(0, Math.floor(segundos));
        const minutos = Math.floor(seguros / 60).toString().padStart(2, '0');
        const resto = (seguros % 60).toString().padStart(2, '0');
        return `${minutos}:${resto}`;
    }

    /**
     * Convierte los campos «min» y «seg» del temporizador personalizado en
     * segundos totales. Devuelve null si lo introducido no es un tiempo válido,
     * que es la señal para avisar al usuario en vez de aplicar cero.
     *
     * @returns {number|null}
     */
    function duracionDesdeCampos(minutos, segundos) {
        const min = parseInt(minutos, 10) || 0;
        const seg = parseInt(segundos, 10) || 0;
        const total = (min * 60) + seg;
        return total > 0 ? total : null;
    }

    /** Fracción de tiempo que queda, entre 0 y 1. */
    function fraccionRestante(restante, duracion) {
        if (!duracion || duracion <= 0) return 0;
        return Math.min(1, Math.max(0, restante / duracion));
    }

    /** Desplazamiento del trazo del anillo SVG para esa fracción. */
    function desplazamientoAnillo(circunferencia, fraccion) {
        return circunferencia * (1 - fraccion);
    }

    /**
     * Qué debe comunicar el anillo: 'advertencia' cuando queda poco, 'pausa'
     * cuando la sesión está detenida, 'normal' el resto del tiempo.
     */
    function estadoAnillo(restante, duracion, enMarcha) {
        if (fraccionRestante(restante, duracion) <= 0.15) return 'advertencia';
        if (!enMarcha) return 'pausa';
        return 'normal';
    }

    /** ¿Toca la animación de aviso de los últimos segundos? */
    function enAvisoFinal(restante, enMarcha) {
        return enMarcha && restante <= 5 && restante > 0;
    }

    const api = {
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
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    } else {
        raiz.ZenSketch = Object.assign(raiz.ZenSketch || {}, api);
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
