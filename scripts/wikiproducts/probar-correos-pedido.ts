// ============================================================================
// ¿LLEGAN LOS CORREOS DE UN PEDIDO GESTIONADO? (Wikiproducts W5, 2026-10-18)
// ============================================================================
//   bash scripts/wikiproducts/local.sh        # la copia local, en el 3005
//   set -a; . /tmp/wikiproducts-local/servidor.env; set +a
//   npx tsx scripts/wikiproducts/probar-correos-pedido.ts
//
// SOLO EN LOCAL: escribe un pedido pagado directamente en la base de datos
// (simula lo que hace el webhook de Stripe) y se niega si SQL_HOST no es local.
// El correo no sale: `fetch` a Resend se intercepta y se cuenta. Comprueba:
//   1. Al pagar: un correo a quien gestiona (qué pedir a qué tienda) y otro al
//      comprador (código y dónde seguirlo).
//   2. El webhook repetido no manda los correos otra vez.
//   3. Sin RESEND_API_KEY no sale nada y el pedido sigue igual.
// Todo lo creado lleva «AI» en el título y se retira al terminar.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';

if (!['localhost', '127.0.0.1', ''].includes(process.env.SQL_HOST || '')) throw new Error('Solo en la copia local: SQL_HOST no es local.');
const { db } = await import('../../src/db/index');
const { registrarPedidoGestionado } = await import('../../src/server/pedidoGestionado');

