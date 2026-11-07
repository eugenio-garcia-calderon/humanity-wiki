// ============================================================================
// LAS PÁGINAS PROPIAS DE UN ESCAPARATE, EN EL SERVIDOR (2026-11-07)
// ============================================================================
// «Colabora», «Sala de prensa» y «Quiénes somos» de luzhumanidad.com (ver
// `components/sitio/reglasPaginasEscaparate.ts`). Son páginas normales; lo que se
// calcula solo es el bloque `escaparate`, y aquí se hacen sus tres cosas de servidor:
//
//   1. LOS DATOS DE CADA SECCIÓN (`datosSeccion`): las cifras, las notas de prensa,
//      lo publicado en los medios, los logotipos, las fotos con crédito, el equipo,
//      las áreas, la transparencia… Salen del modelo del escaparate
//      (`seoEscaparate.ts`, las mismas tablas que la portada) y de la config del
//      sitio. Ninguna cifra ni ningún dato está escrito a mano.
//   2. VIAJAN CON LA PÁGINA: cada bloque recibe los suyos en `datos.precargado`
//      (una ampliación, `ampliarPagina.ts`), así que el navegador los pinta a la
//      primera y el HTML del servidor los escribe con EL MISMO componente
//      (`SeccionesEscaparate.tsx`): un buscador lee lo que ve quien visita. Fuera de
//      la página (el editor) los da `GET /api/sitio/escaparate/:raiz/:seccion`.
//   3. LO QUE DICE EL `<head>`: título y descripción propios, `ContactPage`,
//      `AboutPage` o `CollectionPage` (por las secciones que lleva) y sus migas.
//      El idioma, el nombre del sitio y la imagen al compartir con su medida los
//      pone `seoEscaparate.ts` («cualquier otra página del sitio»), que va antes.
//      El sitemap las lleva por su dirección corta (`urlsEscaparate`).
//
// Todo es público: es lo mismo que ya enseñan la portada y las páginas de los
// proyectos. Lo de miembros no pasa por aquí.
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { renderToStaticMarkup } from 'react-dom/server';
import { registrarHtml } from './htmlBloques';
import { registrarAmpliacion } from './ampliarPagina';
import { configEscaparate, modeloEscaparate, datosPortada, idDePagina } from './seoEscaparate';
import { uploadsDir } from './uploads';
import SeccionEscaparateVista from '../components/sitio/SeccionesEscaparate';
import { anosDe, paisesDe, numero } from '../components/sitio/portadaEscaparate';
import { slugDe, completarSitio, NOMBRES_LEGALES, type DocLegal } from '../components/sitio/sitioWeb';
import {
  seccionDe, seccionesDe, tipoDePagina, creditoDe, creditoPropio, etiquetaCredito, pieSinCredito, ciudadDe,
  formatoDe, rutaDelSitio, redesDe, textoLlano, mencionaMenores, excluidasDe, SECCIONES_ESCAPARATE,
  type SeccionEscaparate, type DatosSeccion, type FotoSitio, type LogoSitio, type NotaPrensa,
} from '../components/sitio/reglasPaginasEscaparate';

const VIDA_MS = 2 * 60_000;
/** Cuántas fotos lleva el kit de prensa, y cuántas de cada proyecto como mucho. Se preparan las
 *  de reserva (`FOTOS_POR_PROYECTO` de cada uno): si quien edita quita alguna (`datos.excluir`),
 *  entra la siguiente. */
const FOTOS_MAX = 16;
const FOTOS_POR_PROYECTO = 2;

