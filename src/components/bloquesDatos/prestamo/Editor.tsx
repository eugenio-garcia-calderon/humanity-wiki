import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Download, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import type { PropsEditor } from '../tipos';
import Lectura from './Lectura';
import { limpiarConfig, faltaParaAbrir, euros, porcentaje, ibanValido, normalizarIban } from './contrato';
import { cn } from '../../../utils/cn';

// The editor of «Formalizar préstamo»: the loan's terms (what the contract says), whether
// it takes signatures, and — for whoever manages the page — the loans already signed.
// Below, the block as visitors see it.

const CAMPO = 'h-9 w-full rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50';
const ETIQUETA = 'text-[11px] font-bold uppercase tracking-wider text-slate-500';
const ESTADOS: Array<[string, string]> = [
  ['recibido', 'Recibido (falta comprobar)'], ['verificado', 'Dinero comprobado'], ['devuelto', 'Devuelto'], ['incidencia', 'Incidencia'], ['anulado', 'Anulado'],
];

type Firmado = {
  id: string; nombre: string | null; documento: string | null; email: string | null; telefono: string | null;
  importe: number; interes: number; plazo_meses: number; estado: string; firmado_at: string;
  copia_prestamista_at: string | null; aviso_admin_at: string | null; borrado_at: string | null; hay_justificante: boolean;
};

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="mb-1 text-sm font-black text-slate-800">{titulo}</legend>
      {children}
    </fieldset>
  );
}

