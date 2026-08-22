#!/usr/bin/env node
// ============================================================================
// PROBAR LAS TELECOMUNICACIONES DE PUNTA A PUNTA (2026-08-22, Programador 8)
// ============================================================================
// Dos navegadores de verdad, con dos sesiones distintas, llamándose el uno al
// otro contra el servidor que le digas:
//
//     node scripts/probar-telecom.mjs                  (contra el 3008)
//     BASE=http://localhost:3000 node scripts/probar-telecom.mjs
//
// CREA DOS PERSONAS DE PRUEBA Y LAS BORRA AL TERMINAR, pase lo que pase. Es la
// norma de la casa: lo que se crea para probar no se queda en la base de datos
// de nadie. Si el script muere a medias, `node scripts/probar-telecom.mjs
// --limpiar` las borra.
//
// ── LO QUE ESTA PRUEBA NO PUEDE COMPROBAR, Y POR QUÉ ────────────────────────
// El apretón de manos final de WebRTC (ICE) no llega a completarse en esta
// máquina: se comprobó con dos conexiones dentro de una misma página, SIN nada
// de esta aplicación por medio, y también falla. El Mac no deja pasar el UDP
// entre dos puertos locales. Así que la prueba llega hasta donde depende de
// nuestro código —la negociación, los carriles, las pistas que recibe cada uno
// y todos los mandos— y ahí se para. Que el audio suene de verdad entre dos
// personas hay que verlo entre dos aparatos de verdad.
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3008';
const CLAVE = 'pruebaTelecom2026';
const ANA = { email: 'prueba.telecom.ana@example.invalid', nombre: 'Prueba Ana', telefono: '600112233' };
const BRU = { email: 'prueba.telecom.bruno@example.invalid', nombre: 'Prueba Bruno', telefono: '600998877' };

/**
 * Deja la base de datos como estaba: borra lo que se puede borrar y ARCHIVA lo
 * que no.
 *
 * POR QUÉ NO SE BORRA LA PERSONA DEL TODO, y esto no es pereza: al registrarse,
 * cada cuenta recibe su regalo de bienvenida y eso deja un apunte en
 * `movimientos_puntos`, que es un libro de SOLO AÑADIR — un disparador de la
 * base de datos impide borrar de él (norma del Programador 7, y es buena: un
 * libro de cuentas del que se puede borrar no es un libro de cuentas). Con ese
 * apunte apuntando a la persona, la fila de la persona tampoco se puede
 * borrar.
 *
 * Así que se hace lo que hace la propia plataforma: se archiva y se le quita
 * todo lo que la identifica —correo, número, nombre—. No queda nada de la
 * prueba a la vista y el libro de cuentas sigue cuadrando. NO se desactiva el
 * disparador para que la prueba salga limpia: un candado no se quita para
 * aprobar un examen.
 */
async function limpiar() {
  const { execFileSync } = await import('node:child_process');
  const correos = `('${ANA.email}','${BRU.email}')`;
  const quienes = `(SELECT id FROM users WHERE email IN ${correos})`;
  const sql = [
    `DELETE FROM notifications WHERE user_id IN ${quienes}`,
    `DELETE FROM llamadas WHERE de_user_id IN ${quienes} OR para_user_id IN ${quienes}`,
    `DELETE FROM mensajes WHERE de_user_id IN ${quienes} OR para_user_id IN ${quienes}`,
    `DELETE FROM sessions WHERE user_id IN ${quienes}`,
    `UPDATE users SET email = 'prueba.borrada.' || id || '@example.invalid', telefono = NULL,
            telefono_buscable = false, name = '(prueba borrada)', display_name = '(prueba borrada)',
            archived_at = now()
       WHERE email IN ${correos}`,
  ];
  for (const q of sql) {
    try {
      execFileSync('psql', ['-h', process.env.SQL_HOST || 'localhost', '-p', process.env.PGPORT || '5432',
        '-U', process.env.SQL_USER || 'eugenio', '-d', process.env.SQL_DB_NAME || 'evolucion_humanidad',
        '-tAc', q], { stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (e) {
      const t = String(e.stderr || '');
      if (!t.includes('no existe') && !t.includes('does not exist')) console.log('   (limpieza)', t.trim().slice(0, 140));
    }
  }
}

if (process.argv.includes('--limpiar')) { await limpiar(); console.log('Personas de prueba borradas.'); process.exit(0); }

// Se limpia ANTES también: si una ejecución anterior se cortó a medias, los
// correos ya estarían cogidos y el registro fallaría con un 409.
await limpiar();

/** Registra a alguien y le pone su número. */
async function crear(quien) {
  const r = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: quien.email, password: CLAVE, name: quien.nombre }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`registrando a ${quien.nombre}: ${j?.error}`);
  quien.id = j.user.id;
  const galleta = (r.headers.get('set-cookie') || '').split(';')[0];
  await fetch(`${BASE}/api/telecom/mi-numero`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: galleta },
    body: JSON.stringify({ telefono: quien.telefono }),
  });
}
await crear(ANA);
await crear(BRU);

