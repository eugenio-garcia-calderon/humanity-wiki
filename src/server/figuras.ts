import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { guardian, REGLAS, ipDe, ritmo, anotarFallo } from './limites/index';
import { requireLevel } from './auth';
import { hayCorreo, enviarCorreo } from './correo';
import { CAMPO_TRAMPA, textoConsentimiento, normalizarCorreo } from '../components/sitio/formularios';

// ============================================================================
// LAS FIGURAS DEL TEST DE GEOMETRÍA POLÍTICA (2026-11-19)
// ============================================================================
// Quien quiere construye su figura con 64 deslizadores (10 temas), la publica con
// un nombre y, si deja su correo, recibe sus resultados. Sin registrarse.
// La página es `public/geometria-figura/index.html`; la cuenta (parecido y niveles)
// es `public/geometria-figura/comun.js`, la misma en el navegador y aquí.
// Tabla: `drizzle/0232_figuras_geometria.sql`. Decisiones y motivos, en
// `memory/03_DECISIONS.md` y en la cabecera de la migración.
//
// LAS RUTAS
//   Públicas (sin cuenta, con el guardián de envíos por IP):
//     POST   /api/figuras                  publicar una figura { nombre, puntuaciones, correo?, novedades?, tiempo }
//     GET    /api/figuras?pagina=N         la galería: sólo las publicadas, sin correos
//     GET    /api/figuras/:id              una figura publicada
//     DELETE /api/figuras/:id              borrarla. Cabecera `x-clave-figura`: la clave que se dio al publicar
//   De quien administra la plataforma (nivel 4):
//     GET    /api/figuras/moderacion       todas, también las ocultas (sin correos)
//     PUT    /api/figuras/:id/estado       { estado: 'publicada' | 'oculta' }
//
// ESCRITURA SIN CUENTA. La regla de «toda ruta de escritura lleva requireLevel o
// requireAdmin» (src/server/CLAUDE.md) no se puede cumplir aquí: publicar sin
// registrarse es el propósito. Lo que la sustituye, por ruta: el guardián de envíos
// (`REGLAS.formulario`, por IP), la comprobación de que el envío viene de la propia
// web, el campo trampa y el tiempo mínimo, y, para borrar, la clave que sólo tiene
// quien publicó. Es el mismo camino que usan los formularios de los sitios.
// ============================================================================

// Desde dónde se leen la cuenta y los datos: la carpeta donde se ejecuta el servidor (la raíz del repo en
// desarrollo, /app en la imagen, que copia public/). NO import.meta: en el paquete CJS de producción
// (dist/server.cjs) queda vacío y el arranque se caía al cargar este módulo.
const CARPETA_FIGURA = path.join(process.cwd(), 'public', 'geometria-figura');
// La cuenta compartida con el navegador (sin dependencias, UMD).
const require = createRequire(path.join(process.cwd(), 'package.json'));
const comun = require(path.join(CARPETA_FIGURA, 'comun.js'));
const datos = JSON.parse(fs.readFileSync(path.join(CARPETA_FIGURA, 'datos.json'), 'utf8'));

/** Lo que se tarda, como mínimo, en construir una figura. Menos que esto es un programa. */
const TIEMPO_MINIMO_FIGURA_MS = 15000;
const TAMANO_PAGINA = 24;
/** La casilla de novedades, con el mismo texto legal que el boletín de los sitios. */
const RESPONSABLE = 'Luz & Humanidad';

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

const base = () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
const enlaceDe = (id: string) => `${base()}/geometria-figura/?f=${encodeURIComponent(id)}`;

