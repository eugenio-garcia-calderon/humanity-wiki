/**
 * The registry of components of the 3D view (2026-11-24, `components/aeromovil/fichas/registro.ts`).
 * Run: npx tsx scripts/fichas.ts
 * For every entry of FICHAS: unique id that fits the server's key (`src/server/aeromovilFichas.ts`), a real 3D layer, a
 * name, a prefix and a sentence; for every vehicle kind it names, a real section of the mass model in the default design of
 * that vehicle (so the record can show its weight and price), in the department it says; the internal numbers
 * («Interior 1») are unique; and the biggest record a person can fill in fits the server's size limit with room to spare.
 * Prints each component with its numbers per vehicle. Ends «Todo OK».
 */
import { PARAMETROS_A1, PARAMETROS_BALA, PARAMETROS_BASCULANTE, PARAMETROS_GOTA, PARAMETROS_TRICICLO, areas, calcular, crearModelo, type Parametros } from '../src/components/aeromovil/geometria';
import { CAPAS } from '../src/components/aeromovil/visor/capas';
import { pesosSecciones } from '../src/components/aeromovil/masasSecciones';
import { FICHAS, fichaEn, fichasDe, numeroPorDefecto, type TipoVehiculo } from '../src/components/aeromovil/fichas/registro';
import { datosDe, hechos, listasDelDiseno } from '../src/components/aeromovil/fichas/datos';
import { MAX_ALTERNATIVAS, MAX_ARCHIVOS_FICHA, MAX_TEXTO_FICHA, limpiarFicha, type FichaValor } from '../src/components/aeromovil/fichas/almacen';

let fallos = 0;
const ok = (c: boolean, m: string) => { if (!c) { console.log(`FALLA ${m}`); fallos++; } };

// the server's own limits (src/server/aeromovilFichas.ts): copied here on purpose, so a change there must show up here
const CLAVE = /^[a-z0-9][a-z0-9_/-]{0,119}$/, VEHICULO = /^[a-z0-9][a-z0-9_-]{0,39}$/;
const MAX_VALOR = 60_000;

const VEHICULOS: Record<TipoVehiculo, Parametros> = { a1: PARAMETROS_A1, gota: PARAMETROS_GOTA, bala: PARAMETROS_BALA, triciclo: PARAMETROS_TRICICLO, basculante: PARAMETROS_BASCULANTE };
const calculado = new Map<string, { m: ReturnType<typeof crearModelo>; res: ReturnType<typeof calcular> }>();
for (const [tipo, P] of Object.entries(VEHICULOS)) {
  const m = crearModelo(P);
  ok(m.tipo === tipo, `el vehículo «${tipo}» por defecto es de tipo «${m.tipo}»`);
  ok(VEHICULO.test(P.disposicion ?? ''), `la familia «${P.disposicion}» no cabe en la clave del servidor`);
  calculado.set(tipo, { m, res: calcular(m, areas(m)) });
}