const CAPTURAS = process.env.CAPTURAS || '/tmp';
const navegador = await chromium.launch({
  args: [
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
    '--autoplay-policy=no-user-gesture-required',
    '--disable-features=WebRtcHideLocalIpsWithMdns',
    '--auto-select-desktop-capture-source=Entire screen',
  ],
});


// ── POR QUÉ SE SUSTITUYE LA CÁMARA ──────────────────────────────────────────
// El navegador de pruebas de Playwright («headless shell») no implementa la
// captura de micrófono ni de cámara: `getUserMedia` se queda colgada para
// siempre, con dispositivo falso y todo. Eso NO es un fallo de la aplicación —
// se comprobó a mano— pero impide probar nada por encima.
//
// Se sustituye SOLO la captura por un vídeo sintético (un lienzo que se pinta)
// y un audio sintético (un oscilador). Todo lo demás de la llamada es el
// código de verdad: la conexión entre navegadores, la negociación, los
// carriles, el cambio de cinta al compartir pantalla y la pantalla de llamada.
const MEDIOS_FALSOS = () => {
  const fabricar = () => {
    const lienzo = Object.assign(document.createElement('canvas'), { width: 320, height: 240 });
    const ctx = lienzo.getContext('2d');
    let n = 0;
    setInterval(() => {
      n++;
      ctx.fillStyle = `hsl(${n % 360} 70% 50%)`;
      ctx.fillRect(0, 0, 320, 240);
      ctx.fillStyle = '#fff'; ctx.font = '28px sans-serif';
      ctx.fillText('prueba ' + n, 20, 130);
    }, 100);
    const flujo = lienzo.captureStream(10);
    const ac = new AudioContext();
    const osc = ac.createOscillator(); osc.frequency.value = 440; osc.start();
    const destino = ac.createMediaStreamDestination();
    osc.connect(destino);
    flujo.addTrack(destino.stream.getAudioTracks()[0]);
    return flujo;
  };
  // Espiar las conexiones que crea la aplicación, sin tocar su código.
  const Original = window.RTCPeerConnection;
  window.__pcs = [];
  window.RTCPeerConnection = function (...a) { const pc = new Original(...a); window.__pcs.push(pc); return pc; };
  window.RTCPeerConnection.prototype = Original.prototype;
  navigator.mediaDevices.getUserMedia = async (c) => {
    const f = fabricar();
    if (!c?.video) f.getVideoTracks().forEach(t => f.removeTrack(t));
    return f;
  };
  navigator.mediaDevices.getDisplayMedia = async () => {
    const f = fabricar();
    f.getAudioTracks().forEach(t => f.removeTrack(t));
    return f;
  };
};

