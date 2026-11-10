import express, { type Express, type Request, type Response } from 'express';
import { sql } from 'drizzle-orm';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { todosLosBloques } from '../utils/bloques';
import {
  limpiarConfig, faltaParaAbrir, validarPrestamista, contrato, contratoEnTexto, aceptaciones, IDS_ACEPTACION, marca,
  LIMITES_ADJUNTOS, TIPOS_JUSTIFICANTE, TIEMPO_MINIMO_MS, CAMPO_TRAMPA,
  euros, porcentaje, ibanBonito, interesesBrutos, type ConfigPrestamo, type Prestamista, type Seccion,
} from '../components/bloquesDatos/prestamo/contrato';
import { guardarArchivo, rutaLocalDeUpload } from './uploads';
import { enviarCorreo, hayCorreo, remitenteConNombre } from './correo';
import { paginaVisible, sitioDePagina } from './sitios';
import { rolEnPagina, capacidades, quienDe } from './permisos';
import { Freno, huellaIp, ipVisitante } from './formulariosSitio';

// ============================================================================
// FORMALIZAR UN PRÉSTAMO (2026-11-10, Eugenio en solarcrowd.com)
// ============================================================================
// «Un botón que sea realizar préstamo; un formulario donde se rellenen los datos
// del prestamista, se le expliquen las condiciones, las acepte y firme; que haga
// la transferencia, adjunte el justificante y le dé a formalizar préstamo; y que
// desde el correo de administración se le envíe una copia de lo firmado.»
//
// THE ROUTES
//   Public (only for a published page that carries an open `prestamo` block):
//     POST   /api/prestamo/:pagina/:bloque          sign: data, acceptances, signature, receipt
//   For whoever manages that page:
//     GET    /api/prestamo/:pagina/lista             the signed loans of the page
//     GET    /api/prestamo/archivo/:id/:cual         its PDF, receipt or signature (private files)
//     PUT    /api/prestamo/:id/estado                { estado }
//     DELETE /api/prestamo/:id                       wipe the person's data and files (right to erasure)
//
// WHAT IS TRUSTED. The loan's terms (borrower, IBAN, interest options, term) are read
// from the block as stored in the page, never from the request: a visitor can only
// choose among what the publisher offered. The contract is rebuilt here with the same
// function the screen used (`contrato.ts`), and its SHA-256 goes in the row, the PDF
// and the e-mail, so what was read, signed and sent is provably the same text.
//
// THE BODY. `server.ts` (frozen) parses JSON globally with a 100 kB cap, before any
// module. A receipt does not fit, so the browser sends the JSON as
// `application/x-prestamo-json` and this route parses it with its own 12 MB cap.
//
// THE FILES. Signature, receipt and PDF go to `/uploads/privado/`, which the static
// server never serves (`uploads.ts`): they only come out through the managers' route.

