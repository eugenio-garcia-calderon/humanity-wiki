import { useEffect, useRef, useState } from 'react';
import { X, Loader2, Plus, CornerDownRight, Search } from 'lucide-react';
import { OBJETIVOS } from '../../utils/objetivos';
import { cn } from '../../utils/cn';

/*
 * CREAR UN TEMA (2026-08-25)
 * ============================================================================
 * Eugenio: «añade la opción en el menú izquierdo de crear un nuevo tema, y que
 * según vayas escribiendo te diga los temas que ya hay creados, y no te permita
 * duplicarlos. Y que te pregunte si es un tema dentro de una rama, o si es un
 * tema principal sin rama».
 *
 * ── LAS SUGERENCIAS SON EL ANTIDUPLICADO ───────────────────────────────────
 * El servidor ya se niega a crear un hermano repetido y la IA además caza los
 * sinónimos. Pero eso pasa DESPUÉS de escribir y pulsar, y llegar hasta ahí
 * para que te digan que no es perder el tiempo de alguien que venía a ayudar.
 *
 * Aquí se enseña lo que ya hay **mientras se escribe**, con su camino entero —
 * «AGUA › Desalación › Coste energético»—, porque un nombre suelto no dice si
 * es el que buscabas: puede haber «Prevención» en Salud y en Ecosistemas y ser
 * dos cosas distintas.
 *
 * Y si lo que sale es lo que querías, se puede **usar ése**: el botón lleva a
 * su rama en vez de crear otro igual. Ésa es la forma de que no se dupliquen
 * que de verdad funciona — no prohibir, sino que encontrar lo que hay sea más
 * cómodo que crear.
 *
 * ── LAS DOS PREGUNTAS, Y POR QUÉ ESTÁN SEPARADAS ───────────────────────────
 * «Principal» y «dentro de una rama» son la misma decisión vista dos veces —
 * de qué cuelga— pero se preguntan aparte porque en la primera basta con
 * elegir uno de quince, y en la segunda hay que buscar entre mil. Meterlas en
 * un solo desplegable de mil entradas escondería las quince que casi todo el
 * mundo va a usar.
 */

type Encontrado = { id: string; objetivo_id: string; nombre: string; ruta: string; nivel: number };

