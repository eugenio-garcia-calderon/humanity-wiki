// ============================================================================
// CHECKS FOR THE PRODUCT SHEET'S DECISIONS (2026-10-18, Wikiproducts W1)
// ============================================================================
// Pure, no database, no server:   npx tsx scripts/wikiproducts/probar-ficha.ts
// It checks the rules that must hold whatever the data says, and above all
// the ethics code: THE COMMISSION NEVER ORDERS ANYTHING (plan §2.3).
import assert from 'node:assert/strict';
import { ordenable, mejoresEn, ordenarPor, calidadFicha, fechaRevision, type Ficha, type TablaFicha } from '../../src/components/bloquesDatos/ficha/modelo';
import { vistaAlternativas, vistaComparador, vistaRetiradas, vistaAfirmaciones, vistaPropiedad, porDefecto, veredictoDe } from '../../src/components/bloquesDatos/ficha/vistas';
import { metaFicha, tituloFicha } from '../../src/components/bloquesDatos/ficha/seo';
import { propiedadHtml, retiradaHtml, comparadorHtml, type Herramientas } from '../../src/components/bloquesDatos/ficha/html';

let n = 0;
const prueba = (nombre: string, fn: () => void) => {
  try { fn(); n++; console.log(`  ok  ${nombre}`); }
  catch (e) { console.error(`  MAL ${nombre}`); throw e; }
};

const ok = (valor: any) => ({ estado: 'ok' as const, valor });
const tabla: TablaFicha = {
  id: 'T', titulo: 'Powerbanks', columnas: [
    { id: 'nom', nombre: 'Nombre', tipo: 'texto', config: {} },
    { id: 'cap', nombre: 'Capacidad (Wh)', tipo: 'numero', config: { grupo: 'tecnico', comparar: 'mayor', unidad: 'Wh' } },
    { id: 'peso', nombre: 'Peso (kg)', tipo: 'numero', config: { grupo: 'tecnico', comparar: 'menor', unidad: 'kg' } },
    // A commission column someone configured to «rank»: it must still never rank.
    { id: 'com', nombre: 'Comisión', tipo: 'porcentaje', config: { grupo: 'compra', ficha: 'comision', comparar: 'mayor' } },
    { id: 'pre', nombre: 'Precio desde', tipo: 'agregado', config: { grupo: 'compra', ficha: 'precio_min', comparar: 'menor', formato: 'moneda' } },
    { id: 'med', nombre: 'Nota media', tipo: 'comunidad', config: { criterio: 'media' } },
    { id: 'cal', nombre: 'Calidad', tipo: 'comunidad', config: { criterio: 'calidad' } },
    { id: 'ret', nombre: 'Retiradas', tipo: 'relacion', config: { ficha: 'retiradas', tabla_destino: 'R' } },
    { id: 'retf', nombre: 'Retiradas comprobadas el', tipo: 'fecha', config: { ficha: 'retiradas_fecha', grupo: 'control' } },
    { id: 'res', nombre: 'Resumen', tipo: 'texto_largo', config: { ficha: 'resumen', visibilidad: 'nunca' } },
    { id: 'rev', nombre: 'Revisado', tipo: 'fecha', config: { ficha: 'revisado', grupo: 'control' } },
  ],
  columna_titulo: 'nom',
  filas: [
    { id: 'a', pagina_id: 'PA', titulo: 'Anker <b>737</b>', celdas: { cap: ok(86.4), peso: ok(0.63), com: ok(0.02), pre: ok(149), med: { estado: 'ok', valor: 4.1, media: 4.3, votos: 12 } as any, cal: { estado: 'ok', valor: 3.9, media: 4, votos: 12 } as any }, procedencia: { cap: { naturaleza: 'declarado', fuente: 'https://anker.com/737', fecha: '2026-10-01' } } },
    { id: 'b', pagina_id: 'PB', titulo: 'Xiaomi 20000', celdas: { cap: ok(74), peso: ok(0.43), com: ok(0.15), pre: ok(39), cal: { estado: 'ok', valor: 4.4, media: 4.5, votos: 30 } as any } },
    { id: 'c', pagina_id: 'PC', titulo: 'Baseus 30W', celdas: { cap: ok(37), peso: ok(0.21), com: ok(0.25), pre: ok(25), retf: ok('2026-10-10') } },
  ],
};
const ficha = (fila: string): Ficha => ({ pagina_id: `P${fila.toUpperCase()}`, fila_id: fila, tabla, relacionadas: {} });

