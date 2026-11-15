// ============================================================================
// The garage as the way to pick, compare, copy and remove our designs (2026-11-13)
// ============================================================================
// Eugenio: «cuando se pinche uno de ellos, hay un botón de solo mostrar este y el resto se quitan. Y también cuando se
// pinche en uno de ellos, aparezcan los sliders para modificar su carrocería, chasis, energía… Y así la forma de
// interactuar es pinchando en cada uno de los vehículos en vez de en el menú izquierdo desplegable. Luego también
// permite borrar uno de los diseños pinchando en él… o de guardar como nuevo, y entonces se crea una copia de ese justo
// al lado y se puede empezar un modelo nuevo partiendo de ese.»
//
// · Picking a design (a click on it in the 3D, a row of the list, or the logo menu) opens it exactly as the logo menu
//   always has (`abrirDiseno`: its parameters, and «base» to tell unsaved changes). What is new is what happens to the
//   changes of the one being left: if it is yours and saves itself, they are saved first; otherwise the page asks.
// · «Guardar como nuevo» and «Eliminar» are the same calls as the logo menu's (POST, and DELETE, which archives).
//   The server lets only the owner of the Aeromóvil (or an admin) do either, so only the owner sees the buttons.
import { useState, type FormEvent, type ReactNode } from 'react';
import { Check, Copy, Eye, EyeOff, Focus, Loader2, MoveDiagonal, Pencil, Rows3, Trash2, X } from 'lucide-react';
import { Button, Card } from '../../ui/core';
import { cn } from '../../../utils/cn';
import { aDiseno, deDiseno, leerClaves, type Diseno, type DisenoAbierto } from '../Disenos';
import type { Parametros } from '../geometria';
import { camposTriciclo, nombreTriciclo } from '../geometriaTriciclo';
import { esDisenoGaraje, idGaraje, type useDisenosGaraje } from '../GarajeDisenos';
import { HUECO_EN_FILA, nombreDeCopia } from './filas';
import { PARAMETROS_REPLICA_SMERA } from './smera';

type Garaje = ReturnType<typeof useDisenosGaraje>;

/** A design's vehicle, from its parameters alone (no model is built): for the list. */
export function familiaGuardada(d: Diseno): string {
  const P = deDiseno(d.parametros || {});
  return P.disposicion === 'basculante' ? 'Cuadriciclo Basculante' : P.disposicion === 'cuatro' ? 'Aeromóvil 1' : P.disposicion === 'bala' ? 'Cuadriciclo Bala en rombo' : P.disposicion === 'triciclo' ? nombreTriciclo(camposTriciclo(P)) : 'Aeromóvil Gota';
}

/** «Solo mostrar este»: nothing hidden, only the design being edited, or only one reference car (by id). */
export type Solo = null | 'activo' | string;

