// Pruebas de las valoraciones de la comunidad (Wikiproducts W4, 2026-10-18).
//
//   npx tsx scripts/probar-valoraciones.ts
//
// Sin base de datos: prueba las funciones puras de `src/server/bd/comunidad.ts`
// y el orden de `bd/vistas.ts`, que son las que deciden qué producto sale
// primero. La más importante es la última: EL ORDEN NUNCA LEE LA COMISIÓN
// (plan §2.3, código ético). Si alguien la hace leer, esto falla.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { resumirCriterio, celdasComunidad, notaMedia, ajustesDe, type Voto } from '../src/server/bd/comunidad';
import { ordenarFilas } from '../src/server/bd/vistas';

let fallos = 0;
const ok = (cond: boolean, que: string) => {
  console.log(`${cond ? 'OK   ' : 'FALLO'} ${que}`);
  if (!cond) fallos++;
};

const votos = (fila: string, col: string, notas: number[], verificado = false, desde = 0): Voto[] =>
  notas.map((nota, i) => ({ fila_id: fila, columna_id: col, user_id: `U${desde + i}`, nota, verificado }));

const aj = ajustesDe({ criterio: 'calidad' });

// 1 · Media bayesiana: dos cincos no ganan a trescientos votos de 4,6.
{
  const pocos = votos('A', 'C', [5, 5, 5]);
  const muchos = votos('B', 'C', [...Array(180).fill(5), ...Array(120).fill(4)], false, 1000); // media 4,6
  const r = resumirCriterio([...pocos, ...muchos], aj);
  ok(r.B.nota! > r.A.nota!, `300 votos de 4,6 (${r.B.nota}) ganan a 3 de 5 (${r.A.nota})`);
  ok(r.A.media === 5, 'la media simple se sigue enseñando (5)');
}

// 2 · Umbral: con menos de 3 votantes no hay número.
{
  const r = resumirCriterio(votos('A', 'C', [5, 4]), aj);
  ok(r.A.nota === null && r.A.votos === 2 && !r.A.suficiente, 'con 2 votos la nota es null y se dice cuántos hay');
  const celdas = celdasComunidad([{ id: 'C', tipo: 'comunidad', config: {} }], ['A', 'Z'], votos('A', 'C', [5, 4]));
  ok(celdas.A.C.estado === 'vacia' && (celdas.A.C as any).votos === 2, 'la celda queda vacía con votos = 2');
  ok(celdas.Z.C.estado === 'vacia' && (celdas.Z.C as any).votos === 0, 'una fila sin votos: vacía con 0');
}

// 3 · Comprador verificado pesa ×2.
{
  const v = [...votos('A', 'C', [1, 1], false), ...votos('A', 'C', [5], true, 10)];
  const r = resumirCriterio(v, ajustesDe({ peso_previo: 0 }));
  ok(Math.abs(r.A.media! - (1 + 1 + 10) / 4) < 0.01, `el voto verificado cuenta doble (media ${r.A.media})`);
  ok(r.A.verificados === 1 && r.A.media_verificados === 5, 'la media de verificados va aparte');
}

// 4 · La nota media pide al menos la mitad de los criterios.
ok(notaMedia([4, null, null]) === null, 'media con 1 de 3 criterios: null');
ok(notaMedia([4, 5, null]) === 4.5, 'media con 2 de 3 criterios: 4,5');

// 5 · Configuración fuera de rango: se recorta, no se cree.
{
  const a = ajustesDe({ umbral: -4, peso_verificado: 1000, criterio: 'Ética!!' });
  ok(a.umbral === 1 && a.peso_verificado === 10 && a.criterio === 'tica', 'los ajustes se limitan');
}

// 6 · EL ORDEN NUNCA LEE LA COMISIÓN.
{
  const cols = [{ id: 'C', tipo: 'comunidad', config: { criterio: 'etica' } }];
  const ids = ['P1', 'P2', 'P3', 'P4', 'P5'];
  const v: Voto[] = [];
  ids.forEach((id, i) => v.push(...votos(id, 'C', [1 + (i % 5), 3, 4, 2 + (i % 3)], i % 2 === 0, i * 100)));
  const notas = celdasComunidad(cols, ids, v);
  const orden = (comisiones: number[]) => ordenarFilas(
    ids.map((id, i) => ({ id, celdas: { ...notas[id], COM: { estado: 'ok' as const, valor: comisiones[i] } } })),
    [{ columna_id: 'C', direccion: 'desc' }],
  ).map(f => f.id).join(',');
  const base = orden([0, 0, 0, 0, 0]);
  let igual = true;
  for (let k = 0; k < 50; k++) {
    if (orden(ids.map(() => Math.round(Math.random() * 3000) / 100)) !== base) igual = false;
  }
  ok(igual, `cambiar la comisión de todas las filas 50 veces no mueve el orden (${base})`);

  // Y la regla escrita: el fichero que calcula la nota no menciona la comisión.
  const fuente = readFileSync(path.join(import.meta.dirname, '../src/server/bd/comunidad.ts'), 'utf8');
  ok(!/comisi[oó]n/i.test(fuente), 'src/server/bd/comunidad.ts no menciona «comisión»');
  const firma = /export function celdasComunidad\(([\s\S]*?)\)\s*:/.exec(fuente)?.[1] || '';
  ok(!/celdas/.test(firma), 'celdasComunidad no recibe las celdas de la fila, sólo sus ids y los votos');
}

console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