console.log('Ficha de producto:');

prueba('la comisión nunca es ordenable, aunque su config diga «comparar»', () => {
  const com = tabla.columnas.find(c => c.id === 'com')!;
  assert.equal(ordenable(com), false);
  assert.equal(mejoresEn(tabla.filas, com).size, 0);
  assert.deepEqual(ordenarPor(tabla.filas, com), []);
});

prueba('«la mejor en cada criterio» no usa nunca la comisión', () => {
  for (const f of ['a', 'b', 'c']) {
    const v = vistaAlternativas(ficha(f), {})!;
    assert.ok(v.criterios.length > 0);
    assert.ok(!v.criterios.some(c => c.columnaId === 'com'), 'la comisión ha salido como criterio');
  }
  // Even asked for by name.
  const v = vistaAlternativas(ficha('a'), { columnas: ['com', 'cap'] })!;
  assert.deepEqual(v.criterios.map(c => c.columnaId), ['cap']);
});

prueba('el comparador no marca «mejor» en la comisión y sí en la capacidad', () => {
  const v = vistaComparador(tabla, ['b', 'c'], { actualId: 'a' })!;
  assert.ok(!v.lineas.some(l => l.columnaId === 'com'), 'la comisión no se compara: no es un dato del producto');
  const cap = v.lineas.find(l => l.columnaId === 'cap')!;
  assert.deepEqual(cap.celdas.map(c => c.mejor), [true, false, false]);
  const peso = v.lineas.find(l => l.columnaId === 'peso')!;
  assert.deepEqual(peso.celdas.map(c => c.mejor), [false, false, true]);
});

prueba('la elección por defecto del comparador es por cercanía de precio, nunca la fila actual', () => {
  assert.deepEqual(porDefecto(tabla, 'c'), ['b', 'a']);
  assert.ok(!porDefecto(tabla, 'a').includes('a'));
});

prueba('la nota de la comunidad ordena por la nota ajustada (valor), no por la media', () => {
  const cal = tabla.columnas.find(c => c.id === 'cal')!;
  assert.deepEqual(ordenarPor(tabla.filas, cal).map(f => f.id), ['b', 'a']);
});

prueba('«ninguna retirada» y «sin comprobar» son frases distintas', () => {
  assert.equal(vistaRetiradas(ficha('a'), {})!.estado, 'sin_comprobar');
  assert.equal(vistaRetiradas(ficha('c'), {})!.estado, 'ninguna');
  assert.equal(vistaRetiradas(null, { modo: 'manual', items: [{ titulo: 'Riesgo de incendio' }] })!.estado, 'hay');
  const h: Herramientas = { esc: (t: unknown) => String(t), enLinea: t => t, enlacePagina: id => `/p/${id}`, hrefSeguro: x => x };
  assert.match(retiradaHtml(ficha('a'), {}, h), /Todavía no hemos comprobado/);
  assert.match(retiradaHtml(ficha('c'), {}, h), /No conocemos ninguna retirada .* a fecha 10\/10\/2026/);
});

prueba('los veredictos se leen de la etiqueta y las falsas salen primero', () => {
  assert.equal(veredictoDe('Sin pruebas'), 'sin_pruebas');
  assert.equal(veredictoDe('FALSA'), 'falsa');
  const v = vistaAfirmaciones(null, { modo: 'manual', items: [{ afirmacion: 'x', veredicto: 'Cierta' }, { afirmacion: 'y', veredicto: 'Falsa' }] })!;
  assert.deepEqual(v.items.map(i => i.veredicto), ['cierta', 'falsa']);
});

