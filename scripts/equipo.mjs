#!/usr/bin/env node
// Reservas de ficheros entre los programadores de humanity.wiki.
//
// Por qué existe: el 2026-08-22 dos agentes resolvieron la misma tarea a la vez
// (uno tuvo que tirar su trabajo) y tres compartían el mismo directorio, donde un
// `git checkout .` de uno borra lo que otro no ha guardado todavía.
//
// Cómo funciona: las reservas viven en la rama `equipo/reservas` del repositorio
// remoto, en un solo fichero JSON. Reservar es un `push`: si dos lo intentan a la
// vez, git rechaza al segundo y el script se entera. No hay servidor ni base de
// datos, y funciona entre máquinas.
//
//   node scripts/equipo.mjs quien                    ver quién tiene qué
//   node scripts/equipo.mjs reservar src/App.tsx --motivo "menú lateral"
//   node scripts/equipo.mjs soltar src/App.tsx       (o --todo)
//   node scripts/equipo.mjs comprobar --staged       lo usa el gancho de commit
//
// Quién eres: el fichero `.agente` en la raíz de tu copia de trabajo (prog1,
// prog2 o prog3). No se versiona.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const RAMA = 'equipo/reservas';
const FICHERO = 'reservas.json';
const CADUCIDAD_MIN = 240; // una reserva de más de 4 h se considera olvidada

const git = (args, opts = {}) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts }).trim();
const gitSilencioso = (args, opts) => {
  try { return git(args, opts); } catch { return null; }
};

const raiz = git(['rev-parse', '--show-toplevel']);

// Quién eres lo dice DÓNDE estás, no un fichero: el 2026-08-22, a la hora de nacer
// este sistema, un agente escribió su `.agente` en las tres copias de trabajo y las
// tres decían lo mismo. La carpeta no se puede falsificar por descuido.
function porLaCarpeta() {
  // Cualquier copia de trabajo se llama como su carpeta: prog2, prog3, dashboard…
  const m = raiz.match(/\/\.claude\/worktrees\/([A-Za-z0-9_.-]+)$/);
  if (m) return m[1].toLowerCase();
  const principal = gitSilencioso(['rev-parse', '--path-format=absolute', '--git-common-dir']);
  if (principal && path.dirname(principal) === raiz) return 'prog1'; // la raíz es de prog1
  return null;
}

function quienSoy() {
  const porCarpeta = porLaCarpeta();
  const f = path.join(raiz, '.agente');
  const porFichero = existsSync(f) ? readFileSync(f, 'utf8').trim().toLowerCase() : null;
  if (porCarpeta && porFichero && porCarpeta !== porFichero) {
    console.error(`Aviso: el fichero .agente dice "${porFichero}" y esta carpeta es de ${porCarpeta}.`);
    console.error(`Mando la carpeta. Corrígelo:  echo ${porCarpeta} > ${f}`);
  }
  return porCarpeta || porFichero || null;
}

function leer() {
  // Si no hay red, seguimos con lo último que tengamos. Nunca bloqueamos por eso.
  // Con tope de tiempo: el 2026-08-22 este fetch dejó colgado un gancho de commit
  // dos minutos. Un guardia que se queda pensando bloquea más de lo que protege.
  gitSilencioso(['fetch', '-q', 'origin', `+refs/heads/${RAMA}:refs/remotes/origin/${RAMA}`], { timeout: 8000 });
  const crudo = gitSilencioso(['show', `origin/${RAMA}:${FICHERO}`]);
  if (!crudo) return { reservas: [], base: null, sinRed: true };
  const base = gitSilencioso(['rev-parse', `origin/${RAMA}`]);
  try {
    const datos = JSON.parse(crudo);
    return { reservas: Array.isArray(datos.reservas) ? datos.reservas : [], base, sinRed: false };
  } catch {
    return { reservas: [], base, sinRed: false };
  }
}

function caducada(r) {
  return (Date.now() - new Date(r.desde).getTime()) / 60000 > CADUCIDAD_MIN;
}

function escribir(reservas, mensaje) {
  // Escritura atómica: si otro ha empujado mientras tanto, el push se rechaza,
  // releemos y lo volvemos a intentar. Tres intentos y avisamos.
  for (let intento = 1; intento <= 3; intento++) {
    const { base } = leer();
    const cuerpo = JSON.stringify({ reservas }, null, 2) + '\n';
    const blob = git(['hash-object', '-w', '--stdin'], { input: cuerpo });
    const arbol = git(['mktree'], { input: `100644 blob ${blob}\t${FICHERO}\n` });
    const padres = base ? ['-p', base] : [];
    const commit = git(['commit-tree', arbol, ...padres, '-m', mensaje]);
    const empujado = gitSilencioso(['push', '-q', 'origin', `${commit}:refs/heads/${RAMA}`], { timeout: 20000 });
    if (empujado !== null) return true;
    // El push puede fallar y aun así estar ya guardado lo que queríamos (otro
    // agente empujó lo mismo, o el remoto lo aceptó y cortó la respuesta). Antes
    // de dar por perdida una liberación, comprobamos el estado de verdad.
    const { reservas: ahora } = leer();
    const igual = JSON.stringify(ahora) === JSON.stringify(reservas);
    if (igual) return true;
    if (intento === 3) {
      console.error('No he podido guardar la reserva (¿sin red, o alguien empujando a la vez?).');
      return false;
    }
  }
}

const relativos = (rutas) =>
  rutas.map((r) => path.relative(raiz, path.resolve(process.cwd(), r)).split(path.sep).join('/'));

