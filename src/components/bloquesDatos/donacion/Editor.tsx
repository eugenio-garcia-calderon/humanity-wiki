import { Plus, X } from 'lucide-react';
import type { PropsEditor } from '../tipos';
import Lectura, { type Cifra } from './Lectura';

// El editor del bloque «Donación»: lo de arriba (logo, título, cifras), los
// importes de una vez y de cada mes, y el correo para empresas. Debajo, cómo queda.
const lista = (v: unknown) => (Array.isArray(v) ? v.join(', ') : '');
const aNumeros = (t: string) => t.split(/[,;\s]+/).map(x => Number(x.replace(',', '.'))).filter(n => n > 0 && n <= 10000);

export default function Editor(p: PropsEditor) {
  const { datos, editable, cambiarDatos } = p;
  const cifras = (Array.isArray(datos.cifras) ? datos.cifras : []) as Cifra[];
  const campo = 'h-9 w-full rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50';
  const texto = (k: string, etiqueta: string, ph = '') => (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{etiqueta}</span>
      <input disabled={!editable} defaultValue={String(datos[k] ?? '')} placeholder={ph} onBlur={e => cambiarDatos({ [k]: e.target.value.trim() })} className={campo} />
    </label>
  );
  const ponCifras = (l: Cifra[]) => cambiarDatos({ cifras: l });
  return (
    <div>
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2">
        {texto('titulo', 'Título', 'Apoya nuestro trabajo')}
        {texto('logo', 'Logo (dirección de la imagen)', '/uploads/…')}
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Importes de una vez (€)</span>
          <input disabled={!editable} defaultValue={lista(datos.importes)} placeholder="10, 25, 50, 100, 250" onBlur={e => cambiarDatos({ importes: aNumeros(e.target.value) })} className={campo} />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Importes de cada mes (€)</span>
          <input disabled={!editable} defaultValue={lista(datos.importesMes)} placeholder="5, 10, 20, 50, 100" onBlur={e => cambiarDatos({ importesMes: aNumeros(e.target.value) })} className={campo} />
        </label>
        {texto('email', 'Correo para empresas y organizaciones', 'administracion@…')}
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Seleccionado al abrir</span>
          <select disabled={!editable} defaultValue={datos.frecuencia === 'mes' ? 'mes' : 'una'} onChange={e => cambiarDatos({ frecuencia: e.target.value === 'mes' ? 'mes' : 'una' })} className={campo}>
            <option value="mes">Cada mes</option><option value="una">Una vez</option>
          </select>
        </label>
        {texto('importeMes', 'Importe de partida, cada mes (€)', '25')}
        <label className="block sm:col-span-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nota bajo el botón (certificado, teléfono…)</span>
          <textarea disabled={!editable} defaultValue={String(datos.nota ?? '')} rows={2} onBlur={e => cambiarDatos({ nota: e.target.value.trim() })}
            className="w-full rounded-lg border border-slate-200 p-2 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50" />
        </label>
        <div className="sm:col-span-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cifras</span>
          {cifras.map((c, i) => (
            <div key={i} className="mt-1 flex gap-2">
              <input disabled={!editable} defaultValue={c.valor} placeholder="4.000" aria-label="Cifra"
                onBlur={e => ponCifras(cifras.map((x, k) => (k === i ? { ...x, valor: e.target.value.trim() } : x)))} className={campo + ' max-w-28'} />
              <input disabled={!editable} defaultValue={c.texto} placeholder="personas" aria-label="Qué cuenta"
                onBlur={e => ponCifras(cifras.map((x, k) => (k === i ? { ...x, texto: e.target.value.trim() } : x)))} className={campo} />
              {editable && <button type="button" aria-label="Quitar cifra" onClick={() => ponCifras(cifras.filter((_, k) => k !== i))}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>}
            </div>
          ))}
          {editable && <button type="button" onClick={() => ponCifras([...cifras, { valor: '', texto: '' }])}
            className="mt-2 inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-100"><Plus className="h-4 w-4" /> Añadir cifra</button>}
        </div>
      </div>
      <Lectura {...p} />
    </div>
  );
}