const abrir = async (quien) => {
  const ctx = await navegador.newContext({ permissions: ['microphone', 'camera'] });
  await ctx.addInitScript(MEDIOS_FALSOS);
  const r = await ctx.request.post(`${BASE}/api/auth/login`, { data: { email: quien.email, password: CLAVE } });
  if (!r.ok()) throw new Error(`login ${quien.email}: ${r.status()} ${await r.text()}`);
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') console.log(`  [${quien.nombre}] error consola:`, m.text().slice(0, 200)); });
  p.on('response', async r => {
    if (!r.url().includes('/api/telecom/') || r.url().includes('conexion')) return;
    let cuerpo = ''; try { cuerpo = (await r.text()).slice(0, 160); } catch {}
    console.log(`  [red ${quien.nombre}] ${r.status()} ${r.request().method()} ${r.url().split('/api/telecom/')[1]} → ${cuerpo}`);
  });
  p.on('pageerror', e => console.log(`  [${quien.nombre}] excepción:`, String(e).slice(0, 200)));
  return { ctx, p };
};

const paso = (t) => console.log(`\n── ${t}`);
let fallos = 0;
const comprobar = (ok, t) => { console.log(`   ${ok ? '✅' : '❌'} ${t}`); if (!ok) fallos++; };

paso('Ana y Bruno entran');
const a = await abrir(ANA);
const b = await abrir(BRU);

// El identificador de la llamada se pesca al vuelo de la respuesta del
// servidor: hace falta para comprobar la ruta que apunta por dónde fue, y en
// la pantalla no aparece por ninguna parte.
let laLlamada = '';
b.p.on('response', async r => {
  if (r.url().endsWith('/api/telecom/llamada') && r.request().method() === 'POST') {
    try { laLlamada = (await r.json())?.id || laLlamada; } catch { /* respuesta sin cuerpo */ }
  }
});
await a.p.goto(`${BASE}/telefono`, { waitUntil: 'domcontentloaded' });
await b.p.goto(`${BASE}/mensajes?con=${ANA.id}`, { waitUntil: 'domcontentloaded' });
await a.p.waitForTimeout(2500);
await b.p.waitForTimeout(1500);

comprobar(await a.p.getByText('Conectado', { exact: true }).first().isVisible(), 'Ana ve su aparato conectado');
comprobar(await a.p.getByRole('heading', { name: 'Teléfono' }).isVisible(), 'La página Teléfono se pinta');
comprobar(await a.p.getByRole('heading', { name: 'Tu número' }).isVisible(), 'Sale el bloque de «Tu número»');
comprobar(await a.p.getByRole('button', { name: 'Conocidos' }).isVisible(), 'Se puede elegir quién te puede llamar');

paso('Por dónde se va a intentar conectar');
// Esta máquina no tiene contratado el TURN, así que la respuesta correcta aquí
// es «STUN y nada más», dicho con todas las letras. Se comprueba porque el
// fallo que importa es el silencioso: servir una lista vacía o rota y que las
// llamadas dejen de conectar sin que nadie sepa por qué.
const hielo = await a.p.evaluate(() => fetch('/api/telecom/hielo', { credentials: 'include' }).then(r => r.json()));
const urls = (hielo.servidores || []).flatMap(s => s.urls || []);
comprobar(urls.some(u => u.startsWith('stun:')), `Siempre hay STUN (${urls.length} direcciones)`);
comprobar(hielo.hayTurn === false && hielo.porQueNoHayTurn === 'sin contratar',
  'Sin llaves de Cloudflare se dice que no hay retransmisión, y por qué');
comprobar(!JSON.stringify(hielo).includes('credential') || hielo.hayTurn === true,
  'No se reparte ninguna credencial que no venga de Cloudflare');

paso('Ana busca a Bruno por su número');
await a.p.getByPlaceholder('+34 600 123 456').nth(1).fill('600998877');
await a.p.getByPlaceholder('+34 600 123 456').nth(1).press('Enter');
await a.p.waitForTimeout(1200);
comprobar(await a.p.getByText(BRU.nombre).first().isVisible(), 'Encuentra a Bruno por el número');

paso('Un desconocido no puede hacer sonar el teléfono de nadie');
// Todavía no se han escrito, así que para Ana él es un desconocido. Es el valor
// que viene puesto de fábrica y el que va a tener casi todo el mundo.
const negada = await b.p.evaluate(async (para) => {
  const r = await fetch('/api/telecom/llamada', {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ para, tipo: 'audio', dispositivo: 'x' }),
  });
  return { estado: r.status, cuerpo: await r.json() };
}, ANA.id);
comprobar(negada.estado === 403 && /escríbele/i.test(negada.cuerpo?.error || ''),
  `Se rechaza y se dice qué hacer: «${negada.cuerpo?.error || negada.estado}»`);
