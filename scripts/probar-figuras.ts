// ============================================================================
// PRUEBA DE LAS FIGURAS DEL TEST DE GEOMETRÍA (2026-11-19)
// ============================================================================
// Levanta un Express mínimo con SOLO el módulo de figuras y una base de datos de
// verdad (no una simulada: ver src/server/limites/CLAUDE.md, «la base de mentira
// habría pasado la prueba y fallado en producción»).
//
//   DATABASE_URL=postgres://… npx tsx scripts/probar-figuras.ts
//
// Requiere que la base tenga las tablas `frenos` (0097) y `figuras_geometria` (0232).
// Cada caso usa una IP distinta (cabecera CF-Connecting-IP) para que el guardián
// no cuente unos contra otros, salvo el caso que prueba el límite a propósito.
// No toca nada fuera de la tabla de figuras y el freno.

import express from 'express';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { registrarFiguras } from '../src/server/figuras';

const require = createRequire(import.meta.url);
const comun = require('../public/geometria-figura/comun.js');
const datos = JSON.parse(fs.readFileSync(new URL('../public/geometria-figura/datos.json', import.meta.url), 'utf8'));

const url = process.env.DATABASE_URL;
if (!url) { console.error('Falta DATABASE_URL (una base de pruebas, nunca producción).'); process.exit(2); }

const pool = new pg.Pool({ connectionString: url, max: 4 });
const db = drizzle(pool);

// Un envío de prueba que pasa el campo trampa, el tiempo y las reglas de la figura.
const puntuacionesTodas = (valor: number) => datos.temas.map((t: any) => t.ejes.map(() => valor));
const TIEMPO_OK = 20000;

let ok = 0, mal = 0;
const comprobar = (nombre: string, cond: boolean, detalle?: unknown) => {
  if (cond) { ok++; console.log(`  ok   ${nombre}`); }
  else { mal++; console.log(`  FALLA ${nombre}${detalle !== undefined ? ' → ' + JSON.stringify(detalle).slice(0, 300) : ''}`); }
};

// Contador de IPs de prueba: cada caso tiene la suya.
let siguienteIp = 1;
const ipNueva = () => `10.9.0.${siguienteIp++}`;