export function useEleccionDiseno({ g, P, actual, abrirDiseno, sinGuardar, alRenombrado, puedeDecidir, nombreVehiculo, morro, cola }: {
  g: Garaje;
  P: Parametros;
  actual: DisenoAbierto | null;
  /** The logo menu's way of opening a design (the one path every design is opened by). */
  abrirDiseno: (d: Diseno) => void;
  /** Leaves the design being edited unsaved (when the one open was removed and there is no other). */
  sinGuardar: () => void;
  /** A design was renamed (2026-11-13): the page updates the open design's name, if it is that one. */
  alRenombrado: (d: Diseno) => void;
  puedeDecidir: boolean;
  nombreVehiculo: string;
  /** The design being edited: nose and tail x (m), for where its copy goes. */
  morro: number; cola: number;
}) {
  const [seguir, setSeguir] = useState<{ n: number; dx: number; dz: number } | undefined>();
  const [tarjeta, setTarjeta] = useState(false);
  const [pendiente, setPendiente] = useState<{ d: Diseno; error?: string } | null>(null);
  const [solo, setSolo] = useState<Solo>(null);
  const [borrar, setBorrar] = useState(false);
  const [ocupado, setOcupado] = useState<null | 'guardar' | 'copiar' | 'eliminar'>(null);
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null);

  const datos = JSON.stringify(aDiseno(P));
  /** Changes that would be lost: against the design as opened or saved, or (unsaved) against its vehicle's starting measures. */
  const cambiado = actual ? datos !== actual.base : datos !== JSON.stringify(aDiseno(deDiseno({ disposicion: P.disposicion })));
  const moverCamara = (x: number, z: number) => setSeguir(s => ({ n: (s?.n ?? 0) + 1, dx: -x, dz: -z }));

  const cambiar = (d: Diseno) => {
    const p = g.plazas.get(idGaraje(d.id));
    if (p) moverCamara(p.x, p.z);
    abrirDiseno(d);
    if (solo && solo !== 'activo') setSolo(null);
    setTarjeta(true); setPendiente(null); setBorrar(false); setAviso(null);
  };
  /** Opens a design, after looking after the changes of the one being left. */
  const elegir = async (d: Diseno) => {
    if (ocupado) return;
    if (d.id === actual?.id) { setTarjeta(true); setPendiente(null); return; }
    if (!cambiado) { cambiar(d); return; }
    // Yours, and it saves itself: its last changes are saved now (they would have been a few seconds later).
    if (actual && puedeDecidir && leerClaves()[actual.id]) {
      setOcupado('guardar');
      try { await g.guardar(actual.id, aDiseno(P)); cambiar(d); }
      catch (e: any) { setPendiente({ d, error: e?.message || 'No se han podido guardar los cambios.' }); }
      finally { setOcupado(null); }
      return;
    }
    setPendiente({ d }); setTarjeta(false);
  };
  const guardarYCambiar = async () => {
    if (!pendiente || !actual) return;
    setOcupado('guardar');
    try { await g.guardar(actual.id, aDiseno(P)); cambiar(pendiente.d); }
    catch (e: any) { setPendiente({ ...pendiente, error: e?.message || 'No se han podido guardar los cambios.' }); }
    finally { setOcupado(null); }
  };
  const copiar = async () => {
    if (ocupado) return;
    setOcupado('copiar'); setAviso(null); setBorrar(false);
    try {
      const nombre = nombreDeCopia(actual?.nombre ?? nombreVehiculo, (g.lista ?? []).map(d => d.nombre));
      const d = await g.copiar(nombre, aDiseno(P), actual?.id ?? null);
      // right after the original: its front axle that far behind ours (`colocarFilas` puts it there)
      if (actual) moverCamara(cola - HUECO_EN_FILA - morro, 0);
      abrirDiseno(d); setTarjeta(true);
      setAviso({ texto: `Copia creada: «${d.nombre}». Es la que editas ahora; el original sigue al lado, como estaba guardado.` });
    } catch (e: any) { setAviso({ texto: e?.message || 'No se ha podido crear la copia.', error: true }); }
    finally { setOcupado(null); }
  };
  /**
   * «Crear editable» on a reference car's card (2026-11-15, the Smera: «a partir de esa réplica permite crear un modelo
   * 3D editable duplicando esa réplica»): a new design with that car's parameters, opened to edit.
   */
  const crearDesde = async (base: string, parametros: Parametros) => {
    if (ocupado) return;
    setOcupado('copiar'); setAviso(null); setBorrar(false);
    try {
      const usados = new Set((g.lista ?? []).map(d => d.nombre));
      let nombre = base; for (let k = 2; usados.has(nombre); k++) nombre = `${base} ${k}`;
      const d = await g.copiar(nombre, aDiseno(parametros), null);
      abrirDiseno(d); setTarjeta(true);
      setAviso({ texto: `Creado «${d.nombre}»: una copia editable de la réplica. Es la que editas ahora; la réplica sigue igual en el garaje.` });
    } catch (e: any) { setAviso({ texto: e?.message || 'No se ha podido crear el diseño editable.', error: true }); }
    finally { setOcupado(null); }
  };
  const eliminar = async () => {
    if (!actual || ocupado) return;
    const lista = g.lista ?? [], k = lista.findIndex(d => d.id === actual.id), nombre = actual.nombre;
    // the one to open next: the nearest one in the row that is on show, or else any
    const cerca = [...lista.slice(k + 1), ...lista.slice(0, Math.max(0, k)).reverse()].filter(d => d.id !== actual.id);
    const siguiente = cerca.find(d => !g.ocultos.includes(d.id)) ?? cerca[0];
    setOcupado('eliminar');
    try {
      await g.archivar(actual.id);
      if (siguiente) cambiar(siguiente); else sinGuardar();
      setAviso({ texto: `«${nombre}» eliminado: ya no sale en la lista ni en el garaje (se archiva; sus datos no se borran).` });
    } catch (e: any) { setAviso({ texto: e?.message || 'No se ha podido eliminar.', error: true }); }
    finally { setOcupado(null); setBorrar(false); }
  };

  /** The viewer's click on a garage car: one of our designs is taken here (it becomes the one being edited). */
  const alPincharGaraje = (id: string) => {
    if (!esDisenoGaraje(id)) { setTarjeta(false); return false; }
    const d = g.lista?.find(x => idGaraje(x.id) === id);
    if (d) void elegir(d);
    return true;
  };
  return {
    seguir, tarjeta, setTarjeta, cerrarTarjeta: () => { setTarjeta(false); setBorrar(false); setAviso(null); }, pendiente, setPendiente, solo, setSolo, borrar, setBorrar, ocupado, aviso, cambiado,
    elegir, guardarYCambiar, descartarYCambiar: () => pendiente && cambiar(pendiente.d), copiar, crearDesde, eliminar, alPincharGaraje,
    /** «Cambiar nombre» (2026-11-13): the name only, through the server's PUT; every place that shows it follows. */
    renombrar: async (id: number, nombre: string) => { const d = await g.renombrar(id, nombre); alRenombrado(d); },
  };
}
type Eleccion = ReturnType<typeof useEleccionDiseno>;

