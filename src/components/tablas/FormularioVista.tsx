import { useEffect, useState } from 'react';
import { Check, Copy, Loader2, ArrowUp, ArrowDown, X, Plus, Link2, RefreshCw, ClipboardList, Star } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Columna } from './Celda';
import type { Vista } from './vistaUtil';

// ============================================================================
// TABLAS · LA VISTA FORMULARIO (2026-10-06, carril «bd»)
// ============================================================================
// Una base de datos con un formulario público: quien tiene el enlace —o lee la
// página donde está incrustado— rellena unos campos y su respuesta ES una fila.
// Aquí viven las dos mitades:
//
//   · `FormularioEnvio`  lo que ve QUIEN RESPONDE (también en `/formulario/:token`)
//   · `FormularioVista`  la vista dentro de la base de datos: para quien edita,
//                        el editor (campos elegidos y ordenados, obligatorios,
//                        textos de ayuda, página de gracias, enlace); para
//                        quien lee una página publicada, el formulario.
//
// Qué se acepta y qué no lo decide el servidor (`bd/formularios.ts`); esta
// interfaz solo ofrece lo que el servidor va a aceptar.

const TIPOS_OK = new Set(['texto', 'texto_largo', 'numero', 'fecha', 'seleccion', 'seleccion_multiple', 'casilla', 'url', 'email', 'telefono', 'moneda', 'porcentaje', 'duracion', 'valoracion']);
const entrada = 'w-full min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50';

type CampoDef = {
  columna_id: string; nombre: string; tipo: string; opciones: Array<{ id: string; label: string; color?: string | null }>;
  config?: any; obligatorio: boolean; ayuda: string;
};