async function main() {
  // Limpieza de lo que dejó una prueba anterior (solo tablas de esta prueba).
  await db.execute(sql`DELETE FROM figuras_geometria`);
  await db.execute(sql`DELETE FROM frenos`);

  const app = express();
  app.use(express.json({ limit: '200kb' }));
  registrarFiguras(app, db);
  const servidor = await new Promise<import('http').Server>((resolver) => {
    const s = app.listen(0, '127.0.0.1', () => resolver(s));
  });
  const { port } = servidor.address() as any;
  const base = `http://127.0.0.1:${port}`;

  const peticion = async (ruta: string, opciones: any = {}, ip = ipNueva()) => {
    const cabeceras: Record<string, string> = { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip, Host: `127.0.0.1:${port}`, ...(opciones.cabeceras || {}) };
    const r = await fetch(base + ruta, { method: opciones.method || 'GET', headers: cabeceras, body: opciones.body ? JSON.stringify(opciones.body) : undefined });
    const texto = await r.text();
    let json: any = null; try { json = JSON.parse(texto); } catch { /* no es JSON */ }
    return { status: r.status, json, texto, headers: r.headers };
  };

  console.log('\n1. Publicar');
  const base1 = { nombre: 'Ana Pruebas', puntuaciones: puntuacionesTodas(5), tiempo: TIEMPO_OK };
  const sinTiempo = await peticion('/api/figuras', { method: 'POST', body: { ...base1, tiempo: undefined } });
  comprobar('sin tiempo: 400', sinTiempo.status === 400, sinTiempo.json);
  const rapido = await peticion('/api/figuras', { method: 'POST', body: { ...base1, tiempo: 3000 } });
  comprobar('demasiado rápido: 400 con codigo «rapido»', rapido.status === 400 && rapido.json?.codigo === 'rapido', rapido.json);
  const nombreCorto = await peticion('/api/figuras', { method: 'POST', body: { ...base1, nombre: 'A' } });
  comprobar('nombre de una letra: 400', nombreCorto.status === 400 && nombreCorto.json?.campo === 'nombre', nombreCorto.json);
  const correoMalo = await peticion('/api/figuras', { method: 'POST', body: { ...base1, correo: 'no-es-correo' } });
  comprobar('correo no válido: 400', correoMalo.status === 400 && correoMalo.json?.campo === 'correo', correoMalo.json);
  const novedadesSinCorreo = await peticion('/api/figuras', { method: 'POST', body: { ...base1, novedades: true } });
  comprobar('novedades sin correo: 400', novedadesSinCorreo.status === 400, novedadesSinCorreo.json);
  const figuraMala = await peticion('/api/figuras', { method: 'POST', body: { ...base1, puntuaciones: puntuacionesTodas(5).map((f: number[], i: number) => i === 0 ? [...f, 5] : f) } });
  comprobar('figura con un aspecto de más: 400', figuraMala.status === 400, figuraMala.json);
  const fueraDeRango = await peticion('/api/figuras', { method: 'POST', body: { ...base1, puntuaciones: puntuacionesTodas(11) } });
  comprobar('cifra 11: 400', fueraDeRango.status === 400, fueraDeRango.json);
  const trampa = await peticion('/api/figuras', { method: 'POST', body: { ...base1, nota_interna: 'soy un robot' } });
  comprobar('campo trampa lleno: finge éxito', trampa.status === 201 && trampa.json?.ok === true);
  const cuentaTrampa = (await db.execute(sql`SELECT count(*)::int AS n FROM figuras_geometria`)).rows[0] as any;
  comprobar('campo trampa lleno: NO guarda nada', cuentaTrampa.n === 0, cuentaTrampa);

  const origenAjeno = await peticion('/api/figuras', { method: 'POST', body: { ...base1 }, cabeceras: { Origin: 'https://otra-web.example' } });
  comprobar('envío desde otra web: 403', origenAjeno.status === 403, origenAjeno.json);

  const publicada = await peticion('/api/figuras', { method: 'POST', body: { ...base1 } });
  comprobar('figura válida sin correo: 201', publicada.status === 201 && !!publicada.json?.id, publicada.json);
  comprobar('devuelve enlace y clave', typeof publicada.json?.enlace === 'string' && typeof publicada.json?.clave === 'string' && publicada.json.clave.length >= 30);
  comprobar('sin correo: estado «no_pedido»', publicada.json?.correo === 'no_pedido', publicada.json);
  const id = publicada.json?.id as string;
  const clave = publicada.json?.clave as string;

  const enBase = (await db.execute(sql`SELECT clave_hash, correo FROM figuras_geometria WHERE id = ${id}`)).rows[0] as any;
  comprobar('la clave se guarda sólo como huella (no en claro)', !!enBase && enBase.clave_hash !== clave && enBase.clave_hash.length === 64, enBase);

  console.log('\n2. Galería y lectura pública');
  const lista = await peticion('/api/figuras');
  comprobar('la galería lista la figura', lista.status === 200 && lista.json?.total === 1 && lista.json.figuras[0].id === id, lista.json);
  comprobar('la galería NO trae correos ni claves', !lista.texto.includes('correo') && !lista.texto.includes('clave') && !lista.texto.includes('clave_hash'), lista.texto.slice(0, 200));
  const una = await peticion(`/api/figuras/${id}`);
  comprobar('una figura publicada se lee', una.status === 200 && una.json?.nombre === 'Ana Pruebas', una.json);
  comprobar('una figura NO trae correo ni clave', !una.texto.includes('correo') && !una.texto.includes('clave'), una.texto.slice(0, 200));
  const inexistente = await peticion('/api/figuras/NOEXISTE123');
  comprobar('id que no existe: 404', inexistente.status === 404);
  const idRaro = await peticion('/api/figuras/..%2Fetc');
  comprobar('id con caracteres raros: 404', idRaro.status === 404);
  const texto = await peticion('/api/figuras/texto-novedades');
  comprobar('el texto de novedades lo da el servidor', texto.status === 200 && typeof texto.json?.texto === 'string' && texto.json.texto.length > 40, texto.json);

  console.log('\n3. Con correo (sin proveedor configurado)');
  delete process.env.RESEND_API_KEY; delete process.env.SMTP_USUARIO; delete process.env.SMTP_CLAVE;
  const sinProveedor = await peticion('/api/figuras', { method: 'POST', body: { ...base1, nombre: 'Luis Sin Proveedor', correo: 'luis@example.org' } });
  comprobar('correo pedido y sin proveedor: 201 con «sin_proveedor» (no finge)', sinProveedor.status === 201 && sinProveedor.json?.correo === 'sin_proveedor', sinProveedor.json);
  const filaSinProv = (await db.execute(sql`SELECT correo, resultados_enviados_at FROM figuras_geometria WHERE id = ${sinProveedor.json?.id}`)).rows[0] as any;
  comprobar('el correo se guarda igualmente, sin marca de envío', filaSinProv?.correo === 'luis@example.org' && filaSinProv?.resultados_enviados_at === null, filaSinProv);

  console.log('\n4. Con correo y proveedor simulado (se captura el envío)');
  const enviados: any[] = [];
  const fetchReal = globalThis.fetch;
  process.env.RESEND_API_KEY = 'clave-de-prueba';
  globalThis.fetch = (async (entrada: any, opciones: any) => {
    const u = String(entrada);
    if (u.startsWith('https://api.resend.com/')) {
      enviados.push(JSON.parse(String(opciones?.body || '{}')));
      return new Response(JSON.stringify({ id: 'simulado' }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return fetchReal(entrada, opciones);
  }) as typeof fetch;
  try {
    const conCorreo = await peticion('/api/figuras', { method: 'POST', body: { ...base1, nombre: 'Marta Correo', correo: 'Marta@Example.org', novedades: true } });
    comprobar('con proveedor: estado «enviado»', conCorreo.status === 201 && conCorreo.json?.correo === 'enviado', conCorreo.json);
    comprobar('se envió a la dirección en minúsculas', enviados.length === 1 && enviados[0].to[0] === 'marta@example.org', enviados.map(e => e.to));
    const cuerpo: string = enviados[0]?.text || '';
    comprobar('el correo trae las cifras por tema', cuerpo.includes('Inmigración') && cuerpo.toLowerCase().includes('más parecido'), cuerpo.slice(0, 300));
    comprobar('el correo trae el enlace y la clave para borrar', cuerpo.includes(conCorreo.json?.enlace) && cuerpo.includes(conCorreo.json?.clave), cuerpo.slice(-400));
    const filaEnviada = (await db.execute(sql`SELECT resultados_enviados_at, quiere_novedades, texto_consentimiento FROM figuras_geometria WHERE id = ${conCorreo.json?.id}`)).rows[0] as any;
    comprobar('marca la hora de envío', !!filaEnviada?.resultados_enviados_at, filaEnviada);
    comprobar('guarda la casilla y el texto que se leyó', filaEnviada?.quiere_novedades === true && typeof filaEnviada?.texto_consentimiento === 'string' && filaEnviada.texto_consentimiento.length > 40, filaEnviada);

    // Solo el proveedor falla; las peticiones de la propia prueba al servidor siguen pasando.
    globalThis.fetch = (async (entrada: any, opciones: any) => {
      if (String(entrada).startsWith('https://api.resend.com/')) return new Response('caído', { status: 500 });
      return fetchReal(entrada, opciones);
    }) as typeof fetch;
    const fallo = await peticion('/api/figuras', { method: 'POST', body: { ...base1, nombre: 'Fallo Correo', correo: 'fallo@example.org' } });
    comprobar('proveedor caído: la figura SE publica igualmente y avisa «fallido»', fallo.status === 201 && fallo.json?.correo === 'fallido' && !!fallo.json?.id, fallo.json);
  } finally {
    globalThis.fetch = fetchReal;
    delete process.env.RESEND_API_KEY;
  }

  console.log('\n5. Borrar');
  const claveMala = await peticion(`/api/figuras/${id}`, { method: 'DELETE', cabeceras: { 'x-clave-figura': 'otra-clave' } });
  comprobar('clave equivocada: 404 (no revela nada)', claveMala.status === 404, claveMala.json);
  const sinClave = await peticion(`/api/figuras/${id}`, { method: 'DELETE' });
  comprobar('sin clave: 404', sinClave.status === 404);
  const borrada = await peticion(`/api/figuras/${id}`, { method: 'DELETE', cabeceras: { 'x-clave-figura': clave } });
  comprobar('clave correcta: borra', borrada.status === 200 && borrada.json?.ok === true, borrada.json);
  const despues = await peticion(`/api/figuras/${id}`);
  comprobar('después de borrar: ya no se lee', despues.status === 404);
  const cuentaBorrado = (await db.execute(sql`SELECT count(*)::int AS n FROM figuras_geometria WHERE id = ${id}`)).rows[0] as any;
  comprobar('después de borrar: la fila ya no existe en la base', cuentaBorrado.n === 0, cuentaBorrado);

  const conCorreoBorrado = (await db.execute(sql`SELECT count(*)::int AS n FROM figuras_geometria WHERE correo IS NOT NULL AND id = ${sinProveedor.json?.id}`)).rows[0] as any;
  const claveSinProv = await peticion(`/api/figuras/${sinProveedor.json?.id}`, { method: 'DELETE', cabeceras: { 'x-clave-figura': sinProveedor.json?.clave } });
  comprobar('la figura con correo se borra también con su correo', claveSinProv.status === 200 && conCorreoBorrado.n === 1, claveSinProv.json);

  // Probar claves a ciegas tiene que frenarse: los intentos fallidos cuentan, y no borran nada.
  const figuraFreno = await peticion('/api/figuras', { method: 'POST', body: { ...base1, nombre: 'Freno Clave' } }, ipNueva());
  const ipAtacante = ipNueva();
  const intentosClave: number[] = [];
  for (let k = 0; k < 8; k++) {
    const r = await peticion(`/api/figuras/${figuraFreno.json?.id}`, { method: 'DELETE', cabeceras: { 'x-clave-figura': `intento-${k}` } }, ipAtacante);
    intentosClave.push(r.status);
  }
  comprobar('probar claves sin parar acaba en 429 (no sólo 404)', intentosClave.includes(429), intentosClave);
  const sigueViva = await peticion(`/api/figuras/${figuraFreno.json?.id}`);
  comprobar('los intentos fallidos no borran la figura', sigueViva.status === 200, sigueViva.json);

  console.log('\n6. Moderación (sólo nivel 4)');
  const ocultaSinSesion = await peticion('/api/figuras/FIGURAXYZ12/estado', { method: 'PUT', body: { estado: 'oculta' } });
  comprobar('cambiar el estado sin sesión: 401', ocultaSinSesion.status === 401, ocultaSinSesion.json);
  const moderacionSinSesion = await peticion('/api/figuras/moderacion');
  comprobar('la lista de moderación sin sesión: 401', moderacionSinSesion.status === 401);
  // Ocultar una figura directamente en la base y comprobar que deja de verse.
  const visible = await peticion('/api/figuras');
  const idVisible = visible.json?.figuras?.[0]?.id;
  if (idVisible) {
    await db.execute(sql`UPDATE figuras_geometria SET estado = 'oculta' WHERE id = ${idVisible}`);
    const galeriaTras = await peticion('/api/figuras');
    comprobar('una figura oculta sale de la galería', !galeriaTras.json?.figuras?.some((f: any) => f.id === idVisible), galeriaTras.json);
    const unaOculta = await peticion(`/api/figuras/${idVisible}`);
    comprobar('una figura oculta responde 404 (no se distingue de una que no existe)', unaOculta.status === 404, unaOculta.json);
    await db.execute(sql`UPDATE figuras_geometria SET estado = 'publicada' WHERE id = ${idVisible}`);
  }

  console.log('\n7. Límite de envíos (el guardián)');
  const ipAbusiva = ipNueva();
  const respuestas: number[] = [];
  for (let k = 0; k < 8; k++) {
    const r = await peticion('/api/figuras', { method: 'POST', body: { ...base1, nombre: `Abuso ${k}` } }, ipAbusiva);
    respuestas.push(r.status);
  }
  comprobar('una misma IP que envía sin parar acaba en 429', respuestas.includes(429), respuestas);
  comprobar('los primeros envíos de esa IP pasan (gracia de 5)', respuestas.slice(0, 5).every(s => s === 201), respuestas);

  // Los aspectos que la persona deja en 0 no cuentan en el parecido (decisión de Eugenio, 2026-11-19)
  comprobar('un aspecto en 0 no penaliza el parecido', comun.parecido([0, 5, 5, 5], [10, 5, 5, 5]) === 100, String(comun.parecido([0, 5, 5, 5], [10, 5, 5, 5])));
  comprobar('una figura toda en 0 no tiene parecido', comun.parecido([0, 0, 0], [5, 5, 5]) === null);
  const ceros = datos.temas.map((t: any) => t.ejes.map(() => 0));
  const rCeros = comun.resumen(ceros, datos);
  comprobar('figura vacía: ningún partido con cifra', comun.conCifra(rCeros.general).length === 0 && rCeros.mejorGeneral === null);
  comprobar('figura vacía: la frase lo dice sin inventar un ganador', comun.frasePrincipal(rCeros.general, 'tu figura').startsWith('Todavía no hay aspectos'));
  const unos = datos.temas.map((t: any) => t.ejes.map(() => 5));
  const rUnos = comun.resumen(unos, datos);
  comprobar('figura con cifras: sigue dando un partido más parecido', rUnos.mejorGeneral !== null && typeof rUnos.mejorGeneral.parecido === 'number');
  // Orden de los aspectos (2026-11-19): las figuras publicadas antes se leen convertidas al orden nuevo.
  console.log('\n8. Orden de los aspectos');
  const valores = datos.temas.map((t: any, i: number) => t.ejes.map((_: any, j: number) => (i * 7 + j * 3) % 11));
  const esperadaConvertida = datos.temas.map((_: any, i: number) => comun.PERMUTACION_V2[i].map((o: number) => valores[i][o]));
  // Filas que representan datos que ya existían: se escriben a mano porque la vía normal ya no crea orden 1.
  const idAntigua = 'AntiguaPrueba1', idNueva = 'NuevaPrueba002';
  await db.execute(sql`INSERT INTO figuras_geometria (id, nombre, puntuaciones, estado, orden, clave_hash, quiere_novedades)
    VALUES (${idAntigua}, 'Antigua Prueba', ${JSON.stringify(valores)}::jsonb, 'publicada', 1, ${'0'.repeat(64)}, false)`);
  await db.execute(sql`INSERT INTO figuras_geometria (id, nombre, puntuaciones, estado, orden, clave_hash, quiere_novedades)
    VALUES (${idNueva}, 'Nueva Prueba', ${JSON.stringify(valores)}::jsonb, 'publicada', 2, ${'0'.repeat(64)}, false)`);
  const leidaAntigua = await peticion(`/api/figuras/${idAntigua}`);
  comprobar('una figura de orden 1 se lee con el orden nuevo', leidaAntigua.status === 200 && JSON.stringify(leidaAntigua.json?.puntuaciones) === JSON.stringify(esperadaConvertida), leidaAntigua.json?.puntuaciones?.[0]);
  comprobar('convertir no pierde ni cambia ningún valor (suma igual)', leidaAntigua.json?.puntuaciones?.flat().reduce((a: number, b: number) => a + b, 0) === valores.flat().reduce((a: number, b: number) => a + b, 0));
  const leidaNueva = await peticion(`/api/figuras/${idNueva}`);
  comprobar('una figura de orden 2 NO se convierte', leidaNueva.status === 200 && JSON.stringify(leidaNueva.json?.puntuaciones) === JSON.stringify(valores), leidaNueva.json?.puntuaciones?.[0]);
  const galeria = await peticion('/api/figuras');
  const enGaleria = (galeria.json?.figuras || []).find((f: any) => f.id === idAntigua);
  comprobar('la galería también devuelve la figura antigua convertida', JSON.stringify(enGaleria?.puntuaciones) === JSON.stringify(esperadaConvertida));
  const nueva = await peticion('/api/figuras', { method: 'POST', body: { nombre: 'Ana Orden', puntuaciones: puntuacionesTodas(5), tiempo: TIEMPO_OK } });
  const ordenNueva = (await db.execute(sql`SELECT orden FROM figuras_geometria WHERE id = ${nueva.json?.id}`)).rows[0] as any;
  comprobar('una figura publicada hoy se guarda con orden 2', nueva.status === 201 && Number(ordenNueva?.orden) === 2, ordenNueva);

  servidor.close();
  await pool.end();

  console.log(`\n${ok} ok, ${mal} fallos`);
  process.exit(mal ? 1 : 0);
}

main().catch(async (e) => {
  console.error('La prueba se ha caído:', e);
  await pool.end().catch(() => {});
  process.exit(1);
});
