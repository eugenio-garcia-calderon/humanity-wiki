import type { PropsLectura } from '../tipos';
import { useSitio } from '../../sitio/ContextoSitio';
import SeccionesSitio, { useSecciones } from '../../sitio/SeccionesSitio';

/** Las secciones del sitio en el que está la página (o de esta página, si
 *  ella es la raíz: en el editor no hay sitio alrededor). */
export default function Lectura({ datos, paginaId }: PropsLectura) {
  const sitio = useSitio();
  const raiz = sitio?.raizId || paginaId || null;
  const secciones = useSecciones(raiz);
  const titulo = typeof datos.titulo === 'string' ? datos.titulo.trim() : '';
  if (!secciones) return <div className="h-24" aria-busy="true" />;
  if (!secciones.length) {
    // Sólo quien escribe ve esto: publicado y sin catálogos, el bloque calla.
    return sitio ? null : <p className="text-sm text-slate-600">Aquí saldrán las páginas de este sitio que enseñan una base de datos con plantilla de ficha, cuando la página esté publicada.</p>;
  }
  const enlace = (id: string) => sitio ? sitio.enlacePagina(id) : `/paginas/${id}`;
  return (
    <section>
      {titulo && <h2 className="mb-3 text-xl font-black text-slate-900">{titulo}</h2>}
      <SeccionesSitio secciones={secciones} enlace={enlace} />
    </section>
  );
}
