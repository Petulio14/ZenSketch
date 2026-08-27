// Utilidades compartidas por las pruebas.

/**
 * Barajador determinista: devuelve los órdenes indicados, uno por llamada, y
 * vuelve a empezar al agotarlos. Permite comprobar la lógica de la playlist sin
 * depender del azar.
 *
 * @param {Array<Array<number>>} ordenes
 */
export function barajadorEnSecuencia(ordenes) {
    let llamada = 0;
    return function () {
        const orden = ordenes[llamada % ordenes.length];
        llamada++;
        return [...orden];
    };
}
