import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, MousePointerClick, Settings2, FileText, Rows3, ExternalLink, Copy, Loader2 } from 'lucide-react';
import IconoElemento from '../ui/Icono';
import { cn } from '../../utils/cn';
import type { AccionBoton } from '../../utils/bloques';

// ============================================================================
// DOS BLOQUES NUEVOS QUE PINTAN IGUAL EL EDITOR Y LA PÁGINA PUBLICADA (2026-10-05)
// ============================================================================
// Carril «editorA». Viven aquí, aparte de `Documento.tsx` y de
// `BloquesLectura.tsx`, porque los usan los dos: lo que se ve al escribir y lo
// que se publica tienen que ser la misma pieza.

/**
 * MIGAS DE PAN — la ruta de páginas madre hasta ésta, como el bloque
 * «Breadcrumb» de Notion. No guarda nada: se pregunta al servidor cada vez
 * (`/api/paginas/:id/ruta`), así que si la página cambia de sitio las migas
 * cambian solas. Una madre que quien lee no puede ver corta la ruta.
 */
export function MigasDePan({ paginaId, titulo, enlace = id => `/paginas/${id}` }: {
  paginaId: string | null | undefined;
  titulo?: string;
  enlace?: (id: string) => string;
}) {
  const [ruta, setRuta] = useState<{ id: string; titulo: string; icono: string | null }[] | null>(null);
  useEffect(() => {
    if (!paginaId) { setRuta([]); return; }
    let vivo = true;
    fetch(`/api/paginas/${paginaId}/ruta`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : { ruta: [] }))
      .then(j => { if (vivo) setRuta(j.ruta || []); })
      .catch(() => { if (vivo) setRuta([]); });
    return () => { vivo = false; };
  }, [paginaId]);
  if (ruta === null) return <div className="h-6" aria-hidden />;
  // Al leer, una página sin madres no enseña migas: no hay ruta que contar.
  if (!ruta.length && titulo === undefined) return null;
  return (
    <nav aria-label="Migas de pan" className="flex items-center flex-wrap gap-1 text-[13px] text-slate-500 py-0.5">
      {ruta.length === 0 && <span className="text-slate-400">Esta página está arriba del todo ·</span>}
      {ruta.map(p => (
        <span key={p.id} className="inline-flex items-center gap-1 min-w-0">
          <Link to={enlace(p.id)} className="inline-flex items-center gap-1 px-1 py-0.5 rounded hover:bg-slate-100 hover:text-slate-800 truncate max-w-[14rem]">
            {p.icono && <IconoElemento valor={p.icono} tamano={14} className="rounded" />}
            <span className="truncate">{p.titulo}</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
        </span>
      ))}
      {titulo !== undefined && <span className="px-1 font-bold text-slate-700 truncate max-w-[14rem]">{titulo || 'Sin título'}</span>}
    </nav>
  );
}

/** Qué hace cada acción, dicho para quien configura el botón. */
export const ACCIONES_BOTON: { clave: AccionBoton['tipo']; nombre: string; ayuda: string; icon: any }[] = [
  { clave: 'plantilla', nombre: 'Insertar bloques', ayuda: 'Copia debajo los bloques de su plantilla', icon: Copy },
  { clave: 'pagina', nombre: 'Crear una página', ayuda: 'Una página nueva dentro de ésta', icon: FileText },
  { clave: 'fila', nombre: 'Añadir a una base de datos', ayuda: 'Una fila nueva en una tabla de la página', icon: Rows3 },
  { clave: 'enlace', nombre: 'Abrir un enlace', ayuda: 'Lleva a otra web o página', icon: ExternalLink },
];

/**
 * EL BOTÓN, como lo ve cualquiera. Lo que hace al pulsarlo lo decide quien
 * lo pinta (`onPulsar`): el editor puede insertar bloques; la página
 * publicada sólo abre enlaces.
 */
export function BotonVista({ texto, accion, onPulsar, ocupado, extra }: {
  texto?: string; accion?: AccionBoton; onPulsar?: () => void; ocupado?: boolean; extra?: React.ReactNode;
}) {
  const oscuro = (accion?.estilo || 'oscuro') === 'oscuro';
  const contenido = (
    <>
      {ocupado ? <Loader2 className="w-4 h-4 animate-spin" /> : <MousePointerClick className="w-4 h-4" />}
      <span>{texto?.trim() || 'Botón'}</span>
    </>
  );
  const clase = cn('inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-sm font-bold transition-colors',
    oscuro ? 'bg-slate-900 text-white hover:bg-slate-700' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50');
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {accion?.tipo === 'enlace' && accion.url && !onPulsar
        ? <a href={accion.url} target={/^https?:/i.test(accion.url) ? '_blank' : undefined} rel="noopener noreferrer" className={clase}>{contenido}</a>
        : <button type="button" disabled={ocupado} onClick={e => { e.stopPropagation(); onPulsar?.(); }} className={clase}>{contenido}</button>}
      {extra}
    </div>
  );
}

