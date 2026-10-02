import type { CSSProperties, ReactNode } from 'react';
import {
  Menu as Tres, X, Home, Mail, Phone, MapPin, ShoppingBag, ShoppingCart, Info, Users, Calendar, Star,
  Heart, BookOpen, Briefcase, Camera, Globe, MessageCircle, Send, Newspaper, Leaf, Sparkles, Lightbulb,
  HelpCircle, Image, Video, Music, Gift, Tag, Award, Building2, Rocket, Handshake, Coffee, Store,
  FileText, Download, ExternalLink, Instagram, Facebook, Linkedin, Youtube, Twitter, Github,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import {
  type Sitio, type Enlace, type Destino, type DocLegal, type Tamano,
  NOMBRES_LEGALES, textoLegal, textoSobre,
} from './sitioWeb';

// ============================================================================
// EL MENÚ Y EL PIE, COMO SE VEN (2026-10-02)
// ============================================================================
// Lo pintan la página publicada, el servidor (dentro del HTML, para que salga
// con el título y no un segundo después) y la vista previa del creador. Por
// eso aquí no hay ganchos ni nada del navegador:
//
//   · Las tres rayas son un `<details>`: se abren y se cierran sin JavaScript.
//   · Los textos legales son ventanas que abre `:target` (`#aviso-legal`):
//     tampoco necesitan JavaScript, y cada una tiene su dirección.
//   · «Teléfono o escritorio» se decide por el ANCHO DEL MARCO (`@container`),
//     no por el de la pantalla: así la vista previa del creador enseña la
//     versión de teléfono dentro de una caja de 375 px.

/** Los iconos que se pueden poner en un enlace. Pocos y a propósito: esto va
 *  en lo primero que baja una web publicada, y la lista entera de la
 *  plataforma pesa 78 KB. */
export const ICONOS_MENU: Record<string, typeof Home> = {
  Home, Mail, Phone, MapPin, ShoppingBag, ShoppingCart, Store, Info, Users, Calendar, Star, Heart,
  BookOpen, Briefcase, Camera, Globe, MessageCircle, Send, Newspaper, Leaf, Sparkles, Lightbulb,
  HelpCircle, Image, Video, Music, Gift, Tag, Award, Building2, Rocket, Handshake, Coffee, FileText,
  Download, ExternalLink, Instagram, Facebook, Linkedin, Youtube, Twitter, Github,
};

export function IconoMenu({ valor, tamano }: { valor?: string; tamano: number }) {
  if (!valor) return null;
  if (valor.startsWith('lucide:')) {
    const I = ICONOS_MENU[valor.slice(7)];
    return I ? <I style={{ width: tamano, height: tamano }} strokeWidth={1.9} className="shrink-0" /> : null;
  }
  if (/^(https?:|\/)/.test(valor)) return <img src={valor} alt="" style={{ width: tamano, height: tamano }} className="shrink-0 rounded object-cover" />;
  return <span style={{ fontSize: Math.round(tamano * 0.9), lineHeight: 1 }} className="shrink-0">{valor}</span>;
}

/** Cómo se arman las direcciones en este sitio: en un dominio propio la raíz
 *  es `/`, dentro de humanity.wiki es `/@quien/p/…`. */
export type Rutas = { enlacePagina: (id: string) => string; raizId?: string | null };

export function hrefDe(d: Destino, rutas: Rutas): string {
  switch (d?.tipo) {
    case 'inicio': return rutas.raizId ? rutas.enlacePagina(rutas.raizId) : '/';
    case 'pagina': return rutas.enlacePagina(d.id);
    case 'seccion': return `#b-${d.bloque}`;
    case 'legal': return `#${d.doc}`;
    case 'contacto': return '#contacto';
    case 'url': return d.url || '#';
    default: return '#';
  }
}

/** Una dirección de este mismo sitio se abre sin recargar (ver `VistaPagina`). */
const esInterno = (d: Destino) => d?.tipo === 'inicio' || d?.tipo === 'pagina';
const esFuera = (d: Destino) => d?.tipo === 'url' && /^https?:/.test(d.url || '');

const MEDIDAS: Record<Tamano, { alto: number; logo: number; letra: string; caja: string; icono: number }> = {
  pequeno: { alto: 56, logo: 28, letra: 'text-[13px]', caja: 'h-8 px-2.5', icono: 14 },
  mediano: { alto: 68, logo: 36, letra: 'text-sm', caja: 'h-10 px-3.5', icono: 16 },
  grande: { alto: 84, logo: 44, letra: 'text-base', caja: 'h-12 px-4', icono: 18 },
};

function EnlaceMenu({ e, rutas, tamano, acento, lleno }: {
  e: Enlace; rutas: Rutas; tamano: Tamano; acento: string;
  /** En la lista de las tres rayas, a todo lo ancho. */
  lleno?: boolean;
}) {
  const m = MEDIDAS[tamano];
  const boton = e.estilo === 'boton';
  return (
    <a href={hrefDe(e.destino, rutas)}
      data-interno={esInterno(e.destino) ? '' : undefined}
      target={esFuera(e.destino) ? '_blank' : undefined}
      rel={esFuera(e.destino) ? 'noopener noreferrer' : undefined}
      style={boton ? { background: acento, color: textoSobre(acento) } : undefined}
      className={cn('inline-flex items-center gap-2 rounded-lg font-bold whitespace-nowrap transition-opacity',
        m.letra, m.caja, lleno && 'w-full', boton ? 'hover:opacity-90 justify-center' : 'opacity-80 hover:opacity-100')}>
      <IconoMenu valor={e.icono} tamano={m.icono} />
      {e.texto}
    </a>
  );
}

function Marca({ logo, nombre, tamano, rutas, columna }: {
  logo?: string; nombre?: string; tamano: Tamano; rutas: Rutas; columna?: boolean;
}) {
  if (!logo && !nombre) return null;
  const m = MEDIDAS[tamano];
  return (
    <a href={hrefDe({ tipo: 'inicio' }, rutas)} data-interno=""
      className={cn('flex min-w-0 shrink-0 font-black tracking-tight', columna ? 'flex-col items-start gap-3' : 'items-center gap-2.5')}>
      {logo && <IconoMenu valor={logo} tamano={m.logo} />}
      {nombre && <span className={cn('truncate', tamano === 'grande' ? 'text-xl' : tamano === 'pequeno' ? 'text-sm' : 'text-base')}>{nombre}</span>}
    </a>
  );
}

/** La barra de arriba. También es la del teléfono cuando el menú es lateral. */
function Barra({ s, rutas, logo, nombre, soloMovil }: {
  s: Sitio; rutas: Rutas; logo?: string; nombre?: string; soloMovil?: boolean;
}) {
  const mn = s.menu;
  const m = MEDIDAS[mn.tamano];
  // En lateral, la barra sólo existe en el teléfono, y allí siempre plegada.
  const plegado = soloMovil ? 'siempre' : mn.plegado;
  const estilo: CSSProperties = { background: mn.fondo, color: mn.texto, borderColor: `${mn.texto}1f` };
  return (
    <header style={estilo}
      className={cn('w-full z-40', mn.fijo && 'sticky top-0', mn.borde && 'border-b', soloMovil && '@2xl:hidden')}>
      <div className="relative mx-auto max-w-6xl px-5 @2xl:px-8 flex items-center gap-4" style={{ height: m.alto }}>
        <Marca logo={logo} nombre={nombre} tamano={mn.tamano} rutas={rutas} />
        <nav aria-label="Menú"
          className={cn('flex-1 items-center gap-1 min-w-0',
            mn.alineacion === 'centro' ? 'justify-center' : mn.alineacion === 'izquierda' ? 'justify-start' : 'justify-end',
            plegado === 'siempre' ? 'hidden' : plegado === 'movil' ? 'hidden @2xl:flex' : 'flex flex-wrap')}>
          {mn.enlaces.map(e => <EnlaceMenu key={e.id} e={e} rutas={rutas} tamano={mn.tamano} acento={mn.acento} />)}
        </nav>
        {plegado !== 'nunca' && mn.enlaces.length > 0 && (
          <details className={cn('group ml-auto', plegado === 'movil' && '@2xl:hidden')}>
            <summary aria-label="Abrir el menú"
              className="list-none [&::-webkit-details-marker]:hidden cursor-pointer w-11 h-11 grid place-items-center rounded-lg hover:bg-black/5">
              <Tres className="w-6 h-6 group-open:hidden" />
              <X className="w-6 h-6 hidden group-open:block" />
            </summary>
            <div style={{ background: mn.fondo, color: mn.texto, borderColor: `${mn.texto}1f` }}
              className="absolute right-3 left-3 @md:left-auto @md:w-72 top-full mt-1 rounded-2xl border shadow-2xl p-2 flex flex-col gap-1">
              {mn.enlaces.map(e => <EnlaceMenu key={e.id} e={e} rutas={rutas} tamano={mn.tamano} acento={mn.acento} lleno />)}
            </div>
          </details>
        )}
      </div>
    </header>
  );
}

function Lateral({ s, rutas, logo, nombre }: { s: Sitio; rutas: Rutas; logo?: string; nombre?: string }) {
  const mn = s.menu;
  return (
    <aside style={{ background: mn.fondo, color: mn.texto, borderColor: `${mn.texto}1f` }}
      className={cn('hidden @2xl:flex flex-col gap-8 w-64 shrink-0 p-6 self-start sticky top-0 h-screen overflow-y-auto', mn.borde && 'border-r')}>
      <Marca logo={logo} nombre={nombre} tamano={mn.tamano} rutas={rutas} columna />
      <nav aria-label="Menú" className="flex flex-col gap-1">
        {mn.enlaces.map(e => <EnlaceMenu key={e.id} e={e} rutas={rutas} tamano={mn.tamano} acento={mn.acento} lleno />)}
      </nav>
    </aside>
  );
}

function PieSitio({ s, rutas, logo, nombre }: { s: Sitio; rutas: Rutas; logo?: string; nombre?: string }) {
  const p = s.pie;
  const c = p.contacto;
  const hayContacto = !!(c.email || c.telefono || c.direccion);
  const legales = (Object.keys(NOMBRES_LEGALES) as DocLegal[]).filter(d => p.legales[d]);
  const titulo = 'text-[11px] font-black uppercase tracking-[0.15em] opacity-60 mb-3';
  return (
    <footer id="contacto" style={{ background: p.fondo, color: p.texto }} className="w-full">
      <div className="mx-auto max-w-6xl px-5 @2xl:px-8 py-12 grid gap-10 @2xl:grid-cols-3">
        <div className="space-y-3">
          {(logo || nombre) && (
            <div className="flex items-center gap-2.5 font-black text-lg">
              {logo && <IconoMenu valor={logo} tamano={36} />}
              {nombre && <span>{nombre}</span>}
            </div>
          )}
          {p.descripcion && <p className="text-sm opacity-75 leading-relaxed whitespace-pre-line max-w-xs">{p.descripcion}</p>}
        </div>
        {p.enlaces.length > 0 && (
          <div>
            <p className={titulo}>Enlaces</p>
            <ul className="space-y-2">
              {p.enlaces.map(e => (
                <li key={e.id}>
                  <a href={hrefDe(e.destino, rutas)} data-interno={esInterno(e.destino) ? '' : undefined}
                    target={esFuera(e.destino) ? '_blank' : undefined} rel={esFuera(e.destino) ? 'noopener noreferrer' : undefined}
                    className="inline-flex items-center gap-2 text-sm opacity-80 hover:opacity-100">
                    <IconoMenu valor={e.icono} tamano={15} /> {e.texto}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {hayContacto && (
          <div>
            <p className={titulo}>Contacto</p>
            <ul className="space-y-2 text-sm">
              {c.email && <li><a href={`mailto:${c.email}`} className="inline-flex items-center gap-2 opacity-80 hover:opacity-100 break-all"><Mail className="w-4 h-4 shrink-0" /> {c.email}</a></li>}
              {c.telefono && <li><a href={`tel:${c.telefono.replace(/\s+/g, '')}`} className="inline-flex items-center gap-2 opacity-80 hover:opacity-100"><Phone className="w-4 h-4 shrink-0" /> {c.telefono}</a></li>}
              {c.direccion && <li className="inline-flex items-start gap-2 opacity-80 whitespace-pre-line"><MapPin className="w-4 h-4 shrink-0 mt-0.5" /> {c.direccion}</li>}
            </ul>
          </div>
        )}
      </div>
      {(p.copyright || legales.length > 0) && (
        <div style={{ borderColor: `${p.texto}26` }} className="border-t">
          <div className="mx-auto max-w-6xl px-5 @2xl:px-8 py-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs opacity-75">
            {p.copyright && <span>© {new Date().getFullYear()} {s.titular.nombre || nombre}</span>}
            {legales.map(d => <a key={d} href={`#${d}`} className="hover:underline">{NOMBRES_LEGALES[d]}</a>)}
          </div>
        </div>
      )}
    </footer>
  );
}

/** Las ventanas de los textos legales: aparecen cuando la dirección acaba en
 *  `#aviso-legal`, `#privacidad` o `#cookies`. Se cierran yendo a `#cerrar`,
 *  que no existe: así el navegador no salta a ninguna parte. */
function Legales({ s, nombre }: { s: Sitio; nombre: string }) {
  return (
    <>
      {(Object.keys(NOMBRES_LEGALES) as DocLegal[]).map(d => (
        <div key={d} id={d} role="dialog" aria-label={NOMBRES_LEGALES[d]}
          className="hidden target:flex fixed inset-0 z-[70] bg-slate-900/50 items-center justify-center p-4">
          <a href="#cerrar" aria-label="Cerrar" className="absolute inset-0" />
          <div className="relative bg-white text-slate-700 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl p-6 @2xl:p-10">
            <a href="#cerrar" aria-label="Cerrar" className="absolute top-3 right-3 w-11 h-11 grid place-items-center text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </a>
            <TextoSencillo texto={textoLegal(d, s, nombre)} />
          </div>
        </div>
      ))}
    </>
  );
}

/** Lo justo de Markdown para un texto legal: títulos, listas y negritas. */
export function TextoSencillo({ texto }: { texto: string }) {
  const negritas = (t: string) => t.split(/(\*\*[^*]+\*\*)/g).map((x, i) =>
    x.startsWith('**') && x.endsWith('**') ? <strong key={i} className="text-slate-900">{x.slice(2, -2)}</strong> : x);
  const trozos = texto.split(/\n{2,}/);
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {trozos.map((t, i) => {
        if (t.startsWith('# ')) return <h2 key={i} className="text-2xl font-black text-slate-900 pr-10">{t.slice(2)}</h2>;
        if (t.startsWith('## ')) return <h3 key={i} className="pt-2 text-base font-black text-slate-900">{t.slice(3)}</h3>;
        const lineas = t.split('\n');
        if (lineas.every(l => l.startsWith('- '))) {
          return <ul key={i} className="list-disc pl-5 space-y-1">{lineas.map((l, j) => <li key={j}>{negritas(l.slice(2))}</li>)}</ul>;
        }
        return <p key={i} className="whitespace-pre-line">{negritas(t)}</p>;
      })}
    </div>
  );
}

/**
 * La página entera con su menú y su pie. Sin `sitio`, la página tal cual.
 *
 * `logo` y `nombre` son los de la página raíz: si quien publica no pone otros,
 * el menú usa su icono y su título.
 */
export function MarcoSitio({ sitio, rutas, logo, nombre, children }: {
  sitio: Sitio | null; rutas: Rutas; logo?: string | null; nombre?: string; children: ReactNode;
}) {
  if (!sitio || (!sitio.menu.activo && !sitio.pie.activo)) return <>{children}</>;
  const mn = sitio.menu;
  const logoMenu = mn.mostrarLogo ? (mn.logo || logo || undefined) : undefined;
  const nombreMenu = mn.mostrarNombre ? (mn.nombre || nombre || undefined) : undefined;
  const logoPie = sitio.pie.mostrarLogo ? (sitio.pie.logo || mn.logo || logo || undefined) : undefined;
  const nombrePie = sitio.pie.nombre || mn.nombre || nombre || undefined;
  const lateral = mn.activo && mn.posicion === 'lateral' && mn.plegado !== 'siempre';
  return (
    <div className="@container min-h-screen bg-white flex flex-col">
      {mn.activo && <Barra s={sitio} rutas={rutas} logo={logoMenu} nombre={nombreMenu} soloMovil={lateral} />}
      <div className={cn('flex-1', lateral && '@2xl:flex')}>
        {lateral && <Lateral s={sitio} rutas={rutas} logo={logoMenu} nombre={nombreMenu} />}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
      {sitio.pie.activo && <PieSitio s={sitio} rutas={rutas} logo={logoPie} nombre={nombrePie} />}
      <Legales s={sitio} nombre={nombrePie || ''} />
    </div>
  );
}