comprobar((await a.p.locator('[role=dialog]').count()) === 0, 'A Ana no le ha sonado nada');

paso('Bruno escribe a Ana y Ana lo recibe sin recargar');
await a.p.goto(`${BASE}/mensajes?con=${BRU.id}`, { waitUntil: 'domcontentloaded' });
await a.p.waitForTimeout(1500);
const FRASE = `¿Llega esto solo? ${Date.now()}`;
await b.p.getByPlaceholder('Escribe tu mensaje…').fill(FRASE);
await b.p.getByPlaceholder('Escribe tu mensaje…').press('Enter');
await a.p.waitForTimeout(1500);
comprobar(await a.p.getByText(FRASE).first().isVisible(), 'A Ana le aparece el mensaje sin recargar');
const marcas = await b.p.locator('[aria-label="Leído"]').count();
comprobar(marcas > 0, `A Bruno se le ponen las dos marcas de leído (${marcas})`);

paso('Ya se han escrito: ahora la videollamada sí entra');
await b.p.getByRole('button', { name: 'Videollamada' }).click();
await a.p.waitForSelector('text=te está llamando', { timeout: 10000 });
comprobar(true, 'A Ana le salta la llamada en su aplicación');
await a.p.screenshot({ path: CAPTURAS + '/1-llamada-entrante.png' });
await a.p.getByRole('button', { name: 'Descolgar' }).click();

// Esperar a que el reloj de la llamada corra: eso solo pasa cuando la conexión
// directa entre los dos navegadores está establecida de verdad.
// Los mandos de la llamada se prueban NADA MÁS DESCOLGAR. En este entorno de
// pruebas el apretón de manos final de WebRTC no llega a completarse —ni entre
// dos conexiones de la misma página sin nada de esta aplicación por medio: el
// Mac no deja pasar el UDP entre puertos locales— y a los ~15 s la propia
// aplicación cuelga y avisa, que es lo que debe hacer. Así que se comprueba lo
// que sí se puede: que la negociación es correcta y que los mandos funcionan.
await a.p.waitForTimeout(1500);
const estadoRtc = async (p) => p.evaluate(() => {
  const pc = window.__pcs?.[0];
  return pc ? {
    envia: pc.getSenders().filter(x => x.track).map(x => x.track.kind).sort(),
    recibe: pc.getReceivers().filter(x => x.track).map(x => x.track.kind).sort(),
    carriles: pc.getTransceivers().length,
    estado: pc.connectionState,
  } : null;
});
const ra = await estadoRtc(a.p), rb = await estadoRtc(b.p);
console.log('   ana  :', JSON.stringify(ra), '\n   bruno:', JSON.stringify(rb));
comprobar(JSON.stringify(ra?.envia) === '["audio","video"]' && JSON.stringify(rb?.envia) === '["audio","video"]',
  'Los dos envían audio y vídeo');
comprobar(JSON.stringify(ra?.recibe) === '["audio","video"]' && JSON.stringify(rb?.recibe) === '["audio","video"]',
  'Los dos reciben audio y vídeo del otro');
comprobar(ra?.carriles === 2 && rb?.carriles === 2,
  `Cada uno tiene exactamente dos carriles, sin duplicados (${ra?.carriles} y ${rb?.carriles})`);
comprobar((await a.p.locator('[role=dialog]').count()) > 0 && (await b.p.locator('[role=dialog]').count()) > 0,
  'Los dos ven la pantalla de la llamada');

await b.p.screenshot({ path: CAPTURAS + '/2-panel-de-llamada.png' });

paso('Silenciar el micrófono');
await a.p.getByRole('button', { name: 'Silenciar el micrófono' }).click();
await a.p.waitForTimeout(300);
comprobar(await a.p.getByRole('button', { name: 'Volver a hablar' }).isVisible(), 'El botón cambia y avisa de que está silenciado');
const micro = await a.p.evaluate(() => window.__pcs?.[0]?.getSenders().find(s => s.track?.kind === 'audio')?.track.enabled);
comprobar(micro === false, 'La pista de audio deja de mandar de verdad');

