import express from 'express';
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import crypto from 'node:crypto';
import net from 'node:net';
import { configEscaparate, modeloEscaparate } from './seoEscaparate';
import { rolEnPagina, capacidades, quienDe } from './permisos';
import { hayCorreo, enviarCorreo, remitenteConNombre } from './correo';
import {
  validarMensaje, validarAlta, textoConsentimiento, responsableDe, textoMotivo,
  CAMPO_TRAMPA, TIEMPO_MINIMO_MS, TESTIGO, ANCLA_CONFIRMAR, ANCLA_BAJA, ANCLA_RESULTADO, PLAZO_CONFIRMAR_DIAS,
} from '../components/sitio/formularios';

// ============================================================================
// LOS FORMULARIOS DE UN SITIO ESCAPARATE (2026-11-07)
// ============================================================================
// Eugenio, sobre luzhumanidad.com: «con alta calidad, no quiero nada cutre».
// Quien visita un escaparate (`config.sitio.escaparate`) puede escribir para
// colaborar (`FormularioColabora.tsx`) y apuntarse al boletín desde el pie
// (`AltaBoletin.tsx`). Quien administra la página raíz lo ve todo en
// Humanity.Wiki, en `/paginas/:id/formularios` (`FormulariosSitio.tsx`).
//
// LAS RUTAS
//   Públicas (sólo raíces escaparate y publicadas):
//     GET  /api/sitio/:raiz/formulario            los proyectos que se pueden elegir y quién responde de los datos
//     POST /api/sitio/:raiz/mensaje               «quiero colaborar»
//     POST /api/sitio/:raiz/boletin               alta en el boletín (también sin JavaScript: vuelve con un 303)
//     POST /api/sitio/:raiz/boletin/confirmar     { token } del correo de confirmar
//     POST /api/sitio/:raiz/boletin/baja          { token } o ?t= (también la baja en un clic, RFC 8058)
//   De quien administra la raíz:
//     GET    /api/sitio/:raiz/formularios                       mensajes, suscriptores y cifras (?resumen=1: sólo cifras)
//     PUT    /api/sitio/:raiz/formularios/mensajes/:id          { estado }
//     DELETE /api/sitio/:raiz/formularios/mensajes/:id          borra sus datos personales (derecho de supresión)
//     DELETE /api/sitio/:raiz/formularios/suscriptores/:id      da de baja y borra la dirección
//     POST   /api/sitio/:raiz/formularios/confirmaciones        manda el correo de confirmar a los pendientes que no lo recibieron
//     GET    /api/sitio/:raiz/formularios/mensajes.csv
//     GET    /api/sitio/:raiz/formularios/suscriptores.csv   sólo los confirmados (?todos=1: también los pendientes)
//   Y una pasada al día que borra las altas sin confirmar `PLAZO_CONFIRMAR_DIAS` después del correo.
//
// DÓNDE SE GUARDA: en dos tablas propias (migración 0175) y no en dos bases de
// datos de la plataforma. El porqué está en la cabecera de esa migración: la
// historia de las filas de una base de datos se lee sin sesión.
//
// CONTRA LOS PROGRAMAS QUE RELLENAN FORMULARIOS, cuatro cosas y ninguna molesta
// a una persona: el campo trampa (se finge que ha ido bien y no se guarda nada),
// un tiempo mínimo de rellenado, un freno por IP EN MEMORIA y sin guardar la IP
// (la clave es una huella con una sal que cambia en cada arranque; la IP sale de
// `ipVisitante`, que no se fía de lo que escriba quien llama), y que el envío
// venga de la propia web (`Origin`). El boletín, además, pide confirmar por
// correo: sin eso cualquiera podría apuntar la dirección de otro.
//
// CORREO. Sin proveedor (`hayCorreo()`, en `correo.ts`): los
// mensajes se guardan y las altas quedan «pendientes de confirmar», y la
// pantalla nunca dice que se ha mandado un correo que no ha salido. Con
// proveedor: aviso a la dirección de contacto del sitio por cada mensaje (con
// «Responder» hacia quien escribió), doble confirmación del boletín y, en TODO
// correo que salga hacia un suscriptor —también los boletines que se manden
// mañana—, el enlace para darse de baja (`enlacesDe(...).baja` y las cabeceras
// `List-Unsubscribe`). Antes de mandar un boletín, sólo a los `confirmado`.

// ── Lo que el módulo necesita de fuera (se puede cambiar en las pruebas) ─────

export type SitioForm = { raiz: string; titulo: string; config: any; nombre: string; responsable: string; contacto: string | null };
export type SeccionProyectos = { area: string; proyectos: Array<{ slug: string; titulo: string }> };
type Gestion = { ok: true } | { ok: false; codigo: number; error: string };

export type Dependencias = {
  /** El sitio de esa raíz si es un escaparate publicado; `null` si no. */
  sitio: (raiz: string) => Promise<SitioForm | null>;
  /** Los proyectos que se pueden elegir, por área (los del mapa del pie). */
  proyectos: (s: SitioForm) => Promise<SeccionProyectos[]>;
  /** ¿Administra quien llama esa raíz? (dueño o «Administrar»). */
  gestiona: (req: Request, raiz: string) => Promise<Gestion>;
  /** La dirección pública del sitio (`https://luzhumanidad.com`), para los enlaces de los correos. */
  direccion: (req: Request | null, raiz: string) => Promise<string | null>;
  enviar: typeof enviarCorreo;
  hayCorreo: () => boolean;
};

