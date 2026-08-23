import { REGLAS, esperaPendiente, anotarFallo, levantarFreno, ritmo, ipDe } from '../src/server/limites/index.js';

async function main() {

// La base de datos de mentira solo cuenta cuántas filas se habrían escrito:
// los valores de una consulta de drizzle viajan aparte del texto, así que
// buscarlos dentro de la cadena no probaría nada. Lo que hay que demostrar es
// CUÁNTAS se escriben y cuándo, no qué pone dentro.
const filas: any[] = [];
const db = { execute: async (q: any) => { filas.push(q); return { rows: [] }; } };
const R = REGLAS.login;
let ok = 0, mal = 0;
const es = (n: string, a: any, b: any) => { const g = JSON.stringify(a) === JSON.stringify(b); g ? ok++ : mal++; console.log(`${g ? '  ok  ' : ' FALLO'} ${n}: ${JSON.stringify(a)}${g ? '' : ' != ' + JSON.stringify(b)}`); };

console.log('\n== 1 · Los tres fallos de gracia no frenan a nadie ==');
for (let i = 1; i <= 3; i++) await anotarFallo(db, R, '1.1.1.1', 'ana@x.com', true);
es('espera tras 3 fallos', esperaPendiente(R, '1.1.1.1', 'ana@x.com'), 0);

console.log('\n== 2 · El cuarto empieza a frenar, y crece ==');
await anotarFallo(db, R, '1.1.1.1', 'ana@x.com', true);
es('4o fallo -> 5 s', esperaPendiente(R, '1.1.1.1', 'ana@x.com'), 5);
await anotarFallo(db, R, '1.1.1.1', 'ana@x.com', true);
es('5o fallo -> 10 s', esperaPendiente(R, '1.1.1.1', 'ana@x.com'), 10);
await anotarFallo(db, R, '1.1.1.1', 'ana@x.com', true);
es('6o fallo -> 20 s', esperaPendiente(R, '1.1.1.1', 'ana@x.com'), 20);

console.log('\n== 3 · LA REGLA 3: quien acierta no paga el retraso ajeno ==');
// Alguien ataca la cuenta de Bea desde otra IP. Bea entra desde la suya.
const antesDeBea = filas.length;
for (let i = 0; i < 6; i++) await anotarFallo(db, R, '9.9.9.9', 'bea@x.com', true);
es('los 6 intentos contra bea quedan escritos', filas.length - antesDeBea, 6);
es('bea frenada desde cualquier ip', esperaPendiente(R, '2.2.2.2', 'bea@x.com') > 0, true);
levantarFreno(R, '2.2.2.2', 'bea@x.com');
es('bea acierta y queda libre', esperaPendiente(R, '2.2.2.2', 'bea@x.com'), 0);

console.log('\n== 4 · LA REGLA 4: el freno se limpia, el rastro NO ==');
const antes = filas.length;
levantarFreno(R, '9.9.9.9', 'bea@x.com');
es('levantarFreno no escribe en la base', filas.length, antes);
es('el rastro sigue teniendo los 6 de bea despues de acertar', filas.length - antesDeBea, 6);

console.log('\n== 5 · LA REGLA 1: la IP frena aunque cambie de cuenta ==');
for (let i = 0; i < 6; i++) await anotarFallo(db, R, '7.7.7.7', `c${i}@x.com`, false);
es('misma ip, cuentas distintas -> frenada', esperaPendiente(R, '7.7.7.7', 'nueva@x.com') > 0, true);
es('otra ip con esa cuenta nueva, libre', esperaPendiente(R, '3.3.3.3', 'nueva@x.com'), 0);

console.log('\n== 6 · El tope no se pasa ==');
for (let i = 0; i < 30; i++) await anotarFallo(db, R, '8.8.8.8', 'tope@x.com', true);
const e = esperaPendiente(R, '8.8.8.8', 'tope@x.com');
es('espera <= tope de 900 s', e <= 900 && e > 800, true);

console.log('\n== 7 · La IP se lee de Cloudflare primero ==');
es('cf-connecting-ip gana', ipDe({ headers: { 'cf-connecting-ip': '5.5.5.5', 'x-forwarded-for': '6.6.6.6' } } as any), '5.5.5.5');
es('sin cf, el primero de xff', ipDe({ headers: { 'x-forwarded-for': '6.6.6.6, 10.0.0.1' } } as any), '6.6.6.6');

console.log('\n== 8 · `ritmo` frena igual pero NO ensucia el rastro ==');
// Corrección de prog7: enviar puntos once veces seguidas no es un fallo.
const antesDeRitmo = filas.length;
const T = { puerta: 'transferencia', gracia: 3, baseSegundos: 5, topeSegundos: 900, alFallar: 'cerrar' as const };
for (let i = 0; i < 5; i++) ritmo(T, '4.4.4.4', 'rapido@x.com');
es('frena igual que un fallo', esperaPendiente(T, '4.4.4.4', 'rapido@x.com') > 0, true);
es('y no escribe NI UNA fila en el rastro', filas.length - antesDeRitmo, 0);
es('no se mezcla con la puerta del login', esperaPendiente(R, '4.4.4.4', 'rapido@x.com'), 0);

console.log(`\n${mal === 0 ? 'TODO BIEN' : 'HAY FALLOS'} — ${ok} bien, ${mal} mal\n`);
process.exit(mal === 0 ? 0 : 1);

}
main();
