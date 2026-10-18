import type { PropsEditor } from '../tipos';
import ChatAyuda, { type DatosChat } from './Lectura';

/** El chat en el editor: sus tres ajustes y, debajo, la bandeja de verdad
 *  (quien edita la página es del equipo, así que atiende desde aquí). */
export default function EditorChat({ bloque, datos, paginaId, editable, cambiarDatos }: PropsEditor) {
  const d = datos as DatosChat;
  return (
    <div className="space-y-3">
      {editable && (
        <div className="grid gap-2 rounded-xl border border-dashed border-slate-200 p-3 text-sm sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Título que ve el visitante</span>
            <input value={d.titulo || ''} maxLength={80} placeholder="¿Tienes una duda?"
              onChange={e => cambiarDatos({ titulo: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 focus:border-emerald-400 focus:outline-none" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Texto de bienvenida (opcional)</span>
            <input value={d.intro || ''} maxLength={300} placeholder="Te responde una persona, no un robot."
              onChange={e => cambiarDatos({ intro: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 focus:border-emerald-400 focus:outline-none" />
          </label>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" checked={!!d.flotante} onChange={e => cambiarDatos({ flotante: e.target.checked })} />
            <span className="text-xs text-slate-600">Burbuja flotante abajo a la derecha (en vez de ocupar su sitio en la página)</span>
          </label>
        </div>
      )}
      {/* En el editor se pinta siempre en su sitio: una burbuja flotante
          taparía el propio editor. */}
      <ChatAyuda bloque={bloque} datos={{ ...d, flotante: false }} paginaId={paginaId} />
    </div>
  );
}