const ids = new Set<string>();
const capasReales = new Set(CAPAS.map(c => c.k as string));
for (const f of FICHAS) {
  console.log(`\n== ${f.id} · ${numeroPorDefecto(f)} · ${f.nombre}`);
  ok(!ids.has(f.id), `${f.id}: el id está repetido`); ids.add(f.id);
  ok(CLAVE.test(f.id), `${f.id}: no cabe en la clave del servidor (${CLAVE})`);
  ok(f.id.startsWith(`${f.dep}/`), `${f.id}: el id debe empezar por su departamento «${f.dep}/»`);
  ok(!!f.nombre.trim() && !!f.prefijo.trim() && f.queEs.trim().length > 10, `${f.id}: falta nombre, prefijo o una frase de «qué es»`);
  ok(f.capas.length > 0, `${f.id}: sin capas 3D`);
  for (const c of f.capas) ok(capasReales.has(c), `${f.id}: la capa «${c}» no existe en visor/capas.ts`);
  ok(Object.keys(f.secciones).length > 0, `${f.id}: no está en ningún vehículo`);
  ok(FICHAS.filter(x => x.prefijo === f.prefijo).every(x => x.dep === f.dep), `${f.id}: el prefijo «${f.prefijo}» lo usan departamentos distintos`);

  for (const [tipo, clave] of Object.entries(f.secciones) as [TipoVehiculo, string][]) {
    const v = calculado.get(tipo);
    if (!v) { ok(false, `${f.id}: «${tipo}» no es un tipo de vehículo`); continue; }
    const [dep, bloque] = clave.split('|');
    ok(dep === f.dep, `${f.id} (${tipo}): su sección «${clave}» es de otro departamento que «${f.dep}»`);
    const ps = pesosSecciones(v.res, v.m);
    ok(!!ps?.secciones[clave], `${f.id} (${tipo}): la sección «${clave}» no existe en el modelo de pesos de ese vehículo`);
    const d = datosDe(f, tipo, listasDelDiseno(VEHICULOS[tipo], v.m, v.res));
    ok(!!d, `${f.id} (${tipo}): sin datos`);
    ok(!!d?.peso && d.peso.kg > 0, `${f.id} (${tipo}): la sección «${bloque}» no tiene peso en el diseño por defecto`);
    ok(!!d?.precio && d.precio.eur > 0, `${f.id} (${tipo}): la sección «${bloque}» no tiene precio en el diseño por defecto`);
    console.log(`   ${tipo.padEnd(10)} ${clave.padEnd(28)} ${hechos(d, 2).join(' · ')}`);
  }
  // a click on one of its layers, in its department, finds it (and in another department, or another vehicle, does not)
  for (const tipo of Object.keys(f.secciones)) {
    const c = f.capas[0];
    ok(fichaEn({ capa: c, nombres: f.componentes ? [`comp:${f.componentes[0]}`] : [] }, f.dep, tipo) === f, `${f.id} (${tipo}): un clic en su capa no la encuentra`);
    ok(fichaEn({ capa: c, nombres: [] }, 'proyecto', tipo) === null, `${f.id}: en «Proyecto» no debe abrirse ninguna ficha`);
  }
  ok(fichasDe(f.dep, Object.keys(f.secciones)[0]).includes(f), `${f.id}: fichasDe no la devuelve`);
}

// numbers: «Interior 1», «Interior 2»…: unique, from 1, in registry order
const numeros = FICHAS.map(numeroPorDefecto);
ok(new Set(numeros).size === numeros.length, 'hay números internos repetidos');

// the largest record a person can fill in (every text at its limit, every list full) against the server's limit
const larga = (n: number) => 'x'.repeat(n);
const adj = (i: number) => ({ id: i, url: `/api/aeromovil/adjuntos/${i}/${larga(150)}`, nombre: larga(200), tipo: 'application/pdf', bytes: 10_000_000, fecha: '2026-11-24T12:00:00.000Z' });
const lleno: FichaValor = limpiarFicha({
  numero: larga(40), caracteristicas: larga(MAX_TEXTO_FICHA), notas: larga(MAX_TEXTO_FICHA), stock: 999_999,
  alternativas: Array.from({ length: MAX_ALTERNATIVAS + 5 }, (_, i) => ({ nombre: larga(120), nota: larga(400), url: `https://ejemplo.es/${larga(470)}`, eur: 12345.67 + i })),
  imagenes: Array.from({ length: MAX_ARCHIVOS_FICHA + 3 }, (_, i) => adj(i)), documentos: Array.from({ length: MAX_ARCHIVOS_FICHA + 3 }, (_, i) => adj(100 + i)),
});
const tam = JSON.stringify(lleno).length;
console.log(`\n   la ficha más llena que se puede guardar: ${tam} de ${MAX_VALOR} caracteres`);
ok(lleno.alternativas?.length === MAX_ALTERNATIVAS && lleno.imagenes?.length === MAX_ARCHIVOS_FICHA && lleno.documentos?.length === MAX_ARCHIVOS_FICHA, 'limpiarFicha no recorta las listas a su máximo');
ok(tam <= MAX_VALOR * 0.7, `la ficha más llena (${tam}) ocupa más del 70 % del límite del servidor (${MAX_VALOR}): un texto con comillas y saltos de línea podría no caber`);
ok(limpiarFicha({ alternativas: [{ nombre: 'x', url: 'javascript:alert(1)' }] }).alternativas?.[0].url === undefined, 'un enlace javascript: no debe guardarse');
ok(Object.keys(limpiarFicha({ numero: '  ', caracteristicas: '', alternativas: [{ nombre: ' ' }] })).length === 0, 'una ficha vacía debe quedar vacía');

console.log(fallos ? `\n${fallos} FALLA(S)` : '\nTodo OK');
process.exit(fallos ? 1 : 0);
