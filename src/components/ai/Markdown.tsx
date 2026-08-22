// ============================================================================
// PINTAR LO QUE ESCRIBE LA IA (2026-08-21, Eugenio, con una captura: «creo que
// el asistente intenta hacer tabla, pero no salen bien, arréglalo»).
// ============================================================================
// Las respuestas se pintaban como TEXTO PLANO. Cuando la IA hacía una tabla
// —que la hace, y bien— llegaba así:
//
//     | Parámetro | Challenger | Cruiser |
//     |---|---|---|
//     | Área solar máx. | 6 m² | Sin límite |
//
// Una tabla de comparar es justo donde el formato ES la información: en tres
// columnas se ve de un vistazo lo que en una lista de barras no se ve.
//
// POR QUÉ NO SE USA UNA LIBRERÍA. Se intentó `react-markdown` + `remark-gfm` y
// npm lo rechaza: `react-simple-maps` exige React 18 y el proyecto va por el
// 19. Es un conflicto ANTERIOR a esto y forzarlo con `--legacy-peer-deps`
// cambia cómo se resuelve el árbol entero, con otra persona trabajando en el
// mismo repositorio. Cuando ese conflicto se arregle, esto se puede tirar y
// sustituir por la librería sin que nadie lo note.
//
// LA REGLA DE ESTE FICHERO: lo que no se entiende SE IMPRIME TAL CUAL. Nunca
// se adivina. Un pintador que se equivoca al interpretar es peor que uno que
// no interpreta, porque el segundo al menos deja leer el original.
import { Fragment, type ReactNode } from 'react';

/** Negrita, cursiva y código dentro de una línea. Se resuelve con un solo
 *  recorrido y no con tres reemplazos encadenados: encadenar haría que el
 *  contenido de un trozo de código se volviera a interpretar. */
function conFormato(texto: string): ReactNode[] {
  const partes: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto))) {
    if (m.index > ultimo) partes.push(texto.slice(ultimo, m.index));
    const t = m[0];
    if (t.startsWith('**')) {
      partes.push(<strong key={m.index} className="font-bold">{t.slice(2, -2)}</strong>);
    } else if (t.startsWith('`')) {
      partes.push(
        <code key={m.index} className="px-1 py-0.5 rounded bg-slate-200/70 text-[0.9em] font-mono">
          {t.slice(1, -1)}
        </code>,
      );
    } else {
      partes.push(<em key={m.index}>{t.slice(1, -1)}</em>);
    }
    ultimo = m.index + t.length;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return partes;
}

/** Las celdas de una fila de tabla. Se quitan las barras de los extremos, que
 *  pueden estar o no, y NO se recorta a un número fijo de columnas: si una
 *  fila trae de más o de menos, se pinta lo que hay. */
const celdas = (linea: string) =>
  linea.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim());

/** ¿Es la línea de guiones que separa la cabecera del cuerpo? */
const esSeparador = (l: string) => /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(l) && l.includes('-');

/** ¿Esta línea parece parte de una tabla? */
const esFila = (l: string) => l.trim().startsWith('|') && l.includes('|', 1);

export default function Markdown({ texto }: { texto: string }) {
  const lineas = texto.split('\n');
  const bloques: ReactNode[] = [];
  let parrafo: string[] = [];
  let lista: { tipo: 'punto' | 'numero'; items: string[] } | null = null;

  const cerrarParrafo = () => {
    if (!parrafo.length) return;
    bloques.push(
      <p key={bloques.length} className="whitespace-pre-wrap">{conFormato(parrafo.join('\n'))}</p>,
    );
    parrafo = [];
  };
  const cerrarLista = () => {
    if (!lista) return;
    const L = lista.tipo === 'numero' ? 'ol' : 'ul';
    bloques.push(
      <L key={bloques.length} className={`ml-4 space-y-0.5 ${lista.tipo === 'numero' ? 'list-decimal' : 'list-disc'}`}>
        {lista.items.map((it, i) => <li key={i}>{conFormato(it)}</li>)}
      </L>,
    );
    lista = null;
  };
  const cerrarTodo = () => { cerrarParrafo(); cerrarLista(); };

  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];

    // ── TABLA ──────────────────────────────────────────────────────────────
    // Hace falta una fila Y un separador debajo. Sin exigir el separador, un
    // párrafo que mencione «a | b» se convertiría en una tabla de una fila.
    if (esFila(l) && i + 1 < lineas.length && esSeparador(lineas[i + 1])) {
      cerrarTodo();
      const cab = celdas(l);
      const filas: string[][] = [];
      let j = i + 2;
      while (j < lineas.length && esFila(lineas[j])) { filas.push(celdas(lineas[j])); j++; }
      bloques.push(
        // SE PUEDE DESPLAZAR A LO ANCHO. Una tabla de cuatro columnas no cabe
        // en un teléfono, y sin esto empujaría la conversación entera hacia
        // los lados.
        <div key={bloques.length} className="overflow-x-auto -mx-1 my-1">
          <table className="min-w-full text-[13px] border-collapse">
            <thead>
              <tr>
                {cab.map((c, k) => (
                  <th key={k} className="text-left font-bold text-slate-700 border-b-2 border-slate-300 px-2 py-1 whitespace-nowrap">
                    {conFormato(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((f, k) => (
                <tr key={k} className="border-b border-slate-200/70 last:border-0">
                  {f.map((c, n) => (
                    <td key={n} className="px-2 py-1 align-top">{conFormato(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      i = j - 1;
      continue;
    }

    // ── TÍTULOS ────────────────────────────────────────────────────────────
    const tit = l.match(/^(#{1,4})\s+(.*)$/);
    if (tit) {
      cerrarTodo();
      const nivel = tit[1].length;
      bloques.push(
        <p key={bloques.length} className={nivel <= 2 ? 'font-black text-slate-900 mt-2' : 'font-bold text-slate-800 mt-1'}>
          {conFormato(tit[2])}
        </p>,
      );
      continue;
    }

    // ── LÍNEA DIVISORIA ────────────────────────────────────────────────────
    if (/^\s*(---|\*\*\*|___)\s*$/.test(l)) {
      cerrarTodo();
      bloques.push(<hr key={bloques.length} className="my-2 border-slate-200" />);
      continue;
    }

    // ── LISTAS ─────────────────────────────────────────────────────────────
    const punto = l.match(/^\s*[-*·]\s+(.*)$/);
    const numero = l.match(/^\s*\d+[.)]\s+(.*)$/);
    if (punto || numero) {
      cerrarParrafo();
      const tipo = numero ? 'numero' : 'punto';
      if (!lista || lista.tipo !== tipo) { cerrarLista(); lista = { tipo, items: [] }; }
      lista.items.push((punto || numero)![1]);
      continue;
    }

    // ── LO DEMÁS ───────────────────────────────────────────────────────────
    if (!l.trim()) { cerrarTodo(); continue; }
    cerrarLista();
    parrafo.push(l);
  }
  cerrarTodo();

  return <div className="space-y-1.5">{bloques.map((b, i) => <Fragment key={i}>{b}</Fragment>)}</div>;
}