const env = Object.fromEntries(fs.readFileSync('.env.wikiproducts-local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const B = env.HW_URL || 'http://localhost:3005';
const r0 = await fetch(B + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }) });
const A = r0.headers.getSetCookie().map(x => x.split(';')[0]).join('; ');
async function api(m: string, ruta: string, cuerpo?: any) {
  const r = await fetch(B + ruta, { method: m, headers: { 'Content-Type': 'application/json', Cookie: A }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  const j: any = await r.json().catch(() => null);
  if (r.status >= 400) throw new Error(`${m} ${ruta}: ${r.status} ${JSON.stringify(j)}`);
  return j;
}

// Los correos que «salen», interceptados.
const enviados: any[] = [];
const fetchReal = globalThis.fetch;
globalThis.fetch = (async (url: any, init?: any) => {
  if (String(url).startsWith('https://api.resend.com/')) { enviados.push(JSON.parse(init.body)); return new Response('{"id":"x"}', { status: 200 }); }
  return fetchReal(url, init);
}) as any;

const tablas: string[] = [];
const pedidos: string[] = [];
try {
  const P = (await api('POST', '/api/bd/tablas', { titulo: 'AI correos · Productos' })).id; tablas.push(P);
  const D = (await api('POST', '/api/bd/tablas', { titulo: 'AI correos · Tiendas' })).id; tablas.push(D);
  const O = (await api('POST', '/api/bd/tablas', { titulo: 'AI correos · Ofertas' })).id; tablas.push(O);
  const col = async (nombre: string, tipo: string, config: any) => (await api('POST', `/api/bd/tablas/${O}/columnas`, { nombre, tipo, config })).id;
  const c = {
    prod: await col('Producto', 'relacion', { rol: 'producto', tabla_destino: P }),
    dist: await col('Distribuidor', 'relacion', { rol: 'distribuidor', tabla_destino: D }),
    precio: await col('Precio', 'moneda', { rol: 'precio', moneda: 'EUR' }),
  };
  await col('Compra', 'compra', { modo: 'carrito' });
  const ficha = (await api('POST', `/api/bd/tablas/${P}/filas`, { titulo: 'AI Batería de prueba' })).id;
  const norte = (await api('POST', `/api/bd/tablas/${D}/filas`, { titulo: 'AI Tienda Norte' })).id;
  const sur = (await api('POST', `/api/bd/tablas/${D}/filas`, { titulo: 'AI Tienda Sur' })).id;
  const o1 = (await api('POST', `/api/bd/tablas/${O}/filas`, { titulo: 'AI Oferta Norte', celdas: { [c.prod]: [ficha], [c.dist]: [norte], [c.precio]: 100 } })).id;
  const o2 = (await api('POST', `/api/bd/tablas/${O}/filas`, { titulo: 'AI Oferta Sur', celdas: { [c.prod]: [ficha], [c.dist]: [sur], [c.precio]: 50 } })).id;
  // The product behind each buy cell is created when the offers are read.
  await api('GET', `/api/ofertas?fila=${ficha}&tabla=${O}`);
  const prods = (await db.execute(sql`SELECT id, created_by, distribuidor_nombre, bd_fila_id FROM products WHERE bd_fila_id IN (${o1}, ${o2}) AND archived_at IS NULL`)).rows as any[];
  assert.equal(prods.length, 2, 'cada oferta con botón de compra tiene su producto');
  assert.ok(prods.every(p => p.distribuidor_nombre), 'y su distribuidor');

  // Lo que escribe el webhook al pagar: el pedido y sus líneas.
  const pagar = async (codigo: string) => {
    const id = 'PEDAI' + Date.now().toString(36).toUpperCase() + codigo; pedidos.push(id);
    await db.execute(sql`
      INSERT INTO pedidos (id, codigo, producto_nombre, unidades, importe_centimos, comprador_email, comprador_nombre, vendedor_user_id, direccion_envio)
      VALUES (${id}, ${codigo}, 'AI Batería de prueba y 1 más', 1, 20000, 'comprador-ai@example.com', 'AI Comprador', ${prods[0].created_by},
              ${JSON.stringify({ name: 'AI Comprador', line1: 'Calle Falsa 1', postal_code: '28001', city: 'Madrid', country: 'ES' })}::jsonb)`);
    for (const [i, p] of prods.entries()) {
      await db.execute(sql`INSERT INTO pedido_lineas (id, pedido_id, producto_id, producto_nombre, unidades, precio_unitario_centimos)
        VALUES (${id + 'L' + i}, ${id}, ${p.id}, ${'AI ' + p.distribuidor_nombre}, ${i + 1}, ${p.bd_fila_id === o1 ? 10000 : 5000})`);
    }
    return id;
  };

  // 1. Al pagar, dos correos.
  process.env.RESEND_API_KEY = 're_prueba_local';
  const p1 = await pagar('AIC' + Math.floor(Math.random() * 1e6));
  assert.equal(await registrarPedidoGestionado(db, p1), 2, 'dos tiendas, dos filas en la cola');
  assert.equal(enviados.length, 2, `dos correos: ${JSON.stringify(enviados.map(e => e.subject))}`);
  const [aDueno, aCliente] = enviados;
  assert.match(aDueno.subject, /pagado: hay que pedirlo a 2 tiendas/);
  assert.match(aDueno.text, /AI Tienda Norte: 100,00\s€/);
  assert.match(aDueno.text, /AI Tienda Sur: 100,00\s€/);   // 2 × 50 €
  assert.match(aDueno.text, /Calle Falsa 1, 28001 Madrid, ES/);
  assert.match(aDueno.text, /\/comercio\?pestana=distribuidores/);
  assert.equal(aCliente.to[0], 'comprador-ai@example.com');
  assert.match(aCliente.subject, /Tu pedido AIC\d+/);
  assert.match(aCliente.text, /Tu código de pedido es AIC\d+/);
  console.log('  ✓ al pagar: un correo a quien gestiona y otro al comprador');

  // 2. Stripe repite el aviso: nada nuevo.
  assert.equal(await registrarPedidoGestionado(db, p1), 0);
  assert.equal(enviados.length, 2, 'el aviso repetido no manda otra vez');
  console.log('  ✓ el webhook repetido no duplica los correos');

  // 3. Sin proveedor de correo: no sale nada y la cola se crea igual.
  delete process.env.RESEND_API_KEY;
  const p2 = await pagar('AID' + Math.floor(Math.random() * 1e6));
  assert.equal(await registrarPedidoGestionado(db, p2), 2, 'la cola se crea aunque no haya correo');
  assert.equal(enviados.length, 2);
  console.log('  ✓ sin RESEND_API_KEY no sale nada y el pedido sigue adelante');
  console.log('\nCorreos del pedido gestionado: todo bien.');
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  globalThis.fetch = fetchReal;
  for (const id of pedidos) {
    await db.execute(sql`DELETE FROM notifications WHERE entity_type = 'pedidos' AND entity_id = ${id}`);
    await db.execute(sql`DELETE FROM pedidos_distribuidor WHERE pedido_id = ${id}`);
    await db.execute(sql`DELETE FROM pedidos WHERE id = ${id}`);
  }
  for (const t of tablas.reverse()) await api('DELETE', `/api/bd/tablas/${t}`).catch(e => console.log('  ! ' + e.message));
  process.exit();
}
