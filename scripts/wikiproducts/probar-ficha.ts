// ============================================================================
// CHECKS FOR THE PRODUCT SHEET'S DECISIONS (2026-10-18, Wikiproducts W1)
// ============================================================================
// Pure, no database, no server:   npx tsx scripts/wikiproducts/probar-ficha.ts
// It checks the rules that must hold whatever the data says, and above all
// the ethics code: THE COMMISSION NEVER ORDERS ANYTHING (plan §2.3).
import assert from 'node:assert/strict';
import { conUnidad, ordenable, mejoresEn, ordenarPor, calidadFicha, fechaRevision, etiquetaProcedencia, propiedadesTarjeta, etiquetaColumna, textoDe, procedenciaDe, type Ficha, type TablaFicha } from '../../src/components/bloquesDatos/ficha/modelo';
import { vistaAlternativas, vistaComparador, vistaRetiradas, vistaAfirmaciones, vistaPropiedad, porDefecto, veredictoDe } from '../../src/components/bloquesDatos/ficha/vistas';
import { metaFicha, tituloFicha } from '../../src/components/bloquesDatos/ficha/seo';
import { propiedadHtml, retiradaHtml, comparadorHtml, type Herramientas } from '../../src/components/bloquesDatos/ficha/html';
import { calcular } from '../../src/server/bd/formulas';

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

prueba('por defecto, un producto sin precio va detrás de los que tienen precio', () => {
  // Xiaomi is closest to Baseus in price, but with no price it goes last.
  const t = { ...tabla, filas: tabla.filas.map(f => f.id === 'b' ? { ...f, celdas: { ...f.celdas, pre: { estado: 'vacia' } as any } } : f) };
  assert.deepEqual(porDefecto(t, 'c'), ['a', 'b']);
  assert.deepEqual(porDefecto(t, 'c', 1), ['a']);
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
  assert.ok(q.faltan.some(f => /resumen/.test(f)));
});

