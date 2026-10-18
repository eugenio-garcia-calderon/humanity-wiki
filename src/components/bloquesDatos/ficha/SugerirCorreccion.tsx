import { useState } from 'react';
import { Loader2, PencilLine } from 'lucide-react';
import { Button } from '../../ui/core';
import { cn } from '../../../utils/cn';

// «SUGERIR UNA CORRECCIÓN» (W1, evaluator round 1). «Cómo trabajamos» promises
// that anyone can suggest a correction from the sheet; until now no sheet had
// the control. It reuses the moderation queue that already exists
// (`POST /api/report` → `content_reports`, reviewed in the reports screen at
// level 3) instead of a new table: the reason starts with «Corrección
// sugerida» so the reviewer tells it apart from a complaint.
//
// The session is checked on the click, not on load: one request per reader
// who wants to correct something, none per page view, and nothing that
// changes the page's height while it loads.

const PREFIJO = 'Corrección sugerida';

export default function SugerirCorreccion({ paginaId }: { paginaId: string }) {
  const [estado, setEstado] = useState<'cerrado' | 'comprobando' | 'sinSesion' | 'abierto' | 'enviando' | 'hecho'>('cerrado');
  const [texto, setTexto] = useState('');
  const [fallo, setFallo] = useState<string | null>(null);

  // No session check up front: `/api/auth/me` does not see a site member
  // (`miembros.ts`, RUTAS_DE_MIEMBRO), so it would turn away exactly the
  // people a site's «Entrar» signs in. The send answers 401 instead.
  const abrir = () => setEstado('abierto');

  const enviar = async () => {
    const t = texto.trim();
    if (t.length < 10) { setFallo('Cuéntanos qué dato está mal y, si puedes, de dónde sale el correcto.'); return; }
    setFallo(null);
    setEstado('enviando');
    try {
      const r = await fetch('/api/report', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_type: 'knowledge_windows', entity_id: paginaId, reason: `${PREFIJO}: ${t.slice(0, 2000)}` }),
      });
      const j = await r.json().catch(() => ({}));
      // Keep what they wrote: signing in reloads nothing here, they can send again.
      if (r.status === 401) { setEstado('abierto'); setFallo('Para enviarla tienes que entrar con tu cuenta. Tu texto se queda aquí.'); return; }
      if (!r.ok) throw new Error(j.error || 'No se ha podido enviar.');
      setEstado('hecho');
    } catch (e: any) {
      setFallo(e.message);
      setEstado('abierto');
    }
  };

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4" aria-label="Sugerir una corrección">
      {estado === 'cerrado' || estado === 'comprobando' ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">¿Algún dato está mal o ha cambiado?</p>
          <Button variant="outline" onClick={abrir} disabled={estado === 'comprobando'} className="min-h-[44px] gap-2 normal-case tracking-normal text-sm">
            {estado === 'comprobando' ? <Loader2 className="h-4 w-4 animate-spin" /> : <PencilLine className="h-4 w-4" />}
            Sugerir una corrección
          </Button>
        </div>
      ) : estado === 'sinSesion' ? (
        <p className="text-sm text-slate-600">
          Para sugerir una corrección, entra con tu cuenta. Así podemos preguntarte de dónde sale el dato si hace falta.
        </p>
      ) : estado === 'hecho' ? (
        <p className="text-sm text-slate-700">
          <strong>Gracias, ya está enviada.</strong> La revisa una persona antes de cambiar nada en la ficha.
        </p>
      ) : (
        <div className="space-y-2">
          <label htmlFor={`correccion-${paginaId}`} className="block text-sm font-bold text-slate-800">Sugerir una corrección</label>
          <textarea id={`correccion-${paginaId}`} value={texto} onChange={e => setTexto(e.target.value)} rows={4} maxLength={2000}
            placeholder="Qué dato está mal, cuál es el correcto y dónde lo has visto (un enlace a la ficha técnica, por ejemplo)."
            className="w-full rounded-lg border border-slate-200 p-3 text-base text-slate-800 focus:border-sky-400 focus:outline-none" />
          {fallo && <p role="alert" className="text-sm text-rose-700">{fallo}</p>}
          <div className="flex flex-wrap gap-2">
            <Button onClick={enviar} disabled={estado === 'enviando'} className={cn('min-h-[44px] gap-2 normal-case tracking-normal text-sm')}>
              {estado === 'enviando' && <Loader2 className="h-4 w-4 animate-spin" />} Enviar
            </Button>
            <Button variant="ghost" onClick={() => setEstado('cerrado')} className="min-h-[44px] normal-case tracking-normal text-sm">Cancelar</Button>
          </div>
        </div>
      )}
    </section>
  );
}
