import type { PropsEditor } from '../tipos';
import ReservarExperto, { type DatosExperto } from './Lectura';

/** En el editor: el título y la entradilla del bloque, y debajo el bloque de
 *  verdad, con «Gestionar expertos» para darlos de alta sin salir de aquí. */
export default function EditorExperto({ bloque, datos, paginaId, editable, cambiarDatos }: PropsEditor) {
  const d = datos as DatosExperto;
  return (
    <div className="space-y-3">
      {editable && (
        <div className="grid gap-2 rounded-xl border border-dashed border-slate-200 p-3 text-sm sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Título</span>
            <input value={d.titulo || ''} maxLength={80} placeholder="Pide consejo a un experto"
              onChange={e => cambiarDatos({ titulo: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 focus:border-emerald-400 focus:outline-none" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Entradilla (opcional)</span>
            <input value={d.intro || ''} maxLength={300} placeholder="Para las compras grandes, una consulta con alguien que sabe."
              onChange={e => cambiarDatos({ intro: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 focus:border-emerald-400 focus:outline-none" />
          </label>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" checked={!!d.compacto} onChange={e => cambiarDatos({ compacto: e.target.checked })} />
            <span className="text-xs text-slate-600">Versión corta, para la ficha de un producto (una línea por experto; si no hay expertos, no sale)</span>
          </label>
        </div>
      )}
      <ReservarExperto bloque={bloque} datos={d} paginaId={paginaId} />
    </div>
  );
}