/** Un nombre en una línea, sin caracteres de control y entre 2 y 40 letras. */
function nombreLimpio(v: unknown): string | null {
  const s = String(v ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  return s.length >= 2 && s.length <= 40 ? s : null;
}

const correoValido = (v: string) => v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

/** Una clave de borrado de 192 bits, en texto que se puede pegar. */
const nuevaClave = () => crypto.randomBytes(24).toString('base64url');
const nuevoId = () => crypto.randomBytes(9).toString('base64url');
const idValido = (v: unknown) => typeof v === 'string' && /^[A-Za-z0-9_-]{8,20}$/.test(v);

/** Lo que una figura pública enseña: nunca el correo, ni la clave, ni la casilla. */
const publica = (f: any) => ({ id: f.id, nombre: f.nombre, creada: f.created_at, puntuaciones: f.puntuaciones });

/** El texto del correo de resultados, con las mismas cifras que la pantalla. */
function textoResultados(nombre: string, r: any, enlace: string, clave: string): string {
  const lineas = r.temas.map((t: any) =>
    `- ${t.n}: llegan a básico ${t.basico} de ${t.aspectos} aspectos, a intermedio ${t.intermedio} y a avanzado ${t.avanzado}. ` +
    `Más parecido: ${t.mejor ? `${t.mejor.n} (${t.mejor.parecido} %)` : '—'}.`);
  return [
    `Hola. Esta es tu figura en Geometría política, «${nombre}».`,
    '',
    'Cómo se ha leído cada tema:',
    ...lineas,
    '',
    comun.frasePrincipal(r.general, 'tu figura'),
    '',
    `Tu figura: ${enlace}`,
    `Clave para borrarla (no la compartas): ${clave}`,
    `Para borrarla: abre ${enlace}#clave=${clave} y pulsa «Borrar mi figura».`,
    '',
    'Si no has sido tú quien la ha publicado, ignora este correo.',
    'Recibiste este correo porque dejaste tu dirección al publicar la figura.',
  ].filter(l => l !== undefined).join('\n');
}

/** El registro del servidor NUNCA lleva los valores: un error de base de datos los incluye (correo, huella de la clave).
 *  Se escribe el código y el texto de la consulta, cortado antes de los parámetros. */
function registrarError(etiqueta: string, e: any) {
  const texto = String(e?.message || e || '').split('params:')[0].slice(0, 240);
  console.error(`figuras: ${etiqueta}`, e?.code || '', texto);
}

export function registrarFiguras(app: Express, db: any) {
  // Un envío de otra web que no sea la nuestra no se acepta (la misma regla que los formularios).
  const deLaWeb = (req: Request) => {
    const origen = req.headers.origin;
    if (!origen) return true;
    try { return new URL(origen).host === req.headers.host; } catch { return false; }
  };

  // ---- Publicar -----------------------------------------------------------
  app.post('/api/figuras', guardian(db, REGLAS.formulario, () => null), async (req: Request, res: Response) => {
    try {
      if (!deLaWeb(req)) return res.status(403).json({ error: 'Envía el formulario desde la propia web.' });
      const b = req.body || {};

      // El campo trampa: una persona no lo ve. Si lo rellena un programa, se finge que ha ido bien y no se guarda nada.
      // Como en los formularios de los sitios: también cuenta para el límite de su IP (`ritmo`).
      if (String(b[CAMPO_TRAMPA] ?? '').trim()) {
        void ritmo(db, REGLAS.formulario, ipDe(req));
        return res.status(201).json({ ok: true, id: nuevoId(), clave: nuevaClave(), correo: 'no_pedido' });
      }

      const tiempo = Number(b.tiempo);
      if (!Number.isFinite(tiempo) || tiempo < 0) return res.status(400).json({ error: 'Falta un dato. Recarga la página y vuelve a intentarlo.' });
      if (tiempo < TIEMPO_MINIMO_FIGURA_MS) return res.status(400).json({ error: 'Tómate un momento: revisa tu figura y vuelve a publicarla.', codigo: 'rapido' });

      const nombre = nombreLimpio(b.nombre);
      if (!nombre) return res.status(400).json({ error: 'Pon un nombre de entre 2 y 40 letras.', campo: 'nombre' });

      const correo = normalizarCorreo(b.correo) || null;
      if (correo && !correoValido(correo)) return res.status(400).json({ error: 'Ese correo no parece válido.', campo: 'correo' });

      const novedades = b.novedades === true;
      if (novedades && !correo) return res.status(400).json({ error: 'Para recibir novedades necesitamos tu correo.', campo: 'novedades' });

      if (!comun.figuraValida(b.puntuaciones, datos)) {
        return res.status(400).json({ error: 'La figura no está completa. Revisa los temas.' });
      }

      const id = nuevoId();
      const clave = nuevaClave();
      const textoCasilla = novedades ? textoConsentimiento('boletin', RESPONSABLE) : null;
      await db.execute(sql`
        INSERT INTO figuras_geometria (id, nombre, puntuaciones, correo, quiere_novedades, texto_consentimiento, clave_hash)
        VALUES (${id}, ${nombre}, ${JSON.stringify(b.puntuaciones)}::jsonb, ${correo}, ${novedades}, ${textoCasilla}, ${sha256(clave)})
      `);
      void ritmo(db, REGLAS.formulario, ipDe(req));

      // Los resultados por correo: sólo si lo pidió y sólo si hay proveedor. Sin proveedor no se finge.
      let estadoCorreo: 'no_pedido' | 'enviado' | 'fallido' | 'sin_proveedor' = 'no_pedido';
      if (correo) {
        if (!hayCorreo()) estadoCorreo = 'sin_proveedor';
        else {
          const r = comun.resumen(b.puntuaciones, datos);
          const enlace = enlaceDe(id);
          const enviado = await enviarCorreo({
            para: correo,
            asunto: `Tu figura de Geometría política: ${nombre}`,
            texto: textoResultados(nombre, r, enlace, clave),
          });
          estadoCorreo = enviado ? 'enviado' : 'fallido';
          if (enviado) await db.execute(sql`UPDATE figuras_geometria SET resultados_enviados_at = now() WHERE id = ${id}`);
        }
      }

      res.status(201).json({ ok: true, id, enlace: enlaceDe(id), clave, correo: estadoCorreo });
    } catch (e: any) {
      registrarError('publicar', e);
      res.status(500).json({ error: 'No se ha podido publicar. Prueba de nuevo dentro de un rato.' });
    }
  });

  // ---- La galería (sólo lo publicado, sin nada personal) ----------------
  app.get('/api/figuras', async (req: Request, res: Response) => {
    try {
      const pagina = Math.max(1, Math.min(10000, parseInt(String(req.query.pagina ?? '1'), 10) || 1));
      const total = (await db.execute(sql`SELECT count(*)::int AS n FROM figuras_geometria WHERE estado = 'publicada'`)).rows[0]?.n ?? 0;
      const filas = (await db.execute(sql`
        SELECT id, nombre, puntuaciones, created_at FROM figuras_geometria
        WHERE estado = 'publicada'
        ORDER BY created_at DESC, id
        LIMIT ${TAMANO_PAGINA} OFFSET ${(pagina - 1) * TAMANO_PAGINA}
      `)).rows as any[];
      res.json({ total, pagina, tamano: TAMANO_PAGINA, figuras: filas.map(publica) });
    } catch (e: any) {
      registrarError('galería', e);
      res.status(500).json({ error: 'No se ha podido cargar la galería.' });
    }
  });

  // ---- Quien administra: todas, también las ocultas (va ANTES de /:id) ---
  app.get('/api/figuras/moderacion', requireLevel(4), async (_req: Request, res: Response) => {
    try {
      const filas = (await db.execute(sql`
        SELECT id, nombre, estado, created_at, resultados_enviados_at FROM figuras_geometria
        ORDER BY created_at DESC LIMIT 200
      `)).rows as any[];
      // Sin puntuaciones ni correos: para moderar basta con el nombre y el estado.
      res.json({ figuras: filas });
    } catch (e: any) {
      registrarError('moderación', e);
      res.status(500).json({ error: 'No se ha podido cargar.' });
    }
  });

  app.put('/api/figuras/:id/estado', requireLevel(4), async (req: Request, res: Response) => {
    try {
      const estado = req.body?.estado;
      if (estado !== 'publicada' && estado !== 'oculta') return res.status(400).json({ error: 'El estado debe ser publicada u oculta.' });
      const r = await db.execute(sql`
        UPDATE figuras_geometria SET estado = ${estado}, updated_at = now()
        WHERE id = ${String(req.params.id)} RETURNING id, estado
      `);
      if (!r.rows.length) return res.status(404).json({ error: 'Esa figura no existe.' });
      res.json({ ok: true, ...r.rows[0] });
    } catch (e: any) {
      registrarError('estado', e);
      res.status(500).json({ error: 'No se ha podido cambiar el estado.' });
    }
  });

  // El texto exacto de la casilla de novedades: el mismo que se guarda con cada figura que la marca.
  // Va ANTES de `/:id`, si no «texto-novedades» se tomaría por el id de una figura.
  app.get('/api/figuras/texto-novedades', (_req: Request, res: Response) => {
    res.json({ texto: textoConsentimiento('boletin', RESPONSABLE) });
  });

  // ---- Una figura -----------------------------------------------------------
  app.get('/api/figuras/:id', async (req: Request, res: Response) => {
    try {
      if (!idValido(req.params.id)) return res.status(404).json({ error: 'Esa figura no existe.' });
      const r = await db.execute(sql`
        SELECT id, nombre, puntuaciones, created_at FROM figuras_geometria
        WHERE id = ${req.params.id} AND estado = 'publicada'
      `);
      if (!r.rows.length) return res.status(404).json({ error: 'Esa figura no existe o ya no está publicada.' });
      res.json(publica(r.rows[0]));
    } catch (e: any) {
      registrarError('una', e);
      res.status(500).json({ error: 'No se ha podido cargar la figura.' });
    }
  });

  // ---- Borrarla: sólo con la clave que se dio al publicar -------------------
  app.delete('/api/figuras/:id', guardian(db, REGLAS.formulario, () => null), async (req: Request, res: Response) => {
    try {
      if (!deLaWeb(req)) return res.status(403).json({ error: 'Hazlo desde la propia web.' });
      const ip = ipDe(req);
      const clave = String(req.headers['x-clave-figura'] ?? '');
      const noEncontrada = () => {
        // Cada intento con una clave que no es la suya cuenta como fallo: sin esto se podría probar claves sin límite.
        void anotarFallo(db, REGLAS.formulario, ip);
        return res.status(404).json({ error: 'No encontramos esa figura con esa clave.' });
      };
      if (!idValido(req.params.id) || !clave) return noEncontrada();
      // El correo se borra con la fila: no queda nada suyo en la base de datos.
      const r = await db.execute(sql`
        DELETE FROM figuras_geometria WHERE id = ${req.params.id} AND clave_hash = ${sha256(clave)} RETURNING id
      `);
      if (!r.rows.length) return noEncontrada();
      void ritmo(db, REGLAS.formulario, ip);
      res.json({ ok: true });
    } catch (e: any) {
      registrarError('borrar', e);
      res.status(500).json({ error: 'No se ha podido borrar. Prueba de nuevo.' });
    }
  });
}
