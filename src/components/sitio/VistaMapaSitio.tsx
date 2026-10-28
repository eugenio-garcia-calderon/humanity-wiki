import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronDown, CircleDot, Layers, LayoutGrid, Map as IconoMapa, Orbit, Target } from 'lucide-react';
import { MarcoCargando } from '../knowledge/BotonesCabecera';
import { direccionMapa } from '../bloquesDatos/mapaMundo/Lectura';
import { useTerritorioActual } from '../bloquesDatos/filtroTerritorio/ElegirTerritorio';
import { cn } from '../../utils/cn';
import { raizDe } from './CabeceraSitio';

// ============================================================================
// LA VISTA DE MAPA DEL SITIO (2026-10-26, Eugenio)
// ============================================================================
// «Un botón de cambio de vista: en la vista de mapa, el mapa a toda la pantalla,
// de izquierda a derecha, con el menú que ya tenemos arriba; y ligado al
// territorio que escoges arriba: si está España, el mapa enseña España.»
// La vista va en la dirección (`?vista=mapa`) para poder compartirla. El mapa
// es el de `/mapa` con su columna de filtros; el territorio sale del selector
// de la barra (`useTerritorioActual`) y, si no hay ninguno, España.

const plano = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** Los territorios que el mapa sabe encuadrar sin abrir su ficha (`ENCUADRES` en `pages/Map.tsx`). */
const ENCUADRADOS = new Set(['espana', 'europa']);

export type Vista = 'tabla' | 'mapa' | 'circulos' | 'circulos2' | 'circulos3' | 'circulos4';
const VALIDAS: Vista[] = ['tabla', 'mapa', 'circulos', 'circulos2', 'circulos3', 'circulos4'];
/** Las vistas que eligen el territorio en su título: sin ellas, la segunda fila de la barra (2026-10-28). */
export const VISTAS_CON_TERRITORIO: Vista[] = ['circulos3', 'circulos4'];

/** La vista del sitio, en la dirección: `?vista=tabla|mapa|circulos`. Sin nada, la de por defecto: la tabla o,
 *  en la portada de un sitio con `sitio.vistaInicial` (2026-10-27, Eugenio: «que por defecto la vista de
 *  luzhumanidad.com sea la del círculo»), esa. */
export function useVista(porDefecto: Vista = 'tabla'): [Vista, (v: Vista) => void] {
  const { search, pathname, hash } = useLocation();
  const ir = useNavigate();
  const v = new URLSearchParams(search).get('vista');
  const activa: Vista = VALIDAS.includes(v as Vista) ? v as Vista : porDefecto;
  const cambiar = (nueva: Vista) => {
    const q = new URLSearchParams(search);
    q.delete('circulo');
    if (nueva === porDefecto) q.delete('vista'); else q.set('vista', nueva);
    const s = q.toString();
    ir(`${pathname}${s ? `?${s}` : ''}${hash}`);
  };
  return [activa, cambiar];
}

/** La vista inicial que pide la configuración del sitio, si es una de las que hay. */
export const vistaInicialDe = (config: any): Vista => (VALIDAS.includes(config?.vistaInicial) ? config.vistaInicial : 'tabla');

export function useVistaMapa(): [boolean, (mapa: boolean) => void] {
  const [v, cambiar] = useVista();
  return [v === 'mapa', (mapa: boolean) => cambiar(mapa ? 'mapa' : 'tabla')];
}

const VISTAS: { v: Vista; texto: string; Icono: typeof LayoutGrid }[] = [
  { v: 'tabla', texto: 'Tabla', Icono: LayoutGrid },
  { v: 'mapa', texto: 'Mapa', Icono: IconoMapa },
  { v: 'circulos', texto: 'Círculos', Icono: Target },
  { v: 'circulos2', texto: 'Círculo 2.0', Icono: Orbit },
  { v: 'circulos3', texto: 'Círculo 3.0', Icono: CircleDot },
  { v: 'circulos4', texto: 'Círculo 4.0', Icono: Layers },
];

