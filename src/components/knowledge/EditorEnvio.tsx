/**
 * TARIFAS DE ENVÍO POR ZONA Y RECOGIDA EN PERSONA (2026-08-24, comercio F8).
 *
 * Una fila por zona: si la dejas vacía, no envías ahí — y quien viva ahí lo
 * sabrá ANTES de pagar, no al final. Se dice con esas palabras porque «vacío»
 * suele leerse como «gratis», y aquí significa lo contrario.
 */
import { useEffect, useState } from 'react';
import { Truck, MapPin } from 'lucide-react';

type Tarifa = { zona: string; centimos: string; gratis: string };

const aCent = (t: string) => { const n = Number(String(t).replace(',', '.')); return String(t).trim() === '' || !Number.isFinite(n) ? null : Math.round(n * 100); };
const aEuros = (c: number | null | undefined) => c === null || c === undefined ? '' : (c / 100).toFixed(2).replace('.', ',');

export default function EditorEnvio({ productoId, onGuardado }: { productoId: string; onGuardado?: () => void }) {
  const [zonas, setZonas] = useState<{ id: string; nombre: string; ayuda: string }[]>([]);
  const [tarifas, setTarifas] = useState<Record<string, Tarifa>>({});
  const [recogida, setRecogida] = useState(false);
  const [donde, setDonde] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/publicar/mis-productos/${encodeURIComponent(productoId)}/envio`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null).then(j => {
        if (!j) return;
        setZonas(j.zonas || []);
        const m: Record<string, Tarifa> = {};
        for (const z of j.zonas || []) {
          const t = (j.tarifas || []).find((x: any) => x.zona === z.id);
          m[z.id] = { zona: z.id, centimos: aEuros(t?.centimos), gratis: aEuros(t?.gratis_desde_centimos) };
        }
        setTarifas(m);
        setRecogida(!!j.recogida_en_persona);
        setDonde(j.recogida_donde || '');
      }).catch(() => {});
  }, [productoId]);

  async function guardar() {
    setGuardando(true); setAviso(null);
    const lista = Object.values(tarifas).filter(t => aCent(t.centimos) !== null)
      .map(t => ({ zona: t.zona, centimos: aCent(t.centimos), gratis_desde_centimos: aCent(t.gratis) }));
    try {
      const r = await fetch(`/api/publicar/mis-productos/${encodeURIComponent(productoId)}/envio`, {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tarifas: lista, recogida_en_persona: recogida, recogida_donde: donde.trim() || null }),
      });
      const j = await r.json().catch(() => ({}));
      setAviso(r.ok
        ? (lista.length === 0 && !recogida
            ? 'Guardado. Ahora mismo no envías a ninguna zona: nadie podrá comprarlo para recibirlo.'
            : `Guardado: envías a ${lista.length} zona${lista.length === 1 ? '' : 's'}${recogida ? ' y admites recogida en persona' : ''}.`)
        : (j.error || 'No se ha podido guardar.'));
      if (r.ok) onGuardado?.();
    } catch { setAviso('No hay conexión con el servidor.'); }
    finally { setGuardando(false); }
  }

  const campo = (z: string, k: 'centimos' | 'gratis', ph: string) => (
    <input value={tarifas[z]?.[k] ?? ''} inputMode="decimal" placeholder={ph}
      onChange={e => setTarifas({ ...tarifas, [z]: { ...(tarifas[z] || { zona: z, centimos: '', gratis: '' }), [k]: e.target.value.replace(/[^\d,.]/g, '') } })}
      className="w-24 h-9 px-2 rounded-lg border border-slate-200 text-sm" aria-label={`${k === 'centimos' ? 'Porte' : 'Gratis desde'} en ${z}`} />
  );

  return (
    <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 inline-flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> A dónde envías y por cuánto</p>
      <div className="space-y-1.5">
        {zonas.map(z => (
          <div key={z.id} className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-700 flex-1 min-w-[9rem]">{z.nombre} <span className="text-slate-400">· {z.ayuda}</span></span>
            {campo(z.id, 'centimos', 'porte €')}
            {campo(z.id, 'gratis', 'gratis desde €')}
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-slate-400">Zona en blanco = <b>no envías ahí</b> (se lo decimos a quien lo intente, antes de pagar). «Gratis desde» es opcional.</p>
      <label className="mt-3 flex items-start gap-2 cursor-pointer">
        <input type="checkbox" checked={recogida} onChange={e => setRecogida(e.target.checked)} className="mt-1" />
        <span className="text-xs text-slate-700"><b className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Se puede recoger en persona</b> — sin gastos de envío y sin pedir dirección.</span>
      </label>
      {recogida && (
        <input value={donde} onChange={e => setDonde(e.target.value)} placeholder="¿Dónde y cuándo? (ej. «En el mercado de Bierzo, sábados por la mañana»)"
          className="mt-1.5 w-full h-10 px-3 rounded-lg border border-slate-200 text-sm" aria-label="Dónde se recoge" />
      )}
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <button type="button" onClick={guardar} disabled={guardando} className="h-9 px-3 rounded-lg bg-slate-900 text-white text-xs font-black disabled:opacity-50">{guardando ? 'Guardando…' : 'Guardar envíos'}</button>
        {aviso && <span className="text-xs font-bold text-slate-600">{aviso}</span>}
      </div>
    </div>
  );
}
