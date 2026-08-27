// --- EMPAQUETAR LA VERSIÓN DE ESCRITORIO ---
// ZenSketch-desktop/www/ era una copia a mano de la raíz. Nada impedía que se
// separaran, y la primera corrección que alguien olvidara copiar habría producido
// dos ZenSketch que se comportan distinto — con el fallo apareciendo justo en la
// demostración de escritorio.
//
// Este script hace esa copia siempre igual e inyecta el arranque de Neutralino en
// el HTML, que es lo único que de verdad diferencia a las dos versiones.
//
//     npm run empaquetar            copia y avisa de lo que cambió
//     npm run empaquetar -- --check no toca nada; falla si hay diferencias (para CI)

import { readFile, writeFile, mkdir, readdir, stat, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = path.join(RAIZ, 'ZenSketch-desktop', 'www');

// Lo que la aplicación necesita para funcionar. La documentación y las pruebas se
// quedan fuera a propósito: no se empaquetan.
const ARCHIVOS = [
    'index.html',
    'app.js',
    'styles.css',
    'manifest.webmanifest',
    'servicio.js'
];

const CARPETAS = ['src', 'assets'];

// Lo que nunca entra, aunque esté dentro de una carpeta que sí se copia
const EXCLUIDOS = new Set(['LEEME.md', 'nucleo.md']);

// Lo que vive sólo en el destino y no debe borrarse: es del framework
const PROPIOS_DEL_DESTINO = new Set(['neutralino.js', 'neutralino.d.ts', 'icon.png']);

const soloComprobar = process.argv.includes('--check');
const diferencias = [];

/** Lista recursiva de archivos de una carpeta, con rutas relativas a su raíz. */
async function listar(carpeta, base = carpeta) {
    const encontrados = [];

    for (const entrada of await readdir(carpeta)) {
        const completa = path.join(carpeta, entrada);

        if ((await stat(completa)).isDirectory()) {
            encontrados.push(...await listar(completa, base));
        } else if (!EXCLUIDOS.has(entrada)) {
            encontrados.push(path.relative(base, completa));
        }
    }

    return encontrados;
}

/**
 * El HTML de escritorio es el de la web más el cliente de Neutralino. Se inyecta
 * aquí y no se mantiene un segundo archivo, que es lo que se desincronizaba.
 */
function paraEscritorio(html) {
    const conPermisoLocal = permitirWebsocketDeNeutralino(html);

    const conCliente = conPermisoLocal.replace(
        '</head>',
        '    <!-- Cliente de Neutralinojs, añadido por herramientas/empaquetar.mjs -->\n'
        + '    <script src="neutralino.js"></script>\n'
        + '</head>'
    );

    return conCliente.replace(
        '</body>',
        '    <script>\n'
        + '        // Arranque del proceso nativo. Sólo existe dentro de la aplicación\n'
        + '        // de escritorio; en el navegador esta comprobación lo salta.\n'
        + '        if (typeof Neutralino !== \'undefined\') {\n'
        + '            Neutralino.init();\n'
        + '        }\n'
        + '    </script>\n'
        + '</body>'
    );
}

/**
 * Neutralino habla con su proceso nativo por un websocket en localhost, y la
 * política de la versión web no lo permite. Se abre aquí, y sólo aquí: la versión
 * de navegador sigue sin poder abrir ninguna conexión.
 */
function permitirWebsocketDeNeutralino(html) {
    const permitido = "connect-src 'self' blob: ws://localhost:* ws://127.0.0.1:*;";
    const original = "connect-src 'self' blob:;";

    if (!html.includes(original)) {
        throw new Error(
            'No se encontró la directiva connect-src esperada en index.html. '
            + 'Si cambió la política de seguridad, hay que actualizar empaquetar.mjs.'
        );
    }

    return html.replace(original, permitido);
}

async function escribir(rutaRelativa, contenido) {
    const destino = path.join(DESTINO, rutaRelativa);

    if (existsSync(destino)) {
        const actual = await readFile(destino);
        if (Buffer.compare(Buffer.from(contenido), actual) === 0) return;
    }

    diferencias.push(rutaRelativa);
    if (soloComprobar) return;

    await mkdir(path.dirname(destino), { recursive: true });
    await writeFile(destino, contenido);
}

async function empaquetar() {
    for (const archivo of ARCHIVOS) {
        const contenido = await readFile(path.join(RAIZ, archivo));

        if (archivo === 'index.html') {
            await escribir(archivo, paraEscritorio(contenido.toString('utf8')));
        } else {
            await escribir(archivo, contenido);
        }
    }

    for (const carpeta of CARPETAS) {
        const origen = path.join(RAIZ, carpeta);
        if (!existsSync(origen)) continue;

        for (const relativa of await listar(origen)) {
            const contenido = await readFile(path.join(origen, relativa));
            await escribir(path.join(carpeta, relativa), contenido);
        }
    }

    await limpiarSobrantes();
}

/** Borra del destino lo que ya no existe en la raíz: si no, quedan fantasmas. */
async function limpiarSobrantes() {
    if (!existsSync(DESTINO)) return;

    const esperados = new Set();
    for (const archivo of ARCHIVOS) esperados.add(archivo);
    for (const carpeta of CARPETAS) {
        const origen = path.join(RAIZ, carpeta);
        if (!existsSync(origen)) continue;
        for (const relativa of await listar(origen)) {
            esperados.add(path.join(carpeta, relativa));
        }
    }

    for (const relativa of await listar(DESTINO)) {
        const nombre = path.basename(relativa);
        if (PROPIOS_DEL_DESTINO.has(nombre)) continue;
        if (esperados.has(relativa)) continue;

        diferencias.push(`(sobra) ${relativa}`);
        if (!soloComprobar) await rm(path.join(DESTINO, relativa));
    }
}

await empaquetar();

if (diferencias.length === 0) {
    console.log('La versión de escritorio ya estaba al día.');
    process.exit(0);
}

if (soloComprobar) {
    console.error('La copia de escritorio no coincide con la raíz:');
    for (const d of diferencias) console.error('  - ' + d);
    console.error('\nEjecuta «npm run empaquetar» y confirma el resultado.');
    process.exit(1);
}

console.log(`Versión de escritorio actualizada (${diferencias.length} archivos):`);
for (const d of diferencias) console.log('  - ' + d);
