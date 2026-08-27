import js from '@eslint/js';
import globals from 'globals';

export default [
    {
        ignores: ['node_modules/**', 'ZenSketch-desktop/**', 'coverage/**']
    },

    // --- Núcleo comprobable: se carga como script clásico en el navegador y con
    // require() desde las pruebas, así que convive con los dos mundos. ---
    {
        files: ['src/nucleo/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                ...globals.browser,
                ...globals.commonjs,
                globalThis: 'readonly'
            }
        },
        rules: {
            ...js.configs.recommended.rules,
            'no-unused-vars': 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            eqeqeq: ['error', 'always'],
            'no-implicit-globals': 'error'
        }
    },

    // --- Aplicación: un único script clásico sobre el DOM. ---
    {
        files: ['app.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                ...globals.browser,
                // Cargado aparte por index.html; heic2any llega a window en caliente
                ZenSketch: 'readonly'
            }
        },
        rules: {
            ...js.configs.recommended.rules,
            'no-unused-vars': 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            eqeqeq: ['error', 'always']
        }
    },

    // --- El trabajador corre fuera del documento: su global es self. ---
    {
        files: ['src/nucleo/trabajador-imagen.js', 'servicio.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: { ...globals.worker }
        },
        rules: {
            ...js.configs.recommended.rules,
            'no-unused-vars': 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            eqeqeq: ['error', 'always'],
            // El ámbito de un trabajador ya es suyo: aquí nada se escapa a la página
            'no-implicit-globals': 'off'
        }
    },

    // --- Pruebas: módulos ES sobre Node. ---
    {
        files: ['pruebas/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: { ...globals.node }
        },
        rules: {
            ...js.configs.recommended.rules,
            'no-unused-vars': 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            eqeqeq: ['error', 'always']
        }
    }
];
