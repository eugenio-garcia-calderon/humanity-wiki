import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, Sparkles, Search, ChevronDown, Info } from 'lucide-react';

// ============================================================================
// LA PÁGINA DE RESULTADOS (2026-08-24)
// ============================================================================
// Eugenio: «se abre una página con esas publicaciones como si fuese un buscador
// de google o yahoo… y también como hace google arriba te aparece un pequeño
// texto generado por la IA».
//
// ── LO QUE DICE LA PLATAFORMA Y LO QUE SE SABE LA IA, SEPARADOS ─────────────
// Él pidió una mezcla de las dos cosas, y es lo más útil. Pero mezclarlas SIN
// MARCAR sería lo peor que puede hacer esta plataforma en concreto: se pasa el
// día distinguiendo lo medido de lo simulado —hay una página entera dedicada a
// eso—, y un párrafo donde ambas van juntas deja a cualquiera citando como
// vuestro algo que nadie ha comprobado, con vuestra cara detrás.
//
// Por eso son dos bloques con dos fondos y dos etiquetas. Lo de la plataforma
// se puede ir a comprobar pinchando abajo; lo de la IA lo dice ella y punto.
//
// ── EL RESUMEN NO PUEDE TUMBAR LOS RESULTADOS ───────────────────────────────
// Van por separado: primero se pintan los resultados y luego llega el resumen.
// Si la IA falla, tarda o está apagada, la página sirve igual — que es como
// tiene que ser, porque lo que se buscaba está abajo.

const MODELOS = [
  { id: 'sencillo', label: 'Sencillo', pista: 'Gratis y rápido' },
  { id: 'medio', label: 'Medio', pista: 'Mejor redacción' },
  { id: 'mejor', label: 'El mejor', pista: 'El más capaz' },
];

type Resultado = { tipo: string; titulo: string; url: string; trozo: string | null };

export default function Buscar() {
  const [params] = useSearchParams();
  const q = (params.get('q') || '').trim();

  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [resumen, setResumen] = useState<any>(null);
  const [pensando, setPensando] = useState(false);
  const [modelo, setModelo] = useState('sencillo');
  const [modelosAbierto, setModelosAbierto] = useState(false);

  useEffect(() => {
    if (!q) { setResultados([]); return; }
    let vivo = true;
    setResultados(null); setResumen(null);
    document.title = `${q} · buscar en humanity.wiki`;

    fetch(`/api/buscar?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(j => {
        if (!vivo) return;
        const rs: Resultado[] = j.resultados || [];
        setResultados(rs);
        pedirResumen(rs, modelo);
      })
      .catch(() => vivo && setResultados([]));
    return () => { vivo = false; };
  }, [q]);

  async function pedirResumen(rs: Resultado[], cual: string) {
    setPensando(true); setResumen(null);
    try {
      const r = await fetch('/api/buscar/resumen', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q, resultados: rs.slice(0, 8), modelo: cual }),
      });
      setResumen(await r.json());
    } catch { setResumen({ hay: false }); }
    setPensando(false);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5">
      {/* AQUÍ YA NO VA OTRA CAJA DE BUSCAR (2026-08-24). La llevaba, y estaba
          bien mientras la barra de arriba no buscaba de verdad. Desde que
          `BuscadorSuperior` es esta misma caja, la página salía con DOS: una
          con lo que habías escrito y otra vacía, tres centímetros más abajo.
          Dos campos para lo mismo en la misma pantalla no dan a elegir, hacen
          dudar de cuál es el bueno. Se queda el de arriba, que además está en
          todas las demás pantallas. */}
      {!q ? (
        <p className="text-sm text-slate-500 py-8 text-center">Escribe algo arriba para buscar.</p>
      ) : (
        <>
          {/* ══ EL RESUMEN ═══════════════════════════════════════════════ */}
          <section className="mb-6 rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Resumen</span>
              {/* El selector de modelo, con los mismos nombres que el del
                  asistente. Minimalista y al lado, como pidió Eugenio. */}
              <div className="relative ml-auto">
                <button onClick={() => setModelosAbierto(v => !v)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-100">
                  <span className="text-slate-400 font-black">Modelo</span>
                  {MODELOS.find(m => m.id === modelo)?.label}
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>
                {modelosAbierto && (
                  <div className="absolute right-0 top-full mt-1 z-30 w-52 bg-white border border-slate-200 rounded-xl shadow-xl p-1">
                    {MODELOS.map(m => (
                      <button key={m.id}
                        onClick={() => {
                          setModelo(m.id); setModelosAbierto(false);
                          if (resultados) pedirResumen(resultados, m.id);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-50 ${modelo === m.id ? 'bg-emerald-50' : ''}`}>
                        <span className="block text-xs font-bold text-slate-800">{m.label}</span>
                        <span className="block text-[10px] text-slate-400">{m.pista}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 space-y-3">
              {pensando && (
                <p className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Leyendo lo que hay…
                </p>
              )}

              {!pensando && resumen?.hay && resumen.enPlataforma && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700 mb-1">
                    Según lo que hay aquí
                  </p>
                  <p className="text-[15px] leading-relaxed text-slate-800">{resumen.enPlataforma}</p>
                </div>
              )}

              {!pensando && resumen?.hay && resumen.general && (
                <div className={resumen.enPlataforma ? 'pt-3 border-t border-slate-100' : ''}>
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 mb-1 flex items-center gap-1">
                    <Info className="w-3 h-3" /> Lo añade la IA · no está comprobado aquí
                  </p>
                  <p className="text-[15px] leading-relaxed text-slate-600">{resumen.general}</p>
                </div>
              )}

              {!pensando && !resumen?.hay && (
                // Que no haya resumen no es un fallo de la búsqueda: los
                // resultados están abajo. Se dice en corto y sin alarmar.
                <p className="text-sm text-slate-400">
                  Esta vez no hay resumen. Los resultados están debajo.
                </p>
              )}
            </div>
          </section>

          {/* ══ LOS RESULTADOS ═══════════════════════════════════════════ */}
          {resultados === null ? (
            <p className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Buscando…
            </p>
          ) : resultados.length === 0 ? (
            <div className="py-10 text-center">
              <Search className="w-8 h-8 mx-auto text-slate-200" />
              <p className="mt-2 text-sm text-slate-600">
                No hay nada sobre <b>{q}</b> todavía.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Si sabes del tema, puedes ser quien lo escriba.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-400 mb-3">
                {resultados.length} {resultados.length === 1 ? 'resultado' : 'resultados'}
              </p>
              <ul className="space-y-4">
                {resultados.map((r, i) => (
                  <li key={i}>
                    <Link to={r.url} className="block group">
                      <span className="text-[10px] uppercase tracking-wide text-slate-400">{r.tipo}</span>
                      <span className="block text-[17px] font-bold text-sky-800 group-hover:underline leading-snug">
                        {r.titulo}
                      </span>
                      {r.trozo && (
                        <span className="block mt-0.5 text-sm text-slate-600 leading-relaxed">{r.trozo}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
