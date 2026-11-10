// ============================================================================
// AEROMÓVIL GOTA · diseños guardados (2026-11-05)
// ============================================================================
// Eugenio: «permite guardar configuraciones de los parámetros y tener varios
// diseños… para no perderlas cuando se recarga la página o cuando se quiere
// empezar un nuevo diseño. Que esos diseños estén en el menú».
//
// 2026-11-09 (Eugenio: «unifica los selectores de vehículos… deja solo el de
// arriba… que el selector de vehículos esté integrado en el logo de Aeromóvil,
// como un desplegable»): el botón del menú ES el logo con el nombre del
// vehículo, y la lista va agrupada por vehículo. El bloque «Vehículo» del panel
// lateral desapareció: elegir vehículo es abrir uno de sus diseños.
//
// Un menú desplegable en la barra superior: la lista de diseños (de todos), y
// guardar, guardar como nuevo, empezar uno nuevo y quitar. Quien crea un diseño
// sin cuenta recibe una clave que se queda en SU navegador
// (`aeromovil.claves`): con ella puede cambiarlo o quitarlo después. Sin la
// clave, «Guardar» ofrece guardarlo como uno nuevo.
//
// Guardado automático (2026-11-05, Eugenio: «el diseño según lo voy
// modificando se guarda solo?» → «hazlo»). Un diseño TUYO (su clave está en
// este navegador) se guarda solo en la web unos segundos después de dejar de
// tocar. Los demás no: el diseño base y los de otras personas se cambian con
// «Guardar cambios», a propósito, porque guardar solo encima del trabajo de
// otro en cuanto alguien mueve un deslizador no tiene vuelta atrás (los diseños
// no tienen historial). Y un diseño sin guardar nunca se crea solo: cada
// visitante que juega con los deslizadores llenaría la lista de todos.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, CloudOff, FilePlus2, Link2, Loader2, Save, Star, Trash2 } from 'lucide-react';
import { Button } from '../ui/core';
import { cn } from '../../utils/cn';
import { PARAMETROS_A1, PARAMETROS_BALA, PARAMETROS_GOTA, PARAMETROS_TRICICLO, type Disposicion, type Parametros } from './geometria';

/** The four vehicle families, in the order the menu lists them (the Triciclo Bala since 2026-11-10). */
export const VEHICULOS: { k: Disposicion; n: string; d: string }[] = [
  { k: 'cuatro', n: 'Aeromóvil 1', d: 'Eléctrico de cuatro ruedas, carrocería baja con cúpula (SZEmission ×1,3), clase Twizy.' },
  { k: 'rombo', n: 'Aeromóvil Gota', d: 'Velomóvil tándem 1+2 de pedaleo asistido, rombo basculante, carenado en gota.' },
  { k: 'bala', n: 'Cuadriciclo Bala', d: 'Biplaza a horcajadas, tipo moto carenada: el rombo de ruedas del Gota con carenados laterales fijos, morro en punta y cúpula.' },
  { k: 'triciclo', n: 'Triciclo Bala', d: 'La carrocería del Cuadriciclo con tres ruedas: dos delante en carenados que giran, como el Aptera, y una detrás con el motor; respaldos que se reclinan.' },
];
/** A saved design's family: designs from before 2026-11-06 carry none and are the Gota's. */
const familiaDe = (d: Diseno): Disposicion => { const k = d.parametros?.disposicion; return VEHICULOS.some(v => v.k === k) ? k! : 'rombo'; };

export interface Diseno { id: number; nombre: string; parametros: Partial<Parametros>; autor: string | null; origen: 'equipo' | 'visitante'; por_defecto?: boolean; updated_at: string }

/** El diseño por defecto guardado en la web (el que abre quien llega por primera vez), o null si no hay. */
export async function cargarDisenoPorDefecto(): Promise<Diseno | null> {
  try { const r = await fetch('/api/aeromovil/disenos', { credentials: 'include' }); if (!r.ok) return null; const l: Diseno[] = await r.json(); return l.find(d => d.por_defecto) ?? null; } catch { return null; }
}