/** EL SELECTOR DE VISTA DE LA BARRA. Primero un botón que decía a dónde llevaba («Ver mapa» / «Ver tabla»,
 *  2026-10-26); con la tercera vista, botones juntos (2026-10-27); con seis, un menú plegado (2026-10-28, Eugenio:
 *  «como ya hay muchas vistas, ponlas en un menú colapsado para seleccionar qué vista queremos»): el botón dice la
 *  vista en la que estás y abre la lista. */
export function BotonVista({ porDefecto = 'tabla' }: { porDefecto?: Vista }) {
  const [vista, cambiar] = useVista(porDefecto);
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera); document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', tecla); };
  }, [abierto]);
  const actual = VISTAS.find(x => x.v === vista) || VISTAS[0];
  return (
    <div ref={caja} data-boton-vista className="relative ml-1 shrink-0">
      <button type="button" onClick={() => setAbierto(a => !a)} aria-haspopup="menu" aria-expanded={abierto} aria-label={`Vista: ${actual.texto}. Cambiar de vista`}
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-slate-900 pl-3 pr-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-700" data-vista-actual={vista}>
        <actual.Icono className="h-4 w-4" />
        <span className="whitespace-nowrap">{actual.texto}</span>
        <ChevronDown className={cn('h-4 w-4 opacity-70 transition-transform', abierto && 'rotate-180')} />
      </button>
      {abierto && (
        <div role="menu" aria-label="Vistas" className="absolute left-0 top-full z-50 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {VISTAS.map(({ v, texto, Icono }) => (
            <button key={v} type="button" role="menuitemradio" aria-checked={vista === v} data-vista={v}
              onClick={() => { cambiar(v); setAbierto(false); }}
              className={cn('flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-bold', vista === v ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50')}>
              <Icono className="h-4 w-4 text-slate-500" /><span className="flex-1">{texto}</span>{vista === v && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** El mapa a todo lo ancho de la ventana y todo el alto que deja la barra. */
export default function VistaMapaSitio({ raizId }: { raizId: string }) {
  const t = useTerritorioActual();
  // La base de datos de Sistemas del sitio (`sitio.sistemas`): el menú del mapa toma sus nombres e imágenes.
  const [sistemas, setSistemas] = useState<string | null>(null);
  useEffect(() => { let vivo = true; raizDe(raizId).then(r => { if (vivo) setSistemas(r?.config?.sitio?.sistemas || null); }); return () => { vivo = false; }; }, [raizId]);
  const slug = t ? plano(t.nombre) : 'espana';
  const datos: Record<string, unknown> = { filtros: true, sistemas };
  if (ENCUADRADOS.has(slug) || !t?.mapa) datos.territorio = ENCUADRADOS.has(slug) ? slug : 'espana';
  else datos.foco = t.mapa;
  // Dónde acaba la barra (en el móvil ocupa dos líneas): el mapa llena lo que queda de ventana.
  const [barra, setBarra] = useState(80);
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('[data-cabecera-sitio]');
    if (!el) return;
    // Arriba del todo antes de medir: con la página bajada, la barra (fija) daba un alto de más y el mapa se quedaba corto.
    window.scrollTo(0, 0);
    const medir = () => setBarra(Math.round(el.getBoundingClientRect().bottom));
    medir();
    const ro = new ResizeObserver(medir); ro.observe(el);
    // Sin pie ni desplazamiento: la ventana es la barra y el mapa.
    document.documentElement.classList.add('vista-mapa');
    return () => { ro.disconnect(); document.documentElement.classList.remove('vista-mapa'); };
  }, []);
  return (
    <div data-vista-mapa className="relative" style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)', marginTop: -16, marginBottom: -64 }}>
      <style>{'html.vista-mapa, html.vista-mapa body { overflow: hidden; } html.vista-mapa footer { display: none; }'}</style>
      <MarcoCargando src={direccionMapa(datos, true)} title={`Mapa de ${t?.nombre || 'España'}`} className="w-full"
        style={{ height: `calc(100dvh - ${barra}px)` }} paciencia={12000} />
    </div>
  );
}