export default function DialogoNuevoTema({ onCerrar, onCreado, padreInicial }: {
  onCerrar: () => void;
  onCreado?: (id: string) => void;
  /**
   * DE QUÉ RAMA CUELGA, YA DECIDIDO (2026-08-25, prog8).
   *
   * Cuando esto se abre desde el «+» de una fila del menú, el padre ya está
   * elegido: es la fila que se ha pulsado. Preguntarlo otra vez —«¿principal o
   * dentro de una rama?», y luego buscar entre mil— sería pedir dos veces algo
   * que ya se ha dicho con el dedo.
   *
   * Se sigue pudiendo cambiar: el buscador de padre queda a la vista. Lo que
   * cambia es de dónde se parte, no lo que se puede hacer.
   */
  padreInicial?: string;
}) {
  const [nombre, setNombre] = useState('');
  const [donde, setDonde] = useState<'principal' | 'rama'>(padreInicial ? 'rama' : 'principal');
  const [objetivo, setObjetivo] = useState(OBJETIVOS[0].id);
  const [padre, setPadre] = useState<Encontrado | null>(null);

  // El nombre de la rama de la que cuelga no viaja en la propiedad —el menú
  // tiene el id, no la ficha entera— así que se pide. Sin esto el diálogo
  // diría «dentro de: ST_MEL_CARGA», que no le dice nada a nadie.
  useEffect(() => {
    if (!padreInicial) return;
    let vivo = true;
    fetch(`/api/agregador/tema/${encodeURIComponent(padreInicial)}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (!vivo || !j?.tema) return;
        setPadre({
          id: j.tema.id, objetivo_id: j.tema.objetivo_id, nombre: j.tema.nombre,
          ruta: [...(j.camino || []).map((c: any) => c.nombre)].join(' › ') || j.tema.nombre,
          nivel: (j.camino?.length ?? 1) - 1,
        });
      })
      .catch(() => { /* se queda sin nombre y el buscador sigue ahí */ });
    return () => { vivo = false; };
  }, [padreInicial]);
  const [buscaPadre, setBuscaPadre] = useState('');
  const [candidatos, setCandidatos] = useState<Encontrado[]>([]);
  const [parecidos, setParecidos] = useState<Encontrado[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  // La última búsqueda pedida. Si al llegar la respuesta ya se ha escrito otra
  // cosa, se tira: es de una tecla anterior.
  const ultima = useRef('');

  useEffect(() => {
    const t = window.setTimeout(async () => {
      const v = nombre.trim();
      ultima.current = v;
      if (v.length < 2) { setParecidos([]); return; }
      try {
        const r = await fetch(`/api/temas/buscar?q=${encodeURIComponent(v)}`, { credentials: 'include' });
        const j = await r.json();
        if (ultima.current !== v) return;
        setParecidos(j.temas || []);
      } catch { /* sin sugerencias, se crea igual */ }
    }, 200);
    return () => window.clearTimeout(t);
  }, [nombre]);

  useEffect(() => {
    const t = window.setTimeout(async () => {
      const v = buscaPadre.trim();
      if (v.length < 2) { setCandidatos([]); return; }
      try {
        const r = await fetch(`/api/temas/buscar?q=${encodeURIComponent(v)}`, { credentials: 'include' });
        const j = await r.json();
        setCandidatos(j.temas || []);
      } catch { setCandidatos([]); }
    }, 200);
    return () => window.clearTimeout(t);
  }, [buscaPadre]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [onCerrar]);

  const listo = nombre.trim().length >= 2 && (donde === 'principal' || !!padre);

  async function crear() {
    if (!listo) return;
    setEnviando(true); setAviso(null);
    try {
      const r = await fetch('/api/temas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          nombre: nombre.trim(),
          objetivo: donde === 'principal' ? objetivo : padre!.objetivo_id,
          padre: donde === 'rama' ? padre!.id : null,
        }),
      });
      const j = await r.json();
      if (!r.ok) { setAviso(j.error || 'No se ha podido crear.'); return; }
      // QUE YA EXISTIERA NO ES UN FALLO: es lo que se quería, y hay que
      // decirlo o parecerá que el botón no ha hecho nada.
      if (j.yaExistia) {
        setAviso(j.porSignificado
          ? `Ya había uno que dice lo mismo: «${j.nombre}». No se crea otro.`
          : `«${j.nombre}» ya estaba ahí.`);
        onCreado?.(j.id);
        return;
      }
      onCreado?.(j.id);
      onCerrar();
    } catch { setAviso('No se ha podido crear.'); }
    finally { setEnviando(false); }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6">
      <div onClick={onCerrar} aria-hidden className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" />
      <div role="dialog" aria-modal="true" aria-label="Nuevo tema"
        className="relative flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-4 py-3">
          <Plus className="h-4 w-4 shrink-0 text-slate-400" />
          <h2 className="min-w-0 flex-1 text-sm font-black text-slate-800">Nuevo tema</h2>
          <button onClick={onCerrar} aria-label="Cerrar"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Cómo se llama</label>
          <input
            autoFocus
            value={nombre}
            onChange={e => { setNombre(e.target.value); setAviso(null); }}
            placeholder="Por ejemplo: Desalación"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-base outline-none focus:border-emerald-400 sm:text-sm"
          />

          {/* LO QUE YA HAY, MIENTRAS SE ESCRIBE. Ver la nota de arriba. */}
          {parecidos.length > 0 && (
            <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50/60 p-2">
              <p className="px-1 pb-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                Esto ya existe
              </p>
              <ul className="space-y-0.5">
                {parecidos.slice(0, 5).map(t => (
                  <li key={t.id}>
                    <button
                      onClick={() => { setDonde('rama'); setPadre(t); setBuscaPadre(t.nombre); setNombre(''); setParecidos([]); }}
                      title="Usar éste como rama"
                      className="flex w-full items-start gap-1.5 rounded-lg px-1.5 py-1 text-left hover:bg-white"
                    >
                      <CornerDownRight className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-slate-800">{t.nombre}</span>
                        <span className="block truncate text-[10px] text-slate-500">{nombreObjetivo(t.objetivo_id)} › {t.ruta}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="px-1.5 pt-1 text-[10px] text-amber-700/80">
                Pulsa uno para colgar el tuyo dentro de él en vez de repetirlo.
              </p>
            </div>
          )}

          {/* ══ DÓNDE VA ═══════════════════════════════════════════════════ */}
          <p className="mb-1 mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Dónde va</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDonde('principal')}
              className={cn('rounded-xl border px-3 py-2 text-left transition-colors',
                donde === 'principal' ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300')}
            >
              <span className="block text-xs font-black text-slate-800">Tema principal</span>
              <span className="block text-[10px] text-slate-500">Directamente dentro de un objetivo</span>
            </button>
            <button
              onClick={() => setDonde('rama')}
              className={cn('rounded-xl border px-3 py-2 text-left transition-colors',
                donde === 'rama' ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300')}
            >
              <span className="block text-xs font-black text-slate-800">Dentro de una rama</span>
              <span className="block text-[10px] text-slate-500">Colgando de otro tema</span>
            </button>
          </div>

          {donde === 'principal' ? (
            <div className="mt-2">
              <select
                value={objetivo}
                onChange={e => setObjetivo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              >
                {OBJETIVOS.map(o => <option key={o.id} value={o.id}>{o.titulo}</option>)}
              </select>
            </div>
          ) : (
            <div className="mt-2">
              {padre ? (
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                  <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-black text-slate-800">{padre.nombre}</span>
                    <span className="block truncate text-[10px] text-slate-500">{nombreObjetivo(padre.objetivo_id)} › {padre.ruta}</span>
                  </span>
                  <button onClick={() => { setPadre(null); setBuscaPadre(''); }}
                    className="shrink-0 text-[10px] font-bold text-slate-400 hover:text-slate-700">Cambiar</button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 h-10 focus-within:border-emerald-400">
                    <Search className="h-4 w-4 shrink-0 text-slate-400" />
                    <input
                      value={buscaPadre}
                      onChange={e => setBuscaPadre(e.target.value)}
                      placeholder="Busca el tema que lo contiene"
                      className="min-w-0 flex-1 bg-transparent text-base outline-none sm:text-sm"
                    />
                  </div>
                  {candidatos.length > 0 && (
                    <ul className="mt-1 max-h-44 overflow-y-auto rounded-xl border border-slate-200 py-1">
                      {candidatos.map(t => (
                        <li key={t.id}>
                          <button onClick={() => setPadre(t)}
                            className="flex w-full items-start gap-1.5 px-2.5 py-1.5 text-left hover:bg-slate-50">
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-bold text-slate-800">{t.nombre}</span>
                              <span className="block truncate text-[10px] text-slate-500">{nombreObjetivo(t.objetivo_id)} › {t.ruta}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          )}

          {aviso && (
            <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">{aviso}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <button onClick={onCerrar} className="h-10 rounded-xl px-3 text-xs font-bold text-slate-500 hover:bg-slate-100">Cancelar</button>
          <button
            onClick={crear}
            disabled={!listo || enviando}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
          >
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Crear tema
          </button>
        </div>
      </div>
    </div>
  );
}

const nombreObjetivo = (id: string) => OBJETIVOS.find(o => o.id === id)?.titulo || '';