const linea = (v: unknown, n = 300): string | null => (typeof v === 'string' && v.trim() ? v.replace(/\s+/g, ' ').trim().slice(0, n) : null);
const esPropia = (u: unknown): u is string => typeof u === 'string' && /^\/uploads\/(?!privado\/)[^\s"<>]+$/.test(u) && !u.includes('..');
const recorta = (t: string, n: number) => {
  const s = t.replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  const corte = s.slice(0, n - 1);
  return corte.slice(0, Math.max(corte.lastIndexOf(' '), n - 20)).replace(/[\s,.;:–-]+$/, '') + '…';
};
const correoDe = (cfg: any): string | null => {
  const e = linea(cfg?.pie?.contacto?.email, 254) || linea(cfg?.titular?.email, 254);
  return e && /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+$/.test(e) ? e : null;
};

// ── EL SITIO: SU CONFIG Y SU PORTADA ────────────────────────────────────────

type Base = { raiz: string; cfg: any; marca: string; lema: string | null; icono: string | null; imagen: string | null };

const bases = new Map<string, { t: number; p: Promise<Base | null> }>();
/** El escaparate de esa raíz (publicada), con lo que hace falta de su portada. Dos minutos en memoria.
 *  Solo se guardan los escaparates de verdad (revisión del 2026-11-07): un id inventado en la ruta
 *  pública de las secciones se queda en la memoria de `configEscaparate`, que tiene tope, y aquí no
 *  deja nada (antes, cada uno ocupaba un hueco durante dos minutos). */
export async function baseDe(db: any, raiz: string): Promise<Base | null> {
  if (!idDePagina(raiz)) return null;
  const c = bases.get(raiz);
  if (c && Date.now() - c.t < VIDA_MS) return c.p;
  const cfg = await configEscaparate(db, raiz);
  if (!cfg) return null;
  const ya = bases.get(raiz);
  if (ya && Date.now() - ya.t < VIDA_MS) return ya.p;
  const p = (async (): Promise<Base | null> => {
    const r = (await db.execute(sql`
      SELECT title, config->>'icono' AS icono, config->>'subtitulo' AS lema, config->>'imagenCompartir' AS imagen
      FROM knowledge_windows WHERE id = ${raiz} AND publico = true AND deleted_at IS NULL AND archived_at IS NULL
    `)).rows[0] as any;
    if (!r) return null;
    return {
      raiz, cfg,
      marca: linea(r.title, 120) || linea(cfg.seo?.organizacion, 120) || '',
      lema: linea(r.lema, 200), icono: esPropia(r.icono) ? r.icono : null, imagen: esPropia(r.imagen) ? r.imagen : null,
    };
  })();
  if (bases.size >= 64) for (const [k, v] of bases) if (Date.now() - v.t >= VIDA_MS) bases.delete(k);
  bases.set(raiz, { t: Date.now(), p });
  // Una raíz que no está publicada (o un fallo) no se queda guardada.
  p.then(b => { if (!b && bases.get(raiz)?.p === p) bases.delete(raiz); }, () => { if (bases.get(raiz)?.p === p) bases.delete(raiz); });
  return p;
}

// ── LO QUE NO ESTÁ EN EL MODELO DE LA PORTADA ───────────────────────────────
// El cargo de cada persona, la ilustración y la frase de cada área, el titular y la
// entradilla de cada proyecto, las fotos con crédito y los logotipos.

type Extras = {
  personas: Array<{ pagina: string; cargo: string | null }>;
  areas: Map<string, { descripcion: string | null; imagen: string | null }>;
  titulares: Map<string, { titular: string | null; entradilla: string | null }>;
  /** Las fotos que pueden ir en el kit, en su orden (sin nombre de descarga: se pone al elegirlas). */
  fotos: FotoSitio[];
  logos: LogoSitio[];
};

/** El ancho y el alto de una imagen, leídos de su cabecera (PNG, JPEG y SVG). */
export function medidasImagen(buf: Buffer, formato: string): { ancho: number | null; alto: number | null } {
  try {
    if (formato === 'PNG' && buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { ancho: buf.readUInt32BE(16), alto: buf.readUInt32BE(20) };
    if (formato === 'JPG' && buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2;
      while (i + 9 < buf.length && buf[i] === 0xff) {
        const m = buf[i + 1];
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { alto: buf.readUInt16BE(i + 5), ancho: buf.readUInt16BE(i + 7) };
        i += 2 + buf.readUInt16BE(i + 2);
      }
    }
    if (formato === 'SVG') {
      const t = buf.subarray(0, 4000).toString('utf8');
      const vb = /viewBox=["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(t);
      if (vb) return { ancho: Math.round(Number(vb[1])), alto: Math.round(Number(vb[2])) };
    }
  } catch { /* una cabecera rara: sin medidas */ }
  return { ancho: null, alto: null };
}

async function logosDe(base: Base): Promise<LogoSitio[]> {
  const raizDisco = path.resolve(uploadsDir());
  const vistos = new Set<string>();
  const out: LogoSitio[] = [];
  const nombre = slugDe(base.marca || base.cfg?.seo?.organizacion || 'logotipo') || 'logotipo';
  for (const u of [base.icono, base.cfg?.menu?.logo, base.cfg?.pie?.logo]) {
    if (!esPropia(u) || !/\.(png|jpe?g|svg)$/i.test(u)) continue;
    const ruta = path.resolve(raizDisco, u.slice('/uploads/'.length));
    if (!ruta.startsWith(raizDisco + path.sep)) continue;
    let buf: Buffer;
    try { buf = await fs.promises.readFile(ruta); } catch { continue; }
    // La misma imagen subida dos veces (el icono, el logo del menú y el del pie lo son hoy) va una vez.
    const huella = crypto.createHash('sha1').update(buf).digest('hex');
    if (vistos.has(huella)) continue;
    vistos.add(huella);
    const formato = formatoDe(u);
    out.push({ url: u, formato, ...medidasImagen(buf, formato), bytes: buf.length, descarga: `${nombre}-logotipo${out.length ? `-${out.length + 1}` : ''}.${formato.toLowerCase()}` });
  }
  return out;
}

const extrasMemoria = new Map<string, { t: number; p: Promise<Extras> }>();
function extrasDe(db: any, base: Base): Promise<Extras> {
  const c = extrasMemoria.get(base.raiz);
  if (c && Date.now() - c.t < VIDA_MS) return c.p;
  const p = construirExtras(db, base);
  if (extrasMemoria.size >= 64) for (const [k, v] of extrasMemoria) if (Date.now() - v.t >= VIDA_MS) extrasMemoria.delete(k);
  extrasMemoria.set(base.raiz, { t: Date.now(), p });
  p.catch(() => extrasMemoria.delete(base.raiz));
  return p;
}

async function construirExtras(db: any, base: Base): Promise<Extras> {
  const cfg = base.cfg;
  const tProy = String(cfg.proyectos || ''), tPers = String(cfg.personas || ''), tSist = String(cfg.sistemas || '');
  const m = await modeloEscaparate(db, base.raiz, cfg);

  // Las personas visibles, en el orden de su tabla, con su cargo (la descripción de su página).
  const personas = tPers ? ((await db.execute(sql`
    SELECT f.pagina_id, k.config->>'subtitulo' AS cargo FROM bd_filas f JOIN knowledge_windows k ON k.id = f.pagina_id
    WHERE f.tabla_id = ${tPers} AND f.deleted_at IS NULL AND f.archived_at IS NULL AND f.oculta = false
      AND k.deleted_at IS NULL AND k.archived_at IS NULL
    ORDER BY f.orden, f.created_at
  `)).rows as any[]).map(x => ({ pagina: String(x.pagina_id), cargo: linea(x.cargo, 160) })) : [];

  // Las áreas a las que apuntan los proyectos: su ilustración y su frase (las de su fila de Sistemas).
  const areas = new Map<string, { descripcion: string | null; imagen: string | null }>();
  if (tProy && tSist) {
    const col = (await db.execute(sql`
      SELECT id FROM bd_columnas WHERE tabla_id = ${tProy} AND tipo = 'relacion' AND archived_at IS NULL
        AND config->>'tabla_destino' = ${tSist} ORDER BY orden LIMIT 1
    `)).rows[0] as any;
    if (col) {
      const r = await db.execute(sql`
        SELECT DISTINCT k.title, k.config->>'portada' AS imagen, k.config->>'subtitulo' AS sub
        FROM bd_enlaces e JOIN bd_filas f ON f.id = e.destino_id JOIN knowledge_windows k ON k.id = f.pagina_id
        WHERE e.columna_id = ${col.id} AND f.deleted_at IS NULL AND k.deleted_at IS NULL
      `);
      for (const x of r.rows as any[]) {
        const t = linea(x.title, 120);
        if (t && !areas.has(t)) areas.set(t, { descripcion: linea(x.sub, 200), imagen: esPropia(x.imagen) ? x.imagen : null });
      }
    }
  }

  // De cada proyecto visible: su titular, su entradilla y sus imágenes (sin el resto de la página).
  const filas = tProy ? (await db.execute(sql`
    SELECT f.pagina_id,
      jsonb_path_query_first(k.config, 'strict $.bloques[*] ? (@.tipo == "titulo1").texto') #>> '{}' AS titular,
      jsonb_path_query_first(k.config, 'strict $.bloques[*] ? (@.tipo == "parrafo" && @.estilo == "entradilla").texto') #>> '{}' AS entradilla,
      jsonb_path_query_array(k.config, 'strict $.bloques.** ? (@.tipo == "imagen")') AS imagenes
    FROM bd_filas f JOIN knowledge_windows k ON k.id = f.pagina_id
    WHERE f.tabla_id = ${tProy} AND f.deleted_at IS NULL AND f.archived_at IS NULL AND f.oculta = false
      AND k.deleted_at IS NULL AND k.archived_at IS NULL
  `)).rows as any[] : [];
  const titulares = new Map<string, { titular: string | null; entradilla: string | null }>();
  const imagenes = new Map<string, any[]>();
  for (const f of filas) {
    titulares.set(String(f.pagina_id), { titular: textoLlano(f.titular, 160), entradilla: textoLlano(f.entradilla, 320) });
    imagenes.set(String(f.pagina_id), Array.isArray(f.imagenes) ? f.imagenes : []);
  }

  // LAS FOTOS DEL KIT DE PRENSA: solo fotos («Foto:» en su pie) de la propia organización (su crédito
  // es su nombre, `creditoPropio`), de la web, de buen tamaño (lado mayor ≥ 1.000 px), sin repetir y
  // sin menores (`mencionaMenores`, en su texto alternativo o en su pie). Las primeras de cada
  // proyecto (las que eligió quien escribió la página), apaisadas antes, y de proyecto en proyecto:
  // primero una de cada uno, luego la segunda. `datosSeccion` quita las excluidas y se queda con
  // `FOTOS_MAX`.
  const nombres = [cfg.seo?.organizacion, cfg.titular?.nombre, ...(Array.isArray(cfg.seo?.otrosNombres) ? cfg.seo.otrosNombres : []), base.marca]
    .filter((x): x is string => typeof x === 'string' && !!x.trim());
  const vistas = new Set<string>();
  const porProyecto: FotoSitio[][] = [];
  for (const p of m.proyectos) {
    const suyas: FotoSitio[] = [];
    for (const b of imagenes.get(p.pagina) || []) {
      const url = b?.url;
      if (!esPropia(url) || !/\.(jpe?g|png|webp)$/i.test(url) || vistas.has(url)) continue;
      const credito = creditoDe(b.pie);
      // Fotos de verdad: ni una «Imagen:» (un 3D, un fotograma, un cartel de campaña) ni una «Captura:».
      if (!credito || !creditoPropio(credito, nombres) || !/^Foto/.test(etiquetaCredito(b.pie))) continue;
      // Una foto con menores no se ofrece para publicar (revisión del 2026-11-07).
      if (mencionaMenores(`${b.alt || ''} ${b.pie || ''}`)) continue;
      const [w, h] = Array.isArray(b.natural) ? b.natural.map(Number) : [0, 0];
      if (!w || !h || Math.max(w, h) < 1000 || Math.min(w, h) < 600) continue;
      vistas.add(url);
      suyas.push({
        url, ancho: w, alto: h, credito, etiqueta: etiquetaCredito(b.pie),
        alt: linea(b.alt, 200) || pieSinCredito(b.pie) || p.titulo, pie: pieSinCredito(b.pie),
        descarga: '', proyecto: { titulo: p.titulo, url: p.url },
      });
    }
    // Las apaisadas delante (se ven mejor en la cuadrícula); entre ellas, el orden de la página.
    suyas.sort((a, b) => Number((b.ancho || 0) >= (b.alto || 0)) - Number((a.ancho || 0) >= (a.alto || 0)));
    if (suyas.length) porProyecto.push(suyas.slice(0, FOTOS_POR_PROYECTO));
  }
  const fotos: FotoSitio[] = [];
  for (let vuelta = 0; vuelta < FOTOS_POR_PROYECTO; vuelta++) {
    for (const lista of porProyecto) if (lista[vuelta]) fotos.push(lista[vuelta]);
  }

  return { personas, areas, titulares, fotos, logos: await logosDe(base) };
}

/** Las fotos del kit: las candidatas sin las que quitó quien edita, hasta `FOTOS_MAX`, cada una con
 *  el nombre con el que se descarga («light-humanity-luz-del-amazonas-1.jpg»). Copias: las de la
 *  memoria no se tocan. */
export function fotosDelKit(candidatas: FotoSitio[], fuera: Set<string>, marca: string): FotoSitio[] {
  const marcaSlug = slugDe(marca || 'foto') || 'foto';
  const cuenta = new Map<string, number>();
  return candidatas.filter(f => !fuera.has(f.url)).slice(0, FOTOS_MAX).map(f => {
    const s = slugDe(f.proyecto.titulo) || 'proyecto';
    const n = (cuenta.get(s) || 0) + 1;
    cuenta.set(s, n);
    return { ...f, descarga: `${marcaSlug}-${s}-${n}.${formatoDe(f.url).toLowerCase() || 'jpg'}` };
  });
}

// ── LOS DATOS DE CADA SECCIÓN ────────────────────────────────────────────────

/** La dirección de «colaborar» del sitio (`sitio.colabora`): una ruta, o el id de una página publicada. */
async function rutaColabora(db: any, cfg: any): Promise<string | null> {
  const v = cfg?.colabora;
  const ruta = rutaDelSitio(v);
  if (ruta) return ruta.split(/[?#]/)[0];
  const id = typeof v === 'string' ? v : typeof v?.pagina === 'string' ? v.pagina : null;
  if (!idDePagina(id)) return null;
  const r = (await db.execute(sql`SELECT slug FROM knowledge_windows WHERE id = ${id} AND publico = true AND deleted_at IS NULL AND archived_at IS NULL`)).rows[0] as any;
  return r?.slug && /^[a-z0-9-]+$/.test(r.slug) ? `/${r.slug}` : null;
}

/** Los datos de una sección. `bloque` es el `datos` del bloque que la pinta (las fotos que quitó
 *  quien edita, `excluir`); sin él (el editor, la ruta pública), los de una sección sin cambios. */
export async function datosSeccion<S extends SeccionEscaparate>(db: any, base: Base, seccion: S, bloque?: any): Promise<DatosSeccion[S]> {
  const cfg = base.cfg;
  const email = correoDe(cfg);
  const redes = redesDe(cfg.pie);
  const organizacion = linea(cfg.seo?.organizacion, 120) || base.marca;
  const out = await (async (): Promise<any> => {
    switch (seccion) {
      // Las tarjetas llevan al formulario de la página de colaborar (si el bloque está en otra página).
      case 'formas': return { colabora: await rutaColabora(db, cfg) };
      case 'formulario': return { email, redes };
      case 'contacto': return { email, colabora: await rutaColabora(db, cfg), redes };
      case 'llamada': return { colabora: await rutaColabora(db, cfg) };
      case 'cifras': {
        // Las de la portada (`PresentacionSitio`) y una más: cuántos medios han contado los proyectos.
        const dp = datosPortada(await modeloEscaparate(db, base.raiz, cfg), cfg);
        const anos = anosDe(dp.proyectos), paises = paisesDe(dp.proyectos).length;
        const cifras: Array<{ valor: string; texto: string }> = [{ valor: numero(dp.proyectos.length), texto: dp.proyectos.length === 1 ? 'proyecto' : 'proyectos' }];
        if (paises) cifras.push({ valor: numero(paises), texto: paises === 1 ? 'país' : 'países' });
        if (dp.medios) cifras.push({ valor: numero(dp.medios), texto: dp.medios === 1 ? 'medio' : 'medios' });
        if (dp.noticias) cifras.push({ valor: numero(dp.noticias), texto: 'noticias y vídeos' });
        if (anos.length) cifras.push({ valor: String(anos[0]), texto: 'primer proyecto' });
        return { cifras };
      }
      case 'notas': {
        // Las notas de prensa son las páginas de los proyectos: de la más reciente (su año de
        // inicio) a la más antigua; las del mismo año, en el orden de la portada.
        const [m, x] = await Promise.all([modeloEscaparate(db, base.raiz, cfg), extrasDe(db, base)]);
        const notas: NotaPrensa[] = m.proyectos.map((p, i) => ({ p, i }))
          .sort((a, b) => (Number(b.p.ano) || 0) - (Number(a.p.ano) || 0) || a.i - b.i)
          .map(({ p }) => ({
            pagina: p.pagina, titulo: p.titulo, url: p.url, ano: p.ano, estado: p.estado, color: p.color,
            area: p.areas[0] || null, portada: p.imagenPropia,
            titular: x.titulares.get(p.pagina)?.titular || null, entradilla: x.titulares.get(p.pagina)?.entradilla || p.descripcion || null,
          }));
        return { notas };
      }
      case 'medios': {
        const m = await modeloEscaparate(db, base.raiz, cfg);
        // Solo imágenes de la propia web: la página no pide nada a otras (las de YouTube, sin portada).
        const noticias = m.noticias.map(n => ({ ...n, imagen: esPropia(n.imagen) ? n.imagen : null, logo: esPropia(n.logo) ? n.logo : null }));
        return { noticias, medios: new Set(m.noticias.map(n => n.medio)).size };
      }
      case 'marca': {
        const x = await extrasDe(db, base);
        return { logos: x.logos, marca: base.marca, organizacion, email };
      }
      case 'fotos': return { fotos: fotosDelKit((await extrasDe(db, base)).fotos, excluidasDe(bloque), organizacion), organizacion };
      case 'organizacion': {
        const m = await modeloEscaparate(db, base.raiz, cfg);
        const titular = cfg.titular || {}, seo = cfg.seo || {};
        const legal = linea(titular.nombre, 160);
        // «También nos conocen como»: solo los otros nombres, sin el principal (el que firma toda la
        // página), el legal (va en su fila), el de la web ni su lema (revisión del 2026-11-07).
        const nombres = (Array.isArray(seo.otrosNombres) ? seo.otrosNombres : [])
          .map((n: unknown) => linea(n, 120))
          .filter((n: string | null): n is string => !!n && n !== legal && n !== base.lema && n !== base.marca && n !== linea(seo.organizacion, 120))
          .filter((n: string, i: number, a: string[]) => a.indexOf(n) === i);
        const fundador = linea(seo.fundador, 160);
        // El correo no va aquí: está en «Transparencia» y en el pie de todas las páginas.
        return {
          nombreLegal: legal, nombres,
          fundador: fundador ? { nombre: fundador, url: m.personas.find(p => p.titulo === fundador)?.url || null } : null,
          sede: ciudadDe(titular.domicilio), redes,
        };
      }
      case 'areas': {
        const [m, x] = await Promise.all([modeloEscaparate(db, base.raiz, cfg), extrasDe(db, base)]);
        return { areas: m.secciones.map(s => ({ nombre: s.titulo, descripcion: x.areas.get(s.titulo)?.descripcion || null, imagen: x.areas.get(s.titulo)?.imagen || null, proyectos: s.entradas })) };
      }
      case 'equipo': {
        const [m, x] = await Promise.all([modeloEscaparate(db, base.raiz, cfg), extrasDe(db, base)]);
        const personas = x.personas.map(({ pagina, cargo }) => {
          const p = m.personaDe.get(pagina);
          return p ? { pagina, titulo: p.titulo, url: p.url, foto: esPropia(p.foto) ? p.foto : null, cargo } : null;
        }).filter(Boolean);
        return { personas };
      }
      case 'portada': {
        const dp = datosPortada(await modeloEscaparate(db, base.raiz, cfg), cfg);
        const anos = anosDe(dp.proyectos);
        return { primerAno: anos.length ? String(anos[0]) : null, proyectos: dp.proyectos.length, paises: paisesDe(dp.proyectos).map(p => p.pais) };
      }
      case 'transparencia': {
        const t = cfg.titular || {};
        const legales = completarSitio(cfg).pie.legales;
        return {
          nombre: linea(t.nombre, 160) || linea(cfg.seo?.organizacion, 160), nif: linea(t.nif, 40), domicilio: linea(t.domicilio, 240),
          registro: linea(t.registro, 240), email,
          legales: (Object.keys(NOMBRES_LEGALES) as DocLegal[]).filter(d => legales[d]).map(d => ({ id: d, nombre: NOMBRES_LEGALES[d] })),
        };
      }
      default: return null;
    }
  })();
  return out;
}

/** Cada bloque `escaparate` de la lista (a cualquier profundidad). */
function cadaSeccion(bloques: unknown, f: (b: any, s: SeccionEscaparate) => void, prof = 0) {
  if (!Array.isArray(bloques) || prof > 8) return;
  for (const b of bloques) {
    const s = seccionDe(b);
    if (s) f(b, s);
    cadaSeccion(b?.bloques, f, prof + 1);
    if (Array.isArray(b?.columnas)) for (const c of b.columnas) cadaSeccion(Array.isArray(c) ? c : c?.bloques, f, prof + 1);
  }
}

// ── EL HTML DEL SERVIDOR: EL MISMO COMPONENTE ───────────────────────────────
registrarHtml('escaparate', (b, ctx) => {
  const s = seccionDe(b);
  const d = b?.datos?.precargado;
  if (!s || !d || typeof d !== 'object') return '';
  return renderToStaticMarkup(<SeccionEscaparateVista seccion={s} datos={b.datos} d={d} raiz={ctx.pagina?.sitio?.raizId || null} servidor />);
});

export function registrarPaginasEscaparate(app: Express, db: any) {
  // Los datos de una sección, para el editor (en la página publicada ya viajan con ella). Públicos:
  // es lo que enseñan la portada y las páginas de los proyectos.
  app.get('/api/sitio/escaparate/:raiz/:seccion', async (req: Request, res: Response) => {
    try {
      const { raiz, seccion } = req.params;
      if (!idDePagina(raiz) || !Object.prototype.hasOwnProperty.call(SECCIONES_ESCAPARATE, seccion)) return res.status(404).json({ error: 'No existe.' });
      const base = await baseDe(db, raiz);
      if (!base) return res.status(404).json({ error: 'No es un escaparate.' });
      res.set('Cache-Control', 'public, max-age=300').json(await datosSeccion(db, base, seccion as SeccionEscaparate));
    } catch (e: any) { console.error('escaparate:', e); res.status(500).json({ error: 'Error interno' }); }
  });

  registrarAmpliacion(async (db, req, pagina) => {
    if (!pagina || pagina.muro || pagina.virtual) return;
    const secciones = seccionesDe(pagina.config?.bloques);
    if (!secciones.size) return;
    // LO GUARDADO EN `precargado` NO VALE (revisión del 2026-11-07): quien edita una página podría
    // escribir ahí lo que quisiera (un enlace `javascript:`, unas cifras falsas). Solo cuenta lo que
    // calcula el servidor ahora, así que se quita siempre, también fuera de un escaparate.
    cadaSeccion(pagina.config?.bloques, b => {
      if (b.datos && typeof b.datos === 'object' && 'precargado' in b.datos) { const { precargado: _fuera, ...resto } = b.datos; void _fuera; b.datos = resto; }
    });
    const sitio = pagina.sitio, cfg = sitio?.config;
    if (cfg?.escaparate !== true || !sitio.raizId) return;
    const base = await baseDe(db, sitio.raizId);
    if (!base) return;

    // 1. Los datos de cada sección, dentro de su bloque: viajan con la página. Con la config del sitio
    //    con la que se pinta la página (la misma de la raíz, ya con lo que le añaden las ampliaciones).
    const conSitio = { ...base, cfg };
    const pendientes: Promise<void>[] = [];
    cadaSeccion(pagina.config?.bloques, (b, s) => {
      pendientes.push(datosSeccion(db, conSitio, s, b.datos).then(d => { if (d) b.datos = { ...(b.datos || {}), precargado: d }; }));
    });
    await Promise.all(pendientes);

    // 2. El `<head>`: solo en el HTML del servidor, y nunca el de la portada (es de `seoEscaparate.ts`).
    //    El idioma, el nombre del sitio, `twitter:site` y la imagen al compartir (con su medida y su
    //    texto alternativo) ya los ha puesto `seoEscaparate.ts` (rama «cualquier otra página del
    //    sitio»): aquí no se repiten (cada `meta` se escribe tal cual, y saldrían dos veces).
    if (req || pagina.id === sitio.raizId) return;
    const marca = base.marca || 'Inicio';
    const titulo = String(pagina.titulo || '').trim() || 'Sin título';
    const desc = textoLlano(pagina.config?.descripcion, 400) || textoLlano(pagina.config?.subtitulo, 400);
    const meta = (pagina.meta = pagina.meta || {});
    meta.manda = true;
    meta.titulo = recorta(`${titulo} | ${marca}`, 60);
    if (desc) meta.descripcion = recorta(desc, 160);
    meta.ogType = 'website';

    const tipo = tipoDePagina(secciones);
    const seo = cfg.seo || {}, titular = cfg.titular || {};
    const nombreOrg = linea(seo.organizacion, 160) || linea(titular.nombre, 160) || marca;
    const email = correoDe(cfg);
    const perfiles = (Array.isArray(seo.perfiles) ? seo.perfiles : []).filter((u: unknown) => typeof u === 'string' && /^https:\/\//.test(u));
    const org: any = { '@type': 'NGO', '@id': '/#organizacion', name: nombreOrg, url: '{{inicio}}' };
    const pag: any = {
      '@context': 'https://schema.org', '@type': tipo, url: '{{canonica}}', name: titulo, inLanguage: 'es-ES',
      ...(desc ? { description: recorta(desc, 300) } : {}),
      isPartOf: { '@type': 'WebSite', '@id': '/#web', name: marca, url: '{{inicio}}' },
    };
    if (tipo === 'AboutPage') {
      // Quiénes somos: la organización entera. Sin `member` (revisión del 2026-11-07): la tabla de
      // personas es quien participa en los proyectos, no la lista de socios de la asociación.
      const m = await modeloEscaparate(db, base.raiz, cfg);
      const fundador = linea(seo.fundador, 160);
      pag.mainEntity = {
        ...org,
        ...(titular.nombre && titular.nombre !== nombreOrg ? { legalName: titular.nombre } : {}),
        ...(titular.nif ? { taxID: titular.nif } : {}),
        ...(base.icono ? { logo: base.icono } : {}),
        ...(email ? { email } : {}),
        ...(titular.domicilio ? { address: { '@type': 'PostalAddress', streetAddress: titular.domicilio, addressCountry: 'ES' } } : {}),
        ...(fundador ? { founder: { '@type': 'Person', name: fundador, ...(m.personas.find(p => p.titulo === fundador) ? { url: m.personas.find(p => p.titulo === fundador)!.url } : {}) } } : {}),
        ...(perfiles.length ? { sameAs: perfiles } : {}),
      };
    } else if (tipo === 'ContactPage') {
      pag.mainEntity = { ...org, ...(email ? { email, contactPoint: { '@type': 'ContactPoint', contactType: 'general', email, availableLanguage: 'es' } } : {}) };
    } else if (tipo === 'CollectionPage') {
      // La sala de prensa: sus notas (las páginas de los proyectos) y el contacto de prensa.
      const { notas } = await datosSeccion(db, base, 'notas');
      pag.about = { ...org, ...(email ? { contactPoint: { '@type': 'ContactPoint', contactType: 'press', email, availableLanguage: 'es' } } : {}) };
      if (secciones.has('notas') && notas.length) {
        pag.mainEntity = {
          '@type': 'ItemList', name: 'Notas de prensa', numberOfItems: notas.length,
          itemListElement: notas.map((n, i) => ({ '@type': 'ListItem', position: i + 1, name: n.titular || n.titulo, url: n.url })),
        };
      }
    } else pag.about = org;
    // Los vídeos de la página (`VideoObject`, de `seoEscaparate.ts`) se quedan; lo demás es esto.
    const previos: any[] = Array.isArray(meta.jsonLd) ? meta.jsonLd : meta.jsonLd ? [meta.jsonLd] : [];
    meta.jsonLd = [pag, {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: marca, item: '{{inicio}}' },
        { '@type': 'ListItem', position: 2, name: titulo, item: '{{canonica}}' },
      ],
    }, ...previos.filter(j => j?.['@type'] === 'VideoObject')];
  });
}