prueba('una ficha delgada no se indexa y dice qué le falta (R10)', () => {
  const q = calidadFicha(ficha('a'));
  assert.equal(q.indexable, false);
  assert.ok(q.faltan.some(f => /foto/.test(f)) && q.faltan.some(f => /resumen/.test(f)));
});

prueba('sin fecha de revisión, la fecha es la del dato más reciente, nunca hoy (R11)', () => {
  assert.equal(fechaRevision(ficha('a')), '2026-10-01');
  assert.equal(fechaRevision(ficha('b')), null);
});

prueba('AggregateRating sólo con votos reales', () => {
  const conVotos = metaFicha(ficha('a'), { url: 'https://x/a' }).jsonLd[0];
  assert.equal(conVotos.aggregateRating.ratingCount, 12);
  assert.equal(conVotos.aggregateRating.ratingValue, 4.3);
  assert.equal(metaFicha(ficha('b'), { url: 'https://x/b' }).jsonLd[0].aggregateRating, undefined);
  assert.equal(metaFicha(ficha('a'), { url: null }).jsonLd[0].url, undefined);
});

prueba('cada tienda es un Offer; sin precio no sale, y la comisión nunca', () => {
  const base = { distribuidor: 'Tienda A', envio_centimos: 499, moneda: 'EUR', stock: 3, agotada: false, enlace: 'https://a.es/737' };
  const ofertas = [
    { ...base, precio_centimos: 12999, comision_pct: 5 },
    { ...base, distribuidor: 'Tienda B', precio_centimos: 13999, envio_centimos: null, stock: null, enlace: null },
    { ...base, distribuidor: 'Tienda C', precio_centimos: 9999, stock: 0, agotada: true },
    { ...base, distribuidor: 'Tienda D', precio_centimos: null },
  ];
  const ag = metaFicha(ficha('a'), { url: 'https://x/a', ofertas }).jsonLd[0].offers;
  assert.equal(ag['@type'], 'AggregateOffer');
  assert.equal(ag.offers.length, 3);
  assert.equal(ag.offerCount, 3);
  assert.equal(ag.lowPrice, 99.99);
  assert.equal(ag.highPrice, 139.99);
  const [a, b, c] = ag.offers;
  assert.equal(a.availability, 'https://schema.org/InStock');
  assert.equal(a.shippingDetails.shippingRate.value, 4.99);
  assert.equal(a.seller.name, 'Tienda A');
  assert.equal(b.availability, undefined);
  assert.equal(b.url, 'https://x/a');
  assert.equal(b.shippingDetails, undefined);
  assert.equal(c.availability, 'https://schema.org/OutOfStock');
  assert.ok(!JSON.stringify(ag).includes('comision'));
});

prueba('el título cabe en 60 caracteres sin cortar palabras', () => {
  assert.equal(tituloFicha('Anker 737', 'Wikiproducts'), 'Anker 737: datos, precio y opiniones | Wikiproducts');
  const largo = tituloFicha('EcoFlow DELTA Pro Ultra con panel solar de 400 W', 'Wikiproducts');
  assert.ok(largo.length <= 60, largo);
});

prueba('el HTML del servidor escapa lo que escribe la gente', () => {
  const esc = (t: unknown) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const h: Herramientas = { esc, enLinea: esc, enlacePagina: id => `/p/${id}`, hrefSeguro: x => (/^https?:/.test(x) ? x : null) };
  const html = comparadorHtml(ficha('b'), null, {}, h);
  assert.ok(!html.includes('<b>737'), html);
  assert.ok(html.includes('&lt;b&gt;737'));
  const tabla = propiedadHtml(ficha('a'), { estilo: 'tabla', grupo: 'tecnico' }, h);
  assert.match(tabla, /<th scope="row">Capacidad \(Wh\)<\/th><td>86,4 Wh <small>\(<a href="https:\/\/anker.com\/737"/);
});

prueba('las propiedades no enseñan la comisión ni las notas internas', () => {
  const v = vistaPropiedad(ficha('a'), { estilo: 'tabla' }) as any;
  assert.ok(!v.lineas.some((l: any) => l.columnaId === 'com' || l.columnaId === 'rev'));
});

console.log(`\n${n} comprobaciones, todas bien.`);
