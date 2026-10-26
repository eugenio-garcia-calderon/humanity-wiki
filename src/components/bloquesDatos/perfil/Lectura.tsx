import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Globe2, Loader2, Mail, MapPin, Pencil, Send, UserPlus, X } from 'lucide-react';
import type { PropsLectura } from '../tipos';
import { AccionesPagina } from '../../sitio/RedRelaciones';
import { ponerOpcionesRed, ponerPestanasExtra, quitarPestanasExtra } from '../../sitio/pestanasExtra';
import { miniatura } from '../../../utils/miniatura';
import { cn } from '../../../utils/cn';

// ============================================================================
// EL PERFIL DE UNA PERSONA (2026-10-26, Eugenio)
// ============================================================================
// «El nombre en primera plana y los apellidos debajo, más pequeños, finos y en
// gris, como el logo de Luz & Humanidad; la foto un 10 % más pequeña y
// redonda; a la derecha, muy compacto, las áreas en las que trabaja, y al
// pinchar una, sus proyectos de ese área. Seguir a Eugenio, Conectar con
// Eugenio (su correo y mandarle un mensaje), compartir como en las redes, y si
// es él quien mira, Editar perfil: nombre, localización, alcance y áreas.»
//
// Los datos: `GET /api/perfil/:pagina` (`server/perfil.ts`). El filtro por
// área y las tarjetas compactas los aplica la red de la página
// (`ponerOpcionesRed`); la pestaña «Áreas» no se repite abajo.

type Area = { id: string; pagina_id: string | null; titulo: string; icono: string | null; portada: string | null; filas: string[] };
type Perfil = {
  nombre: string; foto: string | null; correo: string | null; localizacion: string; alcance: string; alcance_id: string | null;
  areas: Area[]; puede_editar: boolean;
  columnas: { localizacion: boolean; alcance: boolean; areas: boolean };
  opciones: { alcance: { id: string; label: string }[]; areas: { id: string; titulo: string }[] };
};

const esImagen = (x: string | null) => !!x && /^(https?:|\/)/.test(x);