// Una reserva cubre el fichero exacto y todo lo que cuelgue de él si es carpeta.
const choca = (a, b) => a === b || a.startsWith(b + '/') || b.startsWith(a + '/');

function haceCuanto(desde) {
  const m = Math.round((Date.now() - new Date(desde).getTime()) / 60000);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

function conflictos(rutas, yo) {
  const { reservas } = leer();
  return reservas
    .filter((r) => r.agente !== yo && !caducada(r))
    .flatMap((r) => rutas.filter((ruta) => choca(ruta, r.ruta)).map((ruta) => ({ ruta, ...r })));
}

const [, , orden, ...resto] = process.argv;
const yo = quienSoy();

if (orden === 'quien') {
  const { reservas, sinRed } = leer();
  const vivas = reservas.filter((r) => !caducada(r));
  if (sinRed) console.log('(sin acceso al remoto: puede que esto no esté al día)');
  if (!vivas.length) console.log('No hay nada reservado.');
  for (const r of vivas) {
    console.log(`${r.agente.padEnd(6)} ${r.ruta}   — ${r.motivo || 'sin motivo'} (hace ${haceCuanto(r.desde)})`);
  }
  const olvidadas = reservas.filter(caducada);
  if (olvidadas.length) console.log(`\n(${olvidadas.length} reserva(s) caducada(s), ya no bloquean)`);
  process.exit(0);
}

if (orden === 'comprobar') {
  let rutas;
  if (resto[0] === '--staged') {
    const salida = gitSilencioso(['diff', '--cached', '--name-only']);
    rutas = salida ? salida.split('\n').filter(Boolean) : [];
  } else {
    rutas = relativos(resto);
  }
  if (!rutas.length) process.exit(0);
  if (!yo) {
    console.error('Falta el fichero `.agente` en la raíz: no sé quién eres.');
    console.error('Escribe tu nombre dentro (prog1, prog2 o prog3):  echo prog1 > .agente');
    process.exit(1);
  }
  const malos = conflictos(rutas, yo);
  if (!malos.length) process.exit(0);
  console.error('\nEstos ficheros los tiene reservados otro programador:\n');
  for (const c of malos) console.error(`  ${c.ruta}  → ${c.agente} (${c.motivo || 'sin motivo'}, hace ${haceCuanto(c.desde)})`);
  console.error('\nHabla con quien lo tiene antes de tocarlo. No lo saques del commit sin decírselo.\n');
  process.exit(1);
}

if (!yo) {
  console.error('Falta el fichero `.agente` en la raíz de tu copia: escribe prog1, prog2 o prog3 dentro.');
  process.exit(1);
}

if (orden === 'reservar') {
  const i = resto.indexOf('--motivo');
  const motivo = i === -1 ? '' : resto.slice(i + 1).join(' ');
  const rutas = relativos(i === -1 ? resto : resto.slice(0, i));
  if (!rutas.length) { console.error('Dime qué ficheros.'); process.exit(1); }
  const malos = conflictos(rutas, yo);
  if (malos.length) {
    console.error('No puedo reservarlo, ya lo tiene otro:');
    for (const c of malos) console.error(`  ${c.ruta} → ${c.agente} (${c.motivo || 'sin motivo'}, hace ${haceCuanto(c.desde)})`);
    process.exit(1);
  }
  const { reservas } = leer();
  const vivas = reservas.filter((r) => !caducada(r) && !(r.agente === yo && rutas.some((x) => x === r.ruta)));
  const ahora = new Date().toISOString();
  for (const ruta of rutas) vivas.push({ agente: yo, ruta, motivo, desde: ahora });
  if (!escribir(vivas, `${yo} reserva ${rutas.join(', ')}`)) process.exit(1);
  console.log(`Reservado por ${yo}: ${rutas.join(', ')}`);
  process.exit(0);
}

// Solo para el Dashboard: soltar lo de un agente que Eugenio ha parado. Una
// reserva de un agente apagado bloquea a los vivos hasta que caduca a las 4 h.
if (orden === 'liberar') {
  const quien = (resto[0] || '').toLowerCase();
  if (!quien) { console.error('Dime de quién:  liberar prog5'); process.exit(1); }
  const { reservas } = leer();
  const quedan = reservas.filter((r) => r.agente !== quien);
  const soltadas = reservas.length - quedan.length;
  if (!soltadas) { console.log(`${quien} no tenía nada reservado.`); process.exit(0); }
  if (!escribir(quedan, `${yo} libera las reservas de ${quien} (agente parado)`)) process.exit(1);
  console.log(`Liberadas ${soltadas} reserva(s) de ${quien}.`);
  process.exit(0);
}

if (orden === 'soltar') {
  const { reservas } = leer();
  const todo = resto.includes('--todo');
  const rutas = todo ? [] : relativos(resto);
  const quedan = reservas.filter((r) => {
    if (r.agente !== yo) return true;
    if (todo) return false;
    return !rutas.some((x) => x === r.ruta);
  });
  const soltadas = reservas.length - quedan.length;
  if (!soltadas) { console.log('No tenías nada de eso reservado.'); process.exit(0); }
  if (!escribir(quedan, `${yo} suelta ${todo ? 'todo' : rutas.join(', ')}`)) process.exit(1);
  console.log(`Soltadas ${soltadas} reserva(s).`);
  process.exit(0);
}

console.log(`Uso:
  node scripts/equipo.mjs quien
  node scripts/equipo.mjs reservar <ficheros...> --motivo "para qué"
  node scripts/equipo.mjs soltar <ficheros...> | --todo
  node scripts/equipo.mjs comprobar --staged`);
process.exit(1);
