import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Download } from 'lucide-react';
import { numero, rotuloTiempo, type Unidad } from '../../utils/graficas/formato';
import type { Serie } from '../../utils/graficas/tabla';

// ============================================================================
// LA PESTAÑA «TABLA» (2026-08-23)
// ============================================================================
// Los MISMOS datos de la gráfica, en números. Está por dos razones y las dos
// importan:
//
// 1. Es la salida accesible. Tres de los ocho colores de nuestra paleta no
//    llegan a 3:1 de contraste sobre blanco; el aviso del validador se salda
//    con rótulos visibles Y con que exista esta pestaña. No es un extra.
// 2. Es de donde sale el CSV. Descargar los datos de una gráfica es lo que
//    permite comprobarla, y una gráfica que no se puede comprobar hay que
//    creérsela.
//
// Una fila por entidad y una columna por instante, que es como se mira una
// serie temporal — y como lo hace Our World in Data.

export default function TablaDatos({ series, unidad, porDias, titulo }: {
  series: Serie[];
  unidad?: Unidad;
  porDias?: boolean;
  titulo?: string;
}) {
  const [ordenPor, setOrdenPor] = useState<'entidad' | number>('entidad');
  const [ascendente, setAscendente] = useState(true);

  const instantes = useMemo(
    () => [...new Set(series.flatMap(s => s.puntos.map(p => p.t)))].sort((a, b) => a - b),
    [series],
  );

  const filas = useMemo(() => {
    const lista = series.map(s => ({
      entidad: s.entidad,
      variable: s.variable,
      porTiempo: new Map(s.puntos.map(p => [p.t, p.v])),
    }));
    lista.sort((a, b) => {
      if (ordenPor === 'entidad') return a.entidad.localeCompare(b.entidad) * (ascendente ? 1 : -1);
      const va = a.porTiempo.get(ordenPor);
      const vb = b.porTiempo.get(ordenPor);
      // Las filas sin dato SIEMPRE al final, se ordene como se ordene: si no,
      // invertir el orden las sube arriba y parecen las más grandes.
      if (va === undefined) return 1;
      if (vb === undefined) return -1;
      return (va - vb) * (ascendente ? 1 : -1);
    });
    return lista;
  }, [series, ordenPor, ascendente]);

  const ordenarPor = (col: 'entidad' | number) => {
    if (col === ordenPor) setAscendente(a => !a);
    else { setOrdenPor(col); setAscendente(col === 'entidad'); }
  };

  /** El CSV: separado por comas, con comillas donde hagan falta, y en UTF-8
   *  con BOM para que Excel no destroce los acentos al abrirlo. */
  const descargar = () => {
    const escapar = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const cabecera = ['Entidad', 'Variable', ...instantes.map(t => rotuloTiempo(t, !!porDias))];
    const cuerpo = filas.map(f => [
      f.entidad, f.variable,
      ...instantes.map(t => { const v = f.porTiempo.get(t); return v === undefined ? '' : v; }),
    ]);
    const csv = [cabecera, ...cuerpo].map(l => l.map(escapar).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(titulo || 'datos').replace(/[^\w\sáéíóúñü-]/gi, '').trim().slice(0, 60) || 'datos'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!series.length) return <p className="text-sm text-slate-400 text-center py-10">No hay datos que enseñar.</p>;

  const flecha = (col: 'entidad' | number) => ordenPor !== col ? null
    : ascendente ? <ArrowUp className="w-3 h-3 inline" /> : <ArrowDown className="w-3 h-3 inline" />;

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button
          onClick={descargar}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          <Download className="w-3.5 h-3.5" /> Descargar CSV
        </button>
      </div>
      <div className="overflow-auto max-h-[420px] border border-slate-100 rounded-xl">
        <table className="w-full text-[11px] border-collapse">
          <thead className="sticky top-0 bg-white shadow-[0_1px_0_#e2e8f0]">
            <tr>
              <th
                onClick={() => ordenarPor('entidad')}
                className="text-left font-black text-slate-700 px-2 py-1.5 sticky left-0 bg-white cursor-pointer hover:text-slate-900 whitespace-nowrap"
              >
                Entidad {flecha('entidad')}
              </th>
              {instantes.map(t => (
                <th
                  key={t}
                  onClick={() => ordenarPor(t)}
                  className="text-right font-black text-slate-700 px-2 py-1.5 cursor-pointer hover:text-slate-900 whitespace-nowrap tabular-nums"
                >
                  {rotuloTiempo(t, !!porDias)} {flecha(t)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map(f => (
              <tr key={`${f.variable}·${f.entidad}`} className="odd:bg-slate-50/50">
                <td className="px-2 py-1 text-slate-700 sticky left-0 bg-inherit whitespace-nowrap">{f.entidad}</td>
                {instantes.map(t => {
                  const v = f.porTiempo.get(t);
                  return (
                    <td key={t} className="px-2 py-1 text-right tabular-nums text-slate-900">
                      {v === undefined ? <span className="text-slate-300">—</span> : numero(v, unidad)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