const boton = 'gap-1.5 px-2.5 py-1.5 text-[11px] normal-case tracking-normal';

/** The server keeps a design's name trimmed and at most 80 characters, and refuses an empty one (aeromovil.ts). */
export const MAX_NOMBRE = 80;

/** «Cambiar nombre» in place: a text field with «Guardar» and «Cancelar» (Enter saves, Escape cancels). */
function FormNombre({ inicial, alGuardar, alCancelar, className }: { inicial: string; alGuardar: (n: string) => Promise<void>; alCancelar: () => void; className?: string }) {
  const [nombre, setNombre] = useState(inicial);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const limpio = nombre.trim();
  const enviar = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!limpio) { setError('El nombre no puede quedar vacío.'); return; }
    if (limpio === inicial) { alCancelar(); return; }
    setOcupado(true); setError(null);
    try { await alGuardar(limpio); } catch (e: any) { setError(e?.message || 'No se ha podido cambiar el nombre.'); setOcupado(false); }
  };
  return (
    <form onSubmit={enviar} onKeyDown={ev => { if (ev.key === 'Escape') { ev.stopPropagation(); alCancelar(); } }} className={cn('flex flex-col gap-1', className)}>
      <div className="flex min-w-0 gap-1">
        <label className="sr-only" htmlFor={`nombre-${inicial}`}>Nombre del diseño</label>
        <input id={`nombre-${inicial}`} autoFocus value={nombre} maxLength={MAX_NOMBRE} onChange={ev => setNombre(ev.target.value)} disabled={ocupado}
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm" />
        <Button type="submit" disabled={ocupado || !limpio} className="shrink-0 bg-teal-700 px-2.5 py-1 text-xs normal-case tracking-normal hover:bg-teal-800">
          {ocupado ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Guardar'}
        </Button>
        <Button type="button" variant="ghost" disabled={ocupado} onClick={alCancelar} className="shrink-0 px-2 py-1 text-xs normal-case tracking-normal">Cancelar</Button>
      </div>
      <p className={cn('text-[11px]', error ? 'text-red-700' : 'text-slate-400')}>{error ?? `${limpio.length}/${MAX_NOMBRE} caracteres`}</p>
    </form>
  );
}