/** Un campo, según el tipo de su propiedad. */
export function CampoEntrada({ campo, valor, onCambiar, error, desactivado = false }: {
  campo: CampoDef; valor: any; onCambiar: (v: any) => void; error?: string; desactivado?: boolean;
}) {
  const id = `campo-${campo.columna_id}`;
  const t = campo.tipo;
  let control;
  if (t === 'texto_largo') control = <textarea id={id} rows={4} value={valor ?? ''} disabled={desactivado} onChange={e => onCambiar(e.target.value)} className={entrada} maxLength={20000} />;
  else if (t === 'seleccion') control = (
    <select id={id} value={valor ?? ''} disabled={desactivado} onChange={e => onCambiar(e.target.value)} className={entrada}>
      <option value="">Elige…</option>
      {campo.opciones.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
  else if (t === 'seleccion_multiple') {
    const marcadas: string[] = Array.isArray(valor) ? valor : [];
    control = (
      <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby={`${id}-et`}>
        {campo.opciones.map(o => {
          const on = marcadas.includes(o.id);
          return (
            <button key={o.id} type="button" disabled={desactivado} aria-pressed={on}
              onClick={() => onCambiar(on ? marcadas.filter(x => x !== o.id) : [...marcadas, o.id])}
              className={cn('min-h-11 px-3 rounded-lg border text-sm font-bold', on ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50')}>
              {o.label}
            </button>
          );
        })}
      </div>
    );
  } else if (t === 'casilla') control = (
    <label className="flex items-center gap-2 min-h-11 text-sm text-slate-700 cursor-pointer">
      <input id={id} type="checkbox" checked={valor === true} disabled={desactivado} onChange={e => onCambiar(e.target.checked)} className="w-5 h-5" />
      <span>{campo.nombre}{campo.obligatorio && <span className="text-rose-500"> *</span>}</span>
    </label>
  );
  else if (t === 'valoracion') {
    const max = campo.config?.maximo ?? 5, n = Number(valor) || 0;
    control = (
      <div className="flex items-center gap-1" role="group" aria-labelledby={`${id}-et`}>
        {Array.from({ length: max }, (_, i) => (
          <button key={i} type="button" disabled={desactivado} aria-label={`${i + 1} de ${max}`} onClick={() => onCambiar(n === i + 1 ? '' : i + 1)} className="w-9 h-11 grid place-items-center">
            <Star className={cn('w-6 h-6', i < n ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
          </button>
        ))}
      </div>
    );
  } else {
    const tipoInput = t === 'fecha' ? 'text' : ['numero', 'moneda', 'porcentaje'].includes(t) ? 'text' : t === 'email' ? 'email' : t === 'url' ? 'url' : t === 'telefono' ? 'tel' : 'text';
    const ph = t === 'fecha' ? 'dd/mm/aaaa' : t === 'duracion' ? '1:30' : t === 'porcentaje' ? '15 %' : '';
    control = <input id={id} type={tipoInput} inputMode={['numero', 'moneda', 'porcentaje'].includes(t) ? 'decimal' : undefined} value={valor ?? ''} placeholder={ph}
      disabled={desactivado} onChange={e => onCambiar(e.target.value)} className={entrada} maxLength={2000} />;
  }
  return (
    <div>
      {t !== 'casilla' && <label id={`${id}-et`} htmlFor={id} className="block mb-1 text-sm font-bold text-slate-800">{campo.nombre}{campo.obligatorio && <span className="text-rose-500" title="Obligatorio"> *</span>}</label>}
      {control}
      {campo.ayuda && <p className="mt-1 text-xs text-slate-500">{campo.ayuda}</p>}
      {error && <p role="alert" className="mt-1 text-xs font-bold text-rose-600">{error}</p>}
    </div>
  );
}

/** El formulario que ve quien responde: se pide al servidor por su token. */
export function FormularioEnvio({ token, onEnviado }: { token: string; onEnviado?: () => void }) {
  const [def, setDef] = useState<{ titulo: string; descripcion: string; boton: string; campos: CampoDef[] } | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'no'>('cargando');
  const [valores, setValores] = useState<Record<string, any>>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [gracias, setGracias] = useState<string | null>(null);
  const [trampa, setTrampa] = useState('');

  useEffect(() => {
    let vivo = true;
    fetch(`/api/bd/formularios/${encodeURIComponent(token)}`)
      .then(async r => { const j = await r.json().catch(() => ({})); if (!vivo) return; if (r.ok) { setDef(j); setEstado('ok'); } else setEstado('no'); })
      .catch(() => vivo && setEstado('no'));
    return () => { vivo = false; };
  }, [token]);

  if (estado === 'cargando') return <div className="flex items-center gap-2 p-6 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Abriendo el formulario…</div>;
  if (estado === 'no' || !def) return <p className="p-6 text-center text-sm font-bold text-slate-500">Este formulario no existe o ya no está abierto.</p>;

  if (gracias !== null) {
    return (
      <div className="py-10 px-4 text-center" role="status">
        <span className="mx-auto w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center"><Check className="w-6 h-6" /></span>
        <p className="mt-3 text-lg font-black text-slate-900">{gracias}</p>
        <button onClick={() => { setGracias(null); setValores({}); setErrores({}); }} className="mt-4 min-h-11 px-4 rounded-lg text-sm font-bold text-emerald-700 hover:bg-emerald-50">Enviar otra respuesta</button>
      </div>
    );
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setFallo(null); setErrores({}); setEnviando(true);
    try {
      const r = await fetch(`/api/bd/formularios/${encodeURIComponent(token)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valores, sitio_web: trampa }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { setGracias(j.gracias || '¡Gracias!'); onEnviado?.(); }
      else {
        if (Array.isArray(j.fallos)) setErrores(Object.fromEntries(j.fallos.map((f: any) => [f.columna, f.error])));
        setFallo(r.status === 429 ? (j.error || 'Has enviado demasiadas respuestas seguidas. Prueba dentro de un rato.') : (j.error || 'No se pudo enviar.'));
      }
    } catch { setFallo('No se pudo enviar. Comprueba tu conexión.'); }
    setEnviando(false);
  };

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      {(def.titulo || def.descripcion) && (
        <header>
          {def.titulo && <h2 className="text-2xl font-black tracking-tight text-slate-900">{def.titulo}</h2>}
          {def.descripcion && <p className="mt-1 text-sm text-slate-600 whitespace-pre-line">{def.descripcion}</p>}
        </header>
      )}
      {/* El campo trampa: las personas no lo ven ni llegan con el tabulador;
          un robot que rellena todo lo que encuentra, sí. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
        <label>No rellenes este campo<input tabIndex={-1} autoComplete="off" name="sitio_web" value={trampa} onChange={e => setTrampa(e.target.value)} /></label>
      </div>
      {def.campos.map(c => <CampoEntrada key={c.columna_id} campo={c} valor={valores[c.columna_id]} error={errores[c.columna_id]}
        onCambiar={v => setValores(x => ({ ...x, [c.columna_id]: v }))} />)}
      {fallo && <p role="alert" className="text-sm font-bold text-rose-600">{fallo}</p>}
      <button type="submit" disabled={enviando} className="inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-lg bg-slate-900 text-white text-sm font-bold disabled:opacity-60">
        {enviando && <Loader2 className="w-4 h-4 animate-spin" />} {def.boton || 'Enviar'}
      </button>
    </form>
  );
}

/** La vista dentro de la base de datos. */
export default function FormularioVista({ columnas, vista, editable, onCambiarVista }: {
  columnas: Columna[]; vista: Vista; editable: boolean; onCambiarVista: (c: Partial<Vista>) => void;
}) {
  const f = vista.config.formulario || {};
  const campos = f.campos || [];
  const posibles = columnas.filter(c => TIPOS_OK.has(c.tipo));
  const sinElegir = posibles.filter(c => !campos.some(x => x.columna_id === c.id));
  const url = f.token ? `${window.location.origin}/formulario/${f.token}` : '';
  const [copiado, setCopiado] = useState(false);
  const cambiar = (c: Partial<NonNullable<typeof f>>) => onCambiarVista({ config: { ...vista.config, formulario: { ...f, ...c } } });
  const cambiarCampo = (i: number, c: Partial<(typeof campos)[number]>) => cambiar({ campos: campos.map((x, j) => j === i ? { ...x, ...c } : x) });
  const mover = (i: number, d: number) => { const n = [...campos]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); cambiar({ campos: n }); };

  // Quien lee (página publicada): el formulario, si su autor lo abrió.
  if (!editable) {
    return (
      <div className="max-w-xl mx-auto p-4">
        {f.publico && f.token ? <FormularioEnvio token={f.token} /> : <p className="p-6 text-center text-sm text-slate-500">Este formulario no está abierto.</p>}
      </div>
    );
  }

  // Los campos tal como los verá quien responde, para la vista previa.
  const previa = campos.map((c): CampoDef | null => {
    const col = columnas.find(x => x.id === c.columna_id);
    return col ? { columna_id: col.id, nombre: c.etiqueta || col.nombre, tipo: col.tipo, opciones: col.opciones || [], config: col.config, obligatorio: !!c.obligatorio, ayuda: c.ayuda || '' } : null;
  }).filter((x): x is CampoDef => x !== null);

  return (
    <div className="grid lg:grid-cols-2 gap-4 p-3">
      <section className="space-y-3 min-w-0">
        <div className="rounded-xl border border-slate-200 p-3 space-y-2">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={!!f.publico} onChange={e => cambiar({ publico: e.target.checked })} className="w-4 h-4" />
            Abrir el formulario al público
          </label>
          {f.publico && f.token ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
                <input readOnly value={url} aria-label="Enlace del formulario" onFocus={e => e.currentTarget.select()} className="flex-1 min-w-0 h-9 px-2 rounded-md border border-slate-200 bg-slate-50 text-xs font-mono" />
                <button onClick={async () => { try { await navigator.clipboard.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 1500); } catch { /* el campo se puede copiar a mano */ } }}
                  className="inline-flex items-center gap-1 h-9 px-2 rounded-md bg-slate-900 text-white text-xs font-bold">{copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copiado ? 'Copiado' : 'Copiar'}</button>
              </div>
              <p className="text-[11px] text-slate-500">También funciona dentro de una página publicada: añade esta base de datos y elige esta vista.</p>
              <button onClick={() => { if (window.confirm('El enlace actual dejará de funcionar. ¿Crear uno nuevo?')) cambiar({ regenerar_token: true } as any); }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-rose-600"><RefreshCw className="w-3 h-3" /> Cambiar el enlace</button>
            </div>
          ) : <p className="text-xs text-slate-500">Cerrado: nadie puede responder. Al abrirlo se crea un enlace que cualquiera puede usar, sin cuenta.</p>}
          <p className="text-[11px] text-slate-400">Protegido contra spam: límite de envíos por IP y un campo trampa para robots.</p>
        </div>

        <div className="rounded-xl border border-slate-200 p-3 space-y-2">
          <input value={f.titulo || ''} onChange={e => cambiar({ titulo: e.target.value })} placeholder="Título del formulario" aria-label="Título" className="w-full h-10 px-2 rounded-md border border-slate-200 text-sm font-black" />
          <textarea value={f.descripcion || ''} onChange={e => cambiar({ descripcion: e.target.value })} placeholder="Una explicación para quien lo rellene (opcional)" aria-label="Descripción" rows={2} className="w-full px-2 py-1.5 rounded-md border border-slate-200 text-xs" />
        </div>

        <div className="rounded-xl border border-slate-200 p-3">
          <p className="pb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">Campos, de arriba abajo</p>
          {!campos.length && <p className="pb-2 text-xs text-slate-400">Elige abajo qué propiedades se piden. Cada respuesta crea una fila con esos valores.</p>}
          <div className="space-y-2">
            {campos.map((c, i) => {
              const col = columnas.find(x => x.id === c.columna_id);
              if (!col) return null;
              return (
                <div key={c.columna_id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-2 space-y-1.5">
                  <div className="flex items-center gap-1">
                    <div className="flex flex-col">
                      <button disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Subir" className="h-4 text-slate-300 hover:text-slate-700 disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                      <button disabled={i === campos.length - 1} onClick={() => mover(i, 1)} aria-label="Bajar" className="h-4 text-slate-300 hover:text-slate-700 disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                    </div>
                    <input value={c.etiqueta ?? ''} onChange={e => cambiarCampo(i, { etiqueta: e.target.value })} placeholder={col.nombre} aria-label={`Rótulo de ${col.nombre}`} className="flex-1 min-w-0 h-8 px-2 rounded-md border border-slate-200 bg-white text-xs font-bold" />
                    <label className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 cursor-pointer shrink-0">
                      <input type="checkbox" checked={!!c.obligatorio} onChange={e => cambiarCampo(i, { obligatorio: e.target.checked })} /> Obligatorio
                    </label>
                    <button onClick={() => cambiar({ campos: campos.filter((_, j) => j !== i) })} aria-label={`Quitar ${col.nombre}`} className="w-8 h-8 grid place-items-center text-slate-300 hover:text-rose-600"><X className="w-4 h-4" /></button>
                  </div>
                  <input value={c.ayuda ?? ''} onChange={e => cambiarCampo(i, { ayuda: e.target.value })} placeholder="Texto de ayuda (opcional)" aria-label={`Ayuda de ${col.nombre}`} className="w-full h-8 px-2 rounded-md border border-slate-200 bg-white text-[11px]" />
                </div>
              );
            })}
          </div>
          {!!sinElegir.length && (
            <div className="pt-2 mt-2 border-t border-slate-100">
              <p className="pb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">Añadir un campo</p>
              <div className="flex flex-wrap gap-1">
                {sinElegir.map(c => (
                  <button key={c.id} onClick={() => cambiar({ campos: [...campos, { columna_id: c.id, obligatorio: false }] })}
                    className="inline-flex items-center gap-1 h-8 px-2 rounded-md border border-slate-200 text-xs font-bold text-slate-600 hover:border-emerald-300 hover:text-emerald-700"><Plus className="w-3 h-3" /> {c.nombre}</button>
                ))}
              </div>
            </div>
          )}
          {columnas.some(c => !TIPOS_OK.has(c.tipo)) && <p className="pt-2 text-[11px] text-slate-400">Las fórmulas, los archivos y los enlaces a otras bases de datos no se piden en un formulario público.</p>}
        </div>

        <div className="rounded-xl border border-slate-200 p-3 space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-wide text-slate-400">Página de gracias</label>
          <textarea value={f.gracias || ''} onChange={e => cambiar({ gracias: e.target.value })} placeholder="¡Gracias! Hemos recibido tu respuesta." aria-label="Mensaje de gracias" rows={2} className="w-full px-2 py-1.5 rounded-md border border-slate-200 text-xs" />
          <input value={f.boton || ''} onChange={e => cambiar({ boton: e.target.value })} placeholder="Texto del botón (Enviar)" aria-label="Texto del botón" className="w-full h-8 px-2 rounded-md border border-slate-200 text-xs" />
        </div>
      </section>

      <section className="min-w-0">
        <p className="pb-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-slate-400"><ClipboardList className="w-3 h-3" /> Así lo verá quien responda</p>
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          {(f.titulo || f.descripcion) && (
            <header>
              {f.titulo && <h2 className="text-2xl font-black tracking-tight text-slate-900">{f.titulo}</h2>}
              {f.descripcion && <p className="mt-1 text-sm text-slate-600 whitespace-pre-line">{f.descripcion}</p>}
            </header>
          )}
          {previa.map(c => <CampoEntrada key={c.columna_id} campo={c} valor={undefined} onCambiar={() => {}} desactivado />)}
          {!previa.length && <p className="text-sm text-slate-400">Aún no hay campos.</p>}
          <button disabled className="min-h-11 px-5 rounded-lg bg-slate-900 text-white text-sm font-bold opacity-70">{f.boton || 'Enviar'}</button>
        </div>
      </section>
    </div>
  );
}
