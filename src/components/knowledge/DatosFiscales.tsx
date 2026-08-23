/**
 * DATOS FISCALES DEL VENDEDOR (2026-08-23, comercio F4). Un panel plegado en
 * Comercio: lo que el vendedor declara de sí mismo para que un día la
 * plataforma pueda emitir facturas en su nombre. Mientras tanto, sin datos
 * el comprador recibe un recibo; con ellos, el recibo enseña quién vende y un
 * desglose de IVA informativo. Nada se inventa: si falta algo, se dice.
 */
import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';

const VACIO = { nombre_fiscal: '', nif: '', direccion: '', cp: '', ciudad: '', pais: 'ES', iva_defecto: '21', serie_factura: '' };

export default function DatosFiscales() {
  const [abierto, setAbierto] = useState(false);
  const [f, setF] = useState<any>(VACIO);
  const [completos, setCompletos] = useState<boolean | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/publicar/mis-datos-fiscales', { credentials: 'include' }).then(r => r.ok ? r.json() : null).then(j => {
      if (!j) return;
      setCompletos(!!j.completos);
      if (j.datos) setF({ ...VACIO, ...Object.fromEntries(Object.entries(j.datos).map(([k, v]) => [k, v === null || v === undefined ? '' : String(v)])) });
    }).catch(() => {});
  }, []);
  async function guardar() {
    setGuardando(true); setAviso(null);
    try {
      const r = await fetch('/api/publicar/mis-datos-fiscales', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setAviso(j.error || 'No se ha podido guardar.'); return; }
      setCompletos(!!j.completos); setAviso(j.completos ? 'Guardado. Tus recibos ya enseñan tus datos y el IVA.' : 'Guardado. Faltan datos para que el recibo enseñe el desglose de IVA.');
    } catch { setAviso('No hay conexión con el servidor.'); }
    finally { setGuardando(false); }
  }
  const campo = (k: string, etiqueta: string, placeholder = '', ancho = '') => (
    <label className={`block ${ancho}`}>
      <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{etiqueta}</span>
      <input value={f[k] ?? ''} onChange={e => setF({ ...f, [k]: e.target.value })} placeholder={placeholder} className="w-full h-10 px-2.5 rounded-lg border border-slate-200 text-sm" />
    </label>
  );
  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white">
      <button type="button" onClick={() => setAbierto(v => !v)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="inline-flex items-center gap-2 text-sm font-black text-slate-800"><FileText className="w-4 h-4 text-slate-400" /> Datos fiscales</span>
        <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${completos ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
          {completos === null ? '…' : completos ? 'completos' : 'sin completar'}
        </span>
      </button>
      {abierto && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-[11px] text-slate-500">Sin estos datos tus compradores reciben un <b>recibo</b> (no fiscal). Con ellos, el recibo enseña quién vende y el IVA incluido; y el día que la plataforma pueda emitir facturas en tu nombre (lo está mirando el asesor), una factura numerada con tu serie. No se inventa nada: si falta algo, se dice.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {campo('nombre_fiscal', 'Nombre o razón social', 'Nombre que va en la factura', 'sm:col-span-2')}
            {campo('nif', 'NIF / CIF', '12345678A')}
            {campo('serie_factura', 'Serie de factura (opcional)', 'A')}
            {campo('direccion', 'Dirección fiscal', 'Calle, número', 'sm:col-span-2')}
            {campo('cp', 'Código postal', '28001')}
            {campo('ciudad', 'Ciudad', 'Madrid')}
            {campo('pais', 'País (2 letras)', 'ES')}
            <label className="block">
              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">IVA por defecto</span>
              <select value={f.iva_defecto ?? '21'} onChange={e => setF({ ...f, iva_defecto: e.target.value })} className="w-full h-10 px-2.5 rounded-lg border border-slate-200 text-sm bg-white">
                <option value="21">21 %</option><option value="10">10 %</option><option value="4">4 %</option><option value="0">0 %</option>
              </select>
            </label>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button type="button" onClick={guardar} disabled={guardando} className="h-10 px-4 rounded-xl bg-slate-900 text-white text-xs font-black disabled:opacity-50">{guardando ? 'Guardando…' : 'Guardar'}</button>
            {aviso && <p className="text-xs font-bold text-slate-600">{aviso}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
