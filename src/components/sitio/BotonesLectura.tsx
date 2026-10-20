import { useState, useEffect } from 'react';
import BloquesLectura from '../knowledge/BloquesLectura';
import { FilaBotones, VentanaBoton, botonesDe, type BotonCabecera } from '../knowledge/BotonesCabecera';

// LOS BOTONES DE LA CABECERA, EN LA PÁGINA PUBLICADA (2026-10-20): cada uno
// abre su página (una subpágina) en una ventana, leída como cualquier otra.
export default function BotonesLectura({ config, centrado }: { config: any; centrado: boolean }) {
  const botones = botonesDe(config);
  const [abierto, setAbierto] = useState<BotonCabecera | null>(null);
  const [pagina, setPagina] = useState<{ titulo: string; bloques: any[] } | 'cargando' | 'no' | null>(null);
  useEffect(() => {
    if (!abierto) { setPagina(null); return; }
    let vivo = true;
    setPagina('cargando');
    fetch(`/api/sitio/pagina/${encodeURIComponent(abierto.entityId)}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (vivo) setPagina(j ? { titulo: j.titulo || abierto.pubTitulo || '', bloques: j.config?.bloques || [] } : 'no'); })
      .catch(() => { if (vivo) setPagina('no'); });
    return () => { vivo = false; };
  }, [abierto]);
  if (!botones.length) return null;
  const titulo = (typeof pagina === 'object' && pagina?.titulo) || abierto?.pubTitulo || 'Sin título';
  return (
    <>
      <FilaBotones botones={botones} talla={config?.cabecera?.botonesTalla} estilo={config?.cabecera?.botonesEstilo}
        centrado={centrado} onAbrir={setAbierto} />
      {abierto && (
        <VentanaBoton titulo={titulo} onCerrar={() => setAbierto(null)}>
          <div className="mx-auto max-w-3xl px-5 pb-12 pt-10 sm:px-10 text-left">
            <h2 className="mb-6 pr-10 text-3xl font-black tracking-tight text-slate-900 break-words">{titulo}</h2>
            {pagina === 'cargando' && <p className="text-slate-400">Cargando…</p>}
            {pagina === 'no' && <p className="text-slate-500">Esta página no está publicada.</p>}
            {typeof pagina === 'object' && pagina && <BloquesLectura bloques={pagina.bloques} paginaId={abierto.entityId} />}
          </div>
        </VentanaBoton>
      )}
    </>
  );
}
