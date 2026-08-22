// ============================================================================
// QUE UN ADMINISTRADOR NO PUEDA ASOMARSE, Y QUE MIRAR DEJE RASTRO (2026-08-22)
// ============================================================================
//     npx tsx scripts/probar-transparencia.ts
//
// Se monta el módulo sobre un Express de mentira, con una base de datos de
// mentira que solo apunta lo que se le pide. No hace falta Postgres ni sesiones
// de verdad: lo que se comprueba aquí es la DECISIÓN —quién pasa, quién no y
// qué queda anotado— y eso es una función de la petición, no de los datos.
import express from 'express';
import { registrarTransparencia, NO_SE_ASOMAN } from '../src/server/seguridad/transparencia.js';

let fallos = 0;
const comprobar = (que: string, bien: boolean, detalle = '') => {
  if (bien) console.log(`  ✓ ${que}`);
  else { fallos++; console.log(`  ✗ ${que}${detalle ? `\n      ${detalle}` : ''}`); }
};

/** Una base de datos que no guarda nada y apunta lo que le mandan. `anotar`
 *  hace tres consultas: la última huella, el siguiente número y el INSERT. */
const anotaciones: string[] = [];
const dbFalsa = {
  execute: async (q: any) => {
    const texto = JSON.stringify(q?.queryChunks ?? q ?? '');
    if (texto.includes('nextval')) return { rows: [{ n: anotaciones.length + 1 }] };
    if (texto.includes('INSERT INTO registro_sellado')) {
      // La clase viaja como parámetro dentro de la plantilla de drizzle; se
      // busca en el texto entero en vez de adivinar su forma interna.
      const clase = texto.match(/lectura_(denegada|privilegiada)/)?.[0];
      anotaciones.push(String(clase ?? 'anotación sin clase reconocida'));
      return { rows: [] };
    }
    return { rows: [] };
  },
};

/** Un servidor con el módulo delante y, detrás, la ruta que se quiere proteger
 *  (la de `server.ts`), que aquí solo dice «he llegado». */
const app = express();
let usuario: any = null;
app.use((req: any, _res, next) => { req.user = usuario; next(); });
registrarTransparencia(app as any, dbFalsa);
app.get('/api/db/tables/:name', (_req, res) => { res.json({ llegue: true }); });
app.get('/api/db/tables', (_req, res) => { res.json({ llegue: true }); });
app.get('/api/admin/users', (_req, res) => { res.json({ llegue: true }); });

const servidor = app.listen(0);
const puerto = (servidor.address() as any).port;
const pedir = async (ruta: string) => {
  const r = await fetch(`http://127.0.0.1:${puerto}${ruta}`);
  return { estado: r.status, cuerpo: await r.json().catch(() => ({})) };
};

try {
  console.log('\nLA PUERTA ANCHA, CERRADA');
  usuario = { id: 'U_ADMIN', roleLevel: 4 };
  const mensajes = await pedir('/api/db/tables/mensajes');
  comprobar('un administrador NO puede asomarse a los mensajes privados',
    mensajes.estado === 403 && !mensajes.cuerpo.llegue, JSON.stringify(mensajes));
  comprobar('y se le dice por qué, no un «no puedes» seco',
    String(mensajes.cuerpo.error || '').includes('conversaciones privadas'));
  comprobar('el intento queda anotado', anotaciones.includes('lectura_denegada'),
    JSON.stringify(anotaciones));

  const territorios = await pedir('/api/db/tables/territories');
  comprobar('lo que sí es común se sigue pudiendo mirar', territorios.cuerpo.llegue === true);

  console.log('\nA QUIEN NO MANDA, LE CONTESTA LA RUTA DE SIEMPRE');
  usuario = { id: 'U_NORMAL', roleLevel: 1 };
  const normal = await pedir('/api/db/tables/mensajes');
  comprobar('a un usuario normal no se le enseña siquiera que esa tabla está apartada',
    normal.cuerpo.llegue === true,
    'contestar nosotros le regalaría información a cambio de nada; la ruta ya le dirá que no');

  console.log('\nMIRAR DEJA RASTRO');
  anotaciones.length = 0;
  usuario = { id: 'U_ADMIN', roleLevel: 4 };
  await pedir('/api/admin/users');
  await new Promise((r) => setTimeout(r, 50));
  comprobar('un administrador leyendo la lista de personas queda anotado',
    anotaciones.includes('lectura_privilegiada'), JSON.stringify(anotaciones));

  anotaciones.length = 0;
  usuario = { id: 'U_NORMAL', roleLevel: 1 };
  await pedir('/api/admin/users');
  await new Promise((r) => setTimeout(r, 50));
  comprobar('y un usuario normal pidiendo lo mismo NO llena el registro',
    anotaciones.length === 0,
    'la ruta le va a decir que no; anotar cada intento fallido enterraría lo que importa');

  console.log('\nLA LISTA');
  comprobar('todo lo apartado dice por qué lo está',
    [...NO_SE_ASOMAN.values()].every((v) => v.length > 15));
  comprobar('están las conversaciones, las sesiones y los datos de la gente',
    ['mensajes', 'sessions', 'bd_filas', 'ai_messages'].every((t) => NO_SE_ASOMAN.has(t)));
} finally {
  servidor.close();
}

console.log('');
if (fallos) { console.log(`✗ ${fallos} comprobación(es) mal.\n`); process.exit(1); }
console.log('✓ Todo correcto.\n');
