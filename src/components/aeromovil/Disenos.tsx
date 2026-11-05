// ============================================================================
// AEROMÓVIL GOTA · diseños guardados (2026-11-05)
// ============================================================================
// Eugenio: «permite guardar configuraciones de los parámetros y tener varios
// diseños… para no perderlas cuando se recarga la página o cuando se quiere
// empezar un nuevo diseño. Que esos diseños estén en el menú».
//
// Un menú desplegable en la barra superior: la lista de diseños (de todos), y
// guardar, guardar como nuevo, empezar uno nuevo y quitar. Quien crea un diseño
// sin cuenta recibe una clave que se queda en SU navegador
// (`aeromovil.claves`): con ella puede cambiarlo o quitarlo después. Sin la
// clave, «Guardar» ofrece guardarlo como uno nuevo.
import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, FilePlus2, FolderOpen, Link2, Loader2, Save, Trash2 } from 'lucide-react';
import { Button } from '../ui/core';
import { cn } from '../../utils/cn';
import { PARAMETROS_POR_DEFECTO, type Parametros } from './geometria';

export interface Diseno { id: number; nombre: string; parametros: Partial<Parametros>; autor: string | null; origen: 'equipo' | 'visitante'; updated_at: string }

const CLAVES = 'aeromovil.claves';
const leerClaves = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(CLAVES) || '{}') || {}; } catch { return {}; } };
const guardarClave = (id: number, clave: string) => { try { localStorage.setItem(CLAVES, JSON.stringify({ ...leerClaves(), [id]: clave })); } catch { /* sin almacenamiento */ } };

/** Solo los parámetros que sirven para el diseño; los de la vista (compresión) no viajan. */
export const aDiseno = (P: Parametros): Partial<Parametros> => { const { comp: _c, ...resto } = P; return resto; };
export const deDiseno = (d: Partial<Parametros>): Parametros => ({ ...PARAMETROS_POR_DEFECTO, ...d, comp: 0 });

