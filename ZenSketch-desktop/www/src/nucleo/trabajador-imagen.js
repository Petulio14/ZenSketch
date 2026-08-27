// --- TRABAJADOR: LOS ALGORITMOS, FUERA DEL HILO DE LA INTERFAZ ---
// Sobel sobre 800×533 son unos 22 ms. No es mucho, pero cae justo cuando aparece
// una imagen nueva, que es cuando se nota. Aquí se calcula en paralelo y el hilo
// principal sólo recibe píxeles listos para pintar.
//
// Carga el mismo src/nucleo/imagen.js que usa la página: no hay dos versiones del
// algoritmo que puedan separarse.

importScripts('imagen.js');

const nucleo = self.ZenSketch;

/** Las dos tintas del modo boceto, a partir de los píxeles en crudo. */
function boceto(datos) {
    const gris = nucleo.aLuminancia(datos.rgba);
    const { magnitud, maximo } = nucleo.sobel(gris, datos.ancho, datos.alto);

    return nucleo.capasDeBoceto(
        magnitud, maximo, datos.umbral, datos.construccion, datos.grafito
    );
}

/** Las polilíneas de las líneas de flujo. */
function flujo(datos) {
    const gris = nucleo.aLuminancia(datos.rgba);
    const { gx, gy } = nucleo.sobel(gris, datos.ancho, datos.alto);

    return { trazos: nucleo.trazosDeFlujo(gx, gy, datos.ancho, datos.alto) };
}

const TAREAS = { boceto, flujo };

self.onmessage = function (evento) {
    const { id, tarea, datos } = evento.data;

    let resultado;
    try {
        resultado = TAREAS[tarea](datos);
    } catch (error) {
        self.postMessage({ id, error: String(error && error.message ? error.message : error) });
        return;
    }

    // Los arreglos de salida viajan sin copiarse: a partir de aquí son de la
    // página, no de este trabajador.
    const transferibles = [];
    if (resultado.base) transferibles.push(resultado.base.buffer);
    if (resultado.grafito) transferibles.push(resultado.grafito.buffer);

    self.postMessage({ id, resultado }, transferibles);
};
