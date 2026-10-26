import { useState, useEffect } from 'react';
import BloquesLectura from '../knowledge/BloquesLectura';
import { FilaBotones, FilaBotonesUnaLinea, VentanaBoton, botonesDe, type BotonCabecera, type TallaBotones } from '../knowledge/BotonesCabecera';
import { BarraFija } from '../knowledge/BarraFija';
import { useHijas, botonesDeHijas, vistaDeHijas } from '../knowledge/PaginasHijas';
import { useSitio } from './ContextoSitio';
import { cn } from '../../utils/cn';
import { Heart } from 'lucide-react';

// LOS BOTONES DE LA CABECERA, EN LA PÁGINA PUBLICADA (2026-10-20): cada uno
// abre su página (una subpágina) en una ventana, leída como cualquier otra.
// Con ganchos y ventanas: sólo en el navegador (`CabeceraLectura` los carga en diferido).

/** La ventana con la página de un botón, leída del servidor. */
/** Los botones de la cabecera: los de antes y, en vista «menú», las páginas hijas (2026-10-23). */
function useBotonesPagina(config: any): { botones: BotonCabecera[]; hijaIds: Set<string> } {
  const hijas = useHijas(config?.hijas?.tabla_id);
  const deHijas = vistaDeHijas(config?.hijas) === 'menu' ? botonesDeHijas(hijas) : [];
  return { botones: [...botonesDe(config), ...deHijas], hijaIds: new Set(deHijas.map(b => b.id)) };
}

function VentanaPaginaPublica({ boton, onCerrar, esHija = false }: { boton: BotonCabecera; onCerrar: () => void; esHija?: boolean }) {
  const sitio = useSitio();
  const [pagina, setPagina] = useState<{ titulo: string; bloques: any[] } | 'cargando' | 'no' | 'fallo'>('cargando');
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    // (2026-10-22) Con tope de tiempo y un reintento solo: una petición que se
    // quedaba colgada dejaba la ventana en blanco hasta cerrarla y volver a abrirla.
    let vivo = true;
    const control = new AbortController();
    const tope = window.setTimeout(() => control.abort(), 8000);
    setPagina('cargando');
    const pedir = (n: number): Promise<void> =>
      fetch(`/api/sitio/pagina/${encodeURIComponent(boton.entityId)}`, { credentials: 'include', signal: control.signal })
        .then(r => (r.ok ? r.json() : r.status === 404 || r.status === 403 ? null : Promise.reject(new Error(String(r.status)))))
        .then(j => { if (vivo) setPagina(j ? { titulo: j.titulo || boton.pubTitulo || '', bloques: j.config?.bloques || [] } : 'no'); })
        .catch(() => { if (!vivo) return; if (n < 1 && !control.signal.aborted) return pedir(n + 1); setPagina('fallo'); });
    pedir(0).finally(() => window.clearTimeout(tope));
    return () => { vivo = false; control.abort(); window.clearTimeout(tope); };
  }, [boton, intento]);
  const titulo = (typeof pagina === 'object' && pagina.titulo) || boton.pubTitulo || 'Sin título';
  // Una página con un mapa a pantalla completa se abre ya expandida.
  const tieneMapa = typeof pagina === 'object' && pagina.bloques.some((b: any) => ['mapaMundo', 'arbolConocimiento'].includes(b?.tipo) && b?.datos?.alto === 'pantalla');
  return (
    <VentanaBoton titulo={titulo} onCerrar={onCerrar} inicialGrande={tieneMapa} enlace={esHija ? (sitio ? sitio.enlacePagina(boton.entityId) : `/p/${boton.entityId}`) : undefined}>
      {grande => (
      <div className={cn('mx-auto px-5 pb-12 pt-10 text-left', grande ? 'max-w-[110rem] sm:px-8' : 'max-w-3xl sm:px-10')}>
        <h2 className="mb-6 pr-10 text-3xl font-black tracking-tight text-slate-900 break-words">{titulo}</h2>
        {pagina === 'cargando' && <p className="text-slate-400">Cargando…</p>}
        {pagina === 'no' && <p className="text-slate-500">Esta página no está publicada.</p>}
        {pagina === 'fallo' && (
          <p className="text-slate-500">No se ha podido cargar.{' '}
            <button type="button" onClick={() => setIntento(i => i + 1)} className="font-bold text-slate-900 underline">Volver a intentarlo</button>
          </p>
        )}
        {typeof pagina === 'object' && <BloquesLectura bloques={pagina.bloques} paginaId={boton.entityId} />}
      </div>
      )}
    </VentanaBoton>
  );
}