const TIPO_CUERPO = 'application/x-prestamo-json';
const ESTADOS = new Set(['recibido', 'verificado', 'devuelto', 'incidencia', 'anulado']);
const nuevoId = () => `PF${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
/** The short reference the lender sees: the last 6 characters of the id. */
const referencia = (id: string) => id.slice(-6);
const huella = (t: string) => crypto.createHash('sha256').update(t, 'utf8').digest('hex');

/** «10 de noviembre de 2026, 10:32» in Spain's time. */
const fechaHora = (d: Date) => d.toLocaleString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });

/** Did the request come from the site itself? (Same rule as the site forms.) */
function deOtraWeb(req: Request): boolean {
  const origen = req.headers.origin;
  if (!origen || origen === 'null') return false;
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
  try { return new URL(origen).host.toLowerCase() !== host; } catch { return true; }
}

/** The bytes of a `data:` URL or plain base64, or `null`. */
function bytesDe(v: unknown, max: number): Buffer | null {
  if (typeof v !== 'string' || !v) return null;
  const b64 = v.includes(',') ? v.slice(v.indexOf(',') + 1) : v;
  if (b64.length > Math.ceil(max / 3) * 4 + 8 || !/^[A-Za-z0-9+/=\s]+$/.test(b64)) return null;
  const buf = Buffer.from(b64, 'base64');
  return buf.length && buf.length <= max ? buf : null;
}

/** The file is what it says it is (first bytes), not just what its name or type claims. */
function esDelTipo(buf: Buffer, tipo: string): boolean {
  const h = buf.subarray(0, 12);
  if (tipo === 'application/pdf') return h.subarray(0, 5).toString('latin1') === '%PDF-';
  if (tipo === 'image/png') return h.readUInt32BE(0) === 0x89504e47;
  if (tipo === 'image/jpeg') return h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff;
  if (tipo === 'image/webp') return h.subarray(0, 4).toString('latin1') === 'RIFF' && h.subarray(8, 12).toString('latin1') === 'WEBP';
  return false;
}

type BloqueLeido = { cfg: ConfigPrestamo; tituloPagina: string };

/** The `prestamo` block `bloque` of page `pagina`, with its config cleaned. */
async function leerBloque(db: any, pagina: string, bloque: string): Promise<BloqueLeido | null> {
  const w = (await db.execute(sql`
    SELECT title, config FROM knowledge_windows
    WHERE id = ${pagina} AND kind = 'pagina' AND deleted_at IS NULL AND archived_at IS NULL
  `)).rows[0] as any;
  if (!w) return null;
  const b = todosLosBloques(w.config?.bloques).find((x: any) => x?.id === bloque && x?.tipo === 'prestamo');
  return b ? { cfg: limpiarConfig(b.datos || {}), tituloPagina: String(w.title || '') } : null;
}

/** The name the e-mails go out with: the site's (its menu or footer), else the supervisor's short name. */
async function nombreSitio(db: any, pagina: string, respaldo: string): Promise<string> {
  const s = await sitioDePagina(db, pagina).catch(() => null);
  const c = s?.config || {};
  return String(c?.menu?.nombre || c?.pie?.nombre || s?.titulo || respaldo).trim();
}

// ── The PDF: what was signed, with the signature and the fingerprint ────────

async function pdfFirmado(o: {
  sitio: string; ref: string; cuando: Date; cfg: ConfigPrestamo; p: Prestamista; secciones: Seccion[];
  aceptaciones: string[]; firma: Buffer; huella: string;
}): Promise<Buffer> {
  const PDFDocument = (await import('pdfkit')).default;
  const doc = new PDFDocument({ size: 'A4', margins: { top: 56, bottom: 64, left: 60, right: 60 }, info: { Title: `Contrato de préstamo ${o.ref}`, Author: o.sitio } });
  const trozos: Buffer[] = [];
  doc.on('data', (c: Buffer) => trozos.push(c));
  const fin = new Promise<Buffer>(ok => doc.on('end', () => ok(Buffer.concat(trozos))));
  const ancho = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const AZUL = '#2B285C';

  doc.font('Helvetica-Bold').fontSize(16).fillColor(AZUL).text(o.sitio, { continued: true })
    .font('Helvetica').fontSize(10).fillColor('#64748b').text(`   ·   Contrato de préstamo firmado · ref. ${o.ref}`);
  doc.moveTo(doc.page.margins.left, doc.y + 4).lineTo(doc.page.margins.left + ancho, doc.y + 4).lineWidth(2).strokeColor('#FCE136').stroke();
  doc.moveDown(1);
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f172a').text(`Préstamo a ${o.cfg.entidad}`);
  doc.font('Helvetica').fontSize(9.5).fillColor('#475569').text(`Firmado el ${fechaHora(o.cuando)} (hora de España).`);
  doc.moveDown(0.6);

  const fila = (k: string, v: string) => {
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#334155').text(`${k}: `, { continued: true }).font('Helvetica').fillColor('#0f172a').text(v);
  };
  fila('Persona prestamista', `${o.p.nombre} (${o.p.documento})`);
  fila('Importe', euros(o.p.importe));
  fila('Interés', o.p.interes === 0 ? '0 % (préstamo solidario)' : `${porcentaje(o.p.interes)} nominal anual`);
  fila('Duración', `${o.p.plazo} meses`);
  if (o.p.interes > 0) fila('Intereses brutos previstos al vencimiento', `${euros(interesesBrutos(o.p))} (antes de la retención que corresponda)`);
  fila('Transferencia a', `${o.cfg.titularCuenta} · ${ibanBonito(o.cfg.iban)}`);
  fila('Devolución a', ibanBonito(o.p.ibanDevolucion));
  doc.moveDown(0.8);

  for (const s of o.secciones) {
    if (doc.y > doc.page.height - doc.page.margins.bottom - 60) doc.addPage();
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(AZUL).text(s.titulo);
    doc.moveDown(0.2);
    for (const par of s.parrafos) { doc.font('Helvetica').fontSize(9.5).fillColor('#1e293b').text(par, { align: 'justify' }); doc.moveDown(0.35); }
    doc.moveDown(0.3);
  }

  if (doc.y > doc.page.height - doc.page.margins.bottom - 220) doc.addPage();
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(AZUL).text('Lo que la Persona Prestamista ha aceptado');
  doc.moveDown(0.2);
  for (const a of o.aceptaciones) { doc.font('Helvetica').fontSize(9.5).fillColor('#1e293b').text(`[X]  ${a}`); doc.moveDown(0.2); }
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(AZUL).text('Firma de la Persona Prestamista');
  doc.moveDown(0.3);
  try { doc.image(o.firma, { fit: [220, 90] }); } catch { doc.font('Helvetica-Oblique').fontSize(9).text('(La firma no se ha podido incrustar; se conserva como archivo aparte.)'); }
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(9).fillColor('#334155').text(`${o.p.nombre} · ${o.p.documento} · ${fechaHora(o.cuando)}`);
  doc.moveDown(1);
  doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text(`Huella SHA-256 del texto del contrato firmado: ${o.huella}. Sirve para comprobar que el texto no ha cambiado: el mismo texto da siempre la misma huella.`, { width: ancho });
  doc.end();
  return fin;
}

// ── The e-mails ─────────────────────────────────────────────────────────────

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function correoPrestamista(sitio: string, ref: string, cfg: ConfigPrestamo, p: Prestamista) {
  const asunto = `Tu préstamo a ${cfg.entidad}: copia del contrato firmado (ref. ${ref})`;
  const lineas = [
    `Hola, ${p.nombre.split(' ')[0]}:`,
    '',
    `Hemos recibido tu préstamo a ${cfg.entidad}. Te adjuntamos el contrato que has firmado, con las condiciones que has aceptado, tu firma y la huella del texto.`,
    '',
    `· Importe: ${euros(p.importe)}`,
    `· Interés: ${p.interes === 0 ? '0 % (préstamo solidario)' : `${porcentaje(p.interes)} nominal anual`}`,
    `· Duración: ${p.plazo} meses`,
    `· Te devolverán el dinero a la cuenta ${ibanBonito(p.ibanDevolucion)}`,
    `· Referencia: ${ref}`,
    '',
    `Qué pasa ahora: comprobamos que tu transferencia ha llegado a la cuenta de ${cfg.entidad} y te escribimos para confirmarlo. ${cfg.entidad} te devolverá el dinero directamente, como tarde al vencimiento, y si surge cualquier problema, ${sitio} interviene para mediar.`,
    '',
    'Recuerda: prestar tiene riesgo y puedes perder una parte o la totalidad del dinero. Guarda este correo y el PDF.',
    '',
    `Si algo no está bien, responde a este correo${cfg.contacto ? ` o escríbenos (${cfg.contacto})` : ''}.`,
    '',
    sitio,
  ];
  const texto = lineas.join('\n');
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#0f172a;max-width:560px">${lineas.map(l => (l ? `<p style="margin:0 0 6px">${esc(l)}</p>` : '<div style="height:8px"></div>')).join('')}</div>`;
  return { asunto, texto, html };
}

