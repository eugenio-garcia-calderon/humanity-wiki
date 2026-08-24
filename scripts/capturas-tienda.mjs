#!/usr/bin/env node
// ============================================================================
// LAS CAPTURAS DE LA FICHA DE LA TIENDA (2026-08-24, agente de APP/UX)
// ============================================================================
//   node --env-file=.env scripts/capturas-tienda.mjs
//
// Google Play pide entre 2 y 8 capturas de teléfono. Se hacen a 1080×1920 —el
// tamaño de un móvil normal— porque cae dentro de lo que las dos tiendas
// aceptan y no hay que reescalarlas para ninguna.
//
// ── POR QUÉ CONTRA EL SERVIDOR LOCAL Y NO CONTRA PRODUCCIÓN ────────────────
// Es el MISMO código —la compilación de producción— pero sin el trabajador de
// servicio por medio, que en un navegador automatizado deja la página colgada.
// Está escrito en `src/pwa.ts` y comprobado dos veces. Por eso todas las
// direcciones llevan `?sw=off`.
//
// ── LA SESIÓN DE PRUEBA ────────────────────────────────────────────────────
// Cuatro de las cinco pantallas sólo existen con la sesión iniciada. Se crea
// una sesión LOCAL marcada con `user_agent = 'claude-dev-verificacion'` y **se
// borra al terminar**, pase lo que pase. Nunca en producción.
import { chromium } from 'playwright';
import pg from 'pg';
import crypto from 'node:crypto';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.CAPTURAS_BASE || 'http://localhost:3002';
const SALIDA = 'capturas-tienda';
// 360×640 CSS a triple densidad = 1080×1920 reales. Los dos números importan y
// son distintos: el TAMAÑO DEL FICHERO lo pide la tienda, pero el ANCHO EN CSS
// es lo que decide qué diseño se dibuja. La primera versión usaba 1080 de ancho
// en CSS y salió la vista de ORDENADOR —los dos raíles de iconos, tres tarjetas
// por fila— en un fichero con forma de móvil. Un revisor lo lee como que la app
// no está adaptada, que es lo contrario de lo que enseña.
const ANCHO_CSS = 360;
const ALTO_CSS = 640;
const DENSIDAD = 3;

/** Quién sale en las capturas. Una cuenta de demostración, nunca una real. */
const USUARIO = process.env.CAPTURAS_USUARIO || 'U_DEMO_LUCIA';

const PANTALLAS = [
  // La primera es la de sin sesión: es la única pantalla sin datos de nadie,
  // así que no hay que limpiarla y no se queda vieja con el contenido de otro.
  { nombre: '1-portada-sin-sesion', ruta: '/', sesion: false, espera: 2500 },
  { nombre: '2-tres-caminos', ruta: '/', sesion: true, espera: 2500 },
  { nombre: '3-explorar', ruta: '/explorar', sesion: true, espera: 3500 },
  { nombre: '4-mapa', ruta: '/mapas', sesion: true, espera: 4500 },
  { nombre: '5-proyectos', ruta: '/proyectos', sesion: true, espera: 3000 },
];

const cliente = () => new pg.Client({
  host: process.env.SQL_HOST,
  port: process.env.SQL_PORT || 5432,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME,
});

async function abrirSesion() {
  const c = cliente();
  await c.connect();
  const token = crypto.randomBytes(32).toString('hex');
  await c.query(
    `INSERT INTO sessions (token, user_id, expires_at, user_agent, ip)
     VALUES ($1, $2, now() + interval '30 minutes', 'claude-dev-verificacion', '127.0.0.1')`,
    [token, USUARIO],
  );
  await c.end();
  return token;
}

async function cerrarSesiones() {
  const c = cliente();
  await c.connect();
  const r = await c.query("DELETE FROM sessions WHERE user_agent = 'claude-dev-verificacion'");
  const q = await c.query("SELECT count(*)::int n FROM sessions WHERE user_agent = 'claude-dev-verificacion'");
  await c.end();
  console.log(`· sesiones de prueba borradas: ${r.rowCount} — quedan ${q.rows[0].n}`);
  if (q.rows[0].n !== 0) throw new Error('QUEDAN SESIONES DE PRUEBA SIN BORRAR');
}

const main = async () => {
  await mkdir(SALIDA, { recursive: true });
  const token = await abrirSesion();
  const navegador = await chromium.launch();

  try {
    for (const p of PANTALLAS) {
      const contexto = await navegador.newContext({
        viewport: { width: ANCHO_CSS, height: ALTO_CSS },
        deviceScaleFactor: DENSIDAD,
        isMobile: true,
        hasTouch: true,
        locale: 'es-ES',
      });
      if (p.sesion) {
        await contexto.addCookies([{
          name: 'rh_session', value: token,
          domain: 'localhost', path: '/', sameSite: 'Lax',
        }]);
      }
      const pagina = await contexto.newPage();
      const url = `${BASE}${p.ruta}${p.ruta.includes('?') ? '&' : '?'}sw=off`;
      await pagina.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
      // Un respiro para las animaciones y para lo que se carga después de la
      // primera pintada: una captura tomada demasiado pronto enseña esqueletos
      // grises, que es justo lo que un revisor lee como «la app no funciona».
      await pagina.waitForTimeout(p.espera);
      await pagina.screenshot({ path: `${SALIDA}/${p.nombre}.png` });
      console.log(`· ${p.nombre}.png  ←  ${p.ruta}${p.sesion ? '  (con sesión)' : ''}`);
      await contexto.close();
    }
  } finally {
    await navegador.close();
    // PASE LO QUE PASE. Una sesión de prueba que sobrevive a un fallo del
    // guion es una sesión abierta que nadie va a recordar.
    await cerrarSesiones();
  }

  console.log(`\nListas en ${SALIDA}/ — ${ANCHO_CSS * DENSIDAD}×${ALTO_CSS * DENSIDAD}`);
};

main().catch(async e => {
  console.error(e);
  await cerrarSesiones().catch(() => {});
  process.exit(1);
});