const linea = (v: unknown) => String(v ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();

function dependenciasPorDefecto(db: any): Dependencias {
  const memoria = new Map<string, { t: number; s: SitioForm | null }>();
  return {
    async sitio(raiz) {
      const m = memoria.get(raiz);
      if (m && Date.now() - m.t < 60_000) return m.s;
      const w = (await db.execute(sql`
        SELECT id, title, config->'sitio' AS sitio FROM knowledge_windows
        WHERE id = ${raiz} AND kind = 'pagina' AND publico = true AND deleted_at IS NULL AND archived_at IS NULL
      `)).rows[0] as any;
      const cfg = w?.sitio?.escaparate === true ? w.sitio : null;
      const s = cfg ? sitioForm(raiz, String(w.title || ''), cfg) : null;
      memoria.set(raiz, { t: Date.now(), s });
      if (memoria.size > 500) memoria.clear();
      return s;
    },
    async proyectos(s) {
      // El mismo modelo que pinta la portada y el mapa del pie (`seoEscaparate.ts`), con su memoria de dos minutos.
      const cfg = await configEscaparate(db, s.raiz);
      if (!cfg) return [];
      const m = await modeloEscaparate(db, s.raiz, cfg);
      return m.secciones.map(sec => ({
        area: sec.titulo,
        proyectos: sec.entradas.map(e => ({ slug: e.url.replace(/^\/+/, '').toLowerCase(), titulo: e.titulo })),
      }));
    },
    async gestiona(req, raiz) {
      if (!req.user || (req as any).miembroSitio) return { ok: false, codigo: 401, error: 'Inicia sesión en Humanity.Wiki.' };
      const a = await rolEnPagina(db, quienDe(req), raiz);
      if (!a.existe) return { ok: false, codigo: 404, error: 'Esa página no existe.' };
      if (!capacidades(a).gestionar) return { ok: false, codigo: 403, error: 'Solo quien administra esta web ve sus mensajes y su boletín.' };
      return { ok: true };
    },
    async direccion(req, raiz) {
      // Un dominio propio activo de esta raíz (el de la petición, si es uno de ellos). NUNCA
      // la cabecera `Host` sin más: con ella, cualquiera podría hacer que el correo de
      // confirmar llevara a otra web.
      const host = req ? String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase().replace(/:\d+$/, '') : '';
      const d = (await db.execute(sql`
        SELECT dominio FROM dominios_paginas
        WHERE entidad_tipo = 'pagina' AND entidad_id = ${raiz} AND estado = 'activo' AND redirigir_a IS NULL
        ORDER BY (dominio = ${host}) DESC, created_at LIMIT 1
      `)).rows[0] as any;
      if (d?.dominio) return `https://${d.dominio}`;
      const w = (await db.execute(sql`
        SELECT w.slug, u.handle FROM knowledge_windows w JOIN users u ON u.id = w.creator_user_id WHERE w.id = ${raiz}
      `)).rows[0] as any;
      return w?.slug && w?.handle ? `https://humanity.wiki/@${w.handle}/${w.slug}` : null;
    },
    enviar: enviarCorreo,
    hayCorreo,
  };
}

/** Lo que hace falta del sitio para los formularios, sacado de su `config.sitio`. */
export function sitioForm(raiz: string, titulo: string, cfg: any): SitioForm {
  const nombre = linea(cfg?.pie?.nombre) || linea(cfg?.menu?.nombre) || linea(titulo) || linea(cfg?.seo?.organizacion) || 'esta web';
  const contacto = linea(cfg?.pie?.contacto?.email) || linea(cfg?.titular?.email) || null;
  return { raiz, titulo, config: cfg, nombre, responsable: responsableDe(cfg, nombre), contacto };
}

// ── Quién envía: su IP, sin fiarse de lo que escriba ───────────────────────
//
// 2026-11-07, revisión: «el límite por IP se puede saltar en luzhumanidad.com».
// `ipDe()` (`limites/`) toma primero `CF-Connecting-IP`, y esa cabecera sólo es
// de fiar si la petición ha pasado por Cloudflare. humanity.wiki va detrás de
// Cloudflare, pero los dominios propios llegan directos a Caddy (bloque `:443`
// del Caddyfile), y ahí la escribe quien llama: 45 envíos cambiándola no
// recibían ni un 429. Tampoco basta con mirar el dominio: la IP del servidor es
// pública (es la de luzhumanidad.com), y una petición directa a ella con
// `Host: humanity.wiki` traería la cabecera que quisiera.
//
// Lo que no se puede falsificar es QUIÉN SE CONECTÓ A CADDY. Caddy escribe
// `X-Forwarded-For`: sin `trusted_proxies` (hoy) tira lo que trajera la petición
// y pone esa conexión; con ellos, la añade al final. El ÚLTIMO valor es siempre
// la conexión. Si es de Cloudflare (sus rangos publicados), quien visita es quien
// Cloudflare pone en `CF-Connecting-IP`; si no, es la propia conexión. El puerto
// de `app` no está publicado (docker-compose.prod.yml): todo pasa por Caddy.
//
// Los rangos, de https://www.cloudflare.com/ips-v4 y /ips-v6 (leídos el
// 2026-11-07). Si Cloudflare añadiera uno, lo peor que pasa es que las visitas
// que entren por él cuenten como de la misma conexión: más freno, nunca menos.
const CLOUDFLARE = (() => {
  const l = new net.BlockList();
  const poner = (rangos: string[], tipo: 'ipv4' | 'ipv6') => {
    for (const r of rangos) { const [ip, bits] = r.split('/'); l.addSubnet(ip, Number(bits), tipo); }
  };
  poner(['173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18', '108.162.192.0/18',
    '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
    '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22'], 'ipv4');
  poner(['2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32', '2a06:98c0::/29', '2c0f:f248::/32'], 'ipv6');
  return l;
})();

/** Una IP tal como llega en una cabecera: sin espacios, sin corchetes y sin el `::ffff:` de una IPv4 vista como IPv6. */
const limpiarIp = (v: string) => v.trim().replace(/^\[|\]$/g, '').replace(/^::ffff:(?=\d{1,3}(\.\d{1,3}){3}$)/i, '');

export function esDeCloudflare(ip: string): boolean {
  const v = net.isIP(ip);
  return v === 4 ? CLOUDFLARE.check(ip, 'ipv4') : v === 6 ? CLOUDFLARE.check(ip, 'ipv6') : false;
}

/** La IP de quien envía el formulario (ver arriba). */
export function ipVisitante(req: Request): string {
  const cadena = String(req.headers['x-forwarded-for'] || '').split(',').map(limpiarIp).filter(Boolean);
  const conexion = cadena[cadena.length - 1] || limpiarIp(String(req.socket?.remoteAddress || '')) || 'desconocida';
  if (esDeCloudflare(conexion)) {
    const cf = limpiarIp(String(req.headers['cf-connecting-ip'] || ''));
    if (net.isIP(cf)) return cf;
  }
  return conexion;
}

// ── El freno, en memoria y sin guardar ninguna IP ───────────────────────────

/** Una sal por arranque: la misma IP da la misma huella mientras el proceso
 *  vive, y ninguna huella se puede volver a convertir en la IP. */
const SAL = crypto.randomBytes(16);
export const huellaIp = (ip: string) => crypto.createHash('sha256').update(SAL).update(ip).digest('base64url').slice(0, 22);

/**
 * Como mucho `max` golpes en `ventanaMs` por clave. EN MEMORIA, a propósito (el
 * freno de `limites/` guarda la IP en la base de datos y aquí no se quiere): con
 * un solo proceso —producción hoy— es exacto; el día que haya varios, cada uno
 * frena por su cuenta y el límite real se multiplica por el número de procesos.
 */
export class Freno {
  private golpes = new Map<string, number[]>();
  constructor(private max: number, private ventanaMs: number, private tope = 20_000) {}
  /** 0 si puede pasar (y queda apuntado); si no, los segundos que le faltan. */
  pasar(clave: string, ahora = Date.now()): number {
    const desde = ahora - this.ventanaMs;
    const lista = (this.golpes.get(clave) || []).filter(t => t > desde);
    if (lista.length >= this.max) {
      this.golpes.set(clave, lista);
      return Math.max(1, Math.ceil((lista[0] + this.ventanaMs - ahora) / 1000));
    }
    lista.push(ahora);
    this.golpes.set(clave, lista);
    if (this.golpes.size > this.tope) {
      for (const [k, l] of this.golpes) if (!l.some(t => t > desde)) this.golpes.delete(k);
      if (this.golpes.size > this.tope) this.golpes.clear();
    }
    return 0;
  }
}

// ── Testigos y enlaces ──────────────────────────────────────────────────────

export const nuevoTestigo = () => crypto.randomBytes(32).toString('base64url');
export const huellaTestigo = (t: string) => crypto.createHash('sha256').update(t).digest('hex');
const nuevoId = (p: string) => `${p}${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

/** Los enlaces de un correo del boletín. El testigo va detrás de `#` (ver `formularios.ts`). */
export function enlacesDe(base: string, raiz: string, confirmar: string | null, baja: string) {
  const u = new URL(base);
  // `https://luzhumanidad.com/#…`, o `https://humanity.wiki/@quien/pagina#…` (sin barra
  // al final, que sería otra dirección). La API cuelga siempre de la raíz del dominio.
  const b = u.pathname === '/' ? `${u.origin}/` : base.replace(/\/+$/, '');
  const origen = u.origin;
  return {
    confirmar: confirmar ? `${b}#${ANCLA_CONFIRMAR}=${confirmar}` : null,
    baja: `${b}#${ANCLA_BAJA}=${baja}`,
    /** La baja en un clic (RFC 8058): la llama el programa de correo, con POST. */
    bajaDirecta: `${origen}/api/sitio/${encodeURIComponent(raiz)}/boletin/baja?t=${baja}`,
  };
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Un correo sobrio que se lee bien en cualquier programa: una tarjeta blanca,
 *  un botón y el pie con la baja. Los colores van escritos aquí porque los
 *  programas de correo no leen hojas de estilo. */
function correoHtml(o: { marca: string; titulo: string; parrafos: string[]; boton?: { texto: string; url: string }; pie: string[] }) {
  const p = (t: string) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155">${t}</p>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(o.titulo)}</title></head>`
    + `<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px"><tr><td align="center">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px">`
    + `<tr><td><p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#64748b">${esc(o.marca)}</p>`
    + `<h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;font-weight:900;color:#0f172a">${esc(o.titulo)}</h1>`
    + o.parrafos.map(p).join('')
    + (o.boton ? `<p style="margin:24px 0"><a href="${esc(o.boton.url)}" style="display:inline-block;background:#fbbf24;color:#0f172a;font-weight:800;font-size:16px;text-decoration:none;padding:14px 24px;border-radius:999px">${esc(o.boton.texto)}</a></p>`
      + `<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#64748b">Si el botón no funciona, copia esta dirección en tu navegador:<br><a href="${esc(o.boton.url)}" style="color:#047857;word-break:break-all">${esc(o.boton.url)}</a></p>` : '')
    + `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">`
    + o.pie.map(t => `<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#64748b">${t}</p>`).join('')
    + `</td></tr></table></td></tr></table></body></html>`;
}

/** El correo de confirmar el alta. */
export function correoConfirmacion(s: SitioForm, email: string, enlaces: ReturnType<typeof enlacesDe>) {
  const asunto = `Confirma tu suscripción al boletín de ${s.nombre}`;
  const sinConfirmar = `Si no has sido tú, no hagas nada: sin confirmar no te enviaremos ningún boletín, y en ${PLAZO_CONFIRMAR_DIAS} días borraremos esta dirección.`;
  const texto = [
    'Hola:',
    `Alguien —esperamos que tú— ha pedido recibir el boletín de ${s.nombre} en esta dirección (${email}).`,
    `Para confirmarlo, abre este enlace:\n${enlaces.confirmar}`,
    sinConfirmar,
    `Para darte de baja y borrar tu dirección en cualquier momento:\n${enlaces.baja}`,
    `${s.responsable} · ${s.nombre}`,
  ].join('\n\n');
  const html = correoHtml({
    marca: s.nombre, titulo: 'Confirma tu suscripción',
    parrafos: [
      `Alguien —esperamos que tú— ha pedido recibir el boletín de <strong>${esc(s.nombre)}</strong> en esta dirección (${esc(email)}).`,
      'Para empezar a recibirlo, confirma que eres tú:',
    ],
    boton: { texto: 'Confirmar suscripción', url: enlaces.confirmar! },
    pie: [
      sinConfirmar,
      `<a href="${esc(enlaces.baja)}" style="color:#64748b">Darme de baja y borrar mi dirección</a>`,
      `${esc(s.responsable)} · ${esc(s.nombre)}`,
    ],
  });
  return { asunto, texto, html };
}

/** El aviso a quien ya estaba suscrito y lo vuelve a pedir: no se le cambia nada. */
export function correoYaSuscrito(s: SitioForm, email: string, enlaces: ReturnType<typeof enlacesDe>) {
  const asunto = `Ya estás suscrito al boletín de ${s.nombre}`;
  const texto = [
    'Hola:',
    `Hemos recibido otra petición para recibir el boletín de ${s.nombre} en ${email}, y esta dirección ya estaba confirmada. No tienes que hacer nada.`,
    `Si quieres darte de baja y borrar tu dirección:\n${enlaces.baja}`,
    `${s.responsable} · ${s.nombre}`,
  ].join('\n\n');
  const html = correoHtml({
    marca: s.nombre, titulo: 'Ya estás suscrito',
    parrafos: [`Hemos recibido otra petición para recibir el boletín de <strong>${esc(s.nombre)}</strong> en ${esc(email)}, y esta dirección ya estaba confirmada. No tienes que hacer nada.`],
    pie: [`<a href="${esc(enlaces.baja)}" style="color:#64748b">Darme de baja y borrar mi dirección</a>`, `${esc(s.responsable)} · ${esc(s.nombre)}`],
  });
  return { asunto, texto, html };
}

/** El aviso de un mensaje nuevo, a la dirección de contacto del sitio. */
export function correoAviso(s: SitioForm, m: { nombre: string; email: string; motivo: string; proyecto: string | null; mensaje: string; origen: string | null }, panel: string) {
  const motivo = textoMotivo(m.motivo);
  const asunto = `Nuevo mensaje en ${s.nombre}: ${motivo} · ${m.nombre}`;
  const datos: Array<[string, string]> = [
    ['Nombre', m.nombre], ['Correo', m.email], ['Cómo quiere colaborar', motivo],
    ...(m.proyecto ? [['Proyecto', m.proyecto] as [string, string]] : []),
    ...(m.origen ? [['Enviado desde', m.origen] as [string, string]] : []),
  ];
  const texto = [
    datos.map(([k, v]) => `${k}: ${v}`).join('\n'),
    `Mensaje:\n${m.mensaje}`,
    `Para contestar, responde a este correo: la respuesta le llegará a ${m.nombre}.`,
    `Todos los mensajes y el boletín: ${panel}`,
  ].join('\n\n');
  const html = correoHtml({
    marca: s.nombre, titulo: `${motivo} · ${m.nombre}`,
    parrafos: [
      datos.map(([k, v]) => `<strong>${esc(k)}:</strong> ${esc(v)}`).join('<br>'),
      `<span style="white-space:pre-line">${esc(m.mensaje)}</span>`,
    ],
    boton: { texto: 'Ver todos los mensajes', url: panel },
    pie: [`Para contestar, responde a este correo: la respuesta le llegará a ${esc(m.nombre)}.`],
  });
  return { asunto, texto, html };
}

/** El aviso a quien administra cada vez que una persona se confirma en el boletín (2026-11-09:
 *  «cada vez que alguien se suscribe»). Solo la primera confirmación: repetir el enlace no avisa. */
export function correoAltaBoletin(s: SitioForm, email: string, panel: string) {
  const asunto = `Nueva suscripción al boletín de ${s.nombre}: ${email}`;
  const texto = [
    `Se ha confirmado una nueva suscripción al boletín de ${s.nombre}.`,
    `Correo: ${email}`,
    `Para ver todas las suscripciones y exportarlas: ${panel}`,
  ].join('\n\n');
  const html = correoHtml({
    marca: s.nombre, titulo: 'Nueva suscripción al boletín',
    parrafos: [`Se ha confirmado una nueva suscripción al boletín de <strong>${esc(s.nombre)}</strong>.`,
      `<strong>Correo:</strong> ${esc(email)}`],
    boton: { texto: 'Ver las suscripciones', url: panel },
    pie: [`${esc(s.responsable)} · ${esc(s.nombre)}`],
  });
  return { asunto, texto, html };
}

// ── Las rutas ───────────────────────────────────────────────────────────────

/** ¿Viene el envío de la propia web? Un navegador pone `Origin` en todo POST de
 *  un formulario; si dice otro anfitrión, es otra web intentando usar el nuestro. */
function deOtraWeb(req: Request): boolean {
  const origen = req.headers.origin;
  if (!origen || origen === 'null') return false;
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
  try { return new URL(origen).host.toLowerCase() !== host; } catch { return true; }
}

/** Los milisegundos que tardó en rellenarse: los cuenta el navegador (`tiempo`);
 *  sin JavaScript, el servidor desde la hora a la que pintó el formulario (`inicio`). */
function tiempoDe(b: any, ahora = Date.now()): number | null {
  const t = Number(b?.tiempo);
  if (Number.isFinite(t) && t >= 0) return t;
  const i = Number(b?.inicio);
  if (Number.isFinite(i) && i > 0 && i <= ahora) return ahora - i;
  return null;
}

/** La página desde la que se envió: sólo la ruta, sin `?` ni `#`. */
const origenDe = (v: unknown) => {
  const s = String(v ?? '').trim();
  return /^\/[^\s?#]{0,200}$/.test(s) ? s : null;
};

const ESTADOS_MENSAJE = new Set(['nuevo', 'leido', 'respondido', 'archivado']);
/** Como mucho un correo cada diez minutos a la misma dirección, aunque lo pidan cien veces. */
const ENTRE_CORREOS_MS = 10 * 60_000;

/** Lo que lee quien ha tocado el freno de su conexión. No le atribuye nada: detrás
 *  de la misma IP puede haber un aula entera o los clientes de una operadora móvil. */
const textoFrenoIp = (segundos: number) => segundos > 30 * 60
  ? 'Ahora llegan muchos envíos desde tu conexión. Prueba más tarde.'
  : 'Ahora llegan muchos envíos desde tu conexión. Prueba dentro de unos minutos.';

/**
 * LAS ALTAS QUE NADIE CONFIRMA (2026-11-07, revisión: «se guardan para siempre»).
 * Se borran `PLAZO_CONFIRMAR_DIAS` días después del último correo de confirmar que
 * salió: la fila entera, porque nunca fue una suscripción y no hay nada que contar.
 * Las que nunca recibieron ese correo (hoy, sin proveedor, todas) esperan a que se
 * pueda mandar: el plazo empieza con el correo. Lo dicen la política y el correo.
 */
export async function borrarSinConfirmar(db: any): Promise<number> {
  const r = await db.execute(sql`
    DELETE FROM sitio_suscriptores
    WHERE estado = 'pendiente' AND correo_enviado_at IS NOT NULL
      AND correo_enviado_at < now() - make_interval(days => ${PLAZO_CONFIRMAR_DIAS})
    RETURNING id
  `);
  return r.rows.length;
}

export function registrarFormulariosSitio(app: Express, db: any, cambios: Partial<Dependencias> = {}) {
  const d: Dependencias = { ...dependenciasPorDefecto(db), ...cambios };

  // LOS FRENOS (revisión del 2026-11-07). Los de cada IP son holgados a propósito:
  // en una charla de «Divulgación en Colegios» treinta personas comparten la wifi,
  // y detrás del CGNAT de una operadora móvil, miles. Lo que de verdad para un
  // ataque es el tope de cada sitio, y en el boletín, un correo cada diez minutos
  // como mucho a la misma dirección.
  const peticiones = new Freno(150, 10 * 60_000);      // todo lo que llega, por IP
  const mensajes10 = new Freno(10, 10 * 60_000);       // mensajes guardados, por IP
  const mensajesDia = new Freno(20, 24 * 3_600_000);
  const altas10 = new Freno(40, 10 * 60_000);          // altas, por IP
  const mensajesSitio = new Freno(120, 3_600_000);     // por sitio: un ataque desde muchas IP no llena el buzón
  const altasSitio = new Freno(300, 3_600_000);
  const enlaces = new Freno(30, 10 * 60_000);          // confirmar y baja desde la web, por IP
  // La baja en un clic (RFC 8058) no la pide quien lee: la pide su proveedor de
  // correo (Gmail, Yahoo…) desde unas pocas IP para miles de personas. El día que
  // salga un boletín, un tope de 30 perdería bajas. El testigo de 256 bits ya hace
  // de llave; esto sólo pone un techo a la carga.
  const bajasDirectas = new Freno(1000, 10 * 60_000);

  // Una pasada al día por las altas sin confirmar (la primera, a los diez minutos de arrancar).
  const pasada = () => { borrarSinConfirmar(db).catch((e: any) => console.error('formularios: altas sin confirmar', e?.message || e)); };
  setTimeout(pasada, 10 * 60_000).unref?.();
  setInterval(pasada, 24 * 3_600_000).unref?.();

  // El alta del pie también funciona sin JavaScript (un formulario de los de siempre).
  const deFormulario = express.urlencoded({ extended: false, limit: '20kb' });

  /** Lo que se le contesta a quien envía: JSON, o vuelta a la página si era un formulario sin JavaScript. */
  const contestar = (req: Request, res: Response, codigo: number, cuerpo: any, resultado?: string) => {
    if (req.is('application/x-www-form-urlencoded')) {
      // Sólo a una página de la misma web; si no, a la portada. Y con UNA barra
      // delante: `//luz-para-kenia` (que también pinta la página) volvería como
      // `Location: //luz-para-kenia#…`, que el navegador lee como otro dominio.
      let vuelta = '/';
      try {
        const r = new URL(String(req.headers.referer || ''));
        const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
        if (r.host.toLowerCase() === host) vuelta = r.pathname.replace(/^\/+/, '/');
      } catch { /* sin referer válido: la portada */ }
      return res.redirect(303, `${vuelta}#${ANCLA_RESULTADO}=${resultado || (codigo < 300 ? 'guardado' : 'error')}`);
    }
    return res.status(codigo).json(cuerpo);
  };

  const sitioPublico = async (req: Request, res: Response): Promise<SitioForm | null> => {
    res.set('Cache-Control', 'no-store');
    const s = await d.sitio(String(req.params.raiz));
    if (!s) { contestar(req, res, 404, { error: 'Este formulario no está disponible.' }); return null; }
    if (deOtraWeb(req)) { contestar(req, res, 403, { error: 'Este formulario solo se puede enviar desde su propia web.' }); return null; }
    return s;
  };

  const frenado = (req: Request, res: Response, segundos: number, texto: string) => {
    res.set('Retry-After', String(segundos));
    contestar(req, res, 429, { error: texto, espera: segundos }, 'espera');
  };

  // ── Lo que necesita el formulario de colaborar ────────────────────────────
  app.get('/api/sitio/:raiz/formulario', async (req: Request, res: Response) => {
    try {
      const s = await d.sitio(String(req.params.raiz));
      if (!s) return res.status(404).json({ error: 'Este formulario no está disponible.' });
      const secciones = await d.proyectos(s).catch(() => []);
      res.set('Cache-Control', 'public, max-age=300').json({ nombre: s.nombre, responsable: s.responsable, secciones });
    } catch (e: any) { console.error('formularios:', e); res.status(500).json({ error: 'No se ha podido cargar el formulario.' }); }
  });

  // ── «Quiero colaborar» ────────────────────────────────────────────────────
  app.post('/api/sitio/:raiz/mensaje', async (req: Request, res: Response) => {
    try {
      const s = await sitioPublico(req, res);
      if (!s) return;
      const ip = huellaIp(ipVisitante(req));
      const espera = peticiones.pasar(ip);
      if (espera) return frenado(req, res, espera, textoFrenoIp(espera));
      const b = req.body || {};

      // El campo trampa: se contesta que ha ido bien, sin pistas, y no se guarda nada.
      if (String(b[CAMPO_TRAMPA] ?? '').trim()) { mensajes10.pasar(ip); return res.json({ ok: true }); }
      const tiempo = tiempoDe(b);
      if (tiempo === null) return res.status(400).json({ error: 'Falta un dato del formulario. Recarga la página y vuelve a enviarlo.' });
      if (tiempo < TIEMPO_MINIMO_MS.mensaje) return res.status(400).json({ error: 'Has ido muy rápido. Espera un par de segundos y vuelve a enviarlo.', codigo: 'rapido' });

      const secciones = await d.proyectos(s).catch(() => [] as SeccionProyectos[]);
      const proyectos = secciones.flatMap(x => x.proyectos);
      // Sin la lista (no se ha podido leer), el proyecto sólo se comprueba por su forma:
      // un fallo nuestro no le cuesta el mensaje a quien escribe.
      const v = validarMensaje(b, proyectos.length ? proyectos.map(p => p.slug) : null);
      if ('errores' in v) return res.status(400).json({ error: 'Revisa los campos marcados.', campos: v.errores });

      let e = mensajes10.pasar(ip) || mensajesDia.pasar(ip);
      if (e) return frenado(req, res, e, textoFrenoIp(e));
      e = mensajesSitio.pasar(s.raiz);
      if (e) return frenado(req, res, e, 'Ahora mismo estamos recibiendo muchos mensajes. Prueba dentro de un rato.');

      const proyecto = v.datos.proyecto ? proyectos.find(p => p.slug === v.datos.proyecto) || null : null;
      const id = nuevoId('SM');
      const origen = origenDe(b.origen);
      await db.execute(sql`
        INSERT INTO sitio_mensajes (id, raiz_id, nombre, email, mensaje, motivo, proyecto_slug, proyecto_titulo, origen, consentimiento_texto, consentimiento_at)
        VALUES (${id}, ${s.raiz}, ${v.datos.nombre}, ${v.datos.email}, ${v.datos.mensaje}, ${v.datos.motivo},
                ${proyecto?.slug || null}, ${proyecto?.titulo || null}, ${origen},
                ${textoConsentimiento('mensaje', s.responsable)}, now())
      `);

      // El aviso a quien administra, sin hacer esperar a quien escribe. Sólo se
      // apunta como enviado si el proveedor dijo que sí.
      if (d.hayCorreo() && s.contacto) {
        const c = correoAviso(s, { ...v.datos, proyecto: proyecto?.titulo || null, origen }, `https://humanity.wiki/paginas/${encodeURIComponent(s.raiz)}/formularios`);
        void d.enviar({ para: s.contacto, asunto: c.asunto, texto: c.texto, html: c.html, remitente: remitenteConNombre(s.nombre), responderA: v.datos.email })
          .then(ok => ok ? db.execute(sql`UPDATE sitio_mensajes SET aviso_enviado_at = now() WHERE id = ${id}`) : null)
          .catch((er: any) => console.error('formularios: aviso', er?.message || er));
      }
      res.json({ ok: true });
    } catch (e: any) { console.error('formularios: mensaje', e); res.status(500).json({ error: 'No hemos podido guardar tu mensaje. Inténtalo de nuevo dentro de un momento.' }); }
  });

  // ── El boletín: el alta ───────────────────────────────────────────────────
  app.post('/api/sitio/:raiz/boletin', deFormulario, async (req: Request, res: Response) => {
    try {
      const s = await sitioPublico(req, res);
      if (!s) return;
      const ip = huellaIp(ipVisitante(req));
      const espera = peticiones.pasar(ip);
      if (espera) return frenado(req, res, espera, textoFrenoIp(espera));
      const b = req.body || {};
      if (String(b[CAMPO_TRAMPA] ?? '').trim()) { altas10.pasar(ip); return contestar(req, res, 200, { ok: true, resultado: 'guardado' }, 'guardado'); }
      const tiempo = tiempoDe(b);
      if (tiempo === null) return contestar(req, res, 400, { error: 'Falta un dato del formulario. Recarga la página y vuelve a intentarlo.' });
      if (tiempo < TIEMPO_MINIMO_MS.boletin) return contestar(req, res, 400, { error: 'Has ido muy rápido. Espera un segundo y vuelve a intentarlo.', codigo: 'rapido' }, 'rapido');
      const v = validarAlta(b);
      if ('errores' in v) return contestar(req, res, 400, { error: v.errores.email || v.errores.consentimiento, campos: v.errores });

      let e = altas10.pasar(ip);
      if (e) return frenado(req, res, e, textoFrenoIp(e));
      e = altasSitio.pasar(s.raiz);
      if (e) return frenado(req, res, e, 'Ahora mismo estamos recibiendo muchas altas. Prueba dentro de un rato.');

      const consentimiento = textoConsentimiento('boletin', s.responsable);
      const origen = origenDe(b.origen);
      const leer = async () => (await db.execute(sql`
        SELECT id, estado, token_baja, correo_enviado_at FROM sitio_suscriptores WHERE raiz_id = ${s.raiz} AND email = ${v.email}
      `)).rows[0] as any;
      let fila = await leer();
      if (!fila) {
        try {
          await db.execute(sql`
            INSERT INTO sitio_suscriptores (id, raiz_id, email, estado, token_baja, consentimiento_texto, consentimiento_at, origen)
            VALUES (${nuevoId('SS')}, ${s.raiz}, ${v.email}, 'pendiente', ${nuevoTestigo()}, ${consentimiento}, now(), ${origen})
          `);
        } catch (er: any) {
          // Dos altas a la vez con el mismo correo: gana una y la otra la lee.
          if (er?.code !== '23505' && er?.cause?.code !== '23505') throw er;
        }
        fila = await leer();
      } else if (fila.estado === 'pendiente') {
        // Lo vuelve a pedir: vale el consentimiento de ahora.
        await db.execute(sql`
          UPDATE sitio_suscriptores SET consentimiento_texto = ${consentimiento}, consentimiento_at = now(), origen = COALESCE(${origen}, origen), updated_at = now()
          WHERE id = ${fila.id}
        `);
      }
      if (!fila) throw new Error('el alta no se ha guardado');

      // SIN CORREO: guardado y pendiente de confirmar, y la pantalla no dice que haya salido nada.
      if (!d.hayCorreo()) return contestar(req, res, 200, { ok: true, resultado: 'guardado' }, 'guardado');
      // Un correo cada diez minutos como mucho a la misma dirección: nadie puede usar este formulario para llenarle el buzón a otro.
      if (fila.correo_enviado_at && Date.now() - new Date(fila.correo_enviado_at).getTime() < ENTRE_CORREOS_MS) {
        return contestar(req, res, 200, { ok: true, resultado: 'reciente' }, 'reciente');
      }
      const base = await d.direccion(req, s.raiz);
      if (!base) return contestar(req, res, 200, { ok: true, resultado: 'guardado' }, 'guardado');
      const enviado = await mandarConfirmacion(s, fila, v.email, base);
      return contestar(req, res, 200, { ok: true, resultado: enviado ? 'enviado' : 'fallo' }, enviado ? 'enviado' : 'fallo');
    } catch (e: any) {
      console.error('formularios: boletín', e);
      contestar(req, res, 500, { error: 'No hemos podido guardar tu suscripción. Inténtalo de nuevo dentro de un momento.' });
    }
  });

  /** Manda el correo que toca (confirmar, o «ya estás suscrito») y apunta que salió. */
  async function mandarConfirmacion(s: SitioForm, fila: { id: string; estado: string; token_baja: string | null }, email: string, base: string): Promise<boolean> {
    let baja = fila.token_baja;
    if (!baja) {
      baja = nuevoTestigo();
      await db.execute(sql`UPDATE sitio_suscriptores SET token_baja = ${baja} WHERE id = ${fila.id}`);
    }
    let confirmar: string | null = null;
    if (fila.estado !== 'confirmado') {
      confirmar = nuevoTestigo();
      await db.execute(sql`UPDATE sitio_suscriptores SET token_confirmar = ${huellaTestigo(confirmar)}, updated_at = now() WHERE id = ${fila.id}`);
    }
    const l = enlacesDe(base, s.raiz, confirmar, baja);
    const c = confirmar ? correoConfirmacion(s, email, l) : correoYaSuscrito(s, email, l);
    const ok = await d.enviar({
      para: email, asunto: c.asunto, texto: c.texto, html: c.html, remitente: remitenteConNombre(s.nombre),
      cabeceras: { 'List-Unsubscribe': `<${l.bajaDirecta}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    });
    if (ok) await db.execute(sql`UPDATE sitio_suscriptores SET correo_enviado_at = now() WHERE id = ${fila.id}`);
    return ok;
  }

  // ── El boletín: confirmar y darse de baja ─────────────────────────────────
  app.post('/api/sitio/:raiz/boletin/confirmar', async (req: Request, res: Response) => {
    try {
      res.set('Cache-Control', 'no-store');
      const espera = enlaces.pasar(huellaIp(ipVisitante(req)));
      if (espera) return frenado(req, res, espera, textoFrenoIp(espera));
      const token = String(req.body?.token || '');
      if (!TESTIGO.test(token)) return res.status(400).json({ error: 'Este enlace no es válido.' });
      const r = (await db.execute(sql`
        UPDATE sitio_suscriptores SET estado = 'confirmado', confirmado_at = COALESCE(confirmado_at, now()), updated_at = now()
        WHERE raiz_id = ${String(req.params.raiz)} AND token_confirmar = ${huellaTestigo(token)} AND email IS NOT NULL AND estado <> 'baja'
        RETURNING (confirmado_at < now()) AS ya, email
      `)).rows[0] as any;
      if (!r) return res.status(404).json({ error: 'Este enlace ya no sirve: puede que hayas pedido otro después o que te dieras de baja. Si quieres, vuelve a suscribirte desde el pie de la web.' });
      res.json({ ok: true, ya: !!r.ya });
      // El aviso a administración: solo en la primera confirmación, y sin hacer esperar a quien confirma.
      if (!r.ya && d.hayCorreo()) {
        const s = await d.sitio(String(req.params.raiz)).catch(() => null);
        if (s?.contacto && r.email) {
          const c = correoAltaBoletin(s, String(r.email), `https://humanity.wiki/paginas/${encodeURIComponent(s.raiz)}/formularios`);
          void d.enviar({ para: s.contacto, asunto: c.asunto, texto: c.texto, html: c.html, remitente: remitenteConNombre(s.nombre) })
            .catch((er: any) => console.error('formularios: aviso de alta', er?.message || er));
        }
      }
    } catch (e: any) { console.error('formularios: confirmar', e); res.status(500).json({ error: 'No hemos podido confirmar tu suscripción. Inténtalo de nuevo dentro de un momento.' }); }
  });

  const darDeBaja = async (raiz: string, token: string) => (await db.execute(sql`
    UPDATE sitio_suscriptores SET estado = 'baja', email = NULL, token_confirmar = NULL, token_baja = NULL, baja_at = now(), updated_at = now()
    WHERE raiz_id = ${raiz} AND token_baja = ${token}
    RETURNING id
  `)).rows.length > 0;

  // La baja en un clic (RFC 8058) llega con el testigo en `?t=` y un cuerpo
  // `List-Unsubscribe=One-Click` que no hace falta leer. Desde la web, en `token`.
  // Cada una con su freno (ver `bajasDirectas`).
  app.post('/api/sitio/:raiz/boletin/baja', deFormulario, async (req: Request, res: Response) => {
    try {
      res.set('Cache-Control', 'no-store');
      const directa = typeof req.query.t === 'string' && req.query.t !== '';
      const espera = (directa ? bajasDirectas : enlaces).pasar(huellaIp(ipVisitante(req)));
      if (espera) return frenado(req, res, espera, textoFrenoIp(espera));
      const token = String(req.query.t || req.body?.token || '');
      if (!TESTIGO.test(token)) return res.status(400).json({ error: 'Este enlace no es válido.' });
      if (!(await darDeBaja(String(req.params.raiz), token))) {
        return res.status(404).json({ error: 'Este enlace ya no sirve: puede que ya te dieras de baja.' });
      }
      res.json({ ok: true });
    } catch (e: any) { console.error('formularios: baja', e); res.status(500).json({ error: 'No hemos podido darte de baja. Inténtalo de nuevo dentro de un momento.' }); }
  });
  // Quien abre a mano la dirección de la baja en un clic: no se le da de baja
  // por abrirla (los programas que revisan enlaces también la abrirían), se le
  // lleva a la web, donde se lo pregunta el pie.
  app.get('/api/sitio/:raiz/boletin/baja', async (req: Request, res: Response) => {
    const token = String(req.query.t || '');
    const base = await d.direccion(null, String(req.params.raiz)).catch(() => null);
    res.set('Cache-Control', 'no-store');
    if (!base || !TESTIGO.test(token)) return res.status(404).json({ error: 'Este enlace no es válido.' });
    res.redirect(303, enlacesDe(base, String(req.params.raiz), null, token).baja);
  });

  // ── El panel de quien administra la web ───────────────────────────────────
  const gestiona = async (req: Request, res: Response): Promise<string | null> => {
    res.set('Cache-Control', 'private, no-store');
    const raiz = String(req.params.raiz);
    const g = await d.gestiona(req, raiz);
    if ('error' in g) { res.status(g.codigo).json({ error: g.error }); return null; }
    return raiz;
  };

  app.get('/api/sitio/:raiz/formularios', async (req: Request, res: Response) => {
    try {
      const raiz = await gestiona(req, res);
      if (!raiz) return;
      const w = (await db.execute(sql`
        SELECT id, title, config->'sitio' AS sitio FROM knowledge_windows WHERE id = ${raiz}
      `)).rows[0] as any;
      const s = sitioForm(raiz, String(w?.title || ''), w?.sitio || {});
      const cifras = (await db.execute(sql`
        SELECT
          (SELECT count(*)::int FROM sitio_mensajes WHERE raiz_id = ${raiz} AND estado = 'nuevo') AS mensajes_nuevos,
          (SELECT count(*)::int FROM sitio_mensajes WHERE raiz_id = ${raiz}) AS mensajes,
          (SELECT count(*)::int FROM sitio_suscriptores WHERE raiz_id = ${raiz} AND estado = 'confirmado') AS confirmados,
          (SELECT count(*)::int FROM sitio_suscriptores WHERE raiz_id = ${raiz} AND estado = 'pendiente') AS pendientes,
          (SELECT count(*)::int FROM sitio_suscriptores WHERE raiz_id = ${raiz} AND estado = 'pendiente' AND correo_enviado_at IS NULL) AS sin_correo,
          (SELECT count(*)::int FROM sitio_suscriptores WHERE raiz_id = ${raiz} AND estado = 'baja') AS bajas
      `)).rows[0] as any;
      const base = {
        pagina: { id: raiz, titulo: String(w?.title || ''), nombre: s.nombre, escaparate: w?.sitio?.escaparate === true },
        correo_activo: d.hayCorreo(), contacto: s.contacto, cifras,
      };
      if (req.query.resumen) return res.json(base);
      const mensajes = (await db.execute(sql`
        SELECT id, nombre, email, mensaje, motivo, proyecto_slug, proyecto_titulo, origen, estado, aviso_enviado_at, datos_borrados_at, created_at
        FROM sitio_mensajes WHERE raiz_id = ${raiz} ORDER BY created_at DESC LIMIT 2000
      `)).rows;
      const suscriptores = (await db.execute(sql`
        SELECT id, email, estado, origen, confirmado_at, correo_enviado_at, created_at
        FROM sitio_suscriptores WHERE raiz_id = ${raiz} AND estado <> 'baja' ORDER BY created_at DESC LIMIT 5000
      `)).rows;
      res.json({ ...base, mensajes, suscriptores });
    } catch (e: any) { console.error('formularios: panel', e); res.status(500).json({ error: 'No se ha podido cargar.' }); }
  });

  app.put('/api/sitio/:raiz/formularios/mensajes/:id', async (req: Request, res: Response) => {
    try {
      const raiz = await gestiona(req, res);
      if (!raiz) return;
      const estado = String(req.body?.estado || '');
      if (!ESTADOS_MENSAJE.has(estado)) return res.status(400).json({ error: 'Ese estado no existe.' });
      const r = await db.execute(sql`
        UPDATE sitio_mensajes SET estado = ${estado}, updated_at = now() WHERE id = ${String(req.params.id)} AND raiz_id = ${raiz} RETURNING id
      `);
      if (!r.rows.length) return res.status(404).json({ error: 'Ese mensaje ya no existe.' });
      res.json({ ok: true });
    } catch (e: any) { console.error('formularios: estado', e); res.status(500).json({ error: 'No se ha podido cambiar.' }); }
  });

  // EL DERECHO DE SUPRESIÓN: se borran el nombre, el correo, el mensaje y la página
  // de origen. Queda la fila (fecha, motivo y proyecto) para que las cifras cuadren,
  // sin nada que diga de quién era.
  app.delete('/api/sitio/:raiz/formularios/mensajes/:id', async (req: Request, res: Response) => {
    try {
      const raiz = await gestiona(req, res);
      if (!raiz) return;
      const r = await db.execute(sql`
        UPDATE sitio_mensajes SET nombre = NULL, email = NULL, mensaje = NULL, origen = NULL, estado = 'archivado',
               datos_borrados_at = now(), updated_at = now()
        WHERE id = ${String(req.params.id)} AND raiz_id = ${raiz} RETURNING id
      `);
      if (!r.rows.length) return res.status(404).json({ error: 'Ese mensaje ya no existe.' });
      res.json({ ok: true });
    } catch (e: any) { console.error('formularios: borrar mensaje', e); res.status(500).json({ error: 'No se ha podido borrar.' }); }
  });

  app.delete('/api/sitio/:raiz/formularios/suscriptores/:id', async (req: Request, res: Response) => {
    try {
      const raiz = await gestiona(req, res);
      if (!raiz) return;
      const r = await db.execute(sql`
        UPDATE sitio_suscriptores SET estado = 'baja', email = NULL, token_confirmar = NULL, token_baja = NULL, baja_at = now(), updated_at = now()
        WHERE id = ${String(req.params.id)} AND raiz_id = ${raiz} AND estado <> 'baja' RETURNING id
      `);
      if (!r.rows.length) return res.status(404).json({ error: 'Esa suscripción ya no existe.' });
      res.json({ ok: true });
    } catch (e: any) { console.error('formularios: baja manual', e); res.status(500).json({ error: 'No se ha podido dar de baja.' }); }
  });

  /** Para el día que haya correo: a los pendientes que nunca recibieron el enlace de confirmar. */
  app.post('/api/sitio/:raiz/formularios/confirmaciones', async (req: Request, res: Response) => {
    try {
      const raiz = await gestiona(req, res);
      if (!raiz) return;
      if (!d.hayCorreo()) return res.status(503).json({ error: 'El correo de la plataforma todavía no está configurado: no se puede enviar nada.' });
      const w = (await db.execute(sql`SELECT title, config->'sitio' AS sitio FROM knowledge_windows WHERE id = ${raiz}`)).rows[0] as any;
      const s = sitioForm(raiz, String(w?.title || ''), w?.sitio || {});
      const base = await d.direccion(null, raiz);
      if (!base) return res.status(409).json({ error: 'La web no tiene todavía una dirección pública a la que llevar el enlace.' });
      const filas = (await db.execute(sql`
        SELECT id, email, estado, token_baja FROM sitio_suscriptores
        WHERE raiz_id = ${raiz} AND estado = 'pendiente' AND email IS NOT NULL AND correo_enviado_at IS NULL
        ORDER BY created_at LIMIT 200
      `)).rows as any[];
      let enviados = 0;
      for (const f of filas) if (await mandarConfirmacion(s, f, f.email, base)) enviados++;
      res.json({ ok: true, enviados, fallidos: filas.length - enviados });
    } catch (e: any) { console.error('formularios: confirmaciones', e); res.status(500).json({ error: 'No se han podido enviar.' }); }
  });

  // Una celda que empieza por = + - @ la ejecuta la hoja de cálculo como fórmula:
  // se le pone un apóstrofo delante (inyección CSV). Lo escribe gente de fuera.
  const celda = (v: any) => {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n;\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = (res: Response, nombre: string, filas: any[][]) => {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.send('\ufeff' + filas.map(f => f.map(celda).join(',')).join('\r\n'));
  };
  const fecha = (c: string) => sql.raw(`COALESCE(to_char(${c} AT TIME ZONE 'Europe/Madrid', 'YYYY-MM-DD HH24:MI'), '')`);

  app.get('/api/sitio/:raiz/formularios/mensajes.csv', async (req: Request, res: Response) => {
    try {
      const raiz = await gestiona(req, res);
      if (!raiz) return;
      const r = (await db.execute(sql`
        SELECT ${fecha('created_at')} AS fecha, nombre, email, motivo, proyecto_titulo, mensaje, estado, origen
        FROM sitio_mensajes WHERE raiz_id = ${raiz} ORDER BY created_at DESC
      `)).rows as any[];
      csv(res, `mensajes-${raiz}.csv`, [
        ['fecha', 'nombre', 'correo', 'como_quiere_colaborar', 'proyecto', 'mensaje', 'estado', 'enviado_desde'],
        ...r.map(f => [f.fecha, f.nombre, f.email, textoMotivo(f.motivo), f.proyecto_titulo, f.mensaje, f.estado, f.origen]),
      ]);
    } catch (e: any) { console.error('formularios: csv', e); res.status(500).json({ error: 'No se ha podido exportar.' }); }
  });

  // SÓLO LOS CONFIRMADOS, salvo que se pida lo contrario (`?todos=1`) (2026-11-07,
  // revisión). Este fichero es el que se lleva a una herramienta de envío, y la
  // política promete no escribir a quien no ha confirmado: con los pendientes
  // dentro, el primer boletín saldría justo hacia ellos.
  app.get('/api/sitio/:raiz/formularios/suscriptores.csv', async (req: Request, res: Response) => {
    try {
      const raiz = await gestiona(req, res);
      if (!raiz) return;
      const todos = req.query.todos === '1';
      const r = (await db.execute(sql`
        SELECT email, estado, ${fecha('created_at')} AS alta, ${fecha('confirmado_at')} AS confirmacion
        FROM sitio_suscriptores
        WHERE raiz_id = ${raiz} AND ${todos ? sql`estado <> 'baja'` : sql`estado = 'confirmado'`}
        ORDER BY created_at
      `)).rows as any[];
      csv(res, todos ? `boletin-${raiz}.csv` : `boletin-confirmados-${raiz}.csv`,
        [['correo', 'estado', 'alta', 'confirmacion'], ...r.map(f => [f.email, f.estado, f.alta, f.confirmacion])]);
    } catch (e: any) { console.error('formularios: csv', e); res.status(500).json({ error: 'No se ha podido exportar.' }); }
  });
}
