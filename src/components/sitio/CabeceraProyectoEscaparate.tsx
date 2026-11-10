import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSitio } from './ContextoSitio';
import { miniatura } from '../../utils/miniatura';
import { cn } from '../../utils/cn';
import { fotoDePortada } from '../../utils/portadaPropia';
import type { DatosPagina } from './CabeceraLectura';
import type { Grupo } from './RedRelaciones';
import { PildoraEstado, TextoEnLinea } from '../tablas/TarjetaPortada';
import { ImageIcon } from 'lucide-react';

// ============================================================================
// LA CABECERA DE UN PROYECTO EN EL ESCAPARATE (2026-11-06, Eugenio en luzhumanidad.com)
// ============================================================================
// «Que sea más grande la imagen de portada, que el título esté encima de la imagen y
// que las propiedades estén dentro de la imagen, como en la galería. Que el equipo
// humano, en vez de estar en una pestaña, esté debajo de la imagen y más pequeñito.
// Que las áreas de innovación estén como una propiedad chiquitita a la derecha de la
// portada, igual que los objetivos estratégicos, en vez de en ese desplegable. Y
// oculta la barrita de avance.» Sustituye a la cabecera, a seguir/compartir y a las
// pestañas de la red: todo lo relacionado se ve aquí de un golpe.

type Opcion = { id: string; label: string; color?: string | null };
type Columna = { id: string; nombre: string; tipo: string; opciones?: Opcion[] };
type Tabla = { columnas: Columna[]; filas: Array<{ id: string; celdas: Record<string, { valor?: unknown }> }> };

const EQUIPO = /equipo|personas/i;

/** Lo que el editor le da para escribir encima (2026-11-10): se ve como al publicar y se edita ahí. */
export type EdicionCabecera = { titulo: string; onTitulo: (v: string) => void; subtitulo: string; onSubtitulo: (v: string) => void; onPortada: () => void };