export default function Lectura({ paginaId }: PropsLectura) {
  const [p, setP] = useState<Perfil | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const cargar = () => {
    if (!paginaId) return;
    fetch(`/api/perfil/${encodeURIComponent(paginaId)}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null)).then(j => j && setP(j)).catch(() => {});
  };
  useEffect(() => {
    cargar();
    window.addEventListener('sitio:sesion', cargar);
    return () => window.removeEventListener('sitio:sesion', cargar);
  }, [paginaId]);
  // La red de abajo: compacta, sin la pestaña de áreas (ya están aquí) y filtrada por el área elegida.
  const elegida = p?.areas.find(a => a.id === area) || null;
  useEffect(() => {
    if (!paginaId) return;
    ponerOpcionesRed(paginaId, { compacta: true, filtro: elegida ? { etiqueta: elegida.titulo, filas: elegida.filas } : null });
  }, [paginaId, elegida]);
  useEffect(() => {
    if (!paginaId) return;
    ponerPestanasExtra(paginaId, [], ['areas', 'ambitos', 'area']);
    return () => { quitarPestanasExtra(paginaId); ponerOpcionesRed(paginaId, null); };
  }, [paginaId]);

  if (!p) return <div className="mb-6 h-36" aria-hidden />;
  const [nombrePila, ...resto] = p.nombre.trim().split(/\s+/);
  const apellidos = resto.join(' ');
  const elegir = (a: Area) => {
    setArea(x => (x === a.id ? null : a.id));
    // Que se vea lo que se ha filtrado, si queda por debajo de la pantalla.
    requestAnimationFrame(() => {
      const red = document.querySelector<HTMLElement>('[data-red-relaciones]');
      if (red && red.getBoundingClientRect().top > window.innerHeight * 0.75) window.scrollBy({ top: red.getBoundingClientRect().top - window.innerHeight * 0.35, behavior: 'smooth' });
    });
  };

  return (
    <div data-perfil className="mb-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-center gap-5">
          {p.foto
            ? <img src={miniatura(p.foto, 256)} alt="" className="h-[108px] w-[108px] shrink-0 rounded-full object-cover ring-1 ring-slate-200" />
            : <span className="grid h-[108px] w-[108px] shrink-0 place-items-center rounded-full bg-slate-100 text-4xl font-black text-slate-400">{nombrePila?.charAt(0) || '?'}</span>}
          <div className="min-w-0">
            <h1 className="text-[2.6rem] font-black leading-none tracking-tight text-slate-900">{nombrePila}</h1>
            {apellidos && <p className="mt-1.5 text-lg font-light leading-tight text-slate-500">{apellidos}</p>}
            {(p.localizacion || p.alcance) && (
              <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-semibold text-slate-500">
                {p.localizacion && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {p.localizacion}</span>}
                {p.alcance && <span className="inline-flex items-center gap-1" title="Alcance territorial"><Globe2 className="h-3.5 w-3.5" /> Alcance {p.alcance.toLowerCase()}</span>}
              </p>
            )}
          </div>
        </div>
        {p.areas.length > 0 && (
          <div data-areas-perfil className="min-w-0 md:max-w-[46%]">
            <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 md:text-right">Áreas</p>
            <div className="flex flex-wrap gap-1.5 md:justify-end">
              {p.areas.map(a => {
                const img = esImagen(a.portada) ? a.portada : esImagen(a.icono) ? a.icono : null;
                const activa = area === a.id;
                return (
                  <button key={a.id} type="button" onClick={() => elegir(a)} aria-pressed={activa}
                    title={a.filas.length ? `Ver sus proyectos de ${a.titulo} (${a.filas.length})` : `${a.titulo}: sin proyectos conectados`}
                    className={cn('inline-flex h-8 items-center gap-1.5 rounded-full border pl-1.5 pr-3 text-[13px] font-bold transition-colors',
                      activa ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400')}>
                    {img ? <img src={miniatura(img, 64)} alt="" className={cn('h-5 w-5 rounded-full object-contain', activa ? 'bg-white' : '')} />
                      : a.icono ? <span className="text-sm leading-none">{a.icono}</span> : <span className="h-5 w-1" />}
                    {a.titulo}
                    {a.filas.length > 0 && <span className={cn('text-[11px] font-semibold', activa ? 'text-white/70' : 'text-slate-400')}>{a.filas.length}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="mt-5">
        <AccionesPagina paginaId={paginaId || ''} nombre={nombrePila} extra={<>
          <Conectar nombre={nombrePila} correo={p.correo} />
          {p.puede_editar && (
            <button type="button" onClick={() => setEditando(true)} data-editar-perfil
              className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">
              <Pencil className="h-4 w-4" /> Editar perfil
            </button>
          )}
        </>} />
      </div>
      {editando && paginaId && <EditarPerfil paginaId={paginaId} p={p} onCerrar={() => setEditando(false)} />}
    </div>
  );
}

/** «Conectar con Eugenio»: su correo y un mensaje que se manda desde el correo de quien escribe. */
function Conectar({ nombre, correo }: { nombre: string; correo: string | null }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [copiado, setCopiado] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierto]);
  const asunto = encodeURIComponent(`Hola, ${nombre}: te escribo desde ${typeof window !== 'undefined' ? window.location.hostname : 'la web'}`);
  return (
    <div ref={caja} className="relative">
      <button type="button" onClick={() => setAbierto(a => !a)} aria-expanded={abierto} data-conectar
        className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">
        <UserPlus className="h-4 w-4" /> Conectar con {nombre}
      </button>
      {abierto && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          {correo ? (
            <>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Correo</p>
              <div className="mt-1 flex items-center gap-2">
                <a href={`mailto:${correo}`} className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900 hover:underline"><Mail className="mr-1.5 inline h-4 w-4 text-slate-400" />{correo}</a>
                <button type="button" aria-label="Copiar el correo" title="Copiar"
                  onClick={async () => { try { await navigator.clipboard.writeText(correo); setCopiado(true); setTimeout(() => setCopiado(false), 1800); } catch { /* sin portapapeles */ } }}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100">
                  {copiado ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <label className="mt-3 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-400" htmlFor="mensaje-conectar">Mándale un mensaje</label>
              <textarea id="mensaje-conectar" value={texto} onChange={e => setTexto(e.target.value)} rows={4} placeholder={`Hola, ${nombre}…`}
                className="mt-1 w-full resize-none rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-slate-400" />
              <a href={`mailto:${correo}?subject=${asunto}&body=${encodeURIComponent(texto)}`} onClick={() => setAbierto(false)}
                className={cn('mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-slate-900 text-sm font-bold text-white hover:bg-slate-800', !texto.trim() && 'pointer-events-none opacity-40')}>
                <Send className="h-4 w-4" /> Enviar mensaje
              </a>
              <p className="mt-2 text-center text-[11px] text-slate-400">Se abre tu correo con el mensaje escrito.</p>
            </>
          ) : <p className="text-sm text-slate-500">{nombre} todavía no ha publicado su correo.</p>}
        </div>
      )}
    </div>
  );
}

/** Editar su perfil: nombre, localización, alcance territorial y áreas. */
function EditarPerfil({ paginaId, p, onCerrar }: { paginaId: string; p: Perfil; onCerrar: () => void }) {
  const [nombre, setNombre] = useState(p.nombre);
  const [localizacion, setLocalizacion] = useState(p.localizacion);
  const [alcance, setAlcance] = useState(p.alcance_id || '');
  const [areas, setAreas] = useState<string[]>(p.areas.map(a => a.id));
  const [guardando, setGuardando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onCerrar]);
  const guardar = async () => {
    setGuardando(true); setFallo(null);
    try {
      const r = await fetch(`/api/perfil/${encodeURIComponent(paginaId)}`, {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, ...(p.columnas.localizacion ? { localizacion } : {}), ...(p.columnas.alcance ? { alcance: alcance || null } : {}), ...(p.columnas.areas ? { areas } : {}) }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'No se ha podido guardar.');
      window.location.reload();
    } catch (e: any) { setFallo(e.message); setGuardando(false); }
  };
  const etiqueta = 'block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500';
  const campo = 'mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400';
  return createPortal(
    <div className="fixed inset-0 z-[10010] grid place-items-center bg-slate-900/40 p-4" onClick={onCerrar}>
      <div role="dialog" aria-modal="true" aria-label="Editar perfil" data-dialogo-perfil onClick={e => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <button type="button" onClick={onCerrar} aria-label="Cerrar" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        <p className="text-xl font-black text-slate-900">Editar perfil</p>
        <div className="mt-4 space-y-4">
          <label className="block"><span className={etiqueta}>Nombre y apellidos</span>
            <input value={nombre} onChange={e => setNombre(e.target.value)} className={campo} /></label>
          {p.columnas.localizacion && (
            <label className="block"><span className={etiqueta}>Localización</span>
              <input value={localizacion} onChange={e => setLocalizacion(e.target.value)} placeholder="Madrid, España" className={campo} /></label>
          )}
          {p.columnas.alcance && (
            <label className="block"><span className={etiqueta}>Alcance territorial</span>
              <select value={alcance} onChange={e => setAlcance(e.target.value)} className={campo}>
                <option value="">Sin decir</option>
                {p.opciones.alcance.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select></label>
          )}
          {p.columnas.areas && p.opciones.areas.length > 0 && (
            <fieldset><legend className={etiqueta}>Áreas en las que trabajas</legend>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.opciones.areas.map(o => {
                  const si = areas.includes(o.id);
                  return (
                    <button key={o.id} type="button" aria-pressed={si} onClick={() => setAreas(l => (si ? l.filter(x => x !== o.id) : [...l, o.id]))}
                      className={cn('inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[13px] font-bold', si ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-400')}>
                      {si && <Check className="h-3.5 w-3.5" />}{o.titulo}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
        </div>
        {fallo && <p role="alert" className="mt-3 text-sm font-bold text-rose-700">{fallo}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCerrar} className="h-11 rounded-full px-4 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button type="button" onClick={guardar} disabled={guardando || !nombre.trim()}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