const CLAVES = 'aeromovil.claves';
export const leerClaves = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(CLAVES) || '{}') || {}; } catch { return {}; } };
const guardarClave = (id: number, clave: string) => { try { localStorage.setItem(CLAVES, JSON.stringify({ ...leerClaves(), [id]: clave })); } catch { /* sin almacenamiento */ } };

/** Solo los parámetros que sirven para el diseño; los de la vista (compresión) no viajan. */
export const aDiseno = (P: Parametros): Partial<Parametros> => { const { comp: _c, ...resto } = P; return resto; };
/**
 * Un diseño guardado sin `disposicion` es de antes del 2026-11-06: del
 * Aeromóvil Gota, con las medidas por defecto de entonces. Desde entonces el
 * diseño por defecto es el Aeromóvil 1 y cada diseño dice de cuál es. Desde el
 * 2026-11-09 hay un tercero, el Cuadriciclo Bala ('bala'), que parte de las
 * medidas del Bala del garaje. Comprobado con `npx tsx scripts/bala-disenos.ts`.
 * Desde el 2026-11-10, el Triciclo Bala ('triciclo'), con sus campos `t…`
 * (`npx tsx scripts/triciclo-disenos.ts`).
 */
export const deDiseno = (d: Partial<Parametros>): Parametros => {
  const base = d.disposicion === 'cuatro' ? PARAMETROS_A1 : d.disposicion === 'bala' ? PARAMETROS_BALA : d.disposicion === 'triciclo' ? PARAMETROS_TRICICLO : PARAMETROS_GOTA;
  // Un valor guardado solo vale si es del mismo tipo que el de por defecto.
  // El 2026-11-06 `parabrisas` pasó de ser un texto ('plano') a un número, y
  // un diseño guardado con el texto dejaba la página en blanco (NaN en toda
  // la geometría). Lo que no cuadra se ignora y se usa el de por defecto.
  const limpio: Partial<Parametros> = {};
  for (const [k, v] of Object.entries(d)) {
    const ref = (base as unknown as Record<string, unknown>)[k];
    if (ref === undefined) { (limpio as Record<string, unknown>)[k] = v; continue; }
    if (typeof ref === 'number') { if (typeof v === 'number' && Number.isFinite(v)) (limpio as Record<string, unknown>)[k] = v; continue; }
    if (typeof ref === typeof v) (limpio as Record<string, unknown>)[k] = v;
  }
  return { ...base, ...limpio, disposicion: d.disposicion ?? 'rombo', comp: 0 };
};

export type DisenoAbierto = { id: number; nombre: string; base: string };
export type EstadoGuardado =
  | { tipo: 'sin-diseno' }          // nada abierto: los cambios solo están en este navegador
  | { tipo: 'manual' }              // abierto, pero no creado desde este navegador: se guarda con el botón
  | { tipo: 'al-dia' }              // tuyo y guardado
  | { tipo: 'pendiente' }           // tuyo, con cambios que se guardarán solos en unos segundos
  | { tipo: 'guardando' }
  | { tipo: 'error'; mensaje: string; reintento?: number };

/** Espera tras el último cambio, y separación mínima entre dos guardados (el
 *  freno del servidor admite 120 por hora y conexión; así quedan como mucho 90). */
const QUIETO_MS = 3000, ENTRE_GUARDADOS_MS = 40_000;

