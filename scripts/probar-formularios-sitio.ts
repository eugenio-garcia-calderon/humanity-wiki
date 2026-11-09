// ============================================================================
// PRUEBA DE LOS FORMULARIOS DEL ESCAPARATE (2026-11-07, `formulariosSitio.ts`)
// ============================================================================
//   npx tsx scripts/probar-formularios-sitio.ts
//       las reglas puras: validación, freno, enlaces, correos, política de privacidad
//   PRUEBA_PG_URL=postgres://… npx tsx scripts/probar-formularios-sitio.ts
//       además, las rutas de verdad contra una base de datos DE USAR Y TIRAR (crea sus
//       tablas mínimas y aplica la migración 0175; NUNCA la de producción ni la tuya):
//       el mensaje, el alta, la doble confirmación, la baja, el panel, el CSV y los
//       correos con el proveedor de mentira (se intercepta `fetch` hacia Resend).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  validarMensaje, validarAlta, capaBasica, textoConsentimiento, responsableDe, enlaceCorreo, TEXTO_CASILLA, CAMPO_TRAMPA,
  MOTIVOS, textoMotivo,
} from '../src/components/sitio/formularios';
import { FORMAS_COLABORAR } from '../src/components/sitio/reglasPaginasEscaparate';
import { completarSitio, textoLegal } from '../src/components/sitio/sitioWeb';
import {
  Freno, huellaIp, enlacesDe, correoConfirmacion, correoAviso, correoAltaBoletin, sitioForm, registrarFormulariosSitio, huellaTestigo,
  ipVisitante, esDeCloudflare, borrarSinConfirmar,
} from '../src/server/formulariosSitio';
import { remitenteConNombre, enviarCorreo } from '../src/server/correo';

let n = 0;
const ok = async (nombre: string, f: () => void | Promise<void>) => { await f(); n++; console.log(`  ✓ ${nombre}`); };

const CFG = {
  escaparate: true,
  pie: { nombre: 'Sitio de Prueba', contacto: { email: 'contacto@ejemplo.org' }, fondo: '#0f172a' },
  titular: { nombre: 'Asociación de Prueba', nif: 'G00000000', domicilio: 'Calle Falsa 1, Madrid' },
  seo: { organizacion: 'Prueba' },
};

console.log('Reglas');
await ok('un mensaje bien escrito pasa, limpio', () => {
  const v = validarMensaje({ nombre: '  Ana   García ', email: ' ana@ejemplo.org ', motivo: 'voluntariado', proyecto: 'Luz-Para-Kenia', mensaje: 'Hola,\r\n\r\n\r\n\r\n\r\nquiero ayudar.  ', consentimiento: true }, ['luz-para-kenia']);
  assert.ok('datos' in v);
  assert.deepEqual(v.datos, { nombre: 'Ana García', email: 'ana@ejemplo.org', motivo: 'voluntariado', proyecto: 'luz-para-kenia', mensaje: 'Hola,\n\n\nquiero ayudar.' });
});
await ok('cada campo dice qué le falta, en español', () => {
  const v = validarMensaje({ nombre: 'A', email: 'ana@', motivo: 'spam', proyecto: 'no-existe', mensaje: 'corto', consentimiento: false }, ['luz-para-kenia']);
  assert.ok('errores' in v);
  assert.deepEqual(Object.keys(v.errores).sort(), ['consentimiento', 'email', 'mensaje', 'motivo', 'nombre', 'proyecto']);
  assert.match(v.errores.email, /nombre@dominio\.org/);
});
await ok('el proyecto se comprueba por su forma aunque no haya lista; demasiados enlaces no pasan', () => {
  assert.ok('errores' in validarMensaje({ nombre: 'Ana', email: 'a@b.es', motivo: 'otro', proyecto: '../../etc', mensaje: 'Un mensaje normal.', consentimiento: 'on' }, null));
  assert.ok('datos' in validarMensaje({ nombre: 'Ana', email: 'a@b.es', motivo: 'otro', proyecto: 'cualquiera', mensaje: 'Un mensaje normal.', consentimiento: 'on' }, null));
  const spam = Array.from({ length: 6 }, (_, i) => `https://x${i}.com`).join(' ');
  const v = validarMensaje({ nombre: 'Ana', email: 'a@b.es', motivo: 'otro', mensaje: spam, consentimiento: true });
  assert.ok('errores' in v && /enlaces/.test(v.errores.mensaje));
});
await ok('el alta normaliza el correo y exige la casilla', () => {
  assert.deepEqual(validarAlta({ email: ' Ana@Ejemplo.ORG ', consentimiento: 'on' }), { email: 'ana@ejemplo.org' });
  const v = validarAlta({ email: 'ana@ejemplo.org' });
  assert.ok('errores' in v && v.errores.consentimiento);
  assert.ok('errores' in validarAlta({ email: 'no es un correo', consentimiento: true }));
});
await ok('la capa básica y el consentimiento nombran al responsable, la finalidad, la base y la transferencia', () => {
  const t = textoConsentimiento('boletin', 'Asociación de Prueba');
  assert.ok(t.startsWith(`${TEXTO_CASILLA}. Responsable: Asociación de Prueba. Finalidad: enviarte el boletín. Legitimación: tu consentimiento.`));
  assert.match(t, /Destinatarios: no se ceden datos a terceros, salvo obligación legal; un proveedor técnico puede tratarlos en EE\. UU\. con garantías adecuadas\./);
  assert.match(capaBasica('mensaje', 'X'), /responder a tu mensaje/);
  assert.equal(responsableDe(CFG), 'Asociación de Prueba');
  assert.equal(responsableDe({ seo: { organizacion: 'Org' } }), 'Org');
});
await ok('el enlace de «Responder» no se puede torcer con la dirección', () => {
  assert.equal(enlaceCorreo('ana@ejemplo.org', 'Tu mensaje a X'), 'mailto:ana@ejemplo.org?subject=Tu%20mensaje%20a%20X');
  const raro = 'a?cc=x%40otro.com&b=@ejemplo.org';
  assert.ok('datos' in validarMensaje({ nombre: 'Ana', email: raro, motivo: 'otro', mensaje: 'Un mensaje normal.', consentimiento: true }), 'la expresión lo admite');
  const l = enlaceCorreo(raro, 'Hola');
  assert.equal(l, 'mailto:a%3Fcc%3Dx%2540otro.com%26b%3D@ejemplo.org?subject=Hola');
  assert.equal(new URL(l).searchParams.get('cc'), null, 'ninguna copia escondida');
});

