// ============================================================================
// PRUEBA DE LAS OFERTAS Y DEL PEDIDO GESTIONADO (Wikiproducts W5, 2026-10-18)
// ============================================================================
//   npx tsx scripts/probar-ofertas.ts
//
// Sin base de datos: comprueba las reglas puras que no pueden fallar.
//   1. EL ORDEN NUNCA LEE LA COMISIÓN (código ético). Se barajan las
//      comisiones entre las ofertas y el orden tiene que salir idéntico.
//   2. El orden es el de quien compra: precio + envío, luego la atención al
//      cliente, y lo agotado al final.
//   3. Dos tiendas son dos cajas: el envío se suma por distribuidor; una
//      tienda sin ofertas paga exactamente lo de antes.
//   4. El pedido del cliente avanza solo cuando avanzan TODAS sus tiendas.
//   5. La caja de compra de cada oferta (entrega, envío, devoluciones,
//      garantía, stock, fecha del precio) dice «no lo sabemos» de forma
//      distinguible de un dato, y nunca «Entrega: desconocido».
import assert from 'node:assert/strict';
import { ordenarOfertas, comisionDeLinea, textoComision, relEnlaceTienda, lineasCompra, textoEnvioTienda, type CondicionesTienda } from '../src/utils/ofertas';
import { calcularEnvio } from '../src/server/zonasEnvio';
import { calcularEnvioPorDistribuidor, estadoDeducido } from '../src/server/pedidoGestionado';

let n = 0;
const ok = (nombre: string, f: () => void) => { f(); n++; console.log(`  ✓ ${nombre}`); };

const base = [
  { id: 'a', distribuidor_nombre: 'Tienda A', precio_centimos: 9999, envio_centimos: 0, nota_distribuidor: 4.1, comision_pct: 1 },
  { id: 'b', distribuidor_nombre: 'Tienda B', precio_centimos: 9499, envio_centimos: 499, nota_distribuidor: 4.8, comision_pct: 12 },
  { id: 'c', distribuidor_nombre: 'Tienda C', precio_centimos: 8999, envio_centimos: 1500, nota_distribuidor: null, comision_pct: null },
  { id: 'd', distribuidor_nombre: 'Tienda D', precio_centimos: 7000, envio_centimos: 0, nota_distribuidor: 5, comision_pct: 30, agotada: true },
  { id: 'e', distribuidor_nombre: 'Tienda E', precio_centimos: null, envio_centimos: null, nota_distribuidor: 3, comision_pct: 50 },
];

console.log('Ofertas');
ok('el orden es precio con envío, luego nota; agotadas y sin precio al final', () => {
  // B 99,98 < A 99,99 < C 104,99; E no tiene precio; D está agotada.
  assert.deepEqual(ordenarOfertas(base).map(o => o.id), ['b', 'a', 'c', 'e', 'd']);
});
ok('a igual precio final, gana la mejor atención al cliente', () => {
  const r = ordenarOfertas([
    { id: 'x', distribuidor_nombre: 'X', precio_centimos: 1000, envio_centimos: 0, nota_distribuidor: 3.9 },
    { id: 'y', distribuidor_nombre: 'Y', precio_centimos: 900, envio_centimos: 100, nota_distribuidor: 4.6 },
  ]);
  assert.deepEqual(r.map(o => o.id), ['y', 'x']);
});
ok('barajar las comisiones NO cambia el orden (todas las permutaciones)', () => {
  const esperado = ordenarOfertas(base).map(o => o.id);
  const comisiones = base.map(o => o.comision_pct);
  const permutar = (xs: any[]): any[][] => xs.length <= 1 ? [xs] : xs.flatMap((x, i) => permutar([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p]));
  for (const p of permutar(comisiones)) {
    const barajadas = base.map((o, i) => ({ ...o, comision_pct: p[i] }));
    assert.deepEqual(ordenarOfertas(barajadas).map(o => o.id), esperado);
  }
});
ok('la comisión va sobre el precio de los productos, nunca sobre el envío', () => {
  assert.equal(comisionDeLinea(9999, 2, 4), 800);
  assert.equal(comisionDeLinea(9999, 1, null), null);
  assert.equal(comisionDeLinea(9999, 1, 0), null);
});
ok('la frase de la comisión y el rel del enlace', () => {
  assert.match(textoComision(null, null), /Sin comisión/);
  assert.match(textoComision(4, 400), /4 % \(4,00\s€\)/);
  assert.equal(relEnlaceTienda(4), 'sponsored noopener');
  assert.equal(relEnlaceTienda(null), 'nofollow noopener');
});