prueba('la foto no decide si se indexa: se apunta como mejora (R10, 2026-10-18)', () => {
  const q = calidadFicha(ficha('a'));
  assert.ok(!q.faltan.some(f => /foto/.test(f)));
  assert.ok(q.mejoras.some(f => /foto/.test(f)));
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
  assert.match(tabla, /<th scope="row">Capacidad<\/th><td>86,4 Wh <small>\(<a href="https:\/\/anker.com\/737"/);
});

prueba('las propiedades no enseñan la comisión ni las notas internas', () => {
  const v = vistaPropiedad(ficha('a'), { estilo: 'tabla' }) as any;
  assert.ok(!v.lineas.some((l: any) => l.columnaId === 'com' || l.columnaId === 'rev'));
});

prueba('la procedencia se dice según quién la da y qué falta', () => {
  assert.equal(etiquetaProcedencia({ naturaleza: 'tercero', fuente: 'https://www.pccomponentes.com/x' }), 'Según pccomponentes.com');
  assert.equal(etiquetaProcedencia({ naturaleza: 'declarado', fuente: 'https://anker.com/x' }), 'Según la marca · anker.com');
  const pruebas: any = { id: 'p', nombre: 'Pruebas independientes', tipo: 'texto', config: { clave: 'pruebas_independientes' } };
  assert.equal(etiquetaProcedencia({ naturaleza: 'no_publicado' }, pruebas), 'No hay pruebas independientes publicadas');
  assert.equal(etiquetaProcedencia({ naturaleza: 'no_publicado' }, { ...pruebas, config: { sin_dato: 'Nadie lo sabe' } }), 'Nadie lo sabe');
  assert.equal(etiquetaProcedencia({ naturaleza: 'no_publicado' }), 'El fabricante no lo publica');
});

prueba('las tarjetas de una tabla de productos enseñan marca, cifra, precio y nota', () => {
  const cols: any[] = [
    { id: 't', nombre: 'Nombre', tipo: 'texto', config: {} },
    { id: 'e', nombre: 'EAN', tipo: 'texto', config: { ficha: 'gtin' } },
    { id: 'm', nombre: 'Marca', tipo: 'relacion', config: { ficha: 'marca' } },
    { id: 'w', nombre: 'Energía', tipo: 'numero', config: { clave: 'capacidad_wh', grupo: 'tecnico', comparar: 'mayor' } },
    { id: 'p', nombre: 'Precio desde', tipo: 'agregado', config: { ficha: 'precio_min' } },
    { id: 'c', nombre: 'Nota', tipo: 'comunidad', config: { criterio: 'media' } },
  ];
  assert.deepEqual(propiedadesTarjeta(cols, 't'), ['m', 'w', 'p', 'c']);
  assert.equal(propiedadesTarjeta([{ id: 'x', nombre: 'X', tipo: 'texto', config: {} } as any], null), null);
});

prueba('la cabecera dice precio, nota y cifras clave, sacadas de las columnas', () => {
  const t: TablaFicha = { ...tabla, columnas: tabla.columnas.map(c => (c.id === 'cap' ? { ...c, config: { ...c.config, clave: 'capacidad_wh' } } : c.id === 'peso' ? { ...c, config: { ...c.config, destacado: true } } : c)) };
  const v = vistaPropiedad({ pagina_id: 'PA', fila_id: 'a', tabla: t, relacionadas: {} }, { estilo: 'cabecera' }) as any;
  assert.ok(v.compra.desde.includes('149'));
  assert.deepEqual(v.nota, { media: '4,3', votos: 12 });
  // `destacado: true` first, then the loader keys; never the commission.
  assert.deepEqual(v.destacados.map((l: any) => l.columnaId), ['peso', 'cap']);
  // Under three voters there is no score, and the header says so instead of 0.
  const sin = vistaPropiedad(ficha('c'), { estilo: 'cabecera' }) as any;
  assert.deepEqual(sin.nota, { media: '', votos: 0 });
});

prueba('lo que nadie publica se dice en una frase, no en una fila cada dato', () => {
  const t: TablaFicha = { ...tabla, filas: tabla.filas.map(f => (f.id === 'c' ? { ...f, procedencia: { peso: { naturaleza: 'no_publicado' as const } } } : f)) };
  const sinPeso: TablaFicha = { ...t, filas: t.filas.map(f => (f.id === 'c' ? { ...f, celdas: { ...f.celdas, peso: { estado: 'vacia' } as any } } : f)) };
  const v = vistaPropiedad({ pagina_id: 'PC', fila_id: 'c', tabla: sinPeso, relacionadas: {} }, { estilo: 'tabla', grupo: 'tecnico' }) as any;
  assert.deepEqual(v.lineas.map((l: any) => l.columnaId), ['cap']);
  assert.deepEqual(v.sinDato, [{ motivo: 'El fabricante no lo publica', etiquetas: ['Peso'] }]);
  const h: Herramientas = { esc: (x: unknown) => String(x), enLinea: x => x, enlacePagina: id => `/p/${id}`, hrefSeguro: x => x };
  const html = propiedadHtml({ pagina_id: 'PC', fila_id: 'c', tabla: sinPeso, relacionadas: {} }, { estilo: 'tabla', grupo: 'tecnico' }, h);
  assert.ok(html.includes('El fabricante no lo publica: Peso.'));
});

prueba('el comparador marca como principales el precio, la nota y las cifras clave', () => {
  const t: TablaFicha = { ...tabla, columnas: tabla.columnas.map(c => (c.id === 'cap' ? { ...c, config: { ...c.config, clave: 'capacidad_wh' } } : c)) };
  const v = vistaComparador(t, ['b', 'c'], { actualId: 'a' })!;
  assert.deepEqual(v.lineas.filter(l => l.clave).map(l => l.columnaId).sort(), ['cap', 'med', 'pre']);
  assert.ok(v.lineas.some(l => !l.clave), 'el resto sigue ahí, detrás de «ver todas»');
});

prueba('la unidad no sale dos veces y «1 año» va en singular', () => {
  const g: any = { id: 'g', nombre: 'Garantía (años)', tipo: 'numero', config: { unidad: 'años' } };
  assert.equal(etiquetaColumna(g), 'Garantía');
  assert.equal(textoDe({ id: 'x', pagina_id: null, titulo: 'x', celdas: { g: { estado: 'ok', valor: 1 } as any } }, g), '1 año');
  assert.equal(textoDe({ id: 'x', pagina_id: null, titulo: 'x', celdas: { g: { estado: 'ok', valor: 2 } as any } }, g), '2 años');
  // A parenthesis that is not the unit stays: «Medidas (mm)» is a text.
  assert.equal(etiquetaColumna({ id: 'm', nombre: 'Medidas (mm)', tipo: 'texto', config: {} } as any), 'Medidas (mm)');
});

prueba('el precio por vatio es «Calculado», dice cuándo no hay precio y sustituye a la estimación cargada', () => {
  const pu: any = { id: 'pu', nombre: 'Precio por kWh', tipo: 'formula', config: { ficha: 'precio_unidad', grupo: 'compra', comparar: 'menor', unidad: '€/kWh', explicacion: 'Precio ÷ energía', sin_dato: 'Sin precio en ninguna tienda todavía' } };
  const est: any = { id: 'est', nombre: 'Precio por kWh útil', tipo: 'moneda', config: { clave: 'precio_por_kwh_util_eur', grupo: 'compra', comparar: 'menor' } };
  const con = { id: 'x', pagina_id: null, titulo: 'x', celdas: { pu: { estado: 'ok', valor: 514 } as any, est: { estado: 'ok', valor: 400 } as any } };
  assert.equal(procedenciaDe(con, pu)?.naturaleza, 'calculado');
  assert.equal(procedenciaDe({ ...con, celdas: {} }, pu)?.etiqueta, 'Sin precio en ninguna tienda todavía');
  const t: TablaFicha = { ...tabla, columnas: [...tabla.columnas, pu, est], filas: tabla.filas.map(f => ({ ...f, celdas: { ...f.celdas, pu: { estado: 'ok', valor: 500 } as any, est: { estado: 'ok', valor: 400 } as any } })) };
  const v = vistaComparador(t, ['b'], { actualId: 'a' })!;
  assert.ok(v.lineas.some(l => l.columnaId === 'pu' && l.clave));
  assert.ok(!v.lineas.some(l => l.columnaId === 'est'), 'la estimación cargada no compite con el cálculo');
  const cab = vistaPropiedad({ pagina_id: 'PA', fila_id: 'a', tabla: t, relacionadas: {} }, { estilo: 'cabecera' }) as any;
  assert.equal(cab.compra.porUnidad, '500 €/kWh');
  assert.ok(propiedadesTarjeta(t.columnas, 'nom')!.includes('pu'));
});

prueba('sin precio no hay precio por kWh: ni «0 €/kWh», ni «MEJOR», ni «A la venta»', () => {
  // The engine: an empty price gave REDONDEAR(vacío; 2) = 2 and
  // REDONDEAR(vacío * 1000; 0) = 0 (evaluator round 2, 2026-10-18).
  const ctx = (precio: any) => ({ celdas: { p: precio, e: ok(250) } as any, porNombre: { 'precio desde': 'p', 'energía nominal': 'e' } });
  assert.equal(calcular('REDONDEAR({Precio desde} / {Energía nominal}; 2)', ctx({ estado: 'vacia' })).estado, 'vacia');
  assert.equal(calcular('REDONDEAR({Precio desde} / {Energía nominal} * 1000; 0)', ctx({ estado: 'vacia' })).estado, 'vacia');
  assert.deepEqual(calcular('REDONDEAR({Precio desde} / {Energía nominal}; 2)', ctx(ok(100))), ok(0.4));
  // And the sheet, whatever a stale value says: 0 is no price per unit.
  const pu: any = { id: 'pu', nombre: 'Precio por kWh', tipo: 'formula', config: { ficha: 'precio_unidad', grupo: 'compra', comparar: 'menor', unidad: '€/kWh', explicacion: 'Precio ÷ energía' } };
  const est: any = { id: 'est', nombre: 'Estado', tipo: 'texto', config: { ficha: 'estado' } };
  const t: TablaFicha = { ...tabla, columnas: [...tabla.columnas, pu, est], filas: tabla.filas.map(f => ({ ...f, celdas: f.id === 'c'
    ? { ...f.celdas, pre: { estado: 'vacia' } as any, pu: ok(0), est: ok('A la venta') }
    : { ...f.celdas, pu: ok(f.id === 'a' ? 600 : 700), est: ok('A la venta') } })) };
  assert.equal(textoDe(t.filas[2], pu), '');
  assert.deepEqual([...mejoresEn(t.filas, pu)], ['a']);
  assert.deepEqual(ordenarPor(t.filas, pu).map(f => f.id), ['a', 'b']);
  const v = vistaComparador(t, ['a', 'b'], { actualId: 'c' })!;
  const linea = v.lineas.find(l => l.columnaId === 'pu')!;
  assert.ok(!linea.celdas.some((c: any) => c.mejor && !c.texto), 'un hueco no puede ser «la mejor»');
  const cab = vistaPropiedad({ pagina_id: 'PC', fila_id: 'c', tabla: t, relacionadas: {} }, { estilo: 'cabecera' }) as any;
  assert.equal(cab.compra.desde, '');
  assert.equal(cab.compra.porUnidad, '');
  assert.equal(cab.estado, '', '«A la venta» junto a «Sin precio todavía»');
  const conPrecio = vistaPropiedad({ pagina_id: 'PA', fila_id: 'a', tabla: t, relacionadas: {} }, { estilo: 'cabecera' }) as any;
  assert.equal(conPrecio.estado, 'A la venta');
});

prueba('la cabecera cuenta las tiendas con precio y no esconde que está descatalogado y a la venta', () => {
  const num: any = { id: 'num', nombre: 'Tiendas', tipo: 'agregado', config: { ficha: 'num_ofertas', visibilidad: 'nunca' } };
  const cp: any = { id: 'cp', nombre: 'Tiendas con precio', tipo: 'agregado', config: { ficha: 'ofertas_con_precio', visibilidad: 'nunca' } };
  const est: any = { id: 'est', nombre: 'Estado', tipo: 'texto', config: { ficha: 'estado' } };
  const conCeldas = (cols: any[], celdas: Record<string, any>): TablaFicha => ({ ...tabla, columnas: [...tabla.columnas, ...cols], filas: tabla.filas.map(f => (f.id === 'a' ? { ...f, celdas: { ...f.celdas, ...celdas } } : f)) });
  // Anker 737 in production: 5 shops listed, 1 with a price.
  let cab = vistaPropiedad({ pagina_id: 'PA', fila_id: 'a', tabla: conCeldas([num, cp, est], { num: ok(5), cp: ok(1), est: ok('A la venta') }), relacionadas: {} }, { estilo: 'cabecera' }) as any;
  assert.equal(cab.compra.tiendas, 1);
  assert.equal(cab.compra.sinPrecio, 4);
  assert.equal(cab.estado, 'A la venta');
  const h: Herramientas = { esc: (x: unknown) => String(x), enLinea: x => x, enlacePagina: id => `/p/${id}`, hrefSeguro: x => x };
  const html = propiedadHtml({ pagina_id: 'PA', fila_id: 'a', tabla: conCeldas([num, cp, est], { num: ok(5), cp: ok(1) }), relacionadas: {} }, { estilo: 'cabecera' }, h);
  assert.ok(html.includes('en 1 tienda · 4 más sin precio confirmado'), html);
  // A table loaded before the column existed keeps counting them all.
  cab = vistaPropiedad({ pagina_id: 'PA', fila_id: 'a', tabla: conCeldas([num], { num: ok(5) }), relacionadas: {} }, { estilo: 'cabecera' }) as any;
  assert.deepEqual([cab.compra.tiendas, cab.compra.sinPrecio], [5, 0]);
  // Tesla Powerwall 2: discontinued, still sold in two shops.
  cab = vistaPropiedad({ pagina_id: 'PA', fila_id: 'a', tabla: conCeldas([num, cp, est], { num: ok(2), cp: ok(2), est: ok('Descatalogado') }), relacionadas: {} }, { estilo: 'cabecera' }) as any;
  assert.equal(cab.estado, 'Descatalogado por el fabricante · aún a la venta en 2 tiendas');
  // ...and with no price, a bare «Descatalogado» is the truth.
  const sinPrecio: TablaFicha = { ...conCeldas([num, cp, est], { num: ok(1), cp: ok(0), est: ok('Descatalogado') }) };
  sinPrecio.filas = sinPrecio.filas.map(f => (f.id === 'a' ? { ...f, celdas: { ...f.celdas, pre: { estado: 'vacia' } as any } } : f));
  cab = vistaPropiedad({ pagina_id: 'PA', fila_id: 'a', tabla: sinPrecio, relacionadas: {} }, { estilo: 'cabecera' }) as any;
  assert.equal(cab.estado, 'Descatalogado');
});

prueba('la cifra de una batería doméstica es la capacidad útil, la misma del precio por kWh', () => {
  const tot: any = { id: 'tot', nombre: 'Capacidad total', tipo: 'numero', config: { clave: 'capacidad_total_kwh', grupo: 'tecnico', unidad: 'kWh', comparar: 'mayor' } };
  const util: any = { id: 'util', nombre: 'Capacidad útil', tipo: 'numero', config: { clave: 'capacidad_util_kwh', grupo: 'tecnico', unidad: 'kWh', comparar: 'mayor' } };
  const cols: any[] = [{ id: 't', nombre: 'Nombre', tipo: 'texto', config: {} }, { id: 'm', nombre: 'Marca', tipo: 'relacion', config: { ficha: 'marca' } }, tot, util];
  assert.deepEqual(propiedadesTarjeta(cols, 't'), ['m', 'util']);
});

prueba('la cabecera sale de las tiendas: una agotada no es «Desde» ni «A la venta»', () => {
  const pu: any = { id: 'pu', nombre: 'Precio por kWh', tipo: 'formula', config: { ficha: 'precio_unidad', unidad: '€/kWh', comparar: 'menor' } };
  const est: any = { id: 'est', nombre: 'Estado', tipo: 'texto', config: { ficha: 'estado' } };
  // The row's aggregate counts every shop: 25 € is the sold-out one.
  const t: TablaFicha = { ...tabla, columnas: [...tabla.columnas, pu, est], filas: tabla.filas.map(f => (f.id === 'a' ? { ...f, celdas: { ...f.celdas, pre: ok(25), pu: ok(289), est: ok('A la venta') } } : f)) };
  const cab = (ofertas: any[]) => vistaPropiedad({ pagina_id: 'PA', fila_id: 'a', tabla: t, relacionadas: {}, ofertas }, { estilo: 'cabecera' }) as any;
  let v = cab([{ precio_centimos: 2500, agotada: true }, { precio_centimos: 3000, agotada: false }, { precio_centimos: null, agotada: false }]);
  assert.match(v.compra.desde, /^30,00\s€$/);
  assert.deepEqual([v.compra.tiendas, v.compra.agotadas, v.compra.sinPrecio], [1, 1, 1]);
  // The price per unit follows the header's price, not the sold-out one.
  assert.equal(v.compra.porUnidad, '347 €/kWh');
  assert.equal(v.estado, 'A la venta');
  // Goal Zero: its only priced shop sold out.
  v = cab([{ precio_centimos: 2995, agotada: true }, { precio_centimos: null, agotada: false }]);
  assert.equal(v.compra.desde, '');
  assert.match(v.compra.ultimo, /^29,95\s€$/);
  assert.equal(v.compra.porUnidad, '');
  assert.equal(v.estado, '', 'nada de «A la venta» con todo agotado');
  const h: Herramientas = { esc: (x: unknown) => String(x), enLinea: x => x, enlacePagina: id => `/p/${id}`, hrefSeguro: x => x };
  assert.ok(propiedadHtml({ pagina_id: 'PA', fila_id: 'a', tabla: t, relacionadas: {}, ofertas: [{ precio_centimos: 2995, agotada: true }] }, { estilo: 'cabecera' }, h).match(/Último precio visto 29,95\s€ \(agotado\)/));
});

prueba('las cifras escritas como texto llevan su unidad', () => {
  assert.equal(conUnidad('5400 / 2400 (ensayo); 3600 / 1600 (diseño)', 'Pa'), '5400 / 2400 Pa (ensayo); 3600 / 1600 Pa (diseño)');
  assert.equal(conUnidad('475–500', 'Wp'), '475–500 Wp');
  assert.equal(conUnidad('Hasta 5400 Pa', 'Pa'), 'Hasta 5400 Pa', 'lo que ya dice algo se deja');
  const c: any = { id: 'cm', nombre: 'Carga mecánica', tipo: 'texto', config: { clave: 'carga_mecanica_pa' } };
  assert.equal(textoDe({ id: 'x', pagina_id: null, titulo: 'x', celdas: { cm: ok('6000 / 4000') } }, c), '6000 / 4000 Pa');
});

prueba('dos datos que solo se distinguen por la unidad no se llaman igual', () => {
  const mah: any = { id: 'mah', nombre: 'Batería (mAh)', tipo: 'numero', config: { clave: 'bateria_mah', unidad: 'mAh' } };
  const wh: any = { id: 'wh', nombre: 'Batería (Wh)', tipo: 'numero', config: { clave: 'bateria_wh', unidad: 'Wh' } };
  assert.equal(etiquetaColumna(mah), 'Batería (capacidad)');
  assert.equal(etiquetaColumna(wh), 'Batería (energía)');
  // Without a name of its own, the unit stays when a sibling would collide.
  const a: any = { id: 'a', nombre: 'Tamaño (cm)', tipo: 'numero', config: { unidad: 'cm' } };
  const b: any = { id: 'b', nombre: 'Tamaño (pulgadas)', tipo: 'numero', config: { unidad: 'pulgadas' } };
  assert.equal(etiquetaColumna(a, [a, b]), 'Tamaño (cm)');
  assert.equal(etiquetaColumna(a, [a]), 'Tamaño');
});

console.log(`\n${n} comprobaciones, todas bien.`);
