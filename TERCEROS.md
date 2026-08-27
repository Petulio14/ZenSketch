# Componentes de terceros

ZenSketch se publica bajo la licencia MIT (ver [`LICENSE`](LICENSE)). Incorpora
además el trabajo de otras personas, que conserva su propia licencia y se recoge
aquí para dejar clara la atribución.

Todo lo que se lista viaja dentro del repositorio: no se pide nada a servidores
ajenos en tiempo de ejecución. Esa es justamente la razón de que estén aquí.

| Componente | Uso en ZenSketch | Licencia | Dónde vive |
|---|---|---|---|
| **Outfit** (Smartsheet Inc.) | Tipografía de toda la interfaz | SIL Open Font License 1.1 | [`assets/fuentes/`](assets/fuentes/) · [texto](assets/fuentes/LICENCIA-Outfit-OFL.txt) |
| **heic2any** (Alex Corvi) | Convierte fotos HEIC/HEIF de iPhone a JPEG | MIT | [`assets/heic2any.min.js`](assets/) · [texto](assets/LICENCIA-heic2any-MIT.txt) |
| **Neutralinojs** (Shalitha Suranga y colaboradores) | Empaqueta la versión de escritorio | MIT | [`ZenSketch-desktop/`](ZenSketch-desktop/) · [texto](ZenSketch-desktop/LICENSE) |
| **Lucide** (Lucide Icons and Contributors) | Los iconos de la interfaz, escritos como SVG dentro del marcado | ISC, con partes bajo MIT | `index.html` · [texto](assets/LICENCIA-Lucide-ISC.txt) |

## Herramientas de desarrollo

Estas no se distribuyen con la aplicación: sólo hacen falta para trabajar en ella,
y se instalan con `npm install`.

| Herramienta | Para qué | Licencia |
|---|---|---|
| **Vitest** | Ejecuta las pruebas de `src/nucleo/` | MIT |
| **ESLint** | Análisis estático de `app.js`, `src/` y `pruebas/` | MIT |
| **@fontsource/outfit** | De aquí salieron los `.woff2` de `assets/fuentes/` | MIT (la tipografía sigue bajo OFL) |

## Nota sobre los iconos

Lucide se publica bajo **ISC**, con la salvedad de que las partes heredadas de
Feather —el proyecto del que nació— siguen bajo **MIT**, a nombre de Cole Bemis.
Las dos son permisivas y sólo piden que se conserve el aviso de copyright, que es
lo que hace [`assets/LICENCIA-Lucide-ISC.txt`](assets/LICENCIA-Lucide-ISC.txt).

Los iconos no se cargan desde ninguna parte: están escritos como SVG dentro de
`index.html`, igual que el resto del marcado.

## Nota sobre `ZenSketch-desktop/LICENSE`

Ese archivo es la licencia MIT de **Neutralinojs**, con su copyright original.
Cubre el framework que empaqueta la aplicación de escritorio, **no** este proyecto.
La licencia de ZenSketch es la de la raíz del repositorio.
