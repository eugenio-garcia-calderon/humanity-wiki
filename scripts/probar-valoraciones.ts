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
import { opinionesDe, textoOpinion } from '../src/utils/opinionesTerceros';
import { vistaAlternativas } from '../src/components/bloquesDatos/ficha/vistas';
import type { TablaFicha } from '../src/components/bloquesDatos/ficha/modelo';

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

// 9 · Opiniones en otras webs: sólo entra lo que trae enlace, fecha y cifras
// válidas, y nunca se mezcla con la nota de la comunidad.
{
  const buena = { fuente: 'Trustpilot', url: 'https://es.trustpilot.com/review/ejemplo.es', nota: 4, escala: 5, opiniones: 16567, fecha: '2026-10-18' };
  const l = opinionesDe(JSON.stringify([
    buena,
    { ...buena, url: 'http://inseguro.es' },
    { ...buena, fecha: 'ayer' },
    { ...buena, nota: 7 },
    { ...buena, opiniones: 0 },
    { ...buena, fuente: '' },
  ]));
  ok(l.length === 1, `de 6 opiniones sólo vale la que trae enlace https, fecha y cifras (${l.length})`);
  ok(opinionesDe('esto no es JSON').length === 0 && opinionesDe(null).length === 0, 'una celda rota o vacía no enseña nada');
  ok(textoOpinion(buena) === 'Según Trustpilot: 4 de 5, de 16.567 opiniones (consultado el 18/10/2026)', `la frase dice fuente, escala, cuántas y cuándo: «${textoOpinion(buena)}»`);
  const fuente = readFileSync(path.join(import.meta.dirname, '../src/server/bd/comunidad.ts'), 'utf8');
  ok(!/opiniones_?terceros|opinionesTerceros/.test(fuente), 'la nota de la comunidad (bd/comunidad.ts) no lee las opiniones de otras webs');
  const rutas = readFileSync(path.join(import.meta.dirname, '../src/server/valoraciones.ts'), 'utf8');
  const agregado = /const agregado =[\s\S]*?;\n/.exec(rutas)?.[0] || '';
  ok(agregado.length > 0 && !/terceros/.test(agregado), 'el AggregateRating del JSON-LD sale sólo de votos de aquí');
}

// 10 · «La mejor en cada criterio» con los criterios de la valoración: mientras
// no hay votos, precio, garantía, ecología y seguridad salen de datos con
// nombre; calidad, estética y ética no se inventan; la comisión nunca cuenta.
{
  const okc = (valor: any) => ({ estado: 'ok' as const, valor });
  const sinVotos = { estado: 'vacia' } as any;
  const t: TablaFicha = {
    id: 'T', titulo: 'Powerbanks', columna_titulo: 'nom', columnas: [
      { id: 'nom', nombre: 'Nombre', tipo: 'texto', config: {} },
      { id: 'pk', nombre: 'Precio por kWh', tipo: 'formula', config: { clave: 'precio_por_kwh', grupo: 'compra', ficha: 'precio_unidad', comparar: 'menor', unidad: '€/kWh' } },
      { id: 'gar', nombre: 'Garantía', tipo: 'numero', config: { clave: 'garantia_anios', grupo: 'garantia', comparar: 'mayor', unidad: 'años' } },
      { id: 'cic', nombre: 'Ciclos', tipo: 'numero', config: { clave: 'ciclos_declarados', grupo: 'tecnico', comparar: 'mayor' } },
      { id: 'com', nombre: 'Comisión', tipo: 'porcentaje', config: { grupo: 'compra', ficha: 'comision', comparar: 'mayor' } },
      { id: 'cal', nombre: 'Calidad', tipo: 'comunidad', config: { criterio: 'calidad' } },
      { id: 'eti', nombre: 'Ética', tipo: 'comunidad', config: { criterio: 'etica' } },
      { id: 'ret', nombre: 'Retiradas', tipo: 'relacion', config: { ficha: 'retiradas', tabla_destino: 'R' } },
      { id: 'retf', nombre: 'Retiradas comprobadas el', tipo: 'fecha', config: { ficha: 'retiradas_fecha', grupo: 'control' } },
    ],
    filas: [
      { id: 'a', pagina_id: 'PA', titulo: 'Anker', celdas: { pk: okc(1500), gar: okc(2), cic: okc(500), com: okc(0.3), cal: sinVotos, eti: sinVotos, retf: okc('2026-10-18') }, apuntados: { ret: [{ id: 'R1' } as any] } },
      { id: 'b', pagina_id: 'PB', titulo: 'Xiaomi', celdas: { pk: okc(900), gar: okc(2), cic: okc(300), com: okc(0), cal: sinVotos, eti: sinVotos, retf: okc('2026-10-18') } },
      { id: 'c', pagina_id: 'PC', titulo: 'Baseus', celdas: { pk: okc(1100), gar: okc(3), cic: okc(800), com: okc(0.1), cal: sinVotos, eti: sinVotos, retf: okc('2026-10-18') } },
    ],
  };
  const v = vistaAlternativas({ pagina_id: 'PA', fila_id: 'a', tabla: t, relacionadas: {} }, {})!;
  const nombres = v.criterios.map(c => c.criterio);
  ok(nombres.slice(0, 4).join(',') === 'Precio,Garantía,Ecología,Salud y seguridad', `primero los criterios de la valoración, por datos: ${nombres.join(', ')}`);
  ok(v.criterios.slice(0, 4).every(c => c.base === 'datos' && !!c.segun) && v.porDatos === true, 'cada uno dice con qué dato se decide');
  ok(!nombres.includes('Calidad') && !nombres.includes('Ética'), 'calidad y ética, sin votos, no se inventan');
  ok(!v.criterios.some(c => c.columnaId === 'com'), 'la comisión nunca es un criterio');
  const precio = v.criterios[0];
  ok(precio.ganador.nombre === 'Xiaomi' && precio.puesto?.n === 3, `precio: gana el menor €/kWh (Xiaomi) y Anker es 3.º (${precio.ganador.nombre}, ${precio.puesto?.n})`);
  const seg = v.criterios[3];
  ok(!seg.esEsta && seg.empates === 1 && /1 aviso/.test(seg.ganador.valor), `seguridad: dos sin retiradas, y este dice que tiene un aviso («${seg.ganador.valor}»)`);
  // With votes, the community takes over that criterion.
  const conVotos = { ...t, filas: t.filas.map((f, i) => ({ ...f, celdas: { ...f.celdas, cal: { estado: 'ok', valor: [3.2, 4.1, 3.8][i], media: 4, votos: 5 } as any } })) };
  const w = vistaAlternativas({ pagina_id: 'PA', fila_id: 'a', tabla: conVotos, relacionadas: {} }, {})!;
  ok(w.criterios[0].criterio === 'Calidad' && w.criterios[0].base === 'votos' && w.criterios[0].ganador.nombre === 'Xiaomi', 'con votos, la calidad la decide la comunidad');
}

console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
