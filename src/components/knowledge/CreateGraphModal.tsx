import { useState } from 'react';
import { X, Network } from 'lucide-react';

// ============================================================================
// Crear un Grafo de Conocimiento (Fase 11d) — desde el perfil o el índice.
// El centro es la FUSIÓN de dos nodos (p. ej. un territorio × un concepto):
// se pide explícitamente aquí para que cada grafo nazca con esa estructura
// técnica, no con un titular.
// ============================================================================

export default function CreateGraphModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (slug: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [leftLabel, setLeftLabel] = useState('');
  const [leftSub, setLeftSub] = useState('Territorio');
  const [rightLabel, setRightLabel] = useState('');
  const [rightSub, setRightSub] = useState('Concepto');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/graphs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          center: (leftLabel.trim() && rightLabel.trim())
            ? { left: { label: leftLabel.trim(), sublabel: leftSub.trim() }, right: { label: rightLabel.trim(), sublabel: rightSub.trim() } }
            : {},
          trigger_keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
          status: 'publicado',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo crear el grafo.');
      onCreated(json.slug);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Network className="w-4 h-4 text-emerald-600" /> Nuevo Grafo de Conocimiento
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Título del grafo *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej. Ceuta: la frontera amenazada"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300" />
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Fusión central: dos nodos que se unen</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 p-3 rounded-xl border border-emerald-200 bg-emerald-50/40">
                <input value={leftLabel} onChange={e => setLeftLabel(e.target.value)} placeholder="Ej. Ceuta"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-emerald-300" />
                <input value={leftSub} onChange={e => setLeftSub(e.target.value)} placeholder="Territorio"
                  className="w-full px-2.5 py-1 border border-slate-200 rounded-lg text-[10px] uppercase tracking-wide focus:outline-none" />
              </div>
              <div className="space-y-1.5 p-3 rounded-xl border border-red-200 bg-red-50/40">
                <input value={rightLabel} onChange={e => setRightLabel(e.target.value)} placeholder="Ej. Amenaza"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-red-300" />
                <input value={rightSub} onChange={e => setRightSub(e.target.value)} placeholder="Concepto"
                  className="w-full px-2.5 py-1 border border-slate-200 rounded-lg text-[10px] uppercase tracking-wide focus:outline-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Descripción</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="Qué explica este grafo y por qué importa."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-emerald-300" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Palabras clave (separadas por comas)</label>
            <input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="ceuta, frontera, amenaza"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300" />
            <p className="text-[10px] text-slate-400 mt-1">Con ellas el buscador/chat abrirá tu grafo directamente.</p>
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
          <button onClick={submit} disabled={saving || !title.trim()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-40 transition-colors">
            {saving ? 'Creando…' : 'Crear grafo'}
          </button>
        </div>
      </div>
    </div>
  );
}