console.log('Freno y huellas');
await ok('el freno deja pasar max golpes por ventana y dice cuánto falta', () => {
  const f = new Freno(2, 10_000);
  assert.equal(f.pasar('a', 0), 0);
  assert.equal(f.pasar('a', 1000), 0);
  assert.equal(f.pasar('a', 2000), 8);
  assert.equal(f.pasar('b', 2000), 0, 'otra clave no comparte freno');
  assert.equal(f.pasar('a', 10_001), 0, 'pasada la ventana, vuelve a dejar');
});
await ok('el freno no crece sin medida', () => {
  const f = new Freno(1, 1000, 100);
  for (let i = 0; i < 250; i++) f.pasar(`k${i}`, i * 10);
  assert.ok((f as any).golpes.size <= 101);
});
await ok('la huella de la IP es estable, corta y no contiene la IP', () => {
  const h = huellaIp('203.0.113.7');
  assert.equal(h, huellaIp('203.0.113.7'));
  assert.notEqual(h, huellaIp('203.0.113.8'));
  assert.ok(!h.includes('203') && h.length === 22);
});
await ok('la IP de quien envía: CF-Connecting-IP sólo cuenta si la conexión viene de Cloudflare', () => {
  const req = (h: Record<string, string>, remota = '172.18.0.5') => ({ headers: h, socket: { remoteAddress: remota } }) as any;
  // Un dominio propio: Caddy pone la conexión en X-Forwarded-For y la cabecera de Cloudflare la escribe quien llama.
  assert.equal(ipVisitante(req({ 'x-forwarded-for': '203.0.113.5', 'cf-connecting-ip': '1.2.3.4', 'x-forwarded-host': 'luzhumanidad.com' })), '203.0.113.5');
  // Lo mismo llamando directamente al servidor con `Host: humanity.wiki`.
  assert.equal(ipVisitante(req({ 'x-forwarded-for': '203.0.113.5', 'cf-connecting-ip': '1.2.3.4', 'x-forwarded-host': 'humanity.wiki' })), '203.0.113.5');
  // humanity.wiki de verdad, por Cloudflare (IPv4 e IPv6): quien visita es CF-Connecting-IP.
  assert.equal(ipVisitante(req({ 'x-forwarded-for': '162.158.10.20', 'cf-connecting-ip': '198.51.100.7' })), '198.51.100.7');
  assert.equal(ipVisitante(req({ 'x-forwarded-for': '2a06:98c0:3600::103', 'cf-connecting-ip': '2001:db8::1' })), '2001:db8::1');
  // Con `trusted_proxies` Caddy AÑADE la conexión al final: manda el último valor, no el primero.
  assert.equal(ipVisitante(req({ 'x-forwarded-for': '9.9.9.9, 162.158.10.20', 'cf-connecting-ip': '198.51.100.7' })), '198.51.100.7');
  assert.equal(ipVisitante(req({ 'x-forwarded-for': '162.158.10.20, 203.0.113.5', 'cf-connecting-ip': '1.2.3.4' })), '203.0.113.5', 'un rango de Cloudflare escrito por quien llama no cuenta');
  // Cloudflare sin CF-Connecting-IP válida: la conexión. Sin Caddy delante: el socket.
  assert.equal(ipVisitante(req({ 'x-forwarded-for': '162.158.10.20', 'cf-connecting-ip': 'basura' })), '162.158.10.20');
  assert.equal(ipVisitante(req({}, '::ffff:192.0.2.9')), '192.0.2.9');
  assert.ok(esDeCloudflare('104.16.1.1') && esDeCloudflare('2606:4700::6810:1') && !esDeCloudflare('37.27.244.35') && !esDeCloudflare('no-es-ip'));
});

console.log('Enlaces y correos');
await ok('los enlaces llevan el testigo detrás de #, y la baja en un clic va a la API', () => {
  const l = enlacesDe('https://luzhumanidad.com', 'KWR', 'C'.repeat(43), 'B'.repeat(43));
  assert.equal(l.confirmar, `https://luzhumanidad.com/#boletin-confirmar=${'C'.repeat(43)}`);
  assert.equal(l.baja, `https://luzhumanidad.com/#boletin-baja=${'B'.repeat(43)}`);
  assert.equal(l.bajaDirecta, `https://luzhumanidad.com/api/sitio/KWR/boletin/baja?t=${'B'.repeat(43)}`);
  const casa = enlacesDe('https://humanity.wiki/@luz/portada/', 'KWR', null, 'B'.repeat(43));
  assert.equal(casa.baja, `https://humanity.wiki/@luz/portada#boletin-baja=${'B'.repeat(43)}`);
  assert.equal(casa.bajaDirecta, `https://humanity.wiki/api/sitio/KWR/boletin/baja?t=${'B'.repeat(43)}`);
});
await ok('el remitente lleva el nombre del sitio y la dirección verificada', () => {
  assert.equal(remitenteConNombre('Luz & Humanidad'), '"Luz & Humanidad" <avisos@humanity.wiki>');
  assert.equal(remitenteConNombre('Mal "nombre" <x>\n'), '"Mal nombre x" <avisos@humanity.wiki>');
});
await ok('el correo de confirmar escapa lo que no es nuestro, lleva la baja y avisa del plazo', () => {
  const s = sitioForm('KWR', 'Portada', { ...CFG, pie: { ...CFG.pie, nombre: 'Sitio <b>raro</b>' } });
  const c = correoConfirmacion(s, 'ana@ejemplo.org', enlacesDe('https://x.org', 'KWR', 'C'.repeat(43), 'B'.repeat(43)));
  assert.ok(!c.html.includes('<b>raro</b>') && c.html.includes('Sitio &lt;b&gt;raro&lt;/b&gt;'));
  assert.ok(c.texto.includes('#boletin-baja=') && c.html.includes('#boletin-baja='));
  assert.match(c.asunto, /Confirma tu suscripción/);
  assert.ok(c.texto.includes('en 30 días borraremos esta dirección') && c.html.includes('en 30 días borraremos esta dirección'));
});
await ok('el aviso a quien administra escapa el mensaje de quien escribe', () => {
  const s = sitioForm('KWR', 'Portada', CFG);
  const c = correoAviso(s, { nombre: 'Eve', email: 'eve@x.org', motivo: 'prensa', proyecto: null, mensaje: '<img src=x onerror=alert(1)>', origen: '/x' }, 'https://humanity.wiki/paginas/KWR/formularios');
  assert.ok(!c.html.includes('<img src=x') && c.html.includes('&lt;img src=x'));
  assert.match(c.asunto, /Prensa · Eve/);
});

