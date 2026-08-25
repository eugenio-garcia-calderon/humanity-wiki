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

function leer(conRed = true) {
  // Si no hay red, seguimos con lo último que tengamos. Nunca bloqueamos por eso.
  if (!conRed) {
    const local = gitSilencioso(['show', `origin/${RAMA}:${FICHERO}`]);
    if (!local) return { reservas: [], base: null, sinRed: true };
    try {
      const datos = JSON.parse(local);
      return { reservas: Array.isArray(datos.reservas) ? datos.reservas : [], base: null, sinRed: true };
    } catch { return { reservas: [], base: null, sinRed: true }; }
  }
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

/**
 * Guarda un cambio en la lista de reservas.
 *
 * ══ RECIBE UN CAMBIO, NO UNA LISTA ══════════════════════════════════════════
 * (2026-08-25.) Antes recibía la lista ya calculada, y ahí estaba el fallo que
 * se comió dos horas de dos agentes en dos días:
 *
 *   1. El agente A lee la lista y quita su reserva de un fichero.
 *   2. Mientras la calcula, el agente B —que había leído ANTES— empuja la suya.
 *   3. El push de A se rechaza. Se reintentaba releyendo **solo la base** y
 *      empujando **la misma lista de A**, calculada sobre una foto vieja.
 *   4. Resultado: lo que B acababa de guardar desaparecía. Y al revés, la
 *      reserva que A había soltado **resucitaba** — con su hora original, así
 *      que parecía que A no la había soltado nunca.
 *
 * Eso es una escritura perdida de manual, y no lo arreglaba reintentar más
 * veces: reintentar empujando lo viejo es repetir el error con más fuerza.
 *
 * Ahora recibe una FUNCIÓN que aplica el cambio, y se aplica **sobre la lista
 * recién leída en cada intento**. Si entre medias otro añadió o quitó algo, su
 * cambio sigue ahí y el nuestro se pone encima.
 *
 * Coste real medido: dos agentes bloqueados una hora cada uno creyendo que un
 * fichero estaba cogido cuando ya se había soltado — y uno de ellos estuvo a
 * punto de commitear una copia vieja del changelog encima del trabajo ajeno,
 * porque la espera envejeció su `stash`.
 */
function escribir(aplicarCambio, mensaje) {
  // Escritura atómica: si otro ha empujado mientras tanto, el push se rechaza,
  // releemos, **volvemos a aplicar el cambio sobre lo nuevo** y reintentamos.
  // Tres intentos y avisamos.
  // ══ SEIS INTENTOS Y UNA ESPERA DESIGUAL ═══════════════════════════════════
  // Con tres no llegaba: probado el 2026-08-25 con cuatro reservas a la vez,
  // una se quedaba fuera y avisaba de que no había podido. Avisar es correcto
  // —mejor eso que pisar a otro— pero el trabajo se queda sin guardar y somos
  // nueve empujando a la misma rama.
  //
  // La espera es al azar a propósito: si todos reintentaran a la vez y con el
  // mismo ritmo, volverían a chocar exactamente igual en cada vuelta.
  const esperar = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  for (let intento = 1; intento <= 6; intento++) {
    if (intento > 1) esperar(80 * intento + Math.floor(Math.random() * 250));
    const { reservas: frescas, base } = leer();
    const reservas = aplicarCambio(frescas);
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
    if (intento === 6) {
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
    // Media hora es mucho para un fichero compartido: el 2026-08-22 tres agentes
    // esperaron por reservas que su dueño ya no usaba y no recordaba tener.
    const vieja = (Date.now() - new Date(r.desde).getTime()) / 60000 > 30;
    const marca = vieja ? ' ← lleva rato, ¿sigues usándolo?' : '';
    console.log(`${r.agente.padEnd(6)} ${r.ruta}   — ${r.motivo || 'sin motivo'} (hace ${haceCuanto(r.desde)})${marca}`);
  }
  const olvidadas = reservas.filter(caducada);
  if (olvidadas.length) console.log(`\n(${olvidadas.length} reserva(s) caducada(s), ya no bloquean)`);
  process.exit(0);
}

// Lo llama el gancho de post-commit. Nunca falla ni bloquea: solo recuerda.
if (orden === 'recordar') {
  if (!yo) process.exit(0);
  // Sin `fetch`: esto corre después de CADA commit y con nueve agentes serían
  // muchas idas al remoto. Con lo último que tengamos basta para recordar.
  const { reservas } = leer(false);
  const mias = reservas.filter((r) => r.agente === yo && !caducada(r));
  if (!mias.length) process.exit(0);
  // Muerta = sobre ese fichero no te queda nada sin fusionar. Es un hecho; el
  // tiempo solo es una pista, y una reserva de dos horas puede estar viva.
  const muerta = (ruta) =>
    gitSilencioso(['diff', '--quiet', 'origin/main', '--', ruta], { timeout: 8000 }) !== null;
  const muertas = mias.filter((r) => muerta(r.ruta));
  const vivas2 = mias.filter((r) => !muertas.includes(r));
  console.log(`\n(${yo}: tienes ${mias.length} reserva(s))`);
  if (muertas.length) {
    console.log('   MUERTAS — ya fusionado, suéltalas:');
    for (const r of muertas) console.log(`     ${r.ruta}   — hace ${haceCuanto(r.desde)}`);
    console.log(`   node scripts/equipo.mjs soltar ${muertas.map((r) => r.ruta).join(' ')}`);
  }
  if (vivas2.length) {
    console.log('   en uso:');
    for (const r of vivas2) console.log(`     ${r.ruta}   — hace ${haceCuanto(r.desde)}`);
  }
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
  const crudas = i === -1 ? resto : resto.slice(0, i);
  // UN MOTIVO NO ES UN FICHERO. El 2026-08-23 alguien escribió
  // `reservar fichero "el motivo"` sin `--motivo` y quedó una reserva fantasma
  // llamada como la frase: el tablero se ensucia con ficheros que no existen y
  // el motivo real se pierde. Aquí no hay rutas con espacios, así que un
  // argumento con espacios es siempre esto.
  const conEspacios = crudas.filter((x) => /\s/.test(x));
  if (conEspacios.length) {
    console.error('Eso parece un motivo, no un fichero:');
    for (const x of conEspacios) console.error(`  «${x}»`);
    console.error('\nEl motivo va detrás de --motivo:');
    console.error(`  node scripts/equipo.mjs reservar ${crudas.filter((x) => !/\s/.test(x)).join(' ') || '<fichero>'} --motivo "${conEspacios[0]}"`);
    process.exit(1);
  }
  const rutas = relativos(crudas);
  if (!rutas.length) { console.error('Dime qué ficheros.'); process.exit(1); }
  const malos = conflictos(rutas, yo);
  if (malos.length) {
    console.error('No puedo reservarlo, ya lo tiene otro:');
    for (const c of malos) console.error(`  ${c.ruta} → ${c.agente} (${c.motivo || 'sin motivo'}, hace ${haceCuanto(c.desde)})`);
    process.exit(1);
  }
  const ahora = new Date().toISOString();
  // El cambio, no la lista: quitar mis reservas viejas de esas rutas y las
  // caducadas de cualquiera, y poner las mías nuevas. Se aplica sobre lo que
  // haya en cada intento, así que lo que otro guarde mientras tanto se queda.
  const anadirLasMias = (actuales) => {
    const vivas = actuales.filter((r) => !caducada(r) && !(r.agente === yo && rutas.some((x) => x === r.ruta)));
    for (const ruta of rutas) vivas.push({ agente: yo, ruta, motivo, desde: ahora });
    return vivas;
  };
  if (!escribir(anadirLasMias, `${yo} reserva ${rutas.join(', ')}`)) process.exit(1);
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
  if (!escribir((actuales) => actuales.filter((r) => r.agente !== quien),
    `${yo} libera las reservas de ${quien} (agente parado)`)) process.exit(1);
  console.log(`Liberadas ${soltadas} reserva(s) de ${quien}.`);
  process.exit(0);
}

if (orden === 'soltar') {
  const { reservas } = leer();
  const todo = resto.includes('--todo');
  // `--todo` a secas suelta solo las MUERTAS: el 2026-08-22 se llevó por delante
  // una reserva viva de otro trabajo en curso. Para soltarlo todo de verdad,
  // `--todo --forzar`, que ya es una decisión y no un descuido.
  const forzar = resto.includes('--forzar');
  if (todo && !forzar) {
    const muerta = (ruta) =>
      gitSilencioso(['diff', '--quiet', 'origin/main', '--', ruta], { timeout: 8000 }) !== null;
    const mias = reservas.filter((r) => r.agente === yo && !caducada(r));
    const vivas2 = mias.filter((r) => !muerta(r.ruta));
    if (vivas2.length) {
      console.log('No suelto estas, que aún tienen trabajo tuyo sin fusionar:');
      for (const r of vivas2) console.log(`   ${r.ruta}   — hace ${haceCuanto(r.desde)}`);
      console.log('Para soltarlas igualmente: soltar --todo --forzar\n');
    }
    const quedan2 = reservas.filter((r) => r.agente !== yo || vivas2.includes(r));
    const soltadas2 = reservas.length - quedan2.length;
    if (!soltadas2) { console.log('No había ninguna muerta que soltar.'); process.exit(0); }
    const rutasMuertas = quedan2.length === reservas.length ? [] :
      reservas.filter((r) => !quedan2.includes(r)).map((r) => r.ruta);
    if (!escribir((actuales) => actuales.filter((r) => r.agente !== yo || !rutasMuertas.includes(r.ruta)),
      `${yo} suelta ${soltadas2} reserva(s) muerta(s)`)) process.exit(1);
    console.log(`Soltadas ${soltadas2} reserva(s) muerta(s).`);
    process.exit(0);
  }
  const rutas = todo ? [] : relativos(resto);
  const quedan = reservas.filter((r) => {
    if (r.agente !== yo) return true;
    if (todo) return false;
    return !rutas.some((x) => x === r.ruta);
  });
  const soltadas = reservas.length - quedan.length;
  if (!soltadas) { console.log('No tenías nada de eso reservado.'); process.exit(0); }
  const soltarLasMias = (actuales) => actuales.filter((r) => {
    if (r.agente !== yo) return true;   // lo de los demás no se toca nunca
    if (todo) return false;
    return !rutas.some((x) => x === r.ruta);
  });
  if (!escribir(soltarLasMias, `${yo} suelta ${todo ? 'todo' : rutas.join(', ')}`)) process.exit(1);
  console.log(`Soltadas ${soltadas} reserva(s).`);
  process.exit(0);
}

console.log(`Uso:
  node scripts/equipo.mjs quien
  node scripts/equipo.mjs reservar <ficheros...> --motivo "para qué"
  node scripts/equipo.mjs soltar <ficheros...> | --todo
  node scripts/equipo.mjs comprobar --staged`);
process.exit(1);
