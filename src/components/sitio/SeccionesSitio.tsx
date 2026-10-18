import { createContext, useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { useSitio } from './ContextoSitio';
import { CLASES_TARJETA as C, CLASES_COMPACTA as K, CLASES_GRUPOS as G, CARGA_INMEDIATA, agruparSecciones } from './tarjetaSeccion';

// ============================================================================
// LAS SECCIONES DE UN SITIO, EN TARJETAS (2026-10-18, Wikiproducts W2)
// ============================================================================
// Ronda 1 del evaluador: una búsqueda sin resultados y una dirección que no
// existe dejaban a la persona en una página vacía. Las secciones son las
// páginas del sitio que enseñan un catálogo de fichas (`seccionesDe` en
// `src/server/buscadorSitio.ts`): «Powerbanks · 23 productos». Se enseñan en
// la búsqueda vacía, en la página de error, en la portada y en cada
// categoría (bloque `secciones`, con `ambito: 'pagina'` sólo las que cuelgan
// de ella). Tarjetas con foto grande: ver `tarjetaSeccion.ts`.

export type Seccion = { id: string; titulo: string; descripcion: string; fichas: number; portada: string | null; slug?: string | null;
  /** Las subpáginas de donde se pidieron por las que se llega a ella. */
  vias?: string[];
  /** La categoría de la que cuelga, para agrupar la portada (`seccionesDe`). */
  grupo?: { id: string; titulo: string; slug: string | null; orden?: number } | null };

type Clases = { enlace: string; marco: string; imagen: string; cuerpo: string; titulo: string; cuenta: string; descripcion: string };

/** `agrupar`: si las secciones cuelgan de dos o más categorías, una fila de
 *  grupos con su título (la portada). Si no, la rejilla de siempre. */
export default function SeccionesSitio({ secciones, enlace, className = '', agrupar = false }: {
  secciones: Seccion[]; enlace: (id: string) => string; className?: string; agrupar?: boolean;
}) {
  // Por su nombre corto (`/powerbanks`) si lo tiene: es su dirección canónica.
  const sitio = useSitio();
  const a = (s: { id: string; slug?: string | null }) => s.slug && sitio ? sitio.enlaceSlug(s.slug, '') : enlace(s.id);
  const grupos = agrupar ? agruparSecciones(secciones) : null;
  let n = 0;
  const tarjeta = (s: Seccion, K: Clases) => {
    const i = n++;
    return (
      <li key={s.id}>
        <Link to={a(s)} className={K.enlace}>
          <span className={K.marco} aria-hidden={s.portada ? undefined : true}>
            {s.portada
              ? <img src={s.portada} alt="" width={320} height={240} loading={i < CARGA_INMEDIATA ? 'eager' : 'lazy'} className={K.imagen} />
              : <Package className="w-8 h-8" />}
          </span>
          <span className={K.cuerpo}>
            <span className={K.titulo}>{s.titulo}</span>
            <span className={K.cuenta}>{s.fichas === 1 ? '1 producto' : `${s.fichas} productos`}</span>
            {s.descripcion && <span className={K.descripcion}>{s.descripcion}</span>}
          </span>
        </Link>
      </li>
    );
  };
  if (grupos) {
    return (
      <div className={`${G.fila} ${className}`}>
        {grupos.map(g => (
          <section key={g.id} className={G.grupo} style={{ flexGrow: g.secciones.length, flexBasis: 0 }}>
            <h3 className={G.titulo}><Link to={a(g)} className={G.enlaceTitulo}>{g.titulo}</Link></h3>
            <ul className={G.lista} style={{ '--n': g.secciones.length } as CSSProperties}>
              {g.secciones.map(s => tarjeta(s, K))}
            </ul>
          </section>
        ))}
      </div>
    );
  }
  return <ul className={`${C.lista} ${className}`}>{secciones.map(s => tarjeta(s, C))}</ul>;
}

/** Las secciones del sitio `raizId` (o sólo las que cuelgan de la página
 *  `desde`), pedidas al servidor. `null` mientras llegan. */
export function useSecciones(raizId: string | null | undefined, desde?: string | null): Seccion[] | null {
  const [secciones, setSecciones] = useState<Seccion[] | null>(null);
  useEffect(() => {
    if (!raizId) return;
    let vivo = true;
    const extra = desde && desde !== raizId ? `&desde=${encodeURIComponent(desde)}` : '';
    fetch(`/api/sitio/secciones?sitio=${encodeURIComponent(raizId)}${extra}`)
      .then(r => r.ok ? r.json() : { secciones: [] })
      .then(j => { if (vivo) setSecciones(j.secciones || []); })
      .catch(() => vivo && setSecciones([]));
    return () => { vivo = false; };
  }, [raizId, desde]);
  return secciones;
}

/** Las subpáginas de la página que ya salen en sus tarjetas de secciones: no
 *  se repiten debajo como una lista de enlaces. `ids` es `null` mientras las
 *  tarjetas cargan (entonces esas subpáginas esperan, para que no salten).
 *  Lo da `BloquesLectura` sólo si la página tiene un bloque `secciones`. */
export const SubpaginasEnTarjetas = createContext<{ ids: Set<string> | null; poner: (ids: Set<string>) => void } | null>(null);