await ok('cada alta confirmada avisa a administración con el correo de quien se suscribe', () => {
  const s = sitioForm('KWR', 'Portada', CFG);
  const c = correoAltaBoletin(s, 'nueva@x.org', 'https://humanity.wiki/paginas/KWR/formularios');
  assert.equal(c.asunto, 'Nueva suscripción al boletín de Sitio de Prueba: nueva@x.org');
  assert.ok(c.texto.includes('Correo: nueva@x.org') && c.html.includes('nueva@x.org'));
});
await ok('«Trabaja con nosotros» sustituye a la donación en la página Colabora; el formulario la conoce', () => {
  const ids = FORMAS_COLABORAR.map(f => f.motivo);
  assert.ok(!ids.includes('donacion' as any), 'la tarjeta de donación ya no está en Colabora');
  assert.ok(ids.includes('trabajo'), 'la tarjeta de trabajo sí');
  assert.equal(textoMotivo('trabajo'), 'Trabaja con nosotros');
  assert.equal(textoMotivo('donacion'), 'Donación', 'los mensajes viejos conservan su etiqueta');
  assert.ok(MOTIVOS.some(m => m.id === 'trabajo'));
  assert.ok(!MOTIVOS.some(m => (m.id as string) === 'donacion'), 'el formulario ya no ofrece donar');
});

console.log('Política de privacidad');
await ok('el escaparate explica sus dos formularios, con base, plazo, baja y quién más los ve', () => {
  const t = textoLegal('privacidad', completarSitio(CFG), 'Sitio de Prueba');
  for (const x of ['Asociación de Prueba («Prueba»), con NIF/CIF G00000000', '## Si nos escribes para colaborar', '## Si te suscribes al boletín',
    'art. 6.1.a del RGPD', 'al darte de baja, borramos tu dirección', 'Antes de enviarte ninguno te pedimos que confirmes', 'www.aepd.es',
    'tu correo, la página desde la que te suscribes,', 'Si no confirmas la suscripción en los 30 días siguientes al correo de confirmación',
    'Para contar las visitas no usamos cookies ni guardamos tu IP', '**Cloudflare, Inc.**', 'Marco de Privacidad de Datos UE-EE. UU.',
    'Decisión de Ejecución (UE) 2023/1795', 'en servidores de la Unión Europea']) {
    assert.ok(t.includes(x), `falta: ${x}`);
  }
  assert.ok(!t.includes('Si te creas una cuenta'), 'un escaparate no tiene cuentas');
  // El lector de textos legales (`TextoSencillo`) sólo hace lista de un bloque en el que TODAS las líneas son «- ».
  const bloque = t.split(/\n{2,}/).find(b => b.includes('Cloudflare'))!;
  assert.ok(bloque.split('\n').every(l => l.startsWith('- ')), 'los encargados, en una lista');
});
await ok('los demás sitios conservan su plantilla', () => {
  const t = textoLegal('privacidad', completarSitio({ titular: { nombre: 'Tienda' } }), 'Tienda');
  assert.ok(t.includes('Si te creas una cuenta') && !t.includes('boletín'));
});
await ok('completarSitio conserva lo que no es del menú ni del pie', () => {
  const s: any = completarSitio({ ...CFG, proyectos: 'BDT1', vistas: ['proyectos'] });
  assert.equal(s.escaparate, true);
  assert.equal(s.proyectos, 'BDT1');
  assert.deepEqual(s.vistas, ['proyectos']);
  assert.equal(s.menu.activo, true);
});

// ── CON BASE DE DATOS (de usar y tirar) ─────────────────────────────────────
const URL_PG = process.env.PRUEBA_PG_URL;
if (!URL_PG) {
  console.log(`\n${n} comprobaciones. Sin PRUEBA_PG_URL: no se prueban las rutas contra una base de datos.`);
  process.exit(0);
}
if (/37\.27\.244\.35|humanity-wiki-db|:5432\b/.test(URL_PG)) throw new Error('Esto borra y crea tablas: usa una base de datos de usar y tirar, nunca la de producción ni la tuya (5432).');

const express = (await import('express')).default;
const pg = (await import('pg')).default;
const { drizzle } = await import('drizzle-orm/node-postgres');
const pool = new pg.Pool({ connectionString: URL_PG, max: 4 });
const db = drizzle(pool);
const q = async (texto: string, valores: any[] = []) => (await pool.query(texto, valores)).rows;

