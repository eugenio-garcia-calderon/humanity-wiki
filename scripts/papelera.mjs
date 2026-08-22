#!/usr/bin/env node
// ============================================================================
// LA PAPELERA DEL CÓDIGO (2026-08-22)
// ============================================================================
// Eugenio: «procura borrar todo lo que ya no sirve para que no ocupe memoria,
// déjalo en una carpeta de papelera que dentro de 30 días se borre de forma
// definitiva, con un programa ya hecho, que no tengas tú que acordarte, y así
// podemos rescatar el código o elementos que hayas borrado».
//
// QUÉ HACE Y QUÉ NO HACE, PARA QUE NADIE SE LLEVE UNA SORPRESA:
//
//   · `mover`  saca ficheros del proyecto y los deja en `papelera/AAAA-MM-DD/`
//              conservando su ruta original dentro. Así se sabe de dónde
//              salió cada uno sin tener que adivinarlo por el nombre.
//   · `vaciar` borra de verdad las carpetas de más de 30 días. Es lo que corre
//              solo, todos los días, en GitHub (`.github/workflows/
//              vaciar-papelera.yml`): nadie tiene que acordarse.
//
// EL DÍA VA EN EL NOMBRE DE LA CARPETA, no en un fichero de registro aparte.
// Un índice que hay que mantener al día es un sitio más donde equivocarse: si
// se corrompe, la papelera deja de saber qué es viejo y qué es de ayer. El
// nombre de la carpeta no se puede desincronizar consigo mismo.
//
// Y AUNQUE SE VACÍE, NADA SE PIERDE DEL TODO: esto es un repositorio de git y
// cada movimiento queda en un commit. La papelera es para rescatar algo de un
// vistazo; el historial es la red de seguridad de debajo.
import { readdir, mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const PAPELERA = path.join(RAIZ, 'papelera');
const DIAS = 30;

const hoy = () => new Date().toISOString().slice(0, 10);

/** ¿Es una carpeta de día («2026-08-22») y de cuántos días? Devuelve `null`
 *  cuando el nombre no es una fecha: cualquier otra cosa que alguien haya
 *  dejado ahí NO se borra sola. Un vaciador que borra lo que no entiende es
 *  peor que uno que no borra nada. */
const diasDe = (nombre) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nombre)) return null;
  const t = Date.parse(`${nombre}T00:00:00Z`);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
};

async function mover(rutas) {
  if (!rutas.length) {
    console.error('Uso: node scripts/papelera.mjs mover <ruta> [<ruta>…]');
    process.exit(1);
  }
  const destinoDia = path.join(PAPELERA, hoy());
  let movidos = 0;
  for (const relativa of rutas) {
    const origen = path.resolve(RAIZ, relativa);
    if (!existsSync(origen)) { console.warn(`· no existe, se salta: ${relativa}`); continue; }
    const dentro = path.relative(RAIZ, origen);
    if (dentro.startsWith('..')) { console.warn(`· fuera del proyecto, se salta: ${relativa}`); continue; }
    const destino = path.join(destinoDia, dentro);
    await mkdir(path.dirname(destino), { recursive: true });
    await rename(origen, destino);
    console.log(`· a la papelera: ${dentro}`);
    movidos++;
  }
  if (movidos) {
    // Una nota dentro de la carpeta del día: dentro de tres semanas, «qué es
    // esto» es la primera pregunta de quien la encuentre.
    await writeFile(path.join(destinoDia, 'LEEME.md'),
      `# Papelera del ${hoy()}\n\n` +
      `${movidos} elemento(s) retirados del proyecto este día.\n\n` +
      `Se borran solos ${DIAS} días después (${new Date(Date.now() + DIAS * 86_400_000).toISOString().slice(0, 10)}).\n` +
      `Para rescatar algo, muévelo de vuelta a su ruta —está conservada dentro de esta carpeta— o búscalo en el historial de git.\n`);
  }
  console.log(`\n${movidos} elemento(s) en papelera/${hoy()}/`);
}

async function vaciar({ seco = false } = {}) {
  if (!existsSync(PAPELERA)) { console.log('No hay papelera todavía.'); return; }
  const dias = await readdir(PAPELERA);
  let borradas = 0;
  for (const nombre of dias) {
    const carpeta = path.join(PAPELERA, nombre);
    if (!(await stat(carpeta)).isDirectory()) continue;
    const edad = diasDe(nombre);
    if (edad === null) { console.log(`· "${nombre}" no es una fecha: se queda.`); continue; }
    if (edad < DIAS) { console.log(`· ${nombre}: ${edad} día(s), le quedan ${DIAS - edad}.`); continue; }
    console.log(`· ${nombre}: ${edad} día(s) — se borra${seco ? ' (simulacro)' : ''}.`);
    if (!seco) await rm(carpeta, { recursive: true, force: true });
    borradas++;
  }
  console.log(`\n${borradas} carpeta(s) ${seco ? 'se borrarían' : 'borradas'}.`);
}

const [orden, ...resto] = process.argv.slice(2);
if (orden === 'mover') await mover(resto);
else if (orden === 'vaciar') await vaciar({ seco: resto.includes('--seco') });
else {
  console.log('Órdenes: mover <rutas…> | vaciar [--seco]');
  process.exit(1);
}
