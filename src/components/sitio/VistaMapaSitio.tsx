import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CircleDot, LayoutGrid, Map as IconoMapa, Orbit, Target } from 'lucide-react';
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

export type Vista = 'tabla' | 'mapa' | 'circulos' | 'circulos2' | 'circulos3';
const VALIDAS: Vista[] = ['tabla', 'mapa', 'circulos', 'circulos2', 'circulos3'];

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
];

/** EL SELECTOR DE VISTA DE LA BARRA. Primero un botón que decía a dónde llevaba («Ver mapa» / «Ver tabla»,
 *  2026-10-26); desde la tercera vista (2026-10-27, Eugenio: «una tercera vista de círculos, junto a la de mapa y
 *  tabla») son tres botones juntos, el de la vista en la que estás en negro. */
export function BotonVista({ porDefecto = 'tabla' }: { porDefecto?: Vista }) {
  const [vista, cambiar] = useVista(porDefecto);
  return (
    <div role="group" aria-label="Vista" data-boton-vista className="ml-1 inline-flex h-9 shrink-0 items-center gap-0.5 rounded-full bg-slate-100 p-0.5">
      {VISTAS.map(({ v, texto, Icono }) => (
        <button key={v} type="button" onClick={() => cambiar(v)} title={`Ver ${texto.toLowerCase()}`} aria-label={`Ver ${texto.toLowerCase()}`}
          aria-pressed={vista === v} data-vista={v}
          className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm font-bold transition-colors',
            vista === v ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white hover:text-slate-900')}>
          <Icono className="h-4 w-4" />
          <span className="hidden whitespace-nowrap xl:inline">{texto}</span>
        </button>
      ))}
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
