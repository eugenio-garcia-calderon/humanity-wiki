import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layers, LayoutGrid, Map as IconoMapa } from 'lucide-react';
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

export type Vista = 'tabla' | 'mapa' | 'circulos';
const VALIDAS: Vista[] = ['tabla', 'mapa', 'circulos'];
// Las direcciones de las vistas de círculos retiradas (2026-10-28) llevan a la que queda.
// Desde el 2026-10-28 (Eugenio: «elimina el Círculo 1.0») «circulos» es el antiguo Círculo 2.0, y `circulo2` lleva a él.
const ANTIGUAS: Record<string, Vista> = { circulos2: 'circulos', circulos3: 'circulos', circulos4: 'circulos', circulos5: 'circulos', circulo2: 'circulos' };
/** Las vistas que eligen el territorio en su título: sin ellas, la segunda fila de la barra (2026-10-28). */
export const VISTAS_CON_TERRITORIO: Vista[] = ['circulos'];

/** La vista del sitio, en la dirección: `?vista=tabla|mapa|circulos`. Sin nada, la de por defecto: la tabla o,
 *  en la portada de un sitio con `sitio.vistaInicial` (2026-10-27, Eugenio: «que por defecto la vista de
 *  luzhumanidad.com sea la del círculo»), esa. */
export function useVista(porDefecto: Vista = 'tabla'): [Vista, (v: Vista) => void] {
  const { search, pathname, hash } = useLocation();
  const ir = useNavigate();
  const v = new URLSearchParams(search).get('vista');
  const activa: Vista = VALIDAS.includes(v as Vista) ? v as Vista : (v && ANTIGUAS[v]) || porDefecto;
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
export const vistaInicialDe = (config: any): Vista => (VALIDAS.includes(config?.vistaInicial) ? config.vistaInicial : ANTIGUAS[config?.vistaInicial] || 'tabla');

export function useVistaMapa(): [boolean, (mapa: boolean) => void] {
  const [v, cambiar] = useVista();
  return [v === 'mapa', (mapa: boolean) => cambiar(mapa ? 'mapa' : 'tabla')];
}

// (2026-10-28, Eugenio: «deja la tabla de sectores y el mapa, y ponlos uno al lado del otro» y «cambia "Tabla"
// por "Sectores"»): tres vistas, juntas; el menú plegado de cuando había seis ya no hace falta.
const VISTAS: { v: Vista; texto: string; Icono: typeof LayoutGrid }[] = [
  { v: 'circulos', texto: 'Círculo', Icono: Layers },
  { v: 'tabla', texto: 'Categorías', Icono: LayoutGrid },
  { v: 'mapa', texto: 'Mapa', Icono: IconoMapa },
];

/** EL SELECTOR DE VISTA DE LA BARRA: los botones juntos en una pastilla, el de la vista en la que estás en negro.
 *  (Antes un botón que decía a dónde llevaba, 2026-10-26; botones juntos, 2026-10-27; un menú plegado con seis
 *  vistas, 2026-10-28; y otra vez juntos al quedarse en tres.) */
export function BotonVista({ porDefecto = 'tabla' }: { porDefecto?: Vista }) {
  const [vista, cambiar] = useVista(porDefecto);
  return (
    // Solo los iconos (2026-10-28, Eugenio: «las vistas solo con los iconos, sin las palabras»); el nombre, en el título.
    <div role="group" aria-label="Vista" data-boton-vista className="inline-flex h-10 shrink-0 items-center gap-0.5 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
      {VISTAS.map(({ v, texto, Icono }) => (
        <button key={v} type="button" onClick={() => cambiar(v)} title={`Ver ${texto.toLowerCase()}`} aria-label={`Ver ${texto.toLowerCase()}`}
          aria-pressed={vista === v} data-vista={v}
          className={cn('grid h-8 w-10 place-items-center rounded-full transition-colors',
            vista === v ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}>
          <Icono className="h-[18px] w-[18px]" />
        </button>
      ))}
    </div>
  );
}

/** Las vistas dentro del menú ☰ de la barra (2026-10-28, Eugenio: «pon más compacto el selector de las vistas y mételo en
 *  el menú colapsable»): una fila de tres, con su icono y su nombre. */
export function VistasMenu({ porDefecto = 'tabla', cerrar }: { porDefecto?: Vista; cerrar?: () => void }) {
  const [vista, cambiar] = useVista(porDefecto);
  return (
    <div data-vistas-menu className="mb-1 border-b border-slate-100 px-1 pb-2 pt-1">
      <p className="px-2 pb-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Vista</p>
      <div role="group" aria-label="Vista" className="grid grid-cols-3 gap-1">
        {VISTAS.map(({ v, texto, Icono }) => (
          <button key={v} type="button" onClick={() => { cambiar(v); cerrar?.(); }} aria-pressed={vista === v} data-vista={v} title={`Ver ${texto.toLowerCase()}`}
            className={cn('flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-bold transition-colors',
              vista === v ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}>
            <Icono className="h-[18px] w-[18px]" /> {texto}
          </button>
        ))}
      </div>
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