/** The signed loans of this page. Only shows for whoever manages it (the server decides). */
function Recibidos({ paginaId }: { paginaId: string }) {
  const [lista, setLista] = useState<Firmado[] | null>(null);
  const [visible, setVisible] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [aBorrar, setABorrar] = useState<string | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true); setFallo(null);
    try {
      const r = await fetch(`/api/prestamo/${encodeURIComponent(paginaId)}/lista`, { credentials: 'same-origin' });
      if (r.status === 401 || r.status === 403) { setVisible(false); return; }
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setFallo(j.error || 'No se han podido leer los préstamos.'); return; }
      setLista(j.prestamos || []);
    } catch { setFallo('Sin conexión.'); } finally { setCargando(false); }
  }, [paginaId]);
  useEffect(() => { cargar(); }, [cargar]);

  const estado = async (id: string, e: string) => {
    setLista(l => l?.map(x => (x.id === id ? { ...x, estado: e } : x)) || null);
    const r = await fetch(`/api/prestamo/${encodeURIComponent(id)}/estado`, { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: e }) }).catch(() => null);
    if (!r?.ok) { setFallo('No se ha podido cambiar el estado.'); cargar(); }
  };
  const borrar = async (id: string) => {
    setABorrar(null);
    const r = await fetch(`/api/prestamo/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' }).catch(() => null);
    if (!r?.ok) setFallo('No se han podido borrar los datos.');
    cargar();
  };

  if (!visible) return null;
  const vivos = (lista || []).filter(x => x.estado !== 'anulado');
  const total = vivos.reduce((s, x) => s + Number(x.importe || 0), 0);
  const comprobado = vivos.filter(x => x.estado === 'verificado' || x.estado === 'devuelto').reduce((s, x) => s + Number(x.importe || 0), 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-black text-slate-800">Préstamos firmados{lista ? ` · ${lista.length}` : ''}</p>
          {!!lista?.length && <p className="text-xs text-slate-500">{euros(total)} firmados · {euros(comprobado)} con el dinero comprobado</p>}
        </div>
        <button type="button" onClick={cargar} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-100">
          {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Actualizar
        </button>
      </div>
      {fallo && <p className="mt-2 text-sm text-rose-700">{fallo}</p>}
      {lista && !lista.length && <p className="mt-2 text-sm text-slate-500">Todavía nadie ha firmado. Cada firma llega también por correo, con el contrato y el justificante.</p>}
      {!!lista?.length && (
        <ul className="mt-3 divide-y divide-slate-100">
          {lista.map(x => (
            <li key={x.id} className="py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  {x.borrado_at ? <p className="text-sm text-slate-400">Datos borrados</p> : (
                    <>
                      <p className="text-sm font-bold text-slate-900">{x.nombre}</p>
                      <p className="break-all text-xs text-slate-500">{x.documento} · {x.email} · {x.telefono}</p>
                      {!x.copia_prestamista_at && <p className="text-xs font-semibold text-amber-700">No le llegó la copia por correo</p>}
                    </>
                  )}
                  <p className="mt-0.5 text-sm text-slate-800">
                    <strong>{euros(Number(x.importe))}</strong> · {porcentaje(Number(x.interes))} · {x.plazo_meses} meses
                    <span className="text-slate-400"> · {new Date(x.firmado_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </p>
                </div>
                <select value={x.estado} onChange={e => estado(x.id, e.target.value)} aria-label="Estado del préstamo" className={cn(CAMPO, 'h-8 w-auto')}>
                  {ESTADOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select>
              </div>
              {!x.borrado_at && (
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
                  <a href={`/api/prestamo/archivo/${x.id}/pdf`} className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:underline"><Download className="h-3.5 w-3.5" /> Contrato</a>
                  {x.hay_justificante && <a href={`/api/prestamo/archivo/${x.id}/justificante`} className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:underline"><Download className="h-3.5 w-3.5" /> Justificante</a>}
                  {aBorrar !== x.id && (
                    <button type="button" onClick={() => setABorrar(x.id)} className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg px-2 font-semibold text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                      <Trash2 className="h-3.5 w-3.5" /> Borrar sus datos
                    </button>
                  )}
                </div>
              )}
              {aBorrar === x.id && (
                <div className="mt-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-900">
                  Se borran su nombre, sus datos, su firma, el contrato y el justificante. Quedan el importe y la huella del texto. No se puede deshacer.
                  <span className="mt-2 flex gap-2">
                    <button type="button" onClick={() => setABorrar(null)} className="h-8 rounded-lg px-3 font-semibold text-slate-700 hover:bg-white">Cancelar</button>
                    <button type="button" onClick={() => borrar(x.id)} className="h-8 rounded-lg bg-rose-600 px-3 font-semibold text-white hover:bg-rose-700">Borrar sus datos</button>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Editor(p: PropsEditor) {
  const { datos, editable, cambiarDatos, paginaId } = p;
  const cfg = limpiarConfig(datos);
  const falta = faltaParaAbrir(cfg);
  const ibanEscrito = String(datos.iban ?? '');

  const texto = (k: string, etiqueta: string, ph = '', ancho = false) => (
    <label className={cn('block', ancho && 'sm:col-span-2')}>
      <span className={ETIQUETA}>{etiqueta}</span>
      <input disabled={!editable} defaultValue={String(datos[k] ?? '')} placeholder={ph} onBlur={e => cambiarDatos({ [k]: e.target.value.trim() })} className={CAMPO} />
    </label>
  );
  const largo = (k: string, etiqueta: string, ph = '') => (
    <label className="block sm:col-span-2">
      <span className={ETIQUETA}>{etiqueta}</span>
      <textarea disabled={!editable} defaultValue={String(datos[k] ?? '')} placeholder={ph} rows={2} onBlur={e => cambiarDatos({ [k]: e.target.value.trim() })}
        className="w-full rounded-lg border border-slate-200 p-2 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50" />
    </label>
  );
  const numero = (k: string, etiqueta: string) => (
    <label className="block">
      <span className={ETIQUETA}>{etiqueta}</span>
      <input disabled={!editable} inputMode="numeric" defaultValue={String((cfg as any)[k])} onBlur={e => { const n = Number(e.target.value.replace(/\./g, '').replace(',', '.')); if (Number.isFinite(n)) cambiarDatos({ [k]: n }); }} className={CAMPO} />
    </label>
  );

  return (
    <div className="space-y-4">
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        {/* Open or closed: the one switch that matters, and why it may not be enough. */}
        <div className={cn('flex flex-wrap items-start justify-between gap-3 rounded-xl p-3', cfg.abierto && !falta ? 'bg-emerald-50' : 'bg-white')}>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" disabled={!editable} checked={cfg.abierto} onChange={e => cambiarDatos({ abierto: e.target.checked })} className="mt-0.5 h-5 w-5 accent-slate-900" />
            <span>
              <span className="block text-sm font-black text-slate-900">Abierto: acepta préstamos</span>
              <span className="block text-xs text-slate-600">
                {!cfg.abierto ? 'Cerrado: quien visita ve «Este préstamo se abrirá pronto».'
                  : falta ? 'Marcado como abierto, pero quien visita sigue viendo «se abrirá pronto» hasta completar lo que falta.'
                  : 'Abierto: quien visita ve el botón «Realizar préstamo».'}
              </span>
            </span>
          </label>
          {falta ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800"><AlertTriangle className="h-4 w-4" /> {falta}</span>
            : <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4" /> Listo para abrir</span>}
        </div>

        <Grupo titulo="La entidad que recibe el préstamo">
          {texto('entidad', 'Nombre', 'Asociación…', true)}
          {texto('entidadNif', 'NIF / CIF', 'G00000000')}
          {texto('representante', 'Firma en su nombre (persona y cargo)', 'Nombre Apellido, presidenta')}
          {texto('entidadDomicilio', 'Domicilio', 'Calle, número, CP, localidad', true)}
          {texto('titularCuenta', 'Titular de la cuenta', 'Igual que la entidad')}
          <label className="block">
            <span className={ETIQUETA}>IBAN donde se transfiere (público)</span>
            <input disabled={!editable} defaultValue={ibanEscrito} placeholder="ES00 0000 0000 0000 0000 0000" onBlur={e => cambiarDatos({ iban: normalizarIban(e.target.value) })} className={CAMPO} />
            {ibanEscrito && !ibanValido(normalizarIban(ibanEscrito)) && <span className="text-xs text-rose-700">Este IBAN no es válido (el control no cuadra).</span>}
          </label>
          {texto('correoEntidad', 'Correo de la entidad (público; recibe copia de cada firma)', 'contacto@entidad.org')}
        </Grupo>

        <Grupo titulo="Las condiciones">
          {largo('destino', 'Para qué es el dinero (sale en el contrato)', 'Financiar la vivienda de acogida para personas sin hogar en Lepe (Huelva)…')}
          {largo('subvencion', 'Subvención que adelanta (vacío: sin cláusula de subvención)', 'Una subvención de la Unión Europea concedida a la entidad para…')}
          <label className="block">
            <span className={ETIQUETA}>Intereses que se pueden elegir (% anual)</span>
            <input disabled={!editable} defaultValue={cfg.intereses.join(', ').replace(/\./g, ',')} placeholder="0; 2,5"
              onBlur={e => cambiarDatos({ intereses: e.target.value.split(/[;\s]+|,\s+/).map(x => Number(x.replace(',', '.'))).filter(n => Number.isFinite(n) && n >= 0 && n <= 20) })} className={CAMPO} />
            <span className="text-xs text-slate-500">Separados por punto y coma: «0; 2,5».</span>
          </label>
          {numero('anticipadaDesde', 'Puede devolver antes desde el mes')}
          {numero('plazoMin', 'Duración mínima (meses)')}
          {numero('plazoMax', 'Duración máxima (meses)')}
          {numero('importeMin', 'Importe mínimo (€)')}
          {numero('importeMax', 'Importe máximo (€)')}
        </Grupo>

        <Grupo titulo="Supervisión y avisos">
          {texto('supervisor', 'Supervisa', cfg.supervisor, true)}
          {texto('supervisorNif', 'NIF de quien supervisa', cfg.supervisorNif)}
          {texto('supervisorDomicilio', 'Domicilio de quien supervisa', cfg.supervisorDomicilio)}
          {texto('avisar', 'Correo de administración (copia de cada firma)', 'administracion@…')}
          {texto('contacto', 'Contacto para dudas (sale a quien presta)', 'correo o teléfono')}
        </Grupo>
        <p className="text-xs text-slate-500">Cambiar las condiciones solo afecta a las firmas que lleguen después: cada préstamo firmado guarda su propio texto y su huella.</p>
      </div>

      {paginaId && <Recibidos paginaId={paginaId} />}
      <Lectura {...p} />
    </div>
  );
}
