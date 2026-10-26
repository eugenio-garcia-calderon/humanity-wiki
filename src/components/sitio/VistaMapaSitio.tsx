import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid, Map as IconoMapa } from 'lucide-react';
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

/** EL BOTÓN DE VISTA DE LA BARRA (2026-10-26, Eugenio: «añade la palabra: “Ver mapa” en la galería y “Ver tabla”
 *  en el mapa, a la derecha de la calificación»). Un solo botón que dice a dónde lleva. */
export function BotonVista() {
  const [mapa, cambiar] = useVistaMapa();
  const texto = mapa ? 'Ver tabla' : 'Ver mapa';
  return (
    <button type="button" data-boton-vista onClick={() => cambiar(!mapa)} title={texto} aria-label={texto}
      className="ml-1 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-slate-900 px-3 text-sm font-bold text-white transition-colors hover:bg-slate-700">
      {mapa ? <LayoutGrid className="h-4 w-4" /> : <IconoMapa className="h-4 w-4" />}
      <span className="hidden whitespace-nowrap sm:inline">{texto}</span>
    </button>
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
