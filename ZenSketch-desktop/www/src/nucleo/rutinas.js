// --- NÚCLEO: RUTINAS DE SESIÓN ---
// Así es como se practica gesto de verdad: bloques encadenados que van de poses
// muy cortas a poses largas. Hasta ahora había que reconfigurar el temporizador a
// mano entre bloque y bloque, que es justo lo que rompe la concentración que la
// herramienta dice proteger.

(function (raiz) {
    'use strict';

    /**
     * Rutinas de partida. Los tiempos son los que se usan en clase de apunte:
     * el calentamiento busca soltar la mano y los bloques largos, construir.
     */
    const PREDEFINIDAS = [
        {
            id: 'calentamiento',
            nombre: 'Calentamiento',
            descripcion: 'Diez poses de 30 s para soltar la mano',
            bloques: [{ duracion: 30, repeticiones: 10 }]
        },
        {
            id: 'clasica',
            nombre: 'Sesión clásica',
            descripcion: 'De apunte rápido a estudio largo',
            bloques: [
                { duracion: 30, repeticiones: 10 },
                { duracion: 120, repeticiones: 5 },
                { duracion: 600, repeticiones: 2 }
            ]
        },
        {
            id: 'escalera',
            nombre: 'Escalera',
            descripcion: 'El tiempo se dobla en cada bloque',
            bloques: [
                { duracion: 30, repeticiones: 8 },
                { duracion: 60, repeticiones: 6 },
                { duracion: 120, repeticiones: 4 },
                { duracion: 300, repeticiones: 2 }
            ]
        },
        {
            id: 'estudio',
            nombre: 'Estudio largo',
            descripcion: 'Cuatro poses de diez minutos',
            bloques: [{ duracion: 600, repeticiones: 4 }]
        }
    ];

    /** Cuántas poses tiene la rutina en total. */
    function totalDePoses(bloques) {
        return bloques.reduce((suma, bloque) => suma + bloque.repeticiones, 0);
    }

    /** Cuánto dura entera, en segundos. */
    function duracionTotal(bloques) {
        return bloques.reduce((suma, b) => suma + b.duracion * b.repeticiones, 0);
    }

    /** Busca una rutina predefinida por su identificador. */
    function porId(id) {
        return PREDEFINIDAS.find((rutina) => rutina.id === id) || null;
    }

    /**
     * Pone una rutina en marcha. El objeto lleva la cuenta de por qué pose va y
     * qué duración toca; quien decide cuándo avanzar es el temporizador.
     *
     * @param {Array<{duracion: number, repeticiones: number}>} bloques
     */
    function crearRutina(bloques) {
        // Se descartan los bloques vacíos para que avanzar no se quede atascado
        const plan = bloques.filter((b) => b.repeticiones > 0 && b.duracion > 0);
        let posicion = 0;   // pose actual, empezando en 0

        function bloqueEn(indice) {
            let recorridas = 0;
            for (let i = 0; i < plan.length; i++) {
                if (indice < recorridas + plan[i].repeticiones) {
                    return { bloque: plan[i], indice: i, dentro: indice - recorridas };
                }
                recorridas += plan[i].repeticiones;
            }
            return null;
        }

        return {
            /** Segundos que debe durar la pose actual, o null si ya terminó. */
            duracionActual() {
                const donde = bloqueEn(posicion);
                return donde ? donde.bloque.duracion : null;
            },

            terminada() {
                return posicion >= totalDePoses(plan);
            },

            /** Pasa a la pose siguiente. Devuelve su duración, o null si acabó. */
            avanzar() {
                posicion++;
                return this.duracionActual();
            },

            /** Vuelve al principio, sin cambiar el plan. */
            reiniciar() {
                posicion = 0;
                return this.duracionActual();
            },

            /**
             * Dónde va la sesión, para poder enseñarlo.
             * @returns {{pose, totalPoses, bloque, totalBloques, dentroDelBloque,
             *            posesDelBloque, duracion, terminada}}
             */
            progreso() {
                const donde = bloqueEn(posicion);
                const total = totalDePoses(plan);

                if (!donde) {
                    return {
                        pose: total,
                        totalPoses: total,
                        bloque: plan.length,
                        totalBloques: plan.length,
                        dentroDelBloque: 0,
                        posesDelBloque: 0,
                        duracion: null,
                        terminada: true
                    };
                }

                return {
                    pose: posicion + 1,
                    totalPoses: total,
                    bloque: donde.indice + 1,
                    totalBloques: plan.length,
                    dentroDelBloque: donde.dentro + 1,
                    posesDelBloque: donde.bloque.repeticiones,
                    duracion: donde.bloque.duracion,
                    terminada: false
                };
            }
        };
    }

    const api = { PREDEFINIDAS, totalDePoses, duracionTotal, porId, crearRutina };

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    } else {
        raiz.ZenSketch = Object.assign(raiz.ZenSketch || {}, api);
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
