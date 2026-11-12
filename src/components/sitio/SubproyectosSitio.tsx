import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSitio } from './ContextoSitio';
import TarjetaPortada, { CLASE_TARJETA_PORTADA } from '../tablas/TarjetaPortada';
import { iconoCategoria } from './iconoCategoria';

// ============================================================================
// LOS PROYECTOS DENTRO DE UN PROYECTO (2026-11-12, Eugenio en luzhumanidad.com)
// ============================================================================
// «Vamos a agrupar varios proyectos que están dentro del mismo proyecto general:
// la comunidad energética de Villalbilla y la de Nuevo Baztán dentro de
// "Comunidades energéticas en pueblos", y que se puedan añadir más.» Y: «esos
// subelementos tienen que quedar igual de bonitos que el grid de los proyectos
// principales: imagen, titular y subtítulo».
//
// The hierarchy is the table's own «subelementos» (`bd.ts`: the self relation
// «Elemento madre» with `config.rol = 'madre'`). A project whose row has a
// mother leaves the home grid (`VistaProyectosSitio`) and shows up here, on its
// mother's page, with the very same card (`TarjetaPortada`). Adding a new
// community is just choosing its «Elemento madre» in the table.

type Celda = { estado?: string; valor?: unknown };
type Fila = {
  id: string; pagina_id: string | null; orden: number; oculta?: boolean;
  pagina?: { titulo?: string; imagen?: string | null; descripcion?: string | null; encuadre?: { x?: number; y?: number } | null } | null;
  celdas: Record<string, Celda>;
};
type Tabla = { columna_titulo?: string | null; columnas: Array<{ id: string; tipo: string; config?: any }>; filas: Fila[]; conexiones?: Array<{ tabla_id: string; columna_id: string }> };

const lista = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
const pide = (t: string) => fetch(`/api/bd/tablas/${encodeURIComponent(t)}?lectura=1`, { credentials: 'include' })
  .then(x => (x.ok ? x.json() : null)).catch(() => null);

/** La columna «Elemento madre» de una tabla, si tiene subelementos. */
export const columnaMadre = (t: { columnas?: Array<{ id: string; config?: any }> } | null) =>
  t?.columnas?.find(c => c.config?.rol === 'madre')?.id || '';

/** Para partir la rejilla en grupos con su título (Sol Solidario: España, Latinoamérica…), por id de fila.
 *  Lo que no está en ningún grupo va al final, en uno sin título. */
export type GrupoSubproyectos = { titulo: string; texto?: string; ids: string[] };

export default function SubproyectosSitio({ filaId, tablaId, sistemasId, titulo, grupos, ancla }: { filaId: string; tablaId: string; sistemasId?: string | null; titulo?: string;
  grupos?: GrupoSubproyectos[]; ancla?: string }) {
  const sitio = useSitio();
  const [tabla, setTabla] = useState<Tabla | null>(null);
  const [sistemas, setSistemas] = useState<Tabla | null>(null);
  useEffect(() => {
    let vivo = true;
    pide(tablaId).then(t => { if (vivo) setTabla(t); });
    if (sistemasId) pide(sistemasId).then(t => { if (vivo) setSistemas(t); });
    return () => { vivo = false; };
  }, [tablaId, sistemasId]);

  const modelo = useMemo(() => {
    const madre = columnaMadre(tabla);
    if (!tabla || !madre) return null;
    const colNombre = tabla.columna_titulo || tabla.columnas.find(c => c.tipo === 'texto')?.id || '';
    const colArea = (tabla.conexiones || []).find(c => c.tabla_id === sistemasId)?.columna_id || '';
    const nombreSistema = new Map<string, string>();
    for (const f of sistemas?.filas || []) {
      const n = String(f.pagina?.titulo || f.celdas[sistemas?.columna_titulo || '']?.valor || '').trim();
      if (n) nombreSistema.set(f.id, n);
    }
    const hijos = tabla.filas
      .filter(f => !f.oculta && f.pagina_id && lista(f.celdas[madre]?.valor).includes(filaId))
      .sort((a, b) => a.orden - b.orden);
    return { colNombre, colArea, nombreSistema, hijos };
  }, [tabla, sistemas, filaId, sistemasId]);

  if (!modelo || modelo.hijos.length === 0) return null;
  const tarjeta = (f: Fila, i: number) => {
    const nombre = String(f.celdas[modelo.colNombre]?.valor || f.pagina?.titulo || '').trim();
    const categoria = lista(f.celdas[modelo.colArea]?.valor).find(id => modelo.nombreSistema.has(id)) || null;
    const nombreCategoria = categoria ? modelo.nombreSistema.get(categoria)! : '';
    return (
      <li key={f.id} className="relative">
        <Link to={sitio ? sitio.enlacePagina(f.pagina_id!) : `/p/${f.pagina_id}`} className={CLASE_TARJETA_PORTADA}>
          <TarjetaPortada nombre={nombre} imagen={f.pagina?.imagen || null} encuadre={f.pagina?.encuadre} descripcion={(f.pagina?.descripcion || '').trim()}
            Titulo="h3" prioridad={i + 10}
            pildora={categoria ? { id: categoria, label: nombreCategoria } : null}
            iconoPildora={nombreCategoria ? iconoCategoria(nombreCategoria) : undefined} nombrePildora="Categoría" />
        </Link>
      </li>
    );
  };
  const rejilla = (l: Fila[], desde = 0) => <ul className="grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">{l.map((f, i) => tarjeta(f, desde + i))}</ul>;
  if (grupos?.length) {
    const usados = new Set(grupos.flatMap(g => g.ids));
    const partes = [...grupos.map(g => ({ ...g, filas: g.ids.map(id => modelo.hijos.find(f => f.id === id)).filter(Boolean) as Fila[] })),
      { titulo: '', texto: '', ids: [], filas: modelo.hijos.filter(f => !usados.has(f.id)) }].filter(g => g.filas.length);
    let n = 0;
    return (
      <section data-subproyectos id={ancla} className="scroll-mt-40">
        {titulo && <h2 className="mb-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{titulo}</h2>}
        {partes.map(g => { const d = n; n += g.filas.length; return (
          <div key={g.titulo || 'resto'} className="mt-10">
            {g.titulo && <h3 className="text-xl font-black text-slate-900 sm:text-2xl">{g.titulo}</h3>}
            {g.texto && <p className="mt-1 max-w-3xl text-[15px] text-slate-600">{g.texto}</p>}
            <div className="mt-5">{rejilla(g.filas, d)}</div>
          </div>
        ); })}
      </section>
    );
  }
  return (
    <section data-subproyectos id={ancla} className="mt-14 scroll-mt-40 sm:mt-20">
      <h2 className="mb-6 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{titulo || 'Proyectos dentro de este proyecto'}</h2>
      {rejilla(modelo.hijos)}
    </section>
  );
}
