// The «Modelo socioeconómico optimizado» as windows (2026-11-12, Eugenio):
// «que cada cosa del menú (presupuestos, pensiones…) sea una ventana distinta
// en vez de una landing con secciones; al pinchar una, que se mantenga
// iluminada y el resto se apaguen, y abajo aparezca su página con un submenú.
// Lo más sencillo a la vista, y lo complejo en un “más” que se despliega ahí
// mismo, en cascada.» And room in the menu for what comes next (education,
// health).
//
// A window and its sections live in the URL hash, so every one can be shared:
// `#pensiones` opens the window, `#pensiones-fondo` opens it at that section.
// The old single-page anchors (`#esquema`, `#cuentas`…) still land in the
// taxes window, where those sections now are.
import { useState, type ReactNode } from 'react';
import { Euro, GraduationCap, HandCoins, Home, Landmark, Layers, Plus, PieChart, Scale, ScrollText, ShieldCheck, Smartphone, Stethoscope, Tags, type LucideIcon } from 'lucide-react';
import { ESPECTROS } from '../../data/espectro';
import { APARTADOS as A_ESCALAS } from '../../data/escalas';
import { APARTADOS as A_VIVIENDA } from '../../data/vivienda';
import { APARTADOS as A_SEGURIDAD } from '../../data/seguridad';
import { APARTADOS as A_JUSTICIA } from '../../data/justicia';
import { APARTADOS as A_SANIDAD } from '../../data/sanidad';
import { APARTADOS as A_EDUCACION } from '../../data/educacion';
import { APARTADOS as A_LEGAL } from '../../data/legal';
import { APARTADOS as A_DIGITAL } from '../../data/digital';
import { APARTADOS as A_BANCA } from '../../data/banca';
import { APARTADOS as A_MONEDA } from '../../data/moneda';
import { cn } from '../../utils/cn';
import { Libre } from './piezas';

export type VentanaId = 'escalas' | 'impuestos' | 'categorias' | 'pensiones' | 'presupuestos' | 'economia' | 'vivienda' | 'seguridad' | 'justicia' | 'sanidad' | 'educacion' | 'legal' | 'digital';
export interface Ventana {
  id: VentanaId;
  titulo: string;
  /** One line under the title, on the cover card. */
  lema: string;
  icono: LucideIcon;
  /** Not built yet: shown in the menu, not clickable. */
  pronto?: boolean;
  /** Sections of the window, in order: id (also the anchor) and menu label. */
  apartados: { id: string; t: string }[];
}