await q(`DROP TABLE IF EXISTS sitio_mensajes, sitio_suscriptores, dominios_paginas, knowledge_windows, users CASCADE`);
await q(`CREATE TABLE users (id text PRIMARY KEY, handle text)`);
await q(`CREATE TABLE knowledge_windows (id text PRIMARY KEY, title text, kind text, config jsonb DEFAULT '{}', creator_user_id text, publico boolean DEFAULT true, slug text, deleted_at timestamp, archived_at timestamp)`);
await q(`CREATE TABLE dominios_paginas (id text PRIMARY KEY, dominio text, entidad_tipo text, entidad_id text, estado text, redirigir_a text, created_at timestamp DEFAULT now())`);
await q(fs.readFileSync(path.join(import.meta.dirname, '../drizzle/0175_formularios_sitio.sql'), 'utf8'));
await q(`INSERT INTO users VALUES ('U_DUENO', 'dueno')`);
await q(`INSERT INTO knowledge_windows (id, title, kind, config, creator_user_id, slug) VALUES
  ('KWR', 'Portada', 'pagina', $1, 'U_DUENO', 'portada'),
  ('KWOTRA', 'Otra', 'pagina', $1, 'U_DUENO', 'otra'),
  ('KWNO', 'Normal', 'pagina', '{"sitio":{"pie":{}}}', 'U_DUENO', 'normal'),
  ('KWPRIV', 'Privada', 'pagina', $1, 'U_DUENO', 'privada')`, [JSON.stringify({ sitio: CFG })]);
await q(`UPDATE knowledge_windows SET publico = false WHERE id = 'KWPRIV'`);
await q(`INSERT INTO dominios_paginas (id, dominio, entidad_tipo, entidad_id, estado) VALUES ('D1', 'prueba.ejemplo.org', 'pagina', 'KWR', 'activo')`);

// El proveedor de correo, de mentira: se apunta lo que se le pide y contesta lo que toque.
const fetchReal = globalThis.fetch;
const correos: any[] = [];
let estadoProveedor = 200;
globalThis.fetch = (async (url: any, init?: any) => {
  if (String(url).startsWith('https://api.resend.com/')) {
    correos.push({ ...JSON.parse(init.body), autorizacion: init.headers?.Authorization });
    return new Response('{"id":"x"}', { status: estadoProveedor });
  }
  return fetchReal(url, init);
}) as typeof fetch;
const conCorreo = (si: boolean) => { if (si) process.env.RESEND_API_KEY = 'prueba'; else delete process.env.RESEND_API_KEY; };
conCorreo(false);

const app = express();
app.use(express.json());
app.use((req: any, _res, next) => { const u = req.headers['x-usuario']; if (u) req.user = { id: String(u), roleLevel: 1 }; next(); });
registrarFormulariosSitio(app as any, db, {
  proyectos: async () => [{ area: 'Energía', proyectos: [{ slug: 'luz-para-kenia', titulo: 'Luz para Kenia' }] }],
  gestiona: async (req: any) => !req.user ? { ok: false, codigo: 401, error: 'Inicia sesión.' }
    : req.user.id === 'U_DUENO' ? { ok: true } : { ok: false, codigo: 403, error: 'No.' },
});
const servidor = app.listen(0);
await new Promise(r => servidor.once('listening', r));
const B = `http://127.0.0.1:${(servidor.address() as any).port}`;
let ipN = 1;
const otraIp = () => `198.51.100.${ipN++}`;
// Como llega a la aplicación desde un dominio propio: Caddy pone la conexión en X-Forwarded-For.
const post = (ruta: string, cuerpo: any, h: Record<string, string> = {}) => {
  const { ip, ...resto } = h;
  return fetchReal(B + ruta, {
    method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip || '192.0.2.1', ...resto }, body: JSON.stringify(cuerpo),
  });
};
const MENSAJE = { nombre: 'Ana García', email: 'ana@ejemplo.org', motivo: 'voluntariado', proyecto: 'luz-para-kenia', mensaje: 'Quiero echar una mano los fines de semana.', consentimiento: true, tiempo: 5000, origen: '/luz-para-kenia' };
const ALTA = (email: string) => ({ email, consentimiento: true, tiempo: 4000, origen: '/' });
const espera = (ms: number) => new Promise(r => setTimeout(r, ms));