/** Guarda solo en la web el diseño abierto, si es de este navegador. */
export function useAutoguardado(P: Parametros, actual: DisenoAbierto | null, alGuardado: (d: Diseno) => void): EstadoGuardado {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<{ mensaje: string; reintento?: number } | null>(null);
  const ultimo = useRef(0);
  const datos = JSON.stringify(aDiseno(P));
  const clave = actual ? leerClaves()[actual.id] : undefined;
  const cambiado = !!actual && datos !== actual.base;
  // Lo que hay que guardar, para el guardado de emergencia al cerrar la página.
  const pendiente = useRef<{ id: number; datos: string; clave: string } | null>(null);
  pendiente.current = actual && clave && cambiado ? { id: actual.id, datos, clave } : null;

  const guardar = useCallback(async (id: number, cuerpo: string, k: string) => {
    setGuardando(true); ultimo.current = Date.now();
    try {
      const r = await fetch(`/api/aeromovil/disenos/${id}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parametros: JSON.parse(cuerpo), clave: k }) });
      const j = await r.json().catch(() => null);
      if (!r.ok) {
        const espera = Number(r.headers.get('Retry-After')) || 0;
        setError({ mensaje: j?.error || 'No se ha podido guardar en la web.', reintento: r.status === 429 && espera ? Date.now() + espera * 1000 : undefined });
        return;
      }
      setError(null); alGuardado(j);
    } catch {
      setError({ mensaje: 'Sin conexión: se guardará en cuanto vuelva la red.', reintento: Date.now() + 15_000 });
    } finally { setGuardando(false); }
  }, [alGuardado]);

  useEffect(() => {
    if (!actual || !clave || !cambiado || guardando) return;
    const ahora = Date.now();
    let cuando = Math.max(ahora + QUIETO_MS, ultimo.current + ENTRE_GUARDADOS_MS);
    if (error) { if (!error.reintento) return; cuando = Math.max(cuando, error.reintento); }   // un 403 o un 400 no se reintenta solo
    const t = setTimeout(() => guardar(actual.id, datos, clave), cuando - ahora);
    return () => clearTimeout(t);
  }, [actual, clave, cambiado, datos, guardando, error, guardar]);

  // Al cambiar de diseño, el error del anterior no vale.
  useEffect(() => { setError(null); }, [actual?.id]);

  // Si se cierra la página con cambios sin subir, se mandan en ese momento.
  useEffect(() => {
    const salir = () => {
      const p = pendiente.current; if (!p) return;
      try { fetch(`/api/aeromovil/disenos/${p.id}`, { method: 'PUT', credentials: 'include', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parametros: JSON.parse(p.datos), clave: p.clave }) }); } catch { /* nada */ }
    };
    window.addEventListener('pagehide', salir);
    return () => window.removeEventListener('pagehide', salir);
  }, []);

  if (!actual) return { tipo: 'sin-diseno' };
  if (!clave) return { tipo: 'manual' };
  if (guardando) return { tipo: 'guardando' };
  if (error && cambiado) return { tipo: 'error', ...error };
  return { tipo: cambiado ? 'pendiente' : 'al-dia' };
}

export function MenuDisenos({ P, actual, alCargar, alNuevo, alGuardado, alVehiculo, nombreVehiculo, puedeDecidir, estado }: {
  P: Parametros;
  /** The open vehicle's name: the button is the page's logo. */
  nombreVehiculo: string;
  /** Opens a vehicle at its starting measures; only used when that vehicle has no design in the list. */
  alVehiculo: (k: Disposicion) => void;
  actual: DisenoAbierto | null;
  estado: EstadoGuardado;
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
  const ponerPorDefecto = async (d: Diseno) => {
    setOcupado(true); setAviso(null);
    try { await llamar(`/api/aeromovil/disenos/${d.id}/por-defecto`, 'POST', {}); setAviso(`«${d.nombre}» es ahora el diseño por defecto: el que abre quien llega por primera vez y el que carga «Empezar uno nuevo».`); cargar(); }
    catch (e: any) { setAviso(e.message); } finally { setOcupado(false); }
  };
  const copiarEnlace = async (d: Diseno) => {
    const url = `${location.origin}/aeromovil?diseno=${d.id}`;
    try { await navigator.clipboard.writeText(url); setAviso('Enlace copiado.'); } catch { setAviso(url); }
  };

  const fila = (d: Diseno) => {
    const esActual = actual?.id === d.id;
    return (
                <li key={d.id} className={cn('group flex items-center gap-1 rounded-lg px-1', esActual && 'bg-teal-50')}>
                  <Button variant="ghost" role="menuitem" onClick={() => { alCargar(d); setAbierto(false); }}
                    className="min-w-0 flex-1 justify-start gap-2 px-2 py-1.5 text-left text-sm font-medium normal-case tracking-normal text-slate-800">
                    {esActual ? <Check className="h-3.5 w-3.5 shrink-0 text-teal-700" /> : <span className="w-3.5 shrink-0" />}
                    <span className="min-w-0 flex-1 truncate">{d.nombre}</span>
                    <span className="shrink-0 text-[11px] font-normal text-slate-400">{d.por_defecto ? 'por defecto · ' : ''}{d.origen === 'equipo' ? 'base' : (d.autor || 'anónimo')} · {new Date(d.updated_at).toLocaleDateString('es-ES')}</span>
                  </Button>
                  {puedeDecidir && (
                    <Button variant="ghost" aria-label={d.por_defecto ? `${d.nombre} es el diseño por defecto` : `Poner ${d.nombre} por defecto`} aria-pressed={!!d.por_defecto} disabled={!!d.por_defecto || ocupado} onClick={() => ponerPorDefecto(d)}
                      className={cn('px-1.5 py-1.5', d.por_defecto ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500')}><Star className={cn('h-3.5 w-3.5', d.por_defecto && 'fill-current')} /></Button>
                  )}
                  <Button variant="ghost" aria-label={`Copiar enlace de ${d.nombre}`} onClick={() => copiarEnlace(d)} className="px-1.5 py-1.5 text-slate-500"><Link2 className="h-3.5 w-3.5" /></Button>
                  {puedeDecidir && (
                    <Button variant="ghost" aria-label={`Quitar ${d.nombre}`} onClick={() => quitar(d)} className="px-1.5 py-1.5 text-slate-500 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></Button>
                  )}
                </li>
    );
  };

  return (
    <div ref={caja} className="relative">
      <Button variant="ghost" aria-expanded={abierto} aria-haspopup="menu" onClick={() => setAbierto(a => !a)}
        title="Elegir vehículo o diseño"
        className={cn('h-auto gap-2 rounded-xl px-1.5 py-1 normal-case tracking-normal sm:px-2', abierto && 'bg-slate-100')}>
        <svg viewBox="0 0 40 20" className="h-5 w-10 shrink-0 text-teal-700 sm:h-6 sm:w-12" aria-hidden>
          <path d="M2 12 C 6 3, 24 1, 38 9 C 30 15, 12 17, 2 12 Z" fill="currentColor" opacity=".18" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="9" cy="16" r="2.4" fill="currentColor" /><circle cx="31" cy="15" r="2.4" fill="currentColor" />
        </svg>
        <span className="flex min-w-0 flex-col items-start text-left leading-tight">
          <span className="flex items-center gap-1 whitespace-nowrap text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
            {nombreVehiculo}<ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-500 transition-transform', abierto && 'rotate-180')} />
          </span>
          <span className="hidden max-w-[13rem] items-center gap-1 text-[11px] font-normal text-slate-500 sm:flex">
            <span className="truncate">{actual ? actual.nombre : 'sin guardar'}</span>
            {estado.tipo === 'guardando' && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-slate-400" aria-label="Guardando en la web" />}
            {estado.tipo === 'al-dia' && actual && <Check className="h-3 w-3 shrink-0 text-teal-700" aria-label="Guardado en la web" />}
            {estado.tipo === 'error' && <CloudOff className="h-3 w-3 shrink-0 text-amber-600" aria-label="Sin guardar en la web" />}
            {(estado.tipo === 'manual' || estado.tipo === 'pendiente') && cambiado && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" title={estado.tipo === 'pendiente' ? 'Se guardará en unos segundos' : 'Cambios sin guardar'} />}
          </span>
        </span>
      </Button>
      {abierto && (
        <div role="menu" className="absolute left-0 top-full z-40 mt-1 w-[min(92vw,420px)] rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          {!puedeDecidir && <p className="border-b border-slate-100 px-2 py-1.5 text-[11px] text-amber-800">Solo el dueño del Aeromóvil, con su sesión iniciada, guarda o cambia diseños (desde el 2026-11-07). Aquí se pueden abrir y mirar.</p>}
          {puedeDecidir && <div className="flex flex-wrap gap-1.5 border-b border-slate-100 p-1 pb-2">
            <Button variant="outline" disabled={ocupado} onClick={guardarCambios} className="px-2.5 py-1.5 text-xs normal-case tracking-normal">
              <Save className="mr-1 h-3.5 w-3.5" />{actual ? 'Guardar cambios' : 'Guardar'}
            </Button>
            <Button variant="outline" disabled={ocupado} onClick={() => { setModoNuevo(true); setNombre(actual ? `${actual.nombre} (variante)` : ''); }} className="px-2.5 py-1.5 text-xs normal-case tracking-normal">
              <FilePlus2 className="mr-1 h-3.5 w-3.5" />Guardar como nuevo
            </Button>
            <Button variant="ghost" disabled={ocupado} onClick={() => { alNuevo(); setAbierto(false); }} className="px-2.5 py-1.5 text-xs normal-case tracking-normal">
              Empezar uno nuevo
            </Button>
          </div>}
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
          <p className={cn('px-2 py-1.5 text-xs', estado.tipo === 'error' ? 'text-amber-800' : 'text-slate-600')}>{
            estado.tipo === 'sin-diseno' ? 'Tus cambios se guardan en este navegador. Para tenerlos en la web, guárdalo con un nombre: a partir de ahí se guarda solo.'
            : estado.tipo === 'manual' ? 'Este diseño no lo creaste tú desde este navegador: tus cambios no se guardan solos. «Guardar cambios» los sube (si puedes cambiarlo) o «Guardar como nuevo» hace tu copia.'
            : estado.tipo === 'error' ? `${estado.mensaje}${estado.reintento ? ' Se volverá a intentar solo.' : ''}`
            : estado.tipo === 'guardando' ? 'Guardando en la web…'
            : estado.tipo === 'pendiente' ? 'Se guarda solo en la web unos segundos después de cada cambio.'
            : 'Guardado en la web. Cada cambio se guarda solo.'}</p>
          {aviso && <p className="px-2 py-1.5 text-xs text-slate-600">{aviso}</p>}
          {error && <p className="px-2 py-1.5 text-xs text-red-700">{error}</p>}
          {!lista && !error && <p className="flex items-center gap-2 px-2 py-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Cargando…</p>}
          <ul className="max-h-[60vh] overflow-y-auto py-1">
            {lista && VEHICULOS.map(v => {
              const suyos = lista.filter(d => familiaDe(d) === v.k), abiertoAhora = P.disposicion === v.k;
              return (
                <li key={v.k} className="py-1">
                  <p className={cn('flex items-baseline gap-2 px-2 pb-0.5 pt-1 text-[11px] font-semibold uppercase tracking-wide', abiertoAhora ? 'text-teal-800' : 'text-slate-500')}>
                    {v.n}{abiertoAhora && <span className="font-normal normal-case tracking-normal text-teal-700">· el que ves</span>}
                  </p>
                  <p className="px-2 pb-1 text-[11px] text-slate-400">{v.d}</p>
                  <ul>
                    {suyos.map(fila)}
                    {!suyos.length && (
                      <li>
                        <Button variant="ghost" role="menuitem" onClick={() => { alVehiculo(v.k); setAbierto(false); }}
                          className="w-full justify-start gap-2 px-2 py-1.5 text-left text-sm font-medium normal-case tracking-normal text-slate-800">
                          <span className="w-3.5 shrink-0" />Medidas de partida
                        </Button>
                      </li>
                    )}
                  </ul>
                </li>
              );
            })}
          </ul>
          <p className="border-t border-slate-100 px-2 pt-2 text-[11px] text-slate-500">Los diseños se pueden abrir y mirar; cambiarlos, guardarlos o quitarlos solo puede el dueño del Aeromóvil con su sesión, que también elige con la estrella cuál es el diseño por defecto.</p>
        </div>
      )}
    </div>
  );
}
