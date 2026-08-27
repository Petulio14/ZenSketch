// Aplica el tema guardado antes del primer pintado, para que no se vea un
// destello del tema equivocado al cargar. Va en un archivo aparte y no en línea
// para que la política de seguridad pueda prohibir todo script incrustado.
//
// A partir de aquí, la clase que deja puesta es la única fuente de verdad:
// app.js la lee en initTheme() en vez de volver a deducirla de localStorage.

(function () {
    'use strict';

    var guardado;
    try {
        guardado = localStorage.getItem('theme');
    } catch (error) {
        guardado = null;   // navegación privada o almacenamiento bloqueado
    }

    if (guardado === 'light') {
        document.body.classList.add('light-theme');
    }
})();