try {
  console.log('Rutas públicas');
  await ok('la lista de proyectos y el responsable; nada fuera de un escaparate publicado', async () => {
    const r = await fetchReal(`${B}/api/sitio/KWR/formulario`);
    const j = await r.json();
    assert.equal(r.status, 200);
    assert.equal(j.responsable, 'Asociación de Prueba');
    assert.equal(j.secciones[0].proyectos[0].slug, 'luz-para-kenia');
    assert.equal((await fetchReal(`${B}/api/sitio/KWNO/formulario`)).status, 404);
    assert.equal((await fetchReal(`${B}/api/sitio/KWPRIV/formulario`)).status, 404);
    assert.equal((await post('/api/sitio/KWNO/mensaje', MENSAJE)).status, 404);
  });
  await ok('un mensaje se guarda con el consentimiento escrito por el servidor, sin IP', async () => {
    const r = await post('/api/sitio/KWR/mensaje', { ...MENSAJE, consentimiento_texto: 'me lo invento' }, { ip: otraIp() });
    assert.equal(r.status, 200);
    const [m] = await q(`SELECT * FROM sitio_mensajes WHERE raiz_id = 'KWR'`);
    assert.equal(m.nombre, 'Ana García');
    assert.equal(m.proyecto_titulo, 'Luz para Kenia');
    assert.equal(m.origen, '/luz-para-kenia');
    assert.equal(m.estado, 'nuevo');
    assert.equal(m.aviso_enviado_at, null, 'sin proveedor no sale ningún aviso');
    assert.equal(m.consentimiento_texto, textoConsentimiento('mensaje', 'Asociación de Prueba'));
    assert.ok(!JSON.stringify(m).includes('198.51.100'), 'la IP no se guarda');
    assert.equal(correos.length, 0);
  });
  await ok('el campo trampa finge que ha ido bien y no guarda nada', async () => {
    const r = await post('/api/sitio/KWR/mensaje', { ...MENSAJE, [CAMPO_TRAMPA]: 'http://spam' }, { ip: otraIp() });
    assert.equal(r.status, 200);
    assert.equal((await q(`SELECT count(*)::int AS n FROM sitio_mensajes`))[0].n, 1);
  });
  await ok('demasiado rápido, sin tiempo, campos mal o desde otra web: no se guarda', async () => {
    const rapido = await post('/api/sitio/KWR/mensaje', { ...MENSAJE, tiempo: 400 }, { ip: otraIp() });
    assert.equal(rapido.status, 400);
    assert.equal((await rapido.json()).codigo, 'rapido');
    const { tiempo, ...sinTiempo } = MENSAJE; void tiempo;
    assert.equal((await post('/api/sitio/KWR/mensaje', sinTiempo, { ip: otraIp() })).status, 400);
    const mal = await post('/api/sitio/KWR/mensaje', { ...MENSAJE, email: 'x', proyecto: 'no-existe', consentimiento: false }, { ip: otraIp() });
    const j = await mal.json();
    assert.equal(mal.status, 400);
    assert.deepEqual(Object.keys(j.campos).sort(), ['consentimiento', 'email', 'proyecto']);
    assert.equal((await post('/api/sitio/KWR/mensaje', MENSAJE, { ip: otraIp(), Origin: 'https://otra.web' })).status, 403);
    assert.equal((await post('/api/sitio/KWR/mensaje', MENSAJE, { ip: otraIp(), Origin: B })).status, 200, 'desde la propia web, sí');
    assert.equal((await q(`SELECT count(*)::int AS n FROM sitio_mensajes`))[0].n, 2);
  });
  await ok('el freno: diez mensajes cada diez minutos por conexión, y después 429 con Retry-After y sin culpar a nadie', async () => {
    const ip = otraIp();
    for (let i = 0; i < 10; i++) assert.equal((await post('/api/sitio/KWR/mensaje', MENSAJE, { ip })).status, 200);
    const r = await post('/api/sitio/KWR/mensaje', MENSAJE, { ip });
    assert.equal(r.status, 429);
    assert.ok(Number(r.headers.get('retry-after')) > 0);
    assert.equal((await r.json()).error, 'Ahora llegan muchos envíos desde tu conexión. Prueba dentro de unos minutos.');
    assert.equal((await post('/api/sitio/KWR/mensaje', MENSAJE, { ip: otraIp() })).status, 200, 'otra IP no comparte freno');
  });
  await ok('en un dominio propio, cambiar CF-Connecting-IP no salta el freno', async () => {
    const ip = otraIp();
    const codigos: number[] = [];
    for (let i = 0; i < 15; i++) {
      codigos.push((await post('/api/sitio/KWR/mensaje', MENSAJE, { ip, 'x-forwarded-host': 'prueba.ejemplo.org', 'cf-connecting-ip': `203.0.113.${i + 1}` })).status);
    }
    assert.deepEqual(codigos, [...Array(10).fill(200), ...Array(5).fill(429)]);
  });
  await ok('por Cloudflare, cada visitante es su CF-Connecting-IP (no todos el mismo nodo de Cloudflare)', async () => {
    const codigos: number[] = [];
    for (let i = 0; i < 12; i++) {
      codigos.push((await post('/api/sitio/KWR/mensaje', MENSAJE, { ip: '162.158.10.20', 'x-forwarded-host': 'humanity.wiki', 'cf-connecting-ip': `192.0.2.${100 + i}` })).status);
    }
    assert.ok(codigos.every(c => c === 200), String(codigos));
  });

  console.log('Boletín sin proveedor de correo');
  await ok('el alta queda pendiente, sin correo y sin decir que se ha mandado nada', async () => {
    const r = await post('/api/sitio/KWR/boletin', ALTA(' Luis@Ejemplo.org '), { ip: otraIp() });
    assert.deepEqual(await r.json(), { ok: true, resultado: 'guardado' });
    const [s] = await q(`SELECT * FROM sitio_suscriptores WHERE email = 'luis@ejemplo.org'`);
    assert.equal(s.estado, 'pendiente');
    assert.equal(s.correo_enviado_at, null);
    assert.equal(s.token_confirmar, null);
    assert.match(s.token_baja, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(s.consentimiento_texto, textoConsentimiento('boletin', 'Asociación de Prueba'));
    assert.equal(correos.length, 0);
  });
  await ok('apuntarse dos veces no duplica', async () => {
    await post('/api/sitio/KWR/boletin', ALTA('luis@ejemplo.org'), { ip: otraIp() });
    assert.equal((await q(`SELECT count(*)::int AS n FROM sitio_suscriptores WHERE email = 'luis@ejemplo.org'`))[0].n, 1);
  });
  await ok('sin JavaScript: un POST de formulario vuelve a la página con el resultado detrás de #', async () => {
    const r = await fetchReal(`${B}/api/sitio/KWR/boletin`, {
      method: 'POST', redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-forwarded-for': otraIp(), Referer: `${B}/luz-para-kenia?a=1#x` },
      body: new URLSearchParams({ email: 'sinjs@ejemplo.org', consentimiento: 'on', inicio: String(Date.now() - 5000) }).toString(),
    });
    assert.equal(r.status, 303);
    assert.equal(r.headers.get('location'), '/luz-para-kenia#boletin-resultado=guardado');
    assert.equal((await q(`SELECT count(*)::int AS n FROM sitio_suscriptores WHERE email = 'sinjs@ejemplo.org'`))[0].n, 1);
    const otra = await fetchReal(`${B}/api/sitio/KWR/boletin`, {
      method: 'POST', redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-forwarded-for': otraIp(), Referer: 'https://otra.web/trampa' },
      body: new URLSearchParams({ email: 'x@ejemplo.org', inicio: String(Date.now() - 5000) }).toString(),
    });
    assert.equal(otra.headers.get('location'), '/#boletin-resultado=error', 'nunca de vuelta a otra web');
    // `//luz-para-kenia` también pinta la página; de vuelta, con UNA barra (con dos, el navegador iría a otro dominio).
    const dobles = await fetchReal(`${B}/api/sitio/KWR/boletin`, {
      method: 'POST', redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-forwarded-for': otraIp(), Referer: `${B}//luz-para-kenia` },
      body: new URLSearchParams({ email: 'sinjs@ejemplo.org', consentimiento: 'on', inicio: String(Date.now() - 5000) }).toString(),
    });
    assert.equal(dobles.headers.get('location'), '/luz-para-kenia#boletin-resultado=guardado');
  });

  console.log('Boletín con proveedor de correo (de mentira)');
  conCorreo(true);
  let tokenConfirmar = '', tokenBaja = '';
  await ok('el alta manda el correo de confirmar, con el nombre del sitio, la baja y List-Unsubscribe', async () => {
    const r = await post('/api/sitio/KWR/boletin', ALTA('marta@ejemplo.org'), { ip: otraIp(), 'x-forwarded-host': 'evil.example' });
    assert.deepEqual(await r.json(), { ok: true, resultado: 'enviado' });
    assert.equal(correos.length, 1);
    const c = correos[0];
    assert.equal(c.from, '"Sitio de Prueba" <avisos@humanity.wiki>');
    assert.deepEqual(c.to, ['marta@ejemplo.org']);
    assert.match(c.subject, /Confirma tu suscripción al boletín de Sitio de Prueba/);
    tokenConfirmar = /prueba\.ejemplo\.org\/#boletin-confirmar=([A-Za-z0-9_-]+)/.exec(c.text)![1];
    tokenBaja = /prueba\.ejemplo\.org\/#boletin-baja=([A-Za-z0-9_-]+)/.exec(c.text)![1];
    assert.ok(!c.text.includes('evil.example'), 'la cabecera Host no decide adónde llevan los enlaces');
    assert.equal(c.headers['List-Unsubscribe'], `<https://prueba.ejemplo.org/api/sitio/KWR/boletin/baja?t=${tokenBaja}>`);
    assert.equal(c.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
    const [s] = await q(`SELECT * FROM sitio_suscriptores WHERE email = 'marta@ejemplo.org'`);
    assert.equal(s.token_confirmar, huellaTestigo(tokenConfirmar), 'se guarda la huella, no el testigo');
    assert.ok(s.correo_enviado_at);
  });
  await ok('pedirlo otra vez enseguida no manda otro correo', async () => {
    const r = await post('/api/sitio/KWR/boletin', ALTA('marta@ejemplo.org'), { ip: otraIp() });
    assert.deepEqual(await r.json(), { ok: true, resultado: 'reciente' });
    assert.equal(correos.length, 1);
  });
  await ok('confirmar con el enlace del correo; la segunda vez dice que ya estaba', async () => {
    const r1 = await post('/api/sitio/KWR/boletin/confirmar', { token: tokenConfirmar });
    assert.deepEqual(await r1.json(), { ok: true, ya: false });
    const [s] = await q(`SELECT estado, confirmado_at FROM sitio_suscriptores WHERE email = 'marta@ejemplo.org'`);
    assert.equal(s.estado, 'confirmado');
    // El aviso a administración: una vez, a la dirección de contacto, con el correo de quien se suscribe.
    await new Promise(r => setTimeout(r, 300));
    const avisos = correos.filter(c => /Nueva suscripción al boletín/.test(c.subject));
    assert.equal(avisos.length, 1, 'una confirmación, un aviso');
    assert.deepEqual(avisos[0].to, ['contacto@ejemplo.org']);
    assert.match(avisos[0].subject, /marta@ejemplo\.org$/);
    const r2 = await post('/api/sitio/KWR/boletin/confirmar', { token: tokenConfirmar });
    assert.deepEqual(await r2.json(), { ok: true, ya: true });
    await new Promise(r => setTimeout(r, 300));
    assert.equal(correos.filter(c => /Nueva suscripción al boletín/.test(c.subject)).length, 1, 'repetir el enlace no avisa otra vez');
    assert.equal((await post('/api/sitio/KWR/boletin/confirmar', { token: 'x'.repeat(43) })).status, 404);
    assert.equal((await post('/api/sitio/KWR/boletin/confirmar', { token: 'corto' })).status, 400);
  });
  await ok('a quien ya está confirmado y lo pide otra vez se le avisa, sin cambiarle nada', async () => {
    await q(`UPDATE sitio_suscriptores SET correo_enviado_at = now() - interval '11 minutes' WHERE email = 'marta@ejemplo.org'`);
    const r = await post('/api/sitio/KWR/boletin', ALTA('marta@ejemplo.org'), { ip: otraIp() });
    assert.deepEqual(await r.json(), { ok: true, resultado: 'enviado' });
    const ultimo = correos[correos.length - 1];
    assert.match(ultimo.subject, /Ya estás suscrito/);
    assert.ok(!/boletin-confirmar/.test(ultimo.text));
    const [s] = await q(`SELECT estado FROM sitio_suscriptores WHERE email = 'marta@ejemplo.org'`);
    assert.equal(s.estado, 'confirmado');
  });
  await ok('si el proveedor falla, se dice y no se apunta como enviado', async () => {
    estadoProveedor = 500;
    const r = await post('/api/sitio/KWR/boletin', ALTA('fallo@ejemplo.org'), { ip: otraIp() });
    assert.deepEqual(await r.json(), { ok: true, resultado: 'fallo' });
    const [s] = await q(`SELECT correo_enviado_at, estado FROM sitio_suscriptores WHERE email = 'fallo@ejemplo.org'`);
    assert.equal(s.correo_enviado_at, null);
    assert.equal(s.estado, 'pendiente');
    estadoProveedor = 200;
  });
  await ok('un mensaje avisa a la dirección de contacto, con «Responder» hacia quien escribe', async () => {
    const antes = correos.length;
    await post('/api/sitio/KWR/mensaje', { ...MENSAJE, email: 'pepe@ejemplo.org', nombre: 'Pepe' }, { ip: otraIp() });
    await espera(300);
    const c = correos[antes];
    assert.deepEqual(c.to, ['contacto@ejemplo.org']);
    assert.equal(c.reply_to, 'pepe@ejemplo.org');
    assert.match(c.subject, /Nuevo mensaje en Sitio de Prueba: Voluntariado · Pepe/);
    assert.ok(c.text.includes('https://humanity.wiki/paginas/KWR/formularios'));
    const [m] = await q(`SELECT aviso_enviado_at FROM sitio_mensajes WHERE email = 'pepe@ejemplo.org'`);
    assert.ok(m.aviso_enviado_at, 'sólo se apunta si el proveedor dijo que sí');
  });
  await ok('la baja borra la dirección; el enlace no vale dos veces', async () => {
    const r = await post('/api/sitio/KWR/boletin/baja', { token: tokenBaja });
    assert.equal(r.status, 200);
    const [s] = await q(`SELECT * FROM sitio_suscriptores WHERE token_baja IS NULL AND estado = 'baja'`);
    assert.equal(s.email, null);
    assert.equal(s.token_confirmar, null);
    assert.ok(s.baja_at);
    assert.equal((await post('/api/sitio/KWR/boletin/baja', { token: tokenBaja })).status, 404);
  });
  await ok('la baja en un clic del programa de correo (RFC 8058) y la de quien abre la dirección a mano', async () => {
    const [s] = await q(`SELECT token_baja FROM sitio_suscriptores WHERE email = 'luis@ejemplo.org'`);
    const abrir = await fetchReal(`${B}/api/sitio/KWR/boletin/baja?t=${s.token_baja}`, { redirect: 'manual' });
    assert.equal(abrir.status, 303, 'abrirla no da de baja: lleva a la web, que pregunta');
    assert.equal(abrir.headers.get('location'), `https://prueba.ejemplo.org/#boletin-baja=${s.token_baja}`);
    assert.equal((await q(`SELECT estado FROM sitio_suscriptores WHERE email = 'luis@ejemplo.org'`))[0].estado, 'pendiente');
    const r = await fetchReal(`${B}/api/sitio/KWR/boletin/baja?t=${s.token_baja}`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-forwarded-for': otraIp() }, body: 'List-Unsubscribe=One-Click',
    });
    assert.equal(r.status, 200);
    assert.equal((await q(`SELECT count(*)::int AS n FROM sitio_suscriptores WHERE email = 'luis@ejemplo.org'`))[0].n, 0);
  });
  await ok('las bajas en un clic llegan de pocas IP (Gmail, Yahoo…): no las para el freno de los enlaces', async () => {
    const gmail = otraIp();
    const directa = (t: string) => fetchReal(`${B}/api/sitio/KWR/boletin/baja?t=${t}`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-forwarded-for': gmail }, body: 'List-Unsubscribe=One-Click',
    });
    const codigos: number[] = [];
    for (let i = 0; i < 40; i++) codigos.push((await directa(`${'Z'.repeat(40)}${String(i).padStart(3, '0')}`)).status);
    assert.ok(codigos.every(c => c === 404), `ningún 429: ${codigos.join(',')}`);
    // Desde la web (el testigo en el cuerpo), el freno de siempre: 30 cada diez minutos.
    const web = otraIp();
    const enWeb: number[] = [];
    for (let i = 0; i < 31; i++) enWeb.push((await post('/api/sitio/KWR/boletin/baja', { token: `${'Y'.repeat(40)}${String(i).padStart(3, '0')}` }, { ip: web })).status);
    assert.equal(enWeb.at(-1), 429);
  });

  console.log('El panel de quien administra');
  const panel = (h: Record<string, string> = {}, ruta = '') => fetchReal(`${B}/api/sitio/KWR/formularios${ruta}`, { headers: h });
  await ok('sin sesión 401, de otra persona 403, del dueño todo', async () => {
    assert.equal((await panel()).status, 401);
    assert.equal((await panel({ 'x-usuario': 'U_OTRO' })).status, 403);
    const r = await panel({ 'x-usuario': 'U_DUENO' });
    const j = await r.json();
    assert.equal(r.status, 200);
    assert.equal(j.pagina.escaparate, true);
    assert.equal(j.contacto, 'contacto@ejemplo.org');
    assert.equal(j.correo_activo, true);
    assert.ok(j.mensajes.length >= 9 && j.mensajes[0].email);
    assert.ok(j.suscriptores.every((s: any) => s.estado !== 'baja'));
    assert.equal(j.cifras.bajas, 2);
    const resumen = await (await panel({ 'x-usuario': 'U_DUENO' }, '?resumen=1')).json();
    assert.ok(!('mensajes' in resumen) && resumen.cifras.mensajes >= 9);
  });
  await ok('cambiar el estado de un mensaje, y solo a uno de los que existen', async () => {
    const [m] = await q(`SELECT id FROM sitio_mensajes WHERE email = 'pepe@ejemplo.org'`);
    const put = (id: string, estado: string, raiz = 'KWR') => fetchReal(`${B}/api/sitio/${raiz}/formularios/mensajes/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-usuario': 'U_DUENO' }, body: JSON.stringify({ estado }),
    });
    assert.equal((await put(m.id, 'respondido')).status, 200);
    assert.equal((await q(`SELECT estado FROM sitio_mensajes WHERE id = $1`, [m.id]))[0].estado, 'respondido');
    assert.equal((await put(m.id, 'borrado')).status, 400);
    assert.equal((await put(m.id, 'leido', 'KWOTRA')).status, 404, 'un mensaje de otro sitio no se toca desde este');
  });
  await ok('borrar los datos de alguien deja la fila sin nada que diga quién era', async () => {
    const [m] = await q(`SELECT id FROM sitio_mensajes WHERE email = 'pepe@ejemplo.org'`);
    const r = await fetchReal(`${B}/api/sitio/KWR/formularios/mensajes/${m.id}`, { method: 'DELETE', headers: { 'x-usuario': 'U_DUENO' } });
    assert.equal(r.status, 200);
    const [x] = await q(`SELECT * FROM sitio_mensajes WHERE id = $1`, [m.id]);
    assert.deepEqual([x.nombre, x.email, x.mensaje, x.origen, x.estado], [null, null, null, null, 'archivado']);
    assert.ok(x.datos_borrados_at && x.motivo === 'voluntariado');
  });
  await ok('el CSV: con BOM (Excel lee bien las tildes), sin fórmulas que se ejecuten y, del boletín, sólo los confirmados', async () => {
    await post('/api/sitio/KWR/mensaje', { ...MENSAJE, nombre: '=HYPERLINK("x")', email: 'csv@ejemplo.org' }, { ip: otraIp() });
    const r = await fetchReal(`${B}/api/sitio/KWR/formularios/mensajes.csv`, { headers: { 'x-usuario': 'U_DUENO' } });
    // `text()` se come la marca BOM al descodificar: se lee tal cual llega.
    const conBom = (x: Response) => x.arrayBuffer().then(a => new TextDecoder('utf-8', { ignoreBOM: true }).decode(a));
    const t = await conBom(r);
    assert.match(r.headers.get('content-type') || '', /text\/csv/);
    assert.ok(t.startsWith('﻿fecha,nombre,correo'));
    assert.ok(t.includes(`"'=HYPERLINK(""x"")"`), 'la fórmula sale como texto');
    assert.equal((await fetchReal(`${B}/api/sitio/KWR/formularios/suscriptores.csv`)).status, 401);
    await q(`UPDATE sitio_suscriptores SET estado = 'confirmado', confirmado_at = now() WHERE email = 'sinjs@ejemplo.org'`);
    const csvS = await fetchReal(`${B}/api/sitio/KWR/formularios/suscriptores.csv`, { headers: { 'x-usuario': 'U_DUENO' } });
    assert.match(csvS.headers.get('content-disposition') || '', /boletin-confirmados-KWR\.csv/);
    const s = await conBom(csvS);
    assert.equal(s.split('\r\n')[0], '﻿correo,estado,alta,confirmacion');
    assert.ok(s.includes('sinjs@ejemplo.org,confirmado'), 'el confirmado sale');
    assert.ok(!s.includes('fallo@ejemplo.org') && !s.includes('pendiente'), 'los pendientes no salen');
    const todos = await conBom(await fetchReal(`${B}/api/sitio/KWR/formularios/suscriptores.csv?todos=1`, { headers: { 'x-usuario': 'U_DUENO' } }));
    assert.ok(todos.includes('fallo@ejemplo.org,pendiente') && todos.includes('sinjs@ejemplo.org') && !todos.includes('marta@ejemplo.org'), 'con ?todos=1, también los pendientes; las bajas nunca');
  });
  await ok('dar de baja desde el panel borra la dirección', async () => {
    const [s] = await q(`SELECT id FROM sitio_suscriptores WHERE email = 'sinjs@ejemplo.org'`);
    const r = await fetchReal(`${B}/api/sitio/KWR/formularios/suscriptores/${s.id}`, { method: 'DELETE', headers: { 'x-usuario': 'U_DUENO' } });
    assert.equal(r.status, 200);
    assert.equal((await q(`SELECT email, estado FROM sitio_suscriptores WHERE id = $1`, [s.id]))[0].email, null);
  });
  await ok('pedir confirmación a los pendientes: 503 sin proveedor; con él, a los que nunca la recibieron', async () => {
    conCorreo(false);
    const sin = await fetchReal(`${B}/api/sitio/KWR/formularios/confirmaciones`, { method: 'POST', headers: { 'x-usuario': 'U_DUENO' } });
    assert.equal(sin.status, 503);
    conCorreo(true);
    const pendientes = (await q(`SELECT count(*)::int AS n FROM sitio_suscriptores WHERE estado = 'pendiente' AND correo_enviado_at IS NULL AND email IS NOT NULL`))[0].n;
    const antes = correos.length;
    const r = await fetchReal(`${B}/api/sitio/KWR/formularios/confirmaciones`, { method: 'POST', headers: { 'x-usuario': 'U_DUENO' } });
    assert.deepEqual(await r.json(), { ok: true, enviados: pendientes, fallidos: 0 });
    assert.equal(correos.length - antes, pendientes);
    assert.equal((await q(`SELECT count(*)::int AS n FROM sitio_suscriptores WHERE estado = 'pendiente' AND correo_enviado_at IS NULL AND email IS NOT NULL`))[0].n, 0);
  });
  await ok('la clave de Resend va en la cabecera y nunca en el cuerpo', async () => {
    assert.ok(correos.every(c => c.autorizacion === 'Bearer prueba' && !JSON.stringify(c).includes('"prueba"')));
    assert.equal(await enviarCorreo({ para: 'a@b.es', asunto: 'x', texto: 'y' }), true);
    conCorreo(false);
    assert.equal(await enviarCorreo({ para: 'a@b.es', asunto: 'x', texto: 'y' }), false, 'sin proveedor no se finge');
  });
  await ok('las altas sin confirmar se borran a los 30 días del correo; las demás, no', async () => {
    const alta = (id: string, email: string, estado: string, correo: string | null) => q(
      `INSERT INTO sitio_suscriptores (id, raiz_id, email, estado, token_baja, consentimiento_texto, consentimiento_at, correo_enviado_at)
       VALUES ($1, 'KWR', $2, $3, $4, 'x', now(), ${correo === null ? 'NULL' : `now() - interval '${correo}'`})`, [id, email, estado, `${id}${'T'.repeat(40)}`]);
    await alta('SSVIEJA', 'vieja@ejemplo.org', 'pendiente', '31 days');
    await alta('SSRECIENTE', 'reciente@ejemplo.org', 'pendiente', '29 days');
    await alta('SSSINCORREO', 'sincorreo@ejemplo.org', 'pendiente', null);
    await alta('SSCONFIRMADA', 'confirmada@ejemplo.org', 'confirmado', '400 days');
    assert.equal(await borrarSinConfirmar(db), 1);
    const quedan = (await q(`SELECT id FROM sitio_suscriptores WHERE id LIKE 'SS%' AND id IN ('SSVIEJA','SSRECIENTE','SSSINCORREO','SSCONFIRMADA') ORDER BY id`)).map(f => f.id);
    assert.deepEqual(quedan, ['SSCONFIRMADA', 'SSRECIENTE', 'SSSINCORREO'], 'sólo la pendiente con el correo de hace más de 30 días');
  });
} finally {
  servidor.close();
  await q(`DROP TABLE IF EXISTS sitio_mensajes, sitio_suscriptores, dominios_paginas, knowledge_windows, users CASCADE`);
  await pool.end();
}
console.log(`\n${n} comprobaciones, todas bien.`);
