import { createContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { useSitio } from './ContextoSitio';
import { CLASES_TARJETA as C, CARGA_INMEDIATA } from './tarjetaSeccion';

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
  vias?: string[] };

export default function SeccionesSitio({ secciones, enlace, className = '' }: {
  secciones: Seccion[]; enlace: (id: string) => string; className?: string;
}) {
  // Por su nombre corto (`/powerbanks`) si lo tiene: es su dirección canónica.
  const sitio = useSitio();
  const a = (s: Seccion) => s.slug && sitio ? sitio.enlaceSlug(s.slug, '') : enlace(s.id);
  return (
    <ul className={`${C.lista} ${className}`}>
      {secciones.map((s, i) => (
        <li key={s.id}>
          <Link to={a(s)} className={C.enlace}>
            <span className={C.marco} aria-hidden={s.portada ? undefined : true}>
              {s.portada
                ? <img src={s.portada} alt="" width={320} height={240} loading={i < CARGA_INMEDIATA ? 'eager' : 'lazy'} className={C.imagen} />
                : <Package className="w-10 h-10" />}
            </span>
            <span className={C.cuerpo}>
              <span className={C.titulo}>{s.titulo}</span>
              <span className={C.cuenta}>{s.fichas === 1 ? '1 producto' : `${s.fichas} productos`}</span>
              {s.descripcion && <span className={C.descripcion}>{s.descripcion}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
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
