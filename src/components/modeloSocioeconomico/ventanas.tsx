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
import { ChevronDown, Euro, GraduationCap, HandCoins, Home, Landmark, Layers, PieChart, Scale, ScrollText, ShieldCheck, Smartphone, Stethoscope, Tags, type LucideIcon } from 'lucide-react';
import { APARTADOS as A_ESCALAS } from '../../data/escalas';
import { APARTADOS as A_VIVIENDA } from '../../data/vivienda';
import { APARTADOS as A_SEGURIDAD } from '../../data/seguridad';
import { APARTADOS as A_JUSTICIA } from '../../data/justicia';
import { APARTADOS as A_SANIDAD } from '../../data/sanidad';
import { APARTADOS as A_EDUCACION } from '../../data/educacion';
import { APARTADOS as A_LEGAL } from '../../data/legal';
import { APARTADOS as A_DIGITAL } from '../../data/digital';
import { cn } from '../../utils/cn';
import { Libre } from './piezas';

export type VentanaId = 'escalas' | 'impuestos' | 'categorias' | 'pensiones' | 'presupuestos' | 'deuda' | 'vivienda' | 'seguridad' | 'justicia' | 'sanidad' | 'educacion' | 'legal' | 'digital';
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

export const VENTANAS: Ventana[] = [
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
    id: 'deuda', titulo: 'Deuda', icono: Landmark,
    lema: 'La deuda de España y de las comunidades, y un sistema sin deuda con una caja para emergencias.',
    apartados: [
      { id: 'deuda', t: 'Resumen' },
      { id: 'deuda-quien', t: 'Quién debe' },
      { id: 'deuda-historia', t: 'Historia' },
      { id: 'deuda-propuesta', t: 'Hoy y propuesta' },
      { id: 'deuda-caja', t: 'Caja de emergencias' },
      { id: 'deuda-heredada', t: 'La deuda de hoy' },
      { id: 'deuda-fuentes', t: 'Fuentes' },
    ],
  },
  { id: 'vivienda', titulo: 'Vivienda', icono: Home, apartados: A_VIVIENDA, lema: 'Lo que hoy apenas se hace, y qué promulga y regula cada escala.' },
  { id: 'seguridad', titulo: 'Seguridad', icono: ShieldCheck, apartados: A_SEGURIDAD, lema: 'Ejército, policías y guardias: un solo cuerpo de guardianes, sin duplicidades.' },
  { id: 'justicia', titulo: 'Justicia', icono: Scale, apartados: A_JUSTICIA, lema: 'Una sola denuncia, juicios rápidos y jueces junto a la policía.' },
  { id: 'sanidad', titulo: 'Sanidad', icono: Stethoscope, apartados: A_SANIDAD, lema: 'Las esperas de hoy y un único expediente para cada persona.' },
  { id: 'educacion', titulo: 'Educación', icono: GraduationCap, apartados: A_EDUCACION, lema: 'Una mochila educativa de 0 a 25 años, y alumnos que enseñan a alumnos.' },
  { id: 'legal', titulo: 'Legal', icono: ScrollText, apartados: A_LEGAL, lema: 'Las mismas reglas en todo el país: menos leyes, y que no se contradigan.' },
  { id: 'digital', titulo: 'Digital', icono: Smartphone, apartados: A_DIGITAL, lema: 'Firmar con el móvil, sin instalar nada.' },
];

/** Which window an anchor belongs to: its own id, or one of its sections. */
export function ventanaDeAncla(ancla: string): VentanaId | null {
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
        className="group inline-flex max-w-full items-start justify-start gap-1.5 rounded-2xl border border-slate-300 bg-white px-3.5 py-2 text-left text-sm font-semibold text-slate-800 hover:border-slate-400 hover:bg-slate-50">
        <ChevronDown aria-hidden className={cn('mt-0.5 h-4 w-4 shrink-0 transition-transform', abierto && 'rotate-180')} />
        <span>{abierto ? 'Menos' : 'Más'}: {titulo}</span>
      </Libre>
      {abierto && <div className="mt-4 border-l-2 border-slate-200 pl-4 sm:pl-6">{children}</div>}
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
        <header className="mb-7 max-w-3xl">
          <h2 id={`${id}-titulo`} className="text-[1.75rem] font-[750] leading-[1.12] tracking-[-0.02em] text-slate-900 sm:text-[2.2rem]">{titulo}</h2>
          {entradilla && <div className="mt-3 text-[17px] leading-relaxed text-slate-600">{entradilla}</div>}
        </header>
        {children}
      </div>
    </section>
  );
}

/** A big number with what it means, for the summaries. */
export function Cifra({ valor, texto, tono = 'neutro', nota }: { valor: ReactNode; texto: ReactNode; tono?: 'neutro' | 'bien' | 'mal'; nota?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className={cn('text-[2rem] font-[800] leading-none tracking-tight tabular-nums',
        tono === 'bien' ? 'text-emerald-700' : tono === 'mal' ? 'text-rose-700' : 'text-slate-900')}>{valor}</p>
      <p className="mt-2 text-[15px] leading-snug text-slate-700">{texto}</p>
      {nota && <p className="mt-1 text-xs leading-snug text-slate-500">{nota}</p>}
    </div>
  );
}