export function MenuDisenos({ P, actual, alCargar, alNuevo, alGuardado, puedeDecidir }: {
  P: Parametros;
  actual: { id: number; nombre: string; base: string } | null;
  alCargar: (d: Diseno) => void;
  alNuevo: () => void;
  alGuardado: (d: Diseno) => void;
  puedeDecidir: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [lista, setLista] = useState<Diseno[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [modoNuevo, setModoNuevo] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const cambiado = !!actual && JSON.stringify(aDiseno(P)) !== actual.base;

  const cargar = () => fetch('/api/aeromovil/disenos', { credentials: 'include' })
    .then(async r => { if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || 'No se han podido leer los diseños.'); return r.json(); })
    .then(setLista).catch(e => setError(e.message));
  useEffect(() => { if (abierto) { setError(null); cargar(); } }, [abierto]);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc); };
  }, [abierto]);

  const llamar = async (url: string, metodo: string, cuerpo: any) => {
    const r = await fetch(url, { method: metodo, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
    const j = await r.json().catch(() => null);
    if (!r.ok) { const e: any = new Error(j?.error || 'No se ha podido guardar.'); e.estado = r.status; throw e; }
    return j;
  };
  const guardarNuevo = async () => {
    const n = nombre.trim();
    if (!n) { setAviso('Ponle un nombre al diseño.'); return; }
    setOcupado(true); setAviso(null);
    try {
      let autor = ''; try { autor = localStorage.getItem('aeromovil.autor') || ''; } catch { /* nada */ }
      const j = await llamar('/api/aeromovil/disenos', 'POST', { nombre: n, parametros: aDiseno(P), autor });
      if (j.diseno) { guardarClave(j.diseno.id, j.clave); alGuardado(j.diseno); }
      setModoNuevo(false); setNombre(''); setAviso('Guardado como diseño nuevo.'); cargar();
    } catch (e: any) { setAviso(e.message); } finally { setOcupado(false); }
  };
  const guardarCambios = async () => {
    if (!actual) { setModoNuevo(true); return; }
    setOcupado(true); setAviso(null);
    try {
      const j = await llamar(`/api/aeromovil/disenos/${actual.id}`, 'PUT', { parametros: aDiseno(P), clave: leerClaves()[actual.id] });
      alGuardado(j); setAviso('Cambios guardados.'); cargar();
    } catch (e: any) {
      if (e.estado === 403) { setModoNuevo(true); setNombre(`${actual.nombre} (mío)`); }
      setAviso(e.message);
    } finally { setOcupado(false); }
  };
  const quitar = async (d: Diseno) => {
    setOcupado(true); setAviso(null);
    try { await llamar(`/api/aeromovil/disenos/${d.id}`, 'DELETE', { clave: leerClaves()[d.id] }); setAviso(`«${d.nombre}» quitado.`); cargar(); }
    catch (e: any) { setAviso(e.message); } finally { setOcupado(false); }
  };
  const copiarEnlace = async (d: Diseno) => {
    const url = `${location.origin}/aeromovil?diseno=${d.id}`;
    try { await navigator.clipboard.writeText(url); setAviso('Enlace copiado.'); } catch { setAviso(url); }
  };
  const claves = leerClaves();

  return (
    <div ref={caja} className="relative">
      <Button variant="ghost" aria-expanded={abierto} aria-haspopup="menu" onClick={() => setAbierto(a => !a)}
        className={cn('gap-1.5 px-3 py-1.5 text-sm normal-case tracking-normal text-slate-700', abierto && 'bg-slate-100')}>
        <FolderOpen className="h-4 w-4" />
        <span className="max-w-[14rem] truncate">{actual ? actual.nombre : 'Diseños'}</span>
        {cambiado && <span className="h-2 w-2 rounded-full bg-amber-500" title="Cambios sin guardar" />}
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>
      {abierto && (
        <div role="menu" className="absolute left-0 top-full z-40 mt-1 w-[min(92vw,380px)] rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          <div className="flex flex-wrap gap-1.5 border-b border-slate-100 p-1 pb-2">
            <Button variant="outline" disabled={ocupado} onClick={guardarCambios} className="px-2.5 py-1.5 text-xs normal-case tracking-normal">
              <Save className="mr-1 h-3.5 w-3.5" />{actual ? 'Guardar cambios' : 'Guardar'}
            </Button>
            <Button variant="outline" disabled={ocupado} onClick={() => { setModoNuevo(true); setNombre(actual ? `${actual.nombre} (variante)` : ''); }} className="px-2.5 py-1.5 text-xs normal-case tracking-normal">
              <FilePlus2 className="mr-1 h-3.5 w-3.5" />Guardar como nuevo
            </Button>
            <Button variant="ghost" disabled={ocupado} onClick={() => { alNuevo(); setAbierto(false); }} className="px-2.5 py-1.5 text-xs normal-case tracking-normal">
              Empezar uno nuevo
            </Button>
          </div>
          {modoNuevo && (
            <form className="flex gap-1.5 border-b border-slate-100 p-1 py-2" onSubmit={e => { e.preventDefault(); guardarNuevo(); }}>
              <label htmlFor="am-dis-nombre" className="sr-only">Nombre del diseño</label>
              <input id="am-dis-nombre" autoFocus value={nombre} onChange={e => setNombre(e.target.value)} maxLength={80} placeholder="Nombre del diseño"
                className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm" />
              <Button type="submit" disabled={ocupado} className="bg-teal-700 px-3 py-1 text-xs normal-case tracking-normal hover:bg-teal-800">
                {ocupado ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Guardar'}
              </Button>
            </form>
          )}
          {aviso && <p className="px-2 py-1.5 text-xs text-slate-600">{aviso}</p>}
          {error && <p className="px-2 py-1.5 text-xs text-red-700">{error}</p>}
          {!lista && !error && <p className="flex items-center gap-2 px-2 py-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Cargando…</p>}
          <ul className="max-h-[50vh] overflow-y-auto py-1">
            {lista?.map(d => {
              const esActual = actual?.id === d.id;
              const mio = puedeDecidir || !!claves[d.id];
              return (
                <li key={d.id} className={cn('group flex items-center gap-1 rounded-lg px-1', esActual && 'bg-teal-50')}>
                  <Button variant="ghost" role="menuitem" onClick={() => { alCargar(d); setAbierto(false); }}
                    className="min-w-0 flex-1 justify-start gap-2 px-2 py-1.5 text-left text-sm font-medium normal-case tracking-normal text-slate-800">
                    {esActual ? <Check className="h-3.5 w-3.5 shrink-0 text-teal-700" /> : <span className="w-3.5 shrink-0" />}
                    <span className="min-w-0 flex-1 truncate">{d.nombre}</span>
                    <span className="shrink-0 text-[11px] font-normal text-slate-400">{d.origen === 'equipo' ? 'base' : (d.autor || 'anónimo')} · {new Date(d.updated_at).toLocaleDateString('es-ES')}</span>
                  </Button>
                  <Button variant="ghost" aria-label={`Copiar enlace de ${d.nombre}`} onClick={() => copiarEnlace(d)} className="px-1.5 py-1.5 text-slate-500"><Link2 className="h-3.5 w-3.5" /></Button>
                  {mio && d.origen !== 'equipo' && (
                    <Button variant="ghost" aria-label={`Quitar ${d.nombre}`} onClick={() => quitar(d)} className="px-1.5 py-1.5 text-slate-500 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></Button>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="border-t border-slate-100 px-2 pt-2 text-[11px] text-slate-500">Los diseños son de todos. Solo quien creó uno (desde este navegador o con su cuenta) o el dueño del Aeromóvil puede cambiarlo o quitarlo.</p>
        </div>
      )}
    </div>
  );
}
