import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid, Map as IconoMapa } from 'lucide-react';
import { MarcoCargando } from '../knowledge/BotonesCabecera';
import { direccionMapa } from '../bloquesDatos/mapaMundo/Lectura';
import { useTerritorioActual } from '../bloquesDatos/filtroTerritorio/ElegirTerritorio';
import { cn } from '../../utils/cn';

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

export function useVistaMapa(): [boolean, (mapa: boolean) => void] {
  const { search, pathname, hash } = useLocation();
  const ir = useNavigate();
  const activa = new URLSearchParams(search).get('vista') === 'mapa';
  const cambiar = (mapa: boolean) => {
    const q = new URLSearchParams(search);
    if (mapa) q.set('vista', 'mapa'); else q.delete('vista');
    const s = q.toString();
    ir(`${pathname}${s ? `?${s}` : ''}${hash}`);
  };
  return [activa, cambiar];
}

/** El interruptor de la barra: contenido o mapa. */
export function BotonVista() {
  const [mapa, cambiar] = useVistaMapa();
  const boton = (activo: boolean, etiqueta: string, icono: ReactNode, onClick: () => void) => (
    <button type="button" onClick={onClick} aria-pressed={activo} title={etiqueta} aria-label={etiqueta}
      className={cn('grid h-7 w-8 place-items-center rounded-full transition-colors', activo ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900')}>
      {icono}
    </button>
  );
  return (
    <div data-boton-vista role="group" aria-label="Vista" className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-slate-200 bg-white p-0.5">
      {boton(!mapa, 'Vista de contenido', <LayoutGrid className="h-4 w-4" />, () => mapa && cambiar(false))}
      {boton(mapa, 'Vista de mapa', <IconoMapa className="h-4 w-4" />, () => !mapa && cambiar(true))}
    </div>
  );
}

/** El mapa a todo lo ancho de la ventana y todo el alto que deja la barra. */
export default function VistaMapaSitio() {
  const t = useTerritorioActual();
  const slug = t ? plano(t.nombre) : 'espana';
  const datos: Record<string, unknown> = { filtros: true };
  if (ENCUADRADOS.has(slug) || !t?.mapa) datos.territorio = ENCUADRADOS.has(slug) ? slug : 'espana';
  else datos.foco = t.mapa;
  // Dónde acaba la barra (en el móvil ocupa dos líneas): el mapa llena lo que queda de ventana.
  const [barra, setBarra] = useState(80);
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('[data-cabecera-sitio]');
    if (!el) return;
    const medir = () => setBarra(Math.round(el.getBoundingClientRect().bottom + window.scrollY));
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