/** El panel para configurar un botón, en el editor. */
export function ConfigBoton({ texto, accion, tablas, onCambio, onCerrar }: {
  texto: string;
  accion: AccionBoton;
  /** Las bases de datos de esta página, para «Añadir a una base de datos». */
  tablas: { id: string; titulo: string }[];
  onCambio: (texto: string, accion: AccionBoton) => void;
  onCerrar: () => void;
}) {
  const [t, setT] = useState(texto);
  const [a, setA] = useState<AccionBoton>(accion);
  // El nombre de cada base de datos, que el bloque no guarda.
  const [nombres, setNombres] = useState<Record<string, string>>({});
  useEffect(() => {
    let vivo = true;
    for (const x of tablas) {
      fetch(`/api/bd/tablas/${x.id}`, { credentials: 'include' }).then(r => (r.ok ? r.json() : null))
        .then(j => { if (vivo && j?.tabla?.titulo) setNombres(n => ({ ...n, [x.id]: j.tabla.titulo })); }).catch(() => {});
    }
    return () => { vivo = false; };
  }, [tablas.map(x => x.id).join(',')]);
  const cambiar = (nt: string, na: AccionBoton) => { setT(nt); setA(na); onCambio(nt, na); };
  return (
    <div onClick={e => e.stopPropagation()} className="mt-2 w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5" /> Configurar el botón</p>
        <button onClick={onCerrar} className="text-xs font-bold text-slate-400 hover:text-slate-700">Listo</button>
      </div>
      <label className="block">
        <span className="text-xs font-bold text-slate-600">Texto del botón</span>
        <input value={t} onChange={e => cambiar(e.target.value, a)} placeholder="Botón"
          className="mt-1 w-full h-9 px-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-400" />
      </label>
      <div>
        <span className="text-xs font-bold text-slate-600">Al pulsarlo</span>
        <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {ACCIONES_BOTON.map(o => (
            <button key={o.clave} type="button" onClick={() => cambiar(t, { ...a, tipo: o.clave })}
              className={cn('flex items-start gap-2 p-2 rounded-lg border text-left transition-colors',
                a.tipo === o.clave ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50')}>
              <o.icon className="w-4 h-4 mt-0.5 text-slate-500 shrink-0" />
              <span className="min-w-0">
                <span className="block text-xs font-bold text-slate-800">{o.nombre}</span>
                <span className="block text-[11px] text-slate-400 leading-tight">{o.ayuda}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      {a.tipo === 'plantilla' && (
        <p className="text-[11px] text-slate-500">Lo que escribas <b>dentro</b> del botón (debajo, con sangría) es la plantilla: cada pulsación copia esos bloques justo debajo del botón.</p>
      )}
      {a.tipo === 'pagina' && (
        <label className="block">
          <span className="text-xs font-bold text-slate-600">Título de la página nueva</span>
          <input value={a.titulo || ''} onChange={e => cambiar(t, { ...a, titulo: e.target.value })} placeholder="Sin título (puedes usar {fecha})"
            className="mt-1 w-full h-9 px-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-400" />
          <span className="block mt-1 text-[11px] text-slate-400">Se crea dentro de esta página, con la plantilla del botón como contenido.</span>
        </label>
      )}
      {a.tipo === 'fila' && (
        tablas.length ? (
          <div className="space-y-2">
            <label className="block">
              <span className="text-xs font-bold text-slate-600">Base de datos</span>
              <select value={a.tabla_id || ''} onChange={e => cambiar(t, { ...a, tabla_id: e.target.value || undefined })}
                className="mt-1 w-full h-9 px-2 rounded-lg border border-slate-200 text-sm bg-white">
                <option value="">Elige una…</option>
                {tablas.map(x => <option key={x.id} value={x.id}>{nombres[x.id] || x.titulo}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-600">Nombre de la fila nueva</span>
              <input value={a.titulo || ''} onChange={e => cambiar(t, { ...a, titulo: e.target.value })} placeholder="Nueva entrada (puedes usar {fecha})"
                className="mt-1 w-full h-9 px-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-400" />
            </label>
          </div>
        ) : <p className="text-[11px] text-amber-700">Esta página todavía no tiene ninguna base de datos. Añade una y vuelve aquí.</p>
      )}
      {a.tipo === 'enlace' && (
        <label className="block">
          <span className="text-xs font-bold text-slate-600">Dirección</span>
          <input value={a.url || ''} onChange={e => cambiar(t, { ...a, url: e.target.value })} placeholder="https://… o /paginas/…"
            className="mt-1 w-full h-9 px-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-400" />
        </label>
      )}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-600">Estilo</span>
        {(['oscuro', 'claro'] as const).map(e => (
          <button key={e} type="button" onClick={() => cambiar(t, { ...a, estilo: e })}
            className={cn('h-7 px-2.5 rounded-md text-[11px] font-bold border', (a.estilo || 'oscuro') === e ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500')}>
            {e === 'oscuro' ? 'Relleno' : 'Contorno'}
          </button>
        ))}
      </div>
    </div>
  );
}

/** «{fecha}» en un título se cambia por la de hoy, como las plantillas de Notion. */
export const conFecha = (s: string) => s.replace(/\{fecha\}/gi, new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }));
