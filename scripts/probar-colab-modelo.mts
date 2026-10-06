import * as Y from 'yjs';
import { firma, construirDesdePlano, aplicarCambios, leerPlano, resucitarEditados, vigilar, limpiarOrden } from '../src/utils/colabModelo.ts';
const ok = (c: boolean, m: string) => { console.log((c ? 'OK   ' : 'FALLA'), m); if (!c) process.exitCode = 1; };
const sync = (a: Y.Doc, b: Y.Doc) => { Y.applyUpdate(b, Y.encodeStateAsUpdate(a, Y.encodeStateVector(b))); Y.applyUpdate(a, Y.encodeStateAsUpdate(b, Y.encodeStateVector(a))); };
const base = { titulo: 'Hola', bloques: [
  { id: 'A', tipo: 'parrafo', texto: 'uno' }, { id: 'B', tipo: 'parrafo', texto: 'dos' }, { id: 'C', tipo: 'lista', texto: 'tres', nivel: 1 },
  { id: 'T', tipo: 'tabla', filas: [['a','b'],['c','d']] } ] as any };
const s = new Y.Doc(); construirDesdePlano(s, base);
const d1 = new Y.Doc(), d2 = new Y.Doc(); sync(s, d1); sync(s, d2);
ok(firma(leerPlano(d1)) === firma(base), 'ida y vuelta del plano');
// 1. mismo párrafo a la vez
const p1 = leerPlano(d1), p2 = leerPlano(d2);
const m1 = structuredClone(p1); m1.bloques[0].texto = 'HOLA uno';
const m2 = structuredClone(p2); m2.bloques[0].texto = 'uno mundo';
aplicarCambios(d1, p1, m1); aplicarCambios(d2, p2, m2); sync(d1, d2);
ok(JSON.stringify(leerPlano(d1)) === JSON.stringify(leerPlano(d2)), 'convergen');
console.log(leerPlano(d1).bloques[0].texto);
ok(leerPlano(d1).bloques[0].texto === 'HOLA uno mundo', 'no pierde texto');
// 2. mover B al final mientras otro lo edita
let q1 = leerPlano(d1), q2 = leerPlano(d2);
const n1 = structuredClone(q1); const [bb] = n1.bloques.splice(1, 1); n1.bloques.push(bb);
const n2 = structuredClone(q2); n2.bloques[1].texto = 'dos EDITADO';
aplicarCambios(d1, q1, n1); aplicarCambios(d2, q2, n2); sync(d1, d2);
const r = leerPlano(d1).bloques.map(b => b.id + ':' + b.texto).join(' | '); console.log(r);
ok(r === leerPlano(d2).bloques.map(b => b.id + ':' + b.texto).join(' | '), 'convergen tras mover');
ok(leerPlano(d1).bloques.find(b => b.id === 'B')!.texto === 'dos EDITADO', 'el movido conserva la edición');
// 3. borrar mientras otro edita -> resucita
q1 = leerPlano(d1); q2 = leerPlano(d2);
const z1 = structuredClone(q1); z1.bloques = z1.bloques.filter(b => b.id !== 'A');
const z2 = structuredClone(q2); z2.bloques[0].texto = 'HOLA uno mundo !!!';
aplicarCambios(d1, q1, z1); aplicarCambios(d2, q2, z2);
// el servidor
const srv = new Y.Doc(); sync(d1, srv); 
const tocados = new Set<string>(); const off = vigilar(srv, (c) => { for (const t of c.tocados) tocados.add(t); });
Y.applyUpdate(srv, Y.encodeStateAsUpdate(d2, Y.encodeStateVector(srv)));
ok(!leerPlano(srv).bloques.some(b => b.id === 'A'), 'tras fusionar, A sigue borrado (aún)');
const vuelve = resucitarEditados(srv, tocados); ok(vuelve.includes('A'), 'se resucita A: ' + vuelve);
ok(leerPlano(srv).bloques[0].id === 'A' && leerPlano(srv).bloques[0].texto === 'HOLA uno mundo !!!', 'A vuelve en su sitio con la edición');
off();
// 4. tabla: celdas distintas
sync(srv, d1); sync(srv, d2);
q1 = leerPlano(d1); q2 = leerPlano(d2);
const t1 = structuredClone(q1); t1.bloques.find(b => b.id === 'T')!.filas![0][0] = 'AA';
const t2 = structuredClone(q2); t2.bloques.find(b => b.id === 'T')!.filas![1][1] = 'DD';
aplicarCambios(d1, q1, t1); aplicarCambios(d2, q2, t2); sync(d1, d2);
ok(JSON.stringify(leerPlano(d1).bloques.find(b => b.id === 'T')!.filas) === '[["AA","b"],["c","DD"]]', 'tabla: dos celdas');
// 5. mover a la vez el mismo bloque -> duplicado en orden, se lee una vez, se limpia
q1 = leerPlano(d1); q2 = leerPlano(d2);
const w1 = structuredClone(q1), w2 = structuredClone(q2);
const [x1] = w1.bloques.splice(0, 1); w1.bloques.splice(2, 0, x1);
const [x2] = w2.bloques.splice(0, 1); w2.bloques.push(x2);
aplicarCambios(d1, q1, w1); aplicarCambios(d2, q2, w2); sync(d1, d2);
const ids = leerPlano(d1).bloques.map(b => b.id); console.log(ids.join(','));
ok(new Set(ids).size === ids.length && ids.length === 4, 'sin duplicados al leer');
ok(limpiarOrden(d1), 'limpieza quitó repetidos');
// emoji
const e1 = leerPlano(d1); const e2 = structuredClone(e1); e2.bloques[0].texto = '😀' + e2.bloques[0].texto; aplicarCambios(d1, e1, e2);
const e3 = structuredClone(e2); e3.bloques[0].texto = e3.bloques[0].texto.replace('😀', '😁'); aplicarCambios(d1, e2, e3);
ok(leerPlano(d1).bloques[0].texto.startsWith('😁'), 'emoji ok');
