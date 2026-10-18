// ============================================================================
// ¿VE UN VISITANTE ANÓNIMO «DÓNDE COMPRARLO»? (Wikiproducts W5, 2026-10-18)
// ============================================================================
//   bash scripts/wikiproducts/local.sh        # la copia local, en el 3005
//   node scripts/wikiproducts/probar-ofertas-anonimo.mjs
//
// La tabla de ofertas no se mete en ninguna página: se enseña a través del
// bloque «Ofertas» de la ficha. Así que no puede heredar la visibilidad de una
// página, y antes de este arreglo el bloque salía VACÍO para todo visitante.
// Comprueba, como anónimo:
//   1. Ficha privada → no se ven sus ofertas (403).
//   2. Ficha publicada (su tabla en una página pública) → se ven, ordenadas.
//   3. Una tabla de OTRA persona que apunta a la misma ficha no se cuela.
// Todo lo creado lleva «AI» en el título y se retira al terminar.
import fs from 'node:fs';
import assert from 'node:assert/strict';

const env = Object.fromEntries(fs.readFileSync('.env.wikiproducts-local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const B = env.HW_URL || 'http://localhost:3005';

async function entrar(email, password) {
  const r = await fetch(B + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (!r.ok) throw new Error(`No se ha podido entrar como ${email}: ${r.status}`);
  return r.headers.getSetCookie().map(x => x.split(';')[0]).join('; ');
}
const A = await entrar(env.ADMIN_EMAIL, env.ADMIN_PASSWORD);
const M = await entrar(env.MIEMBRO_EMAIL, env.MIEMBRO_PASSWORD);
// `KEY` es la clave de API de la administradora: `/api/v1` no acepta la cookie.
const KEY = { clave: env.HW_API_KEY };
async function api(ck, metodo, ruta, cuerpo) {
  const auth = ck === KEY ? { Authorization: `Bearer ${KEY.clave}` } : ck ? { Cookie: ck } : {};
  const r = await fetch(B + ruta, { method: metodo, headers: { 'Content-Type': 'application/json', ...auth }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  const j = await r.json().catch(() => null);
  return { s: r.status, j };
}
const ok = (c, m) => { if (!c.j || c.s >= 400) throw new Error(`${m}: ${c.s} ${JSON.stringify(c.j)}`); return c.j; };
const tabla = async (ck, t) => ok(await api(ck, 'POST', '/api/bd/tablas', { titulo: t }), t).id;
const col = async (ck, t, nombre, tipo, config = {}) => ok(await api(ck, 'POST', `/api/bd/tablas/${t}/columnas`, { nombre, tipo, config }), nombre).id;
const fila = async (ck, t, titulo, celdas) => ok(await api(ck, 'POST', `/api/bd/tablas/${t}/filas`, { titulo, celdas }), titulo).id;

const creadas = [];
let pagina = null;
try {
  const P = await tabla(A, 'AI prueba anónimo · Productos'); creadas.push([A, P]);
  const D = await tabla(A, 'AI prueba anónimo · Tiendas'); creadas.push([A, D]);
  const O = await tabla(A, 'AI prueba anónimo · Ofertas'); creadas.push([A, O]);
  const c = {
    prod: await col(A, O, 'Producto', 'relacion', { rol: 'producto', tabla_destino: P }),
    dist: await col(A, O, 'Distribuidor', 'relacion', { rol: 'distribuidor', tabla_destino: D }),
    precio: await col(A, O, 'Precio', 'moneda', { rol: 'precio', moneda: 'EUR' }),
    envio: await col(A, O, 'Envío', 'moneda', { rol: 'envio', moneda: 'EUR' }),
    com: await col(A, O, 'Comisión', 'porcentaje', { rol: 'comision' }),
  };
  const ficha = await fila(A, P, 'AI Powerbank de prueba');
  const norte = await fila(A, D, 'AI Tienda Norte');
  const sur = await fila(A, D, 'AI Tienda Sur');
  await fila(A, O, 'AI Oferta Norte', { [c.prod]: [ficha], [c.dist]: [norte], [c.precio]: 49.99, [c.envio]: 4.99, [c.com]: 4 });
  await fila(A, O, 'AI Oferta Sur', { [c.prod]: [ficha], [c.dist]: [sur], [c.precio]: 47, [c.envio]: 6 });

  // 1. Privada.
  let r = await api(null, 'GET', `/api/ofertas?fila=${ficha}`);
  assert.equal(r.s, 403, 'una ficha privada no enseña sus ofertas');
  console.log('  ✓ ficha privada: el anónimo no ve las ofertas');

  // 2. La tabla de productos en una página publicada; la de ofertas, en ninguna.
  pagina = ok(await api(KEY, 'POST', '/api/v1/pages', { title: 'AI prueba anónimo · Catálogo', markdown: 'AI página de prueba' }), 'página').id;
  ok(await api(A, 'PATCH', `/api/publicaciones/ventana/${pagina}`, { config: { bloques: [{ id: 'Bai1', tipo: 'basedatos', tabla_id: P }] } }), 'poner la base de datos');
  ok(await api(A, 'PUT', `/api/compartir/pagina/${pagina}`, { publico: true }), 'publicar');
  r = await api(null, 'GET', `/api/ofertas?fila=${ficha}`);
  assert.equal(r.s, 200, `ficha publicada: ${JSON.stringify(r.j)}`);
  assert.deepEqual(r.j.ofertas.map(o => o.distribuidor), ['AI Tienda Sur', 'AI Tienda Norte']);
  assert.equal(r.j.ofertas[1].comision_pct, 4);
  console.log('  ✓ ficha publicada: el anónimo ve las dos ofertas, ordenadas y con la comisión');

  // 3. Otra persona apunta su tabla a la misma ficha.
  const ajena = await tabla(M, 'AI prueba anónimo · Ofertas ajenas'); creadas.push([M, ajena]);
  const cp = await col(M, ajena, 'Producto', 'relacion', { rol: 'producto', tabla_destino: P });
  const cpr = await col(M, ajena, 'Precio', 'moneda', { rol: 'precio', moneda: 'EUR' });
  await fila(M, ajena, 'AI Oferta ajena', { [cp]: [ficha], [cpr]: 1 });
  r = await api(null, 'GET', `/api/ofertas?fila=${ficha}`);
  assert.equal(r.s, 200);
  assert.equal(r.j.tabla_id, O, 'sigue saliendo la tabla de la dueña de la ficha');
  r = await api(null, 'GET', `/api/ofertas?fila=${ficha}&tabla=${ajena}`);
  assert.equal(r.s, 403, 'una tabla ajena no se anuncia en la ficha');
  console.log('  ✓ una tabla de otra persona no se cuela en la ficha');
  console.log('\nOfertas para anónimos: todo bien.');
} finally {
  // La página primero: una tabla metida en una página no se deja retirar.
  if (pagina) await api(A, 'DELETE', `/api/publicaciones/ventana/${pagina}`);
  for (const [ck, t] of creadas.reverse()) {
    const r = await api(ck, 'DELETE', `/api/bd/tablas/${t}`);
    if (r.s >= 400) console.log(`  ! no se ha podido retirar la tabla ${t}: ${JSON.stringify(r.j)}`);
  }
}
