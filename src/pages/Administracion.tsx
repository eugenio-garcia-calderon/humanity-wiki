/**
 * ADMINISTRACIÓN — LAS CIFRAS DEL DINERO (2026-08-24, prog7)
 * ============================================================================
 * Eugenio: «créame en Administración una página que me permita saber todas las
 * variables económicas de la plataforma y ajustarlas desde ese dashboard, y
 * que cuando la modifique de ahí se cambie en todos los lugares».
 *
 * Cada cifra dice tres cosas que no estaban en ningún sitio: cuánto vale hoy,
 * DE DÓNDE sale ese valor (del panel, de una variable del servidor, o del
 * valor por defecto del código) y qué pasa si se cambia. Debajo, el historial:
 * quién cambió qué, cuándo y por qué.
 *
 * La página no sabe qué cifras existen: las pide al servidor. Añadir una cifra
 * nueva es añadirla a `src/server/ajustes.ts` y aparece aquí sola.
 */
import { useEffect, useState } from 'react';
import { SlidersHorizontal, Save, History, AlertTriangle } from 'lucide-react';
import { useAuth, ROLE } from '../contexts/AuthContext';

const comoSeVe = (c: any) => {
  const n = Number(c.valor);
  if (c.tipo === 'bps') return `${(n / 100).toLocaleString('es-ES', { maximumFractionDigits: 2 })} %`;
  if (c.tipo === 'dias') return `${n} día${n === 1 ? '' : 's'}`;
  if (c.tipo === 'meses') return `${n} mes${n === 1 ? '' : 'es'}`;
  if (c.tipo === 'anios') return `${n} año${n === 1 ? '' : 's'}`;
  return n.toLocaleString('es-ES', { maximumFractionDigits: 4 });
};

const ORIGEN: Record<string, { texto: string; clase: string }> = {
  panel: { texto: 'ajustado aquí', clase: 'bg-emerald-100 text-emerald-800' },
  servidor: { texto: 'variable del servidor', clase: 'bg-sky-100 text-sky-800' },
  'por defecto': { texto: 'valor por defecto', clase: 'bg-slate-100 text-slate-500' },
};

export default function Administracion() {
  const { user } = useAuth();
  const esAdmin = (user?.roleLevel ?? 0) >= ROLE.ADMIN;
  const [datos, setDatos] = useState<any>(null);
  const [borrador, setBorrador] = useState<Record<string, string>>({});
  const [motivo, setMotivo] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ clave: string; texto: string; ok: boolean } | null>(null);

  const cargar = () => {
    fetch('/api/admin/economia', { credentials: 'include' })
      .then(r => r.json()).then(j => { if (!j.error) setDatos(j); }).catch(() => {});
  };
  useEffect(() => { if (esAdmin) cargar(); }, [esAdmin]);

  if (!esAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-slate-400">Esta página es solo para administradores.</p>
      </div>
    );
  }

  async function guardar(c: any) {
    const valor = (borrador[c.clave] ?? c.valor).trim();
    if (valor === String(c.valor)) return;
    setGuardando(c.clave); setAviso(null);
    try {
      const r = await fetch('/api/admin/economia', {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave: c.clave, valor, motivo: motivo[c.clave] || undefined }),
      });
      const j = await r.json().catch(() => ({}));
      setAviso({ clave: c.clave, texto: r.ok ? 'Guardado. Ya rige en toda la plataforma.' : (j.error || 'No se ha podido guardar.'), ok: r.ok });
      if (r.ok) {
        setBorrador(b => { const n = { ...b }; delete n[c.clave]; return n; });
        setMotivo(m => { const n = { ...m }; delete n[c.clave]; return n; });
        cargar();
      }
    } catch { setAviso({ clave: c.clave, texto: 'No hay conexión con el servidor.', ok: false }); }
    finally { setGuardando(null); }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 inline-flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5" /> Administración
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Las cifras del dinero</h1>
        <p className="mt-2 text-sm text-slate-500">
          Todo lo económico de la plataforma, en un solo sitio. Lo que cambies aquí rige en toda la
          plataforma en menos de un minuto, y queda con tu nombre, la fecha y el motivo.
        </p>
      </div>

      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-900 leading-relaxed">
          Esto es dinero de verdad. Un cambio afecta a las compras <b>desde el momento en que lo guardas</b>,
          no a las anteriores. Dos avisos: la <b>comisión</b> y los <b>plazos de liquidación</b> están escritos en el
          contrato que firman las tiendas — si los cambias, hay que publicar una versión nueva y avisar con treinta
          días. Y subir los <b>puntos por euro</b> cambia el poder de compra de todo el saldo que ya existe.
        </p>
      </div>

      {!datos ? <p className="text-sm text-slate-400">Cargando…</p> : (
        <>
          {datos.grupos.map((g: string) => (
            <section key={g} className="space-y-2">
              <h2 className="text-lg font-black text-slate-900">{g}</h2>
              <div className="space-y-2">
                {datos.cifras.filter((c: any) => c.grupo === g).map((c: any) => {
                  const cambiado = (borrador[c.clave] ?? c.valor) !== String(c.valor);
                  return (
                    <div key={c.clave} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-slate-900">
                            {c.nombre} <span className="ml-1.5 text-base text-emerald-700">{comoSeVe(c)}</span>
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{c.ayuda}</p>
                          <p className="mt-1 inline-flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wide ${ORIGEN[c.origen]?.clase || ''}`}>
                              {ORIGEN[c.origen]?.texto || c.origen}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">{c.clave}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            value={borrador[c.clave] ?? c.valor}
                            onChange={e => setBorrador(b => ({ ...b, [c.clave]: e.target.value.replace(/[^\d.,-]/g, '') }))}
                            inputMode="decimal" aria-label={c.nombre}
                            className="w-28 h-10 px-2.5 rounded-lg border border-slate-300 text-sm text-right tabular-nums" />
                          <button type="button" onClick={() => guardar(c)} disabled={!cambiado || guardando === c.clave}
                            className="h-10 px-3 rounded-lg bg-slate-900 text-white text-xs font-black disabled:opacity-30 inline-flex items-center gap-1.5">
                            <Save className="w-3.5 h-3.5" /> {guardando === c.clave ? '…' : 'Guardar'}
                          </button>
                        </div>
                      </div>
                      {cambiado && (
                        <input value={motivo[c.clave] ?? ''} onChange={e => setMotivo(m => ({ ...m, [c.clave]: e.target.value }))}
                          placeholder="¿Por qué lo cambias? (queda en el historial)"
                          className="mt-2 w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs" />
                      )}
                      {aviso?.clave === c.clave && (
                        <p className={`mt-1.5 text-xs font-bold ${aviso.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{aviso.texto}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <section className="space-y-2">
            <h2 className="text-lg font-black text-slate-900 inline-flex items-center gap-2"><History className="w-4 h-4 text-slate-400" /> Qué se ha cambiado</h2>
            {datos.historial.length === 0 ? (
              <p className="text-sm text-slate-400">Todavía no se ha cambiado nada desde aquí.</p>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
                {datos.historial.map((h: any, i: number) => (
                  <div key={i} className="p-3 text-xs">
                    <p className="text-slate-700">
                      <span className="font-mono text-slate-500">{h.clave}</span>{' '}
                      <b>{h.valor_antes ?? '—'} → {h.valor_nuevo}</b>
                      {h.quien && <span className="text-slate-400"> · {h.quien}</span>}
                      <span className="text-slate-400"> · {new Date(h.created_at).toLocaleString('es-ES')}</span>
                    </p>
                    {h.motivo && <p className="text-slate-500 mt-0.5">«{h.motivo}»</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