const BASE: Ventana[] = [
  {
    id: 'escalas', titulo: 'Escalas', icono: Layers, apartados: A_ESCALAS,
    lema: 'De la persona al planeta: qué le toca a cada escala y con qué poder.',
  },
  {
    id: 'impuestos', titulo: 'Recaudación', icono: Euro,
    lema: 'Un solo impuesto en cuatro tramos que se suma al precio, frente a los más de cien de hoy.',
    apartados: [
      { id: 'impuestos', t: 'Resumen' },
      { id: 'como-funciona', t: 'Cómo funciona' },
      { id: 'hoy', t: 'Hoy y propuesto' },
      { id: 'esquema', t: 'Adónde va el dinero' },
      { id: 'ejemplo', t: 'Un caso' },
      { id: 'decide', t: 'Quién decide' },
      { id: 'cuentas', t: 'Cuentas y fuentes' },
    ],
  },
  {
    id: 'categorias', titulo: 'Categorías', icono: Tags,
    lema: 'Qué es básico, secundario, ocio o lujo, sector por sector, y cómo decidirlo.',
    apartados: [
      { id: 'categorias', t: 'Las cuatro' },
      { id: 'categorias-sectores', t: 'Cada sector' },
      { id: 'categorias-decidir', t: 'Cómo decidir' },
    ],
  },
  {
    id: 'pensiones', titulo: 'Pensiones', icono: HandCoins,
    lema: 'Una sola pensión igual al salario mínimo, ayudas aparte y un fondo que acabe pagándolas.',
    apartados: [
      { id: 'pensiones', t: 'Resumen' },
      { id: 'pensiones-hoy', t: 'Las de hoy' },
      { id: 'pensiones-propuesta', t: 'La propuesta' },
      { id: 'pensiones-quien', t: 'Ganan y pierden' },
      { id: 'pensiones-cuentas', t: 'Ahorro' },
      { id: 'pensiones-trabajo', t: 'Coste de un sueldo' },
      { id: 'pensiones-fondo', t: 'Fondo' },
      { id: 'pensiones-fuentes', t: 'Fuentes' },
    ],
  },
  {
    id: 'presupuestos', titulo: 'Presupuestos', icono: PieChart,
    lema: 'En qué se gasta cada escala, de la Unión Europea a una familia.',
    apartados: [
      { id: 'presupuestos', t: 'Cada escala' },
      { id: 'presupuestos-comparar', t: 'Todas juntas' },
    ],
  },
  {
    id: 'economia', titulo: 'Economía', icono: Landmark,
    lema: 'La deuda, la banca y la moneda: cómo funcionan hoy y qué se propone en cada una.',
    // Flat list of every part's sections, so any of their anchors opens this window.
    apartados: [],
  },
  { id: 'vivienda', titulo: 'Vivienda', icono: Home, apartados: A_VIVIENDA, lema: 'Lo que hoy apenas se hace, y qué promulga y regula cada escala.' },
  { id: 'seguridad', titulo: 'Seguridad', icono: ShieldCheck, apartados: A_SEGURIDAD, lema: 'Ejército, policías y guardias: un solo cuerpo de guardianes, sin duplicidades.' },
  { id: 'justicia', titulo: 'Justicia', icono: Scale, apartados: A_JUSTICIA, lema: 'Una sola denuncia, juicios rápidos y jueces junto a la policía.' },
  { id: 'sanidad', titulo: 'Sanidad', icono: Stethoscope, apartados: A_SANIDAD, lema: 'Las esperas de hoy y un único expediente para cada persona.' },
  { id: 'educacion', titulo: 'Educación', icono: GraduationCap, apartados: A_EDUCACION, lema: 'Una mochila educativa de 0 a 25 años, y alumnos que enseñan a alumnos.' },
  { id: 'legal', titulo: 'Legal', icono: ScrollText, apartados: A_LEGAL, lema: 'Las mismas reglas en todo el país: menos leyes, y que no se contradigan.' },
  { id: 'digital', titulo: 'Digital', icono: Smartphone, apartados: A_DIGITAL, lema: 'Firmar con el móvil, sin instalar nada.' },
];

/** Every window with «Otras propuestas» gets it as the first entry of its submenu. */
const conPropuestas = (id: string, apartados: { id: string; t: string }[]) =>
  ESPECTROS[id] ? [{ id: `${id}-propuestas`, t: 'Otras propuestas' }, ...apartados] : apartados;

/**
 * The «Economía» window (Eugenio, 2026-11-13) holds three parts — Deuda, Banca,
 * Moneda — each with its own «Otras propuestas» and sections. Only the open
 * part is drawn; its anchors keep the old ids (#deuda-caja), so links shared
 * before the merge still land.
 */
export const PARTES_ECONOMIA: { id: 'deuda' | 'banca' | 'moneda'; t: string; apartados: { id: string; t: string }[] }[] = [
  { id: 'deuda', t: 'Deuda', apartados: conPropuestas('deuda', [
      { id: 'deuda', t: 'Resumen' },
      { id: 'deuda-quien', t: 'Quién debe' },
      { id: 'deuda-historia', t: 'Historia' },
      { id: 'deuda-propuesta', t: 'Hoy y propuesta' },
      { id: 'deuda-caja', t: 'Caja de emergencias' },
      { id: 'deuda-heredada', t: 'La deuda de hoy' },
      { id: 'deuda-fuentes', t: 'Fuentes' },
  ]) },
  { id: 'banca', t: 'Banca', apartados: conPropuestas('banca', A_BANCA) },
  { id: 'moneda', t: 'Moneda', apartados: conPropuestas('moneda', A_MONEDA) },
];
export type ParteEconomia = (typeof PARTES_ECONOMIA)[number]['id'];

/** The part an anchor belongs to (its id, one of its sections, or its prefix); Deuda by default. */
export function parteDeAncla(ancla: string): ParteEconomia {
  const p = PARTES_ECONOMIA.find(x => x.id === ancla || ancla.startsWith(`${x.id}-`) || x.apartados.some(a => a.id === ancla));
  return p ? p.id : 'deuda';
}

/** Every window with «Otras propuestas» gets it as the first entry of its submenu. */
export const VENTANAS: Ventana[] = BASE.map(v => v.id === 'economia'
  ? { ...v, apartados: PARTES_ECONOMIA.flatMap(p => [{ id: p.id, t: p.t }, ...p.apartados]) }
  : { ...v, apartados: conPropuestas(v.id, v.apartados) });