export default function BotonesLectura({ config, centrado, derecha, talla, unaLinea = false, plegado, parte }: { config: any; centrado: boolean; derecha?: boolean; talla?: TallaBotones;
  /** La barra del sitio (2026-10-26) pinta por separado Donar y el menú (solo las tres rayas), con la cuenta en medio. */
  parte?: 'donar' | 'menu';
  /** En una sola línea; lo que no cabe, en «Más ▾» (la cabecera del sitio, 2026-10-26). */
  unaLinea?: boolean;
  /** Todo en el menú desplegable, diga lo que diga la página (la barra del sitio, 2026-10-26). */
  plegado?: boolean;
}) {
  const { botones, hijaIds } = useBotonesPagina(config);
  const [abierto, setAbierto] = useState<BotonCabecera | null>(null);
  const sitio = useSitio();
  const plegar = plegado ?? config?.cabecera?.botonesMenu === 'plegado';
  // DONAR (2026-10-26, Eugenio: «a la izquierda del botón de menú, un botón de donar que lleve a la
  // página de donar»): `config.donar` es esa página.
  const donar = typeof config?.donar === 'string' && config.donar ? (
    <a href={sitio ? sitio.enlacePagina(config.donar) : `/p/${config.donar}`} data-interno data-boton-donar
      // El amarillo del logo de Luz & Humanidad (2026-10-26, Eugenio: «un botón menos rojo»).
      className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#f8e038] font-bold text-slate-900 shadow-sm ring-1 ring-black/5 transition-colors hover:bg-[#efd320]', talla === 'xs' ? 'h-7 px-2.5 text-[11px]' : parte ? 'h-8 px-3 text-[12px]' : 'h-9 px-3.5 text-[13px]')}>
      <Heart className="h-4 w-4" fill="currentColor" /> Donar
    </a>
  ) : null;
  if (parte === 'donar') return donar;
  if (parte === 'menu') return botones.length ? (
    <>
      <FilaBotones botones={derecha === false ? botones : [...botones].reverse()} sinMargen plegado soloIcono derechaAncho onAbrir={setAbierto} />
      {abierto && <VentanaPaginaPublica boton={abierto} esHija={hijaIds.has(abierto.id)} onCerrar={() => setAbierto(null)} />}
    </>
  ) : null;
  if (!botones.length) return donar;
  if (plegar) return (
    <span className="inline-flex items-center gap-2">
      {donar}
      {/* En el menú, en el orden en que se leían los botones (la lista va al revés: el primero, a la derecha). */}
      <FilaBotones botones={derecha === false ? botones : [...botones].reverse()} talla={talla || config?.cabecera?.botonesTalla} estilo={config?.cabecera?.botonesEstilo} sinMargen plegado derechaAncho onAbrir={setAbierto} />
      {abierto && <VentanaPaginaPublica boton={abierto} esHija={hijaIds.has(abierto.id)} onCerrar={() => setAbierto(null)} />}
    </span>
  );
  return (
    <>
      {donar}
      {unaLinea ? (
        // En estas cabeceras los botones iban a la derecha con el primero a la derecha del todo:
        // de izquierda a derecha se leen al revés de la lista. Se conserva ese orden.
        <FilaBotonesUnaLinea botones={[...botones].reverse()} talla={talla || config?.cabecera?.botonesTalla} estilo={config?.cabecera?.botonesEstilo} onAbrir={setAbierto} />
      ) : <FilaBotones botones={botones} talla={talla || config?.cabecera?.botonesTalla} estilo={config?.cabecera?.botonesEstilo}
        centrado={centrado} derechaAncho={derecha} sinMargen={derecha !== undefined} plegado={config?.cabecera?.botonesMenu === 'plegado'} onAbrir={setAbierto} />}
      {abierto && <VentanaPaginaPublica boton={abierto} esHija={hijaIds.has(abierto.id)} onCerrar={() => setAbierto(null)} />}
    </>
  );
}

/** La barra fina que se queda arriba al bajar (ver `BarraFija`). */
export function BarraFijaLectura({ config, titulo }: { config: any; titulo: string }) {
  const [abierto, setAbierto] = useState<BotonCabecera | null>(null);
  const { botones: todos, hijaIds } = useBotonesPagina(config);
  const verBotones = !(config?.cabecera?.elementos || []).some((e: any) => e?.id === 'botones' && e.oculto);
  return (
    <>
      <BarraFija icono={config?.icono || null} titulo={config?.ocultarTitulo ? '' : titulo} subtitulo={config?.subtitulo}
        portada={config?.portada} botones={verBotones ? todos : []} estilo={config?.cabecera?.botonesEstilo} plegado={config?.cabecera?.botonesMenu === 'plegado'} onAbrir={setAbierto} />
      {abierto && <VentanaPaginaPublica boton={abierto} esHija={hijaIds.has(abierto.id)} onCerrar={() => setAbierto(null)} />}
    </>
  );
}