/** The card of the design being edited, in the 3D view: «Solo mostrar este», «Guardar como nuevo», «Eliminar». */
export function TarjetaDiseno({ e, g, actual, porDefecto, nombreVehiculo, puedeDecidir, bascular, className }: {
  e: Eleccion; g: Garaje; actual: DisenoAbierto | null; porDefecto: boolean; nombreVehiculo: string; puedeDecidir: boolean;
  /** A tilting design (the Cuadriciclo Basculante family): «Bascular» on its card, the toolbar's own lean each way and back. */
  bascular?: { angulo: number; alPulsar: () => void };
  className?: string;
}) {
  const [editando, setEditando] = useState(false);
  if (!e.tarjeta && !e.aviso) return null;
  const movido = actual ? !!g.sitios[idGaraje(actual.id)] : false;
  return (
    <Card role="group" aria-label={`${actual?.nombre ?? 'Diseño sin guardar'}: el diseño que editas`} className={cn('absolute z-[16] p-3 shadow-lg', className)}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {editando && actual
            ? <FormNombre key={actual.id} inicial={actual.nombre} alCancelar={() => setEditando(false)} alGuardar={async n => { await e.renombrar(actual.id, n); setEditando(false); }} />
            : <p className="truncate text-sm font-semibold text-slate-900">{actual?.nombre ?? 'Diseño sin guardar'}</p>}
          <p className="text-[11px] leading-snug text-slate-600">{nombreVehiculo} · el que editas: sus departamentos están arriba y sus deslizadores en el panel (en el móvil, debajo del 3D).</p>
        </div>
        <Button variant="ghost" onClick={e.cerrarTarjeta} aria-label="Cerrar" title="Cerrar" className="-mr-1.5 -mt-1.5 h-10 w-10 shrink-0 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
      {e.aviso && <p role="status" className={cn('mt-1.5 text-[11px] leading-snug', e.aviso.error ? 'text-red-700' : 'text-teal-800')}>{e.aviso.texto}</p>}
      {e.tarjeta && !e.borrar && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Button variant="outline" aria-pressed={e.solo === 'activo'} onClick={() => e.setSolo(e.solo === 'activo' ? null : 'activo')} className={cn(boton, e.solo === 'activo' && 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800')}>
            <Focus className="h-3.5 w-3.5" />{e.solo === 'activo' ? 'Mostrar todos' : 'Solo mostrar este'}
          </Button>
          {bascular && (
            <Button variant="outline" onClick={bascular.alPulsar} title={`Inclina la carrocería y las cuatro ruedas hasta ${bascular.angulo}° a cada lado y vuelve, como en una curva`} className={boton}>
              <MoveDiagonal className="h-3.5 w-3.5" />Bascular
            </Button>
          )}
          {puedeDecidir && (
            <Button variant="outline" disabled={!!e.ocupado} onClick={e.copiar} className={boton}>
              {e.ocupado === 'copiar' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}Guardar como nuevo
            </Button>
          )}
          {puedeDecidir && actual && !editando && (
            <Button variant="outline" disabled={!!e.ocupado} onClick={() => setEditando(true)} className={boton}>
              <Pencil className="h-3.5 w-3.5" />Cambiar nombre
            </Button>
          )}
          {movido && actual && (
            <Button variant="outline" onClick={() => g.aFila(idGaraje(actual.id))} title="Vuelve a su sitio en la fila (los demás se colocan alrededor)" className={boton}>
              <Rows3 className="h-3.5 w-3.5" />Volver a su fila
            </Button>
          )}
          {puedeDecidir && actual && (
            <Button variant="outline" disabled={!!e.ocupado} onClick={() => e.setBorrar(true)} className={cn(boton, 'text-red-700 hover:bg-red-50')}>
              <Trash2 className="h-3.5 w-3.5" />Eliminar
            </Button>
          )}
        </div>
      )}
      {e.tarjeta && e.borrar && actual && (
        <div role="alertdialog" aria-label={`¿Eliminar «${actual.nombre}»?`} className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2">
          <p className="text-xs font-semibold text-red-800">¿Eliminar «{actual.nombre}»?</p>
          <p className="mt-0.5 text-[11px] leading-snug text-red-800">
            Deja de salir en la lista y en el garaje. Se archiva: sus datos no se borran.{porDefecto ? ' Es el diseño por defecto: quien llegue por primera vez ya no lo verá.' : ''} Después se abre el diseño de al lado.
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Button variant="primary" disabled={!!e.ocupado} onClick={e.eliminar} className={cn(boton, 'bg-red-700 hover:bg-red-800')}>
              {e.ocupado === 'eliminar' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}Sí, eliminar
            </Button>
            <Button variant="outline" disabled={!!e.ocupado} onClick={() => e.setBorrar(false)} className={boton}>Cancelar</Button>
          </div>
        </div>
      )}
      {e.tarjeta && !puedeDecidir && <p className="mt-1.5 text-[11px] leading-snug text-slate-500">Copiar, renombrar o eliminar diseños solo puede el dueño del Aeromóvil, con su sesión iniciada.</p>}
      {e.tarjeta && <p className="mt-1.5 text-[11px] leading-snug text-slate-500">El que editas se queda en el centro: arrastra los demás coches para colocarlos a su alrededor.</p>}
    </Card>
  );
}

/** Switching away from a design with changes that would be lost: save them (if you can), drop them, or stay. */
export function AvisoCambios({ e, actual, puedeDecidir, className }: { e: Eleccion; actual: DisenoAbierto | null; puedeDecidir: boolean; className?: string }) {
  if (!e.pendiente) return null;
  const quien = actual ? `«${actual.nombre}»` : 'Este diseño';
  return (
    <Card role="alertdialog" aria-label="Cambios sin guardar" className={cn('absolute z-[17] border-amber-300 p-3 shadow-lg', className)}>
      <p className="text-sm font-semibold text-slate-900">{quien} tiene cambios sin guardar</p>
      <p className="mt-0.5 text-[11px] leading-snug text-slate-600">
        {actual ? (puedeDecidir ? 'Si abres' : 'Solo el dueño del Aeromóvil puede guardarlos. Si abres') : 'No está guardado en la web. Si abres'} «{e.pendiente.d.nombre}», {actual ? 'esos cambios se pierden' : 'se pierde'}.
      </p>
      {e.pendiente.error && <p className="mt-1 text-[11px] text-red-700">{e.pendiente.error}</p>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {actual && puedeDecidir && (
          <Button variant="primary" disabled={!!e.ocupado} onClick={e.guardarYCambiar} className={cn(boton, 'bg-teal-700 hover:bg-teal-800')}>
            {e.ocupado === 'guardar' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Guardar cambios y abrirlo
          </Button>
        )}
        <Button variant="outline" disabled={!!e.ocupado} onClick={e.descartarYCambiar} className={boton}>Descartar cambios y abrirlo</Button>
        <Button variant="ghost" disabled={!!e.ocupado} onClick={() => e.setPendiente(null)} className={boton}>Cancelar</Button>
      </div>
    </Card>
  );
}

/** «Volver a su fila» on a reference car's card, once it has been dragged (2026-11-13). */
export function BotonFilaReferencia({ g, id }: { g: Garaje; id: string }) {
  if (!g.sitios[id]) return null;
  return (
    <Button variant="outline" onClick={() => g.aFila(id)} className="h-10 shrink-0 px-2 text-[11px] normal-case tracking-normal sm:h-auto sm:gap-1.5 sm:px-2.5 sm:py-1.5">
      <Rows3 className="hidden h-3.5 w-3.5 sm:block" />Volver a su fila
    </Button>
  );
}

/**
 * «Crear editable» on the card of a reference car that is one of our own families' models (the Smera replica): saves
 * it as a new design and opens it, so its sliders change it (longer, lower, the riders more reclined, solar panels).
 */
export function BotonEditableReferencia({ e, id }: { e: Eleccion; id: string }) {
  if (id !== 'smera') return null;
  return (
    <Button variant="outline" disabled={!!e.ocupado} onClick={() => void e.crearDesde('Smera editable', PARAMETROS_REPLICA_SMERA)} className="h-10 shrink-0 px-2 text-[11px] normal-case tracking-normal sm:h-auto sm:gap-1.5 sm:px-2.5 sm:py-1.5">
      {e.ocupado === 'copiar' ? <Loader2 className="hidden h-3.5 w-3.5 animate-spin sm:block" /> : <Copy className="hidden h-3.5 w-3.5 sm:block" />}Crear editable
    </Button>
  );
}

/** «Solo mostrar este» on a reference car's card (inside the viewer's own card). */
export function BotonSoloReferencia({ e, id }: { e: Eleccion; id: string }) {
  const activo = e.solo === id;
  return (
    <Button variant="outline" aria-pressed={activo} onClick={() => e.setSolo(activo ? null : id)} className={cn('h-10 shrink-0 px-2 text-[11px] normal-case tracking-normal sm:h-auto sm:gap-1.5 sm:px-2.5 sm:py-1.5', activo && 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800')}>
      <Focus className="hidden h-3.5 w-3.5 sm:block" />{activo ? 'Mostrar todos' : 'Solo mostrar este'}
    </Button>
  );
}

/** «2,38 m · 350 kg» for a row of the list (2026-11-15: the order from the smallest to the largest has to be visible). */
function medidaFila(m?: { largo: number; masa?: number }): string {
  if (!m) return '';
  const largo = `${m.largo.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
  return m.masa != null ? `${largo} · ${Math.round(m.masa).toLocaleString('es-ES')} kg` : largo;
}

/**
 * The list view of the garage, in the side panel and in the «Garaje» panel of the 3D view: «Mis diseños» (the first
 * row) and «Coches de referencia» (the second), each one shown or hidden.
 */
export function ListaGaraje({ g, e, actual, nombreVehiculo, referencias, alAlternarReferencia, alElegido, puedeDecidir, pie }: {
  g: Garaje; e: Eleccion; actual: DisenoAbierto | null; nombreVehiculo: string;
  /** The owner (or an admin): only they can rename, as the server checks. */
  puedeDecidir: boolean;
  /** After a design is picked in the list (the «Garaje» panel closes on a phone, where it covers the 3D). */
  alElegido?: () => void;
  /** In the catalogue's order (from the smallest to the largest), with their kerb mass when it is known. */
  referencias: { id: string; nombre: string; largo: number; masa?: number; visible: boolean }[];
  alAlternarReferencia: (id: string) => void;
  pie?: ReactNode;
}) {
  const lista = g.lista;
  const [editando, setEditando] = useState<number | null>(null);
  const propioFuera = !actual || (lista != null && !lista.some(d => d.id === actual.id));
  const fila = 'flex items-center gap-1 rounded-lg border px-1';
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-1.5">
        <p className="flex items-baseline justify-between text-xs font-semibold text-slate-600">
          Mis diseños<span className="text-[11px] font-normal text-slate-400">primera fila, de menor a mayor{lista ? ` · ${lista.length - g.ocultos.filter(id => lista.some(d => d.id === id)).length + (propioFuera ? 1 : 0)} a la vista` : ''}</span>
        </p>
        {g.error && (
          <p className="text-xs text-red-700">{g.error} <Button variant="ghost" onClick={g.cargar} className="px-1 py-0 text-xs normal-case tracking-normal underline">Reintentar</Button></p>
        )}
        {!lista && !g.error && <p className="text-xs text-slate-400">Cargando los diseños…</p>}
        <ul className="flex flex-col gap-1">
          {propioFuera && (
            <li className={cn(fila, 'border-teal-600 bg-teal-50')}>
              <span className="min-w-0 flex-1 px-1.5 py-1.5 text-[13px] font-medium text-teal-900">
                <span className="block truncate">{actual?.nombre ?? 'Sin guardar'}</span>
                <span className="block truncate text-[11px] font-normal text-teal-700">{nombreVehiculo} · el que editas</span>
              </span>
            </li>
          )}
          {lista?.map(d => {
            const esActivo = d.id === actual?.id, oculto = !esActivo && g.ocultos.includes(d.id);
            if (editando === d.id) return (
              <li key={d.id} className={cn(fila, 'border-teal-600 p-1.5')}>
                <FormNombre inicial={d.nombre} className="min-w-0 flex-1" alCancelar={() => setEditando(null)} alGuardar={async n => { await e.renombrar(d.id, n); setEditando(null); }} />
              </li>
            );
            return (
              <li key={d.id} className={cn(fila, esActivo ? 'border-teal-600 bg-teal-50' : 'border-slate-200')}>
                <Button variant="ghost" onClick={() => { void e.elegir(d); alElegido?.(); }} disabled={!!e.ocupado} aria-current={esActivo || undefined}
                  title={esActivo ? 'Es el que editas' : `Abrir «${d.nombre}» para editarlo`}
                  className="min-w-0 flex-1 flex-col items-start justify-start gap-0 px-1.5 py-1.5 text-left normal-case tracking-normal">
                  <span className={cn('block w-full truncate text-[13px] font-medium', esActivo ? 'text-teal-900' : oculto ? 'text-slate-400' : 'text-slate-800')}>{d.nombre}</span>
                  <span className={cn('block w-full truncate text-[11px] font-normal', esActivo ? 'text-teal-700' : 'text-slate-400')}>{[medidaFila(g.medidas[d.id]), familiaGuardada(d), esActivo ? 'el que editas' : ''].filter(t => t && t !== d.nombre).join(' · ') || '\u00a0'}</span>
                </Button>
                {puedeDecidir && (
                  <Button variant="ghost" onClick={() => setEditando(d.id)} aria-label={`Cambiar el nombre de «${d.nombre}»`} title="Cambiar nombre"
                    className="h-9 w-9 shrink-0 p-0 text-slate-500"><Pencil className="h-4 w-4" /></Button>
                )}
                {!esActivo && (
                  <Button variant="ghost" aria-pressed={!oculto} onClick={() => g.alternarOculto(d.id)}
                    aria-label={oculto ? `Mostrar «${d.nombre}» en el 3D` : `Ocultar «${d.nombre}» en el 3D`} title={oculto ? 'Mostrar en el 3D' : 'Ocultar en el 3D'}
                    className="h-9 w-9 shrink-0 p-0 text-slate-500">
                    {oculto ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        {lista && lista.length === 0 && <p className="text-xs text-slate-400">Aún no hay diseños guardados.</p>}
      </div>
      <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-2.5">
        <p className="flex items-baseline justify-between text-xs font-semibold text-slate-600">
          Coches de referencia<span className="text-[11px] font-normal text-slate-400">segunda fila, de menor a mayor</span>
        </p>
        <div className="flex flex-col gap-1">
          {referencias.map(v => (
            <Button key={v.id} variant="outline" aria-pressed={v.visible} onClick={() => alAlternarReferencia(v.id)}
              className={cn('justify-between gap-2 px-2.5 py-1.5 text-left text-[13px] font-medium normal-case tracking-normal', !v.visible && 'border-dashed text-slate-400')}>
              <span className="flex min-w-0 items-center gap-1.5">{v.visible ? <Eye className="h-3.5 w-3.5 shrink-0 text-slate-500" /> : <EyeOff className="h-3.5 w-3.5 shrink-0" />}<span className="truncate">{v.nombre}</span></span>
              <span className="shrink-0 text-[11px] font-normal tabular-nums text-slate-400">{medidaFila(v)}</span>
            </Button>
          ))}
        </div>
      </div>
      {g.movidos.length > 0 && (
        <Button variant="outline" onClick={() => g.aFila()} className="gap-1.5 px-2.5 py-1.5 text-xs normal-case tracking-normal">
          <Rows3 className="h-3.5 w-3.5" />Volver a colocar en fila ({g.movidos.length} {g.movidos.length === 1 ? 'coche movido' : 'coches movidos'})
        </Button>
      )}
      <p className="text-[11px] leading-snug text-slate-500">
        En el 3D, tus diseños están en la primera fila y los coches de referencia en la segunda, detrás; las dos van del más corto al más largo (y, si miden lo mismo, del más ligero al más pesado), en el orden de esta lista. Tus diseños se miden como están guardados.
        Pincha uno de tus diseños (aquí o en el 3D) para editarlo: pasa al centro y sus departamentos y deslizadores salen en el panel.
        Pincha un coche de referencia para ver su ficha. Para mover un coche, púlsalo y arrástralo: se queda donde lo sueltes, en este navegador.
        El que editas se queda en el centro.
      </p>
      {pie}
    </div>
  );
}
