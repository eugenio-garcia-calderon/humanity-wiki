import { useMemo, useState } from 'react';
import { CROMADO, colorDeSerie } from '../../utils/graficas/colores';
import { numero, type Unidad } from '../../utils/graficas/formato';

// ============================================================================
// BARRAS: LA FOTO DE UN MOMENTO (2026-08-23)
// ============================================================================
// Cuando lo que importa es comparar el tamaño de unos cuantos, no cómo cambian
// con el tiempo. Horizontales y no verticales, porque los nombres de países
// caben enteros a la izquierda y en vertical hay que ladear la cabeza.
//
// SIEMPRE DESDE CERO. Una barra dice «cuánto» por su longitud; si el eje
// empieza en 40, una barra el doble de larga que otra no es el doble de grande
// y la gráfica miente. En las líneas el cero es opcional; en las barras, no.

export default function Barras({ valores, unidad, alto = 380, orden = 'valor' }: {
  valores: Map<string, number>;
  unidad?: Unidad;
  alto?: number;
  orden?: 'valor' | 'nombre';
}) {
  const [encima, setEncima] = useState<string | null>(null);

  const filas = useMemo(() => {
    const lista = [...valores.entries()].map(([entidad, v]) => ({ entidad, v }));
    lista.sort(orden === 'valor' ? (a, b) => b.v - a.v : (a, b) => a.entidad.localeCompare(b.entidad));
    return lista;
  }, [valores, orden]);

  const tope = useMemo(() => Math.max(0, ...filas.map(f => Math.abs(f.v))), [filas]);
  const hayNegativos = filas.some(f => f.v < 0);

  if (!filas.length) return <p className="text-sm text-slate-400 text-center py-10">No hay datos que dibujar.</p>;

  return (
    <div className="w-full overflow-y-auto" style={{ maxHeight: alto }}>
      <div className="space-y-[2px]">
        {filas.map((f, i) => {
          const proporcion = tope ? Math.abs(f.v) / tope : 0;
          return (
            <div
              key={f.entidad}
              className="flex items-center gap-2 group"
              onMouseEnter={() => setEncima(f.entidad)}
              onMouseLeave={() => setEncima(null)}
            >
              <span className="w-32 shrink-0 text-[11px] text-right truncate" style={{ color: CROMADO.tintaSecundaria }}>
                {f.entidad}
              </span>
              <div className="flex-1 min-w-0 h-5 relative">
                <div
                  className="absolute top-0 h-5 transition-[width] duration-200"
                  style={{
                    // Con negativos el cero se va al centro; sin ellos, a la
                    // izquierda, que es donde se espera.
                    left: hayNegativos ? (f.v < 0 ? `${50 - proporcion * 50}%` : '50%') : 0,
                    width: `${proporcion * (hayNegativos ? 50 : 100)}%`,
                    background: colorDeSerie(i < 8 ? i : 8),
                    borderRadius: f.v < 0 ? '4px 0 0 4px' : '0 4px 4px 0',
                    opacity: encima && encima !== f.entidad ? 0.45 : 1,
                  }}
                />
                {hayNegativos && (
                  <div className="absolute top-0 bottom-0 left-1/2 w-px" style={{ background: CROMADO.ejeBase }} />
                )}
              </div>
              <span className="w-24 shrink-0 text-[11px] font-bold tabular-nums" style={{ color: CROMADO.tintaPrimaria }}>
                {numero(f.v, unidad)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
