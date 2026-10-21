import { useState, useEffect } from 'react';
import BloquesLectura from '../knowledge/BloquesLectura';
import { FilaBotones, VentanaBoton, botonesDe, type BotonCabecera, type TallaBotones } from '../knowledge/BotonesCabecera';
import { BarraFija } from '../knowledge/BarraFija';
import { cn } from '../../utils/cn';

// LOS BOTONES DE LA CABECERA, EN LA PÁGINA PUBLICADA (2026-10-20): cada uno
// abre su página (una subpágina) en una ventana, leída como cualquier otra.
// Con ganchos y ventanas: sólo en el navegador (`CabeceraLectura` los carga en diferido).

/** La ventana con la página de un botón, leída del servidor. */
function VentanaPaginaPublica({ boton, onCerrar }: { boton: BotonCabecera; onCerrar: () => void }) {
  const [pagina, setPagina] = useState<{ titulo: string; bloques: any[] } | 'cargando' | 'no'>('cargando');
  useEffect(() => {
    let vivo = true;
    setPagina('cargando');
    fetch(`/api/sitio/pagina/${encodeURIComponent(boton.entityId)}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (vivo) setPagina(j ? { titulo: j.titulo || boton.pubTitulo || '', bloques: j.config?.bloques || [] } : 'no'); })
      .catch(() => { if (vivo) setPagina('no'); });
    return () => { vivo = false; };
  }, [boton]);
  const titulo = (typeof pagina === 'object' && pagina.titulo) || boton.pubTitulo || 'Sin título';
  // Una página con un mapa a pantalla completa se abre ya expandida.
  const tieneMapa = typeof pagina === 'object' && pagina.bloques.some((b: any) => ['mapaMundo', 'arbolConocimiento'].includes(b?.tipo) && b?.datos?.alto === 'pantalla');
  return (
    <VentanaBoton titulo={titulo} onCerrar={onCerrar} inicialGrande={tieneMapa}>
      {grande => (
      <div className={cn('mx-auto px-5 pb-12 pt-10 text-left', grande ? 'max-w-[110rem] sm:px-8' : 'max-w-3xl sm:px-10')}>
        <h2 className="mb-6 pr-10 text-3xl font-black tracking-tight text-slate-900 break-words">{titulo}</h2>
        {pagina === 'cargando' && <p className="text-slate-400">Cargando…</p>}
        {pagina === 'no' && <p className="text-slate-500">Esta página no está publicada.</p>}
        {typeof pagina === 'object' && <BloquesLectura bloques={pagina.bloques} paginaId={boton.entityId} />}
      </div>
      )}
    </VentanaBoton>
  );
}

export default function BotonesLectura({ config, centrado, derecha, talla }: { config: any; centrado: boolean; derecha?: boolean; talla?: TallaBotones }) {
  const botones = botonesDe(config);
  const [abierto, setAbierto] = useState<BotonCabecera | null>(null);
  if (!botones.length) return null;
  return (
    <>
      <FilaBotones botones={botones} talla={talla || config?.cabecera?.botonesTalla} estilo={config?.cabecera?.botonesEstilo}
        centrado={centrado} derechaAncho={derecha} sinMargen={derecha !== undefined} plegado={config?.cabecera?.botonesMenu === 'plegado'} onAbrir={setAbierto} />
      {abierto && <VentanaPaginaPublica boton={abierto} onCerrar={() => setAbierto(null)} />}
    </>
  );
}

/** La barra fina que se queda arriba al bajar (ver `BarraFija`). */
export function BarraFijaLectura({ config, titulo }: { config: any; titulo: string }) {
  const [abierto, setAbierto] = useState<BotonCabecera | null>(null);
  const verBotones = !(config?.cabecera?.elementos || []).some((e: any) => e?.id === 'botones' && e.oculto);
  return (
    <>
      <BarraFija icono={config?.icono || null} titulo={config?.ocultarTitulo ? '' : titulo} subtitulo={config?.subtitulo}
        portada={config?.portada} botones={verBotones ? botonesDe(config) : []} estilo={config?.cabecera?.botonesEstilo} plegado={config?.cabecera?.botonesMenu === 'plegado'} onAbrir={setAbierto} />
      {abierto && <VentanaPaginaPublica boton={abierto} onCerrar={() => setAbierto(null)} />}
    </>
  );
}