/** Which window an anchor belongs to: its own id, or one of its sections (any Economía part's prefix too). */
export function ventanaDeAncla(ancla: string): VentanaId | null {
  if (PARTES_ECONOMIA.some(p => ancla === p.id || ancla.startsWith(`${p.id}-`))) return 'economia';
  for (const v of VENTANAS) {
    if (v.pronto) continue;
    if (v.id === ancla || v.apartados.some(a => a.id === ancla)) return v.id as VentanaId;
  }
  if (ALIAS[ancla]) return ventanaDeAncla(ALIAS[ancla]);
  return null;
}

/** Anchors of the old single page whose content now sits inside another section. */
export const ALIAS: Record<string, string> = { inicio: 'impuestos', tercios: 'esquema', matriz: 'esquema', retos: 'cuentas', fuentes: 'cuentas' };

/**
 * «Más»: the detail one click away, opened right there (Eugenio: «que haya un
 * enlace que pinchas y se despliega ahí mismo más información, en cascada»).
 * Closed by default; they nest.
 */
export function Mas({ titulo, children, className, abierto: inicial = false }: { titulo: string; children: ReactNode; className?: string; abierto?: boolean }) {
  const [abierto, setAbierto] = useState(inicial);
  return (
    <div className={cn('mt-5', className)}>
      <Libre onClick={() => setAbierto(a => !a)} aria-expanded={abierto}
        className={cn('group inline-flex max-w-full items-start justify-start gap-2.5 rounded-[1.25rem] border py-1.5 pl-1.5 pr-4 text-left text-sm font-semibold transition-colors duration-150 motion-reduce:transition-none',
          abierto ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800' : 'border-slate-300 bg-white text-slate-800 shadow-sm shadow-slate-900/5 hover:border-slate-900 hover:text-slate-900')}>
        <span aria-hidden className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full transition-colors duration-150 motion-reduce:transition-none',
          abierto ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white')}>
          <Plus className={cn('h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none', abierto && 'rotate-45')} strokeWidth={2.5} />
        </span>
        <span className="py-0.5">{abierto ? 'Menos' : 'Más'}: {titulo}</span>
      </Libre>
      {abierto && (
        <div className="mt-4 border-l-2 border-slate-300 pl-4 transition duration-200 ease-out starting:-translate-y-1 starting:opacity-0 motion-reduce:transition-none sm:pl-6">
          {children}
        </div>
      )}
    </div>
  );
}

/** One section of a window: its anchor, its title and the one idea it holds. */
export function Apartado({ id, titulo, entradilla, children, fondo = 'claro' }: {
  id: string; titulo: string; entradilla?: ReactNode; children: ReactNode; fondo?: 'claro' | 'blanco';
}) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className={cn('scroll-mt-40', fondo === 'blanco' && 'border-y border-slate-200 bg-white')}>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6">
        <header className="mb-8 max-w-3xl">
          {/* The calibration mark: the same short rule opens every section (the observatory's axis, in ink). */}
          <span aria-hidden className="mb-4 block h-[3px] w-10 rounded-full bg-gradient-to-r from-slate-900 to-slate-300" />
          <h2 id={`${id}-titulo`} className="text-balance text-[1.75rem] font-[750] leading-[1.12] tracking-[-0.02em] text-slate-900 sm:text-[2.2rem]">{titulo}</h2>
          {entradilla && <div className="mt-3 max-w-[64ch] text-[17px] leading-relaxed text-slate-600">{entradilla}</div>}
        </header>
        {children}
      </div>
    </section>
  );
}

/** A big number with what it means, for the summaries. */
export function Cifra({ valor, texto, tono = 'neutro', nota }: { valor: ReactNode; texto: ReactNode; tono?: 'neutro' | 'bien' | 'mal'; nota?: ReactNode }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.04]">
      {/* A short rule in the tone's colour: the reading's sign at a glance (the value repeats it in its own colour). */}
      <span aria-hidden className={cn('mb-3 block h-[3px] w-7 rounded-full',
        tono === 'bien' ? 'bg-emerald-600' : tono === 'mal' ? 'bg-rose-600' : 'bg-slate-300')} />
      <p className={cn('break-words text-[2.1rem] font-[800] leading-none tracking-[-0.025em] tabular-nums',
        tono === 'bien' ? 'text-emerald-700' : tono === 'mal' ? 'text-rose-700' : 'text-slate-900')}>{valor}</p>
      <p className="mt-2.5 text-[15px] leading-snug text-slate-700">{texto}</p>
      {nota && <p className="mt-auto pt-2 text-xs leading-snug text-slate-500">{nota}</p>}
    </div>
  );
}