function correoAdministracion(ref: string, cfg: ConfigPrestamo, p: Prestamista, panel: string) {
  const asunto = `Préstamo firmado: ${p.nombre}, ${euros(p.importe)} a ${cfg.entidad} (ref. ${ref})`;
  const texto = [
    `Nueva firma de préstamo a ${cfg.entidad}.`,
    '',
    `Persona: ${p.nombre} · ${p.documento}`,
    `Correo: ${p.email} · Teléfono: ${p.telefono}`,
    `Domicilio: ${p.domicilio}`,
    `Importe: ${euros(p.importe)} · Interés: ${porcentaje(p.interes)} · Duración: ${p.plazo} meses`,
    `Devolución a: ${ibanBonito(p.ibanDevolucion)}`,
    '',
    `Adjuntos: el contrato firmado (PDF) y el justificante de la transferencia que ha subido. Falta comprobar que el dinero ha llegado a la cuenta de ${cfg.entidad} y marcarlo como «verificado» en: ${panel}`,
    '',
    'Responder a este correo le escribe a la persona prestamista.',
  ].join('\n');
  return { asunto, texto };
}

// ── The routes ──────────────────────────────────────────────────────────────

export function registrarPrestamos(app: Express, db: any) {
  const porIp = new Freno(10, 60 * 60_000);      // attempts per connection and hour (the screen validates first)
  const porPagina = new Freno(200, 60 * 60_000); // per loan: an attack from many IPs does not fill the table
  const cuerpo = express.raw({ type: TIPO_CUERPO, limit: '12mb' });

  const gestiona = async (req: Request, res: Response, pagina: string) => {
    res.set('Cache-Control', 'private, no-store');
    if (!req.user || (req as any).miembroSitio) { res.status(401).json({ error: 'Inicia sesión en Humanity.Wiki.' }); return false; }
    const a = await rolEnPagina(db, quienDe(req), pagina);
    if (!a.existe) { res.status(404).json({ error: 'Esa página no existe.' }); return false; }
    if (!capacidades(a).gestionar) { res.status(403).json({ error: 'Solo quien administra esta página ve sus préstamos.' }); return false; }
    return true;
  };

  app.post('/api/prestamo/:pagina/:bloque', cuerpo, async (req: Request, res: Response) => {
    res.set('Cache-Control', 'no-store');
    // Private files written before the row exists: removed again if the row never lands.
    const sueltos: string[] = [];
    let guardado = false;
    try {
      const pagina = String(req.params.pagina), bloque = String(req.params.bloque);
      if (deOtraWeb(req)) return res.status(403).json({ error: 'Este formulario solo se puede enviar desde su propia web.' });
      const ip = huellaIp(ipVisitante(req));
      const espera = porIp.pasar(ip) || porPagina.pasar(pagina);
      if (espera) { res.set('Retry-After', String(espera)); return res.status(429).json({ error: 'Ahora llegan muchos envíos. Prueba dentro de un rato.' }); }

      // Only our own body type: anything else was parsed (or dropped) by someone else on the way.
      let b: any;
      try { if (!Buffer.isBuffer(req.body)) throw new Error('tipo'); b = JSON.parse(req.body.toString('utf8')); }
      catch { return res.status(400).json({ error: 'El envío ha llegado incompleto. Vuelve a intentarlo.' }); }

      const leido = await leerBloque(db, pagina, bloque);
      if (!leido || !(await paginaVisible(db, pagina))) return res.status(404).json({ error: 'Este préstamo no está disponible.' });
      const { cfg } = leido;
      if (!cfg.abierto || faltaParaAbrir(cfg)) return res.status(409).json({ error: 'Este préstamo todavía no está abierto.' });

      // The trap field: answer «done», keep nothing.
      if (String(b?.[CAMPO_TRAMPA] ?? '').trim()) return res.json({ ok: true, ref: '000000', copiaEnviada: false });
      if (!(Number(b?.tiempo) >= TIEMPO_MINIMO_MS)) return res.status(400).json({ error: 'Has ido muy rápido. Lee las condiciones con calma y vuelve a enviarlo.' });

      const v = validarPrestamista(b?.datos || {}, cfg);
      if ('errores' in v) return res.status(400).json({ error: 'Revisa los campos marcados.', campos: v.errores });
      const p = v.datos;

      const marcadas = new Set(Array.isArray(b?.aceptaciones) ? b.aceptaciones.map(String) : []);
      if (!IDS_ACEPTACION.every(id => marcadas.has(id))) return res.status(400).json({ error: 'Tienes que aceptar las tres casillas.', campos: { acepta: 'Marca las tres casillas.' } });

      const firma = bytesDe(b?.firma, LIMITES_ADJUNTOS.firmaBytes);
      if (!firma || !esDelTipo(firma, 'image/png')) return res.status(400).json({ error: 'Falta tu firma.', campos: { firma: 'Firma en el recuadro.' } });

      const tipoJ = String(b?.justificante?.tipo || '').toLowerCase();
      const justificante = TIPOS_JUSTIFICANTE[tipoJ] ? bytesDe(b?.justificante?.datos, LIMITES_ADJUNTOS.justificanteBytes) : null;
      if (!justificante || !esDelTipo(justificante, tipoJ)) {
        return res.status(400).json({ error: 'Falta el justificante de la transferencia (PDF, JPG o PNG, hasta 8 MB).', campos: { justificante: 'Adjunta el justificante.' } });
      }

      // The contract, rebuilt here from the stored terms: the text that is signed.
      const cuando = new Date();
      const secciones = contrato(cfg, p, cuando);
      const texto = contratoEnTexto(secciones);
      const firmaTexto = huella(texto);
      const aceptadas = aceptaciones(cfg).map(a => a.texto);

      const id = nuevoId();
      const ref = referencia(id);
      const sitio = await nombreSitio(db, pagina, marca(cfg));
      const urlFirma = guardarArchivo('image/png', firma, { privado: true }).url; sueltos.push(urlFirma);
      const urlJustificante = guardarArchivo(tipoJ, justificante, { privado: true }).url; sueltos.push(urlJustificante);
      const pdf = await pdfFirmado({ sitio, ref, cuando, cfg, p, secciones, aceptaciones: aceptadas, firma, huella: firmaTexto });
      const urlPdf = guardarArchivo('application/pdf', pdf, { privado: true }).url; sueltos.push(urlPdf);

      await db.execute(sql`
        INSERT INTO prestamos_firmados (id, pagina_id, bloque_id, entidad, nombre, documento, domicilio, email, telefono, iban_devolucion,
          importe, interes, plazo_meses, contrato_texto, contrato_huella, aceptaciones, firmado_at, firma_url, justificante_url, pdf_url)
        VALUES (${id}, ${pagina}, ${bloque}, ${cfg.entidad}, ${p.nombre}, ${p.documento}, ${p.domicilio}, ${p.email}, ${p.telefono}, ${p.ibanDevolucion},
          ${p.importe}, ${p.interes}, ${p.plazo}, ${texto}, ${firmaTexto}, ${JSON.stringify(aceptadas)}::jsonb, ${cuando.toISOString()},
          ${urlFirma}, ${urlJustificante}, ${urlPdf})
      `);
      guardado = true;

      // The copies. A copy that does not leave is never announced as sent.
      const nombrePdf = `contrato-prestamo-${ref}.pdf`;
      let copiaEnviada = false;
      // The signature is already kept: a mail failure must not tell the person it was not.
      if (hayCorreo()) try {
        const c = correoPrestamista(sitio, ref, cfg, p);
        copiaEnviada = await enviarCorreo({
          para: p.email, asunto: c.asunto, texto: c.texto, html: c.html, remitente: remitenteConNombre(sitio),
          responderA: cfg.avisar || undefined, adjuntos: [{ nombre: nombrePdf, tipo: 'application/pdf', contenido: pdf }],
        });
        if (copiaEnviada) await db.execute(sql`UPDATE prestamos_firmados SET copia_prestamista_at = now() WHERE id = ${id}`);
        const a = correoAdministracion(ref, cfg, p, `https://humanity.wiki/paginas/${pagina}`);
        const adjuntos = [
          { nombre: nombrePdf, tipo: 'application/pdf', contenido: pdf },
          { nombre: `justificante-${ref}.${TIPOS_JUSTIFICANTE[tipoJ]}`, tipo: tipoJ, contenido: justificante },
        ];
        let avisado = false;
        for (const para of [cfg.avisar, cfg.correoEntidad].filter(Boolean)) {
          avisado = (await enviarCorreo({ para, asunto: a.asunto, texto: a.texto, remitente: remitenteConNombre(sitio), responderA: p.email, adjuntos })) || avisado;
        }
        if (avisado) await db.execute(sql`UPDATE prestamos_firmados SET aviso_admin_at = now() WHERE id = ${id}`);
      } catch (e: any) { console.error('prestamos: correos', id, e?.message || e); }

      // The PDF goes back too: the lender keeps a copy even if the e-mail does not arrive.
      res.json({ ok: true, ref, copiaEnviada, email: p.email, pdf: pdf.toString('base64'), nombrePdf });
    } catch (e: any) {
      console.error('prestamos: firmar', e?.message || e);
      if (!guardado) for (const url of sueltos) { const r = rutaLocalDeUpload(url); if (r) fs.promises.unlink(r).catch(() => {}); }
      res.status(500).json({ error: guardado
        ? 'Tu préstamo se ha guardado, pero algo ha fallado al terminar. No lo vuelvas a enviar: escríbenos y te mandamos la copia.'
        : 'No se ha podido formalizar el préstamo. No se ha guardado nada: vuelve a intentarlo o escríbenos.' });
    }
  });

  app.get('/api/prestamo/:pagina/lista', async (req: Request, res: Response) => {
    try {
      const pagina = String(req.params.pagina);
      if (!(await gestiona(req, res, pagina))) return;
      const r = await db.execute(sql`
        SELECT id, bloque_id, entidad, nombre, documento, email, telefono, importe::float AS importe, interes::float AS interes, plazo_meses,
               estado, firmado_at, copia_prestamista_at, aviso_admin_at, borrado_at, (justificante_url IS NOT NULL) AS hay_justificante
        FROM prestamos_firmados WHERE pagina_id = ${pagina} ORDER BY created_at DESC LIMIT 500
      `);
      res.json({ prestamos: r.rows });
    } catch (e: any) { console.error('prestamos: lista', e?.message || e); res.status(500).json({ error: 'No se han podido leer los préstamos.' }); }
  });

  const filaDe = async (id: string) => (await db.execute(sql`SELECT * FROM prestamos_firmados WHERE id = ${id}`)).rows[0] as any;

  app.get('/api/prestamo/archivo/:id/:cual', async (req: Request, res: Response) => {
    try {
      const f = await filaDe(String(req.params.id));
      if (!f) return res.status(404).json({ error: 'Ese préstamo no existe.' });
      if (!(await gestiona(req, res, f.pagina_id))) return;
      const cual = String(req.params.cual);
      const url = cual === 'pdf' ? f.pdf_url : cual === 'justificante' ? f.justificante_url : cual === 'firma' ? f.firma_url : null;
      const ruta = url ? rutaLocalDeUpload(url) : null;
      if (!ruta || !fs.existsSync(ruta)) return res.status(404).json({ error: 'Ese archivo ya no existe.' });
      const ext = ruta.split('.').pop();
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.download(ruta, `${cual}-${referencia(f.id)}.${ext}`);
    } catch (e: any) { console.error('prestamos: archivo', e?.message || e); res.status(500).json({ error: 'No se ha podido abrir el archivo.' }); }
  });

  app.put('/api/prestamo/:id/estado', async (req: Request, res: Response) => {
    try {
      const f = await filaDe(String(req.params.id));
      if (!f) return res.status(404).json({ error: 'Ese préstamo no existe.' });
      if (!(await gestiona(req, res, f.pagina_id))) return;
      const estado = String(req.body?.estado || '');
      if (!ESTADOS.has(estado)) return res.status(400).json({ error: 'Estado no válido.' });
      await db.execute(sql`UPDATE prestamos_firmados SET estado = ${estado}, updated_at = now() WHERE id = ${f.id}`);
      res.json({ ok: true, estado });
    } catch (e: any) { console.error('prestamos: estado', e?.message || e); res.status(500).json({ error: 'No se ha podido cambiar el estado.' }); }
  });

  /** The right to erasure: the row keeps the amounts and the fingerprint, nothing that says who it was. */
  app.delete('/api/prestamo/:id', async (req: Request, res: Response) => {
    try {
      const f = await filaDe(String(req.params.id));
      if (!f) return res.status(404).json({ error: 'Ese préstamo no existe.' });
      if (!(await gestiona(req, res, f.pagina_id))) return;
      for (const url of [f.firma_url, f.justificante_url, f.pdf_url]) {
        const ruta = url ? rutaLocalDeUpload(url) : null;
        if (ruta) fs.promises.unlink(ruta).catch(() => {});
      }
      await db.execute(sql`
        UPDATE prestamos_firmados SET nombre = NULL, documento = NULL, domicilio = NULL, email = NULL, telefono = NULL, iban_devolucion = NULL,
          contrato_texto = NULL, firma_url = NULL, justificante_url = NULL, pdf_url = NULL, borrado_at = now(), updated_at = now()
        WHERE id = ${f.id}
      `);
      res.json({ ok: true });
    } catch (e: any) { console.error('prestamos: borrar', e?.message || e); res.status(500).json({ error: 'No se han podido borrar los datos.' }); }
  });
}