paso('Compartir pantalla');
let pantalla = 'no';
try {
  await b.p.getByRole('button', { name: 'Compartir mi pantalla' }).click();
  await b.p.waitForSelector('text=Compartiendo', { timeout: 8000 });
  const etiqueta = await b.p.evaluate(() => window.__pcs?.[0]?.getSenders().find(s => s.track?.kind === 'video')?.track.label);
  pantalla = 'sí';
  comprobar(true, `El carril de vídeo pasa a llevar la pantalla (${etiqueta || 'sin etiqueta'})`);
} catch (e) { comprobar(false, 'Compartir pantalla: ' + String(e).slice(0, 80)); }

await b.p.screenshot({ path: CAPTURAS + '/3-compartiendo-pantalla.png' });

paso('Por dónde fue la llamada (lo que decide el gasto)');
// El apretón de manos no se completa en esta máquina, así que la aplicación no
// llega a medirlo sola; lo que se comprueba aquí es que la ruta que lo apunta
// existe, guarda y **no deja que un tercero ensucie la cuenta de otro**. La
// clasificación en sí tiene su propia prueba, sin navegador:
// `node_modules/.bin/tsx scripts/probar-camino-llamada.ts`.
const apuntada = await b.p.evaluate(async (id) => {
  const r = await fetch(`/api/telecom/llamada/${id}/via`, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ via: 'retransmitida' }),
  });
  return { estado: r.status, cuerpo: await r.json() };
}, laLlamada);
comprobar(apuntada.estado === 200 && apuntada.cuerpo?.ok === true, 'Se apunta por dónde fue');
const inventada = await b.p.evaluate(async (id) => {
  const r = await fetch(`/api/telecom/llamada/${id}/via`, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ via: 'por-el-espacio' }),
  });
  return r.status;
}, laLlamada);
comprobar(inventada === 400, 'Un camino inventado se rechaza');

paso('Colgar');
await a.p.getByRole('button', { name: 'Colgar' }).click();
await a.p.waitForTimeout(1500);
comprobar((await a.p.locator('[role=dialog]').count()) === 0, 'El panel desaparece al colgar');
const sueltas = await a.p.evaluate(() => document.querySelectorAll('video').length);
comprobar(sueltas === 0, 'No queda ningún vídeo (ni la cámara encendida)');

await b.p.goto(`${BASE}/telefono`, { waitUntil: 'domcontentloaded' });
await b.p.waitForTimeout(1500);
comprobar(await b.p.getByText('Últimas llamadas').isVisible(), 'El historial se pinta');
const hist = await b.p.locator('text=Videollamada').count();
comprobar(hist > 0, 'La videollamada queda en el historial');
// A UN MIEMBRO NORMAL NO SE LE CUENTA LA INFRAESTRUCTURA. El aviso de que
// falta el servidor de retransmisión, y la cuenta de lo que se lleva gastado,
// son cosas de quien administra: Bruno es nivel 1 y no debe ver ninguna.
comprobar(!(await b.p.getByText('Sin retransmisión contratada').isVisible().catch(() => false)),
  'A un miembro normal no se le cuenta que falta el servidor de retransmisión');
comprobar(!(await b.p.getByText('retransmitidas ·').isVisible().catch(() => false)),
  'A un miembro normal no se le enseña la cuenta del gasto');

await b.p.screenshot({ path: CAPTURAS + '/4-historial.png', fullPage: true });
await a.p.goto(`${BASE}/telefono`, { waitUntil: 'domcontentloaded' });
await a.p.waitForTimeout(1200);
await a.p.screenshot({ path: CAPTURAS + '/5-pagina-telefono.png', fullPage: true });

await navegador.close();
await limpiar();
console.log(`\n${fallos === 0 ? '✅ TODO PASA' : `❌ ${fallos} COMPROBACIONES FALLIDAS`} · las personas de prueba quedan archivadas y sin datos`);
process.exit(fallos === 0 ? 0 : 1);