export default function CabeceraProyectoEscaparate({ pagina, edicion }: { pagina: DatosPagina; edicion?: EdicionCabecera }) {
  const sitio = useSitio();
  const cfg: any = (pagina as any).config || {};
  const fila = pagina.fila || null;
  const [colEstado, setColEstado] = useState<Columna | null>(null);
  const [estado, setEstado] = useState<Opcion | null>(null);
  const [ano, setAno] = useState<string | null>(null);
  const [grupos, setGrupos] = useState<Grupo[] | null>(null);

  useEffect(() => {
    let vivo = true;
    if (fila) fetch(`/api/bd/tablas/${encodeURIComponent(fila.tabla_id)}?lectura=1`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null)).then((t: Tabla | null) => {
        if (!vivo || !t) return;
        const f = t.filas.find(x => x.id === fila.fila_id);
        if (!f) return;
        const cEstado = t.columnas.find(c => c.tipo === 'seleccion' && c.nombre === 'Estado') || t.columnas.find(c => c.tipo === 'seleccion');
        const cFecha = t.columnas.find(c => c.tipo === 'fecha' && c.nombre === 'Fecha Inicio') || t.columnas.find(c => c.tipo === 'fecha');
        if (cEstado) setColEstado(cEstado);
        if (cEstado) setEstado(cEstado.opciones?.find(o => o.id === String(f.celdas[cEstado.id]?.valor || '')) || null);
        const m = cFecha ? /\b(\d{4})\b/.exec(String(f.celdas[cFecha.id]?.valor ?? '')) : null;
        setAno(m ? m[1] : null);
      }).catch(() => {});
    fetch(`/api/bd/paginas/${encodeURIComponent(pagina.id)}/red`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null)).then(j => { if (vivo) setGrupos((j?.grupos || []).filter((g: Grupo) => g.entradas.length)); }).catch(() => {});
    return () => { vivo = false; };
  }, [pagina.id, fila?.tabla_id, fila?.fila_id]);

  const cambiarEstado = async (id: string | null) => {
    if (!fila || !colEstado) return;
    setEstado(colEstado.opciones?.find(o => o.id === id) || null);
    await fetch(`/api/bd/filas/${encodeURIComponent(fila.fila_id)}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ celdas: { [colEstado.id]: id } }) }).catch(() => null);
  };
  const enlace = (id: string | null) => (id ? (edicion ? `/paginas/${id}` : sitio ? sitio.enlacePagina(id) : `/p/${id}`) : '#');
  const equipo = grupos?.find(g => EQUIPO.test(g.nombre)) || null;
  const resto = (grupos || []).filter(g => g !== equipo);
  // UNA PORTADA QUE ES UN VÍDEO (2026-11-07): en su lugar, la primera foto propia de la página
  // (`fotoDePortada`, la misma que pone el servidor en el HTML, `cabeceraSitio.tsx`). El encuadre
  // se eligió para su portada: con la foto de recambio, centrada.
  const portada = fotoDePortada(cfg);
  const enc = portada && portada.url === String(cfg.portada || '').trim() ? cfg.encuadre : null;
  const principal = estado?.label === 'Desarrollo principal actual' || estado?.label === 'Foco principal';

  return (
    <header data-cabecera-proyecto className="mb-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_15rem]">
      <div className="min-w-0">
        {/* La portada, grande, con el título y las propiedades encima. */}
        {/* Una franja baja (2026-11-06, Eugenio: «las portadas siguen siendo muy grandes; en cuanto
            pinchas, más pequeñito»): 16:9 en el móvil, 3:1 en tableta y 4:1 en pantalla ancha
            (unos 220 px de alto), para que la nota de prensa empiece en la primera pantalla. */}
        <div className={cn('relative w-full overflow-hidden rounded-2xl bg-slate-100', edicion ? 'flex min-h-[220px] flex-col justify-end' : 'aspect-[16/9] sm:aspect-[3/1] lg:aspect-[4/1]')}>
          {portada && (
            <img src={miniatura(portada.url, 800)} alt={portada.alt || (typeof cfg.subtitulo === 'string' && cfg.subtitulo.trim() ? `${pagina.titulo}: ${cfg.subtitulo.trim()}` : pagina.titulo)} fetchPriority="high" decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
              style={enc ? { objectPosition: `${enc.x ?? 50}% ${enc.y ?? 50}%` } : undefined} />
          )}
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
          {edicion && (
            <button type="button" onClick={edicion.onPortada} className="absolute right-3 top-3 z-10 inline-flex h-8 items-center gap-1.5 rounded-full bg-white/90 px-3 text-xs font-bold text-slate-700 shadow-sm backdrop-blur hover:bg-white">
              <ImageIcon className="h-3.5 w-3.5" aria-hidden /> {portada ? 'Cambiar portada' : 'Añadir portada'}
            </button>
          )}
          {/* Al editar, la franja crece con lo que se escribe: un texto largo no se sale por arriba. */}
          <div className={cn('flex flex-wrap items-end justify-between gap-2 p-4 sm:p-5', edicion ? 'relative pt-14 sm:pt-14' : 'absolute inset-x-0 bottom-0')}>
            <div data-fondo-oscuro="" className={cn('min-w-0 max-w-3xl', edicion && 'w-full')}>
              {edicion
                ? <TextoEnLinea valor={edicion.titulo} onGuardar={edicion.onTitulo} etiqueta="Título" obligatorio className="text-2xl font-black leading-tight tracking-tight text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.45)] sm:text-3xl" />
                : <h1 className="text-2xl font-black leading-tight tracking-tight text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.45)] sm:text-3xl">{pagina.titulo}</h1>}
              {edicion
                ? <TextoEnLinea valor={edicion.subtitulo} onGuardar={edicion.onSubtitulo} etiqueta="Descripción" ayuda="Añadir una descripción" maximo={300} className="mt-1 text-sm font-medium leading-snug text-white/90 placeholder:text-white/70 [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]" />
                : typeof cfg.subtitulo === 'string' && cfg.subtitulo.trim() && <p className="mt-1 max-w-2xl text-sm font-medium leading-snug text-white/90 [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]">{cfg.subtitulo.trim()}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {ano && <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-700 shadow-sm backdrop-blur">{principal ? `Desde ${ano}` : ano}</span>}
              <PildoraEstado estado={estado} opciones={colEstado?.opciones} onCambiar={edicion && colEstado ? cambiarEstado : undefined} className="px-3 py-1 text-xs" />
            </div>
          </div>
        </div>
        {/* El equipo humano, debajo y pequeño. */}
        {equipo && (
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{equipo.nombre}</p>
            <ul className="flex list-none flex-wrap gap-x-4 gap-y-2 p-0">
              {equipo.entradas.map(p => (
                <li key={p.fila_id}>
                  <Link to={enlace(p.pagina_id)} data-interno className="group inline-flex items-center gap-2">
                    {p.imagen
                      ? <img src={miniatura(p.imagen, 64)} alt={p.titulo} loading="lazy" className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200" />
                      : <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-400">{p.titulo.charAt(0)}</span>}
                    <span className="text-sm font-semibold text-slate-700 group-hover:underline">{p.titulo}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {/* A la derecha, chiquitito: las áreas, los objetivos y el resto de lo relacionado. */}
      {resto.length > 0 && (
        <aside className="space-y-5 lg:pt-1">
          {resto.map(g => (
            <div key={g.columna_id}>
              <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{g.nombre}</p>
              <ul className="flex list-none flex-wrap gap-1.5 p-0">
                {g.entradas.map(x => (
                  <li key={x.fila_id}>
                    <Link to={enlace(x.pagina_id)} data-interno
                      className={cn('inline-flex h-7 items-center gap-1.5 rounded-full border border-slate-200 bg-white pr-2.5 text-[12px] font-bold text-slate-700 hover:border-slate-400', x.imagen ? 'pl-1' : 'pl-2.5')}>
                      {x.imagen && <img src={miniatura(x.imagen, 64)} alt="" loading="lazy" className="h-5 w-5 rounded-full object-cover" />}
                      {x.titulo}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>
      )}
    </header>
  );
}