console.log('Envío por distribuidor');
const tarifa = (centimos: number, gratis: number | null = null) => [{ zona: 'peninsula' as const, centimos, gratis_desde_centimos: gratis }];
const tarifas = new Map([
  ['p1', tarifa(499)], ['p2', tarifa(300)], ['p3', tarifa(1500, 10000)], ['propio', tarifa(700)], ['propio2', tarifa(200)],
]);
ok('sin ofertas de distribuidor, el envío es exactamente el de siempre', () => {
  const ls = [{ p: { id: 'propio' }, unidades: 1, precio: 1000 }, { p: { id: 'propio2' }, unidades: 1, precio: 500 }];
  const { por_distribuidor, ...resto } = calcularEnvioPorDistribuidor(ls, 1500, 'peninsula', tarifas);
  assert.deepEqual(resto, calcularEnvio(ls, 1500, 'peninsula', tarifas));
  assert.equal(resto.centimos, 700);
  assert.deepEqual(por_distribuidor, []);
});
ok('dos tiendas son dos portes; dentro de cada una, el más caro', () => {
  const ls = [
    { p: { id: 'p1', distribuidor_id: 'A', distribuidor_nombre: 'Tienda A' }, unidades: 1, precio: 2000 },
    { p: { id: 'p2', distribuidor_id: 'A', distribuidor_nombre: 'Tienda A' }, unidades: 1, precio: 1000 },
    { p: { id: 'p3', distribuidor_id: 'B', distribuidor_nombre: 'Tienda B' }, unidades: 1, precio: 5000 },
  ];
  const r = calcularEnvioPorDistribuidor(ls, 8000, 'peninsula', tarifas);
  assert.equal(r.centimos, 499 + 1500);
  assert.equal(r.por_distribuidor.length, 2);
});
ok('el envío gratis de una tienda se mide con lo de esa tienda, no con toda la cesta', () => {
  const ls = [
    { p: { id: 'p1', distribuidor_id: 'A' }, unidades: 1, precio: 9000 },
    { p: { id: 'p3', distribuidor_id: 'B' }, unidades: 1, precio: 5000 },
  ];
  // La cesta pasa de 100 € pero la parte de B no: B cobra su porte.
  assert.equal(calcularEnvioPorDistribuidor(ls, 14000, 'peninsula', tarifas).centimos, 499 + 1500);
  const ls2 = [{ p: { id: 'p3', distribuidor_id: 'B' }, unidades: 2, precio: 5000 }];
  assert.equal(calcularEnvioPorDistribuidor(ls2, 10000, 'peninsula', tarifas).centimos, 0);
});
ok('si una tienda no llega a la zona, no se cobra nada', () => {
  const ls = [{ p: { id: 'p1', distribuidor_id: 'A', name: 'Powerbank' }, unidades: 1, precio: 1000 }];
  const r = calcularEnvioPorDistribuidor(ls, 1000, 'europa', tarifas);
  assert.equal(r.se_envia, false);
});

console.log('Estado del pedido del cliente');
ok('avanza solo cuando avanzan todas sus tiendas', () => {
  assert.equal(estadoDeducido(['pendiente', 'pendiente']), 'pagado');
  assert.equal(estadoDeducido(['pedido_hecho', 'pendiente']), 'preparando');
  assert.equal(estadoDeducido(['enviado', 'pedido_hecho']), 'preparando');
  assert.equal(estadoDeducido(['enviado', 'entregado']), 'enviado');
  assert.equal(estadoDeducido(['entregado', 'entregado']), 'entregado');
  assert.equal(estadoDeducido(['entregado', 'cancelado']), 'entregado');
  assert.equal(estadoDeducido(['incidencia']), 'pagado');
});

console.log('Caja de compra de cada oferta');
const tienda: CondicionesTienda = {
  envia_a_espana: true,
  entrega_min_dias: 1, entrega_max_dias: 2, envio_centimos: 499, envio_gratis_desde_centimos: 5000,
  devolucion_dias: 30, devolucion_gratis: true, garantia: 'La tienda', condiciones_url: 'https://x.test/envios', condiciones_fecha: '2026-10-18',
};
const oferta = { precio_centimos: 9599, envio_centimos: null, moneda: 'EUR', stock: null, agotada: false, plazo: 'desconocido', comprobado: '2026-10-18', tienda };
const texto = (o: any) => Object.fromEntries(lineasCompra(o).map(l => [l.clave, l.texto]));
ok('las condiciones de la tienda llenan la caja; «desconocido» no es un plazo', () => {
  const t = texto(oferta);
  assert.equal(t.entrega, 'Entrega en 1–2 días');
  assert.equal(t.devolucion, 'Devolución gratuita en 30 días');
  assert.equal(t.garantia, 'Garantía: la gestiona la tienda');
  assert.equal(t.stock, 'Disponibilidad sin confirmar');
  assert.match(t.comprobado, /^Precio comprobado el 18 de octubre de 2026$/);
  assert.equal(texto({ ...oferta, plazo: '24-48 h' }).entrega, 'Entrega: 24-48 h');
});
ok('sin condiciones, cada línea dice que no se sabe (y se marca como no sabida)', () => {
  const l = lineasCompra({ ...oferta, tienda: null });
  assert.deepEqual(l.filter(x => !x.sabido).map(x => x.clave), ['entrega', 'devolucion', 'garantia']);
  assert.ok(!l.some(x => /desconocido/i.test(x.texto)));
});
ok('el envío de la tienda depende del precio y del umbral de envío gratis', () => {
  // Intl puts a no-break space before «€».
  assert.match(textoEnvioTienda(oferta)!, /^Envío gratis \(pedidos desde 50\s€\)$/);
  assert.match(textoEnvioTienda({ ...oferta, precio_centimos: 2000 })!, /^Envío 4,99\s€, gratis desde 50\s€$/);
  assert.equal(textoEnvioTienda({ ...oferta, tienda: { ...tienda, envio_gratis_desde_centimos: 0 } }), 'Envío gratis');
  // The offer's own shipping wins: the shop rule is only a fallback.
  assert.equal(textoEnvioTienda({ ...oferta, envio_centimos: 300 }), null);
});

console.log(`\n${n} comprobaciones, todas bien.`);
