import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { PasoRuta, type OpcionRuta } from './PasoRuta';
import { useSitio } from './ContextoSitio';

// ============================================================================
// LA RUTA DE UNA ENTRADA, COMO EN LA BARRA (2026-10-26, Eugenio)
// ============================================================================
// «Sistemas de la Humanidad (la portada) › Movilidad › el objetivo › el
// indicador, con el icono y el desplegable de antes para cambiar de tema o de
// indicador; aunque vaya debajo del menú, con la misma técnica.» Los pasos los
// da `GET /api/ruta-relaciones/:pagina` (`server/rutaRelaciones.ts`). Si la
// entrada no cuelga de la portada por sus relaciones, quedan las migas de siempre.

type Paso = { fila_id: string; pagina_id: string; titulo: string; nombre: string; icono: string | null; opciones: OpcionRuta[] };
type Ruta = { raiz: { pagina_id: string; titulo: string }; pasos: Paso[] };

export default function RutaRelaciones({ paginaId, sinRuta }: { paginaId: string;
  /** Lo que se enseña si no hay ruta por relaciones (las migas de siempre). */
  sinRuta: ReactNode;
}) {
  const sitio = useSitio();
  const [ruta, setRuta] = useState<Ruta | null | 'no'>(null);
  useEffect(() => {
    let vivo = true;
    setRuta(null);
    fetch(`/api/ruta-relaciones/${encodeURIComponent(paginaId)}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null)).then(j => { if (vivo) setRuta(j?.pasos?.length >= 2 ? j : 'no'); }).catch(() => { if (vivo) setRuta('no'); });
    return () => { vivo = false; };
  }, [paginaId]);
  if (ruta === 'no') return <>{sinRuta}</>;
  // Mientras llega, el mismo alto (sin salto).
  if (!ruta) return <div className="mb-5 h-[54px]" aria-hidden />;
  return (
    <nav aria-label="Estás en" data-ruta-relaciones className="mb-5 flex justify-center">
      <div className="flex min-w-0 max-w-full flex-wrap items-center justify-center gap-x-0.5 gap-y-1 rounded-[1.6rem] border border-slate-200 bg-white p-1 shadow-sm">
        <Link to={sitio ? sitio.enlacePagina(ruta.raiz.pagina_id) : '/'} data-interno
          className="inline-flex h-9 items-center rounded-full px-3 text-base font-black tracking-tight text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:text-lg">
          {ruta.raiz.titulo}
        </Link>
        {ruta.pasos.map((p, i) => (
          <Fragment key={p.fila_id}>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
            <PasoRuta etiqueta={p.nombre || p.titulo} titulo={p.titulo} opciones={p.opciones} actual={p.fila_id} icono={p.icono}
              apagado={i < ruta.pasos.length - 1} />
          </Fragment>
        ))}
      </div>
    </nav>
  );
}
