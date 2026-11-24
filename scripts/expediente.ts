/**
 * The pedal cycle's file (2026-11-24): checks the catalogue of the conformity matrix, the tests and the documents, runs
 * every document generator on a real design, and checks the percentages. Run with:
 *   npx tsx scripts/expediente.ts [diseño.json …]
 * Ends with «Todo OK». Nothing here touches the server: the routes are checked against a scratch Postgres by hand
 * (see the PR), the page is checked in the browser.
 */
import { readFileSync } from 'fs';
import { PARAMETROS_TRICICLO, ajustarCarenado, areas, calcular, crearModelo, type Parametros } from '../src/components/aeromovil/geometria';
import { deDiseno } from '../src/components/aeromovil/Disenos';
import { FUENTES, REQUISITOS } from '../src/components/aeromovil/homologacion/normas';
import { fichaHomologacion } from '../src/components/aeromovil/homologacion/ficha';
import { GRUPOS_MATRIZ, OBLIGACIONES, claveObligacion } from '../src/components/aeromovil/homologacion/epac/catalogo';
import { ENSAYOS } from '../src/components/aeromovil/homologacion/epac/ensayos';
import { CARPETA_LEGAL, DOCUMENTOS, type ContextoDoc } from '../src/components/aeromovil/homologacion/epac/documentos';
import { CAMPOS_FABRICANTE, FABRICANTE_VACIO, conPendientes, type Fabricante } from '../src/components/aeromovil/homologacion/epac/tipos';
import { carpetaLegal, estadoDoc, estadoEnsayo, estadoHueco, hechosSinArchivo, progresoDocumentos, progresoEnsayos, progresoGrupo, progresoImprescindible, progresoObligacion, progresoTotal, queFalta, resumenEnsayo, type Estados } from '../src/components/aeromovil/homologacion/epac/progreso';
import { IDS_CONTRASTE, INSPECCION, REFERENCIA } from '../src/components/aeromovil/homologacion/epac/referencia';
import { TEXTO_APORTADO } from '../src/components/aeromovil/homologacion/epac/textoAportado';

let fallos = 0;
const ok = (c: boolean, m: string) => { if (!c) { console.log(`FALLA ${m}`); fallos++; } };
const CLAVE_SERVIDOR = /^[a-z0-9][a-z0-9:_-]{0,79}$/;   // src/server/aeromovilExpediente.ts

// ── the catalogue
{
  const ids = new Set<string>();
  for (const o of OBLIGACIONES) {
    ok(!ids.has(o.id), `la obligación ${o.id} está dos veces`); ids.add(o.id);
    ok(o.huecos.length > 0, `${o.id} no tiene evidencia`);
    ok(GRUPOS_MATRIZ.some(g => g.id === o.grupo), `${o.id}: grupo desconocido`);
    ok(o.fuente in FUENTES, `${o.id}: fuente desconocida ${o.fuente}`);
    ok(o.exige.length > 20 && o.titulo.length > 5 && o.ref.length > 3, `${o.id}: texto demasiado corto`);
    const hs = new Set<string>();
    for (const h of o.huecos) {
      ok(!hs.has(h.id), `${o.id}.${h.id} está dos veces`); hs.add(h.id);
      ok(!h.ensayo || ENSAYOS.some(e => e.id === h.ensayo), `${o.id}.${h.id}: ensayo ${h.ensayo} no existe`);
      ok(!h.doc || DOCUMENTOS.some(d => d.id === h.doc), `${o.id}.${h.id}: documento ${h.doc} no existe`);
      ok(h.tipo !== 'ensayo' || !!h.ensayo, `${o.id}.${h.id}: es de tipo ensayo y no apunta a ninguno`);
      ok(!!h.ensayo === (h.tipo === 'ensayo') || h.tipo === 'inspeccion' || h.tipo !== 'ensayo', `${o.id}.${h.id}: tipo y enlace no cuadran`);
    }
    if (o.diseno) ok(REQUISITOS.some(r => r.id === o.diseno && r.categorias.includes('EPAC')), `${o.id}: «${o.diseno}» no es un requisito de EPAC`);
  }
  for (const r of REQUISITOS.filter(r => r.categorias.includes('EPAC') && r.id !== 'permiso')) ok(OBLIGACIONES.some(o => o.diseno === r.id), `el requisito de EPAC «${r.id}» no sale en ninguna obligación de la matriz`);
  for (const g of GRUPOS_MATRIZ) ok(OBLIGACIONES.some(o => o.grupo === g.id), `el grupo ${g.id} está vacío`);
  for (const o of OBLIGACIONES) ok(CLAVE_SERVIDOR.test(claveObligacion(o.id)), `clave de obligación no válida: ${claveObligacion(o.id)}`);
  for (const e of ENSAYOS) {
    ok(CLAVE_SERVIDOR.test(`ensayo-${e.id}`), `clave de ensayo no válida ${e.id}`);
    ok(e.codigo === `EN-${e.id.slice(1)}`, `${e.id}: el código ${e.codigo} no coincide`);
    ok(OBLIGACIONES.some(o => o.huecos.some(h => h.ensayo === e.id)), `el ensayo ${e.codigo} no demuestra ninguna obligación`);
    ok(e.procedimiento.length >= 3 && e.instrumentos.length >= 1 && e.campos.length >= 3 && !!e.criterio, `${e.codigo}: le falta contenido`);
    ok(new Set(e.campos.map(c => c.id)).size === e.campos.length, `${e.codigo}: campos repetidos`);
    if (!e.criterioLegal) ok(!/\b\d+\s?(W|km\/h|cd)\b/.test(e.criterio), `${e.codigo}: cifra en el criterio sin ser legal`);
  }
  for (const d of DOCUMENTOS) {
    ok(CLAVE_SERVIDOR.test(`doc-${d.id}`), `clave de documento no válida ${d.id}`);
    ok(d.codigo === d.id.toUpperCase(), `${d.id}: el código ${d.codigo} no coincide`);
    ok(new Set(d.secciones.map(s => s.id)).size === d.secciones.length, `${d.codigo}: secciones repetidas`);
    ok(d.secciones.length >= 3, `${d.codigo}: pocas secciones`);
  }
  for (const i of CARPETA_LEGAL) for (const id of i.docs) ok(DOCUMENTOS.some(d => d.id === id), `carpeta legal ${i.n}: ${id} no existe`);
  ok(CARPETA_LEGAL.length === 8, 'la carpeta legal debe tener los 8 documentos del texto aportado');
  ok(CLAVE_SERVIDOR.test('fabricante'), 'clave fabricante');
  ok(CAMPOS_FABRICANTE.every(c => c.id in FABRICANTE_VACIO), 'campo de fabricante desconocido');
  ok(REFERENCIA.length >= 6, 'la referencia debe guardar las secciones del texto aportado');
  for (const id of IDS_CONTRASTE) ok(TEXTO_APORTADO.some(e => e.id === id), `el contraste «${id}» no corresponde a ninguna sección del texto aportado`);
  for (const e of TEXTO_APORTADO) ok(!/favicons|utm_source|&#x20;|chatgpt/i.test(e.md), `${e.id}: quedan restos de la herramienta de chat`);
  ok(TEXTO_APORTADO.reduce((t, e) => t + e.md.length, 0) > 15000, 'el texto aportado debe guardarse entero');
  for (const f of INSPECCION) for (const id of f.obligaciones) ok(OBLIGACIONES.some(o => o.id === id), `inspección «${f.pregunta}»: la obligación ${id} no existe`);
  const pesos = OBLIGACIONES.map(o => o.peso);
  console.log(`${OBLIGACIONES.length} obligaciones (${pesos.filter(p => p === 3).length} de peso 3), ${OBLIGACIONES.reduce((s, o) => s + o.huecos.length, 0)} elementos de evidencia, ${ENSAYOS.length} ensayos, ${DOCUMENTOS.length} documentos, ${REFERENCIA.length} secciones de referencia`);
}

// ── the percentages
const vacio: Estados = { fab: { ...FABRICANTE_VACIO }, obligaciones: {}, ensayos: {}, docs: {} };
{
  ok(progresoTotal(vacio) === 0 && progresoImprescindible(vacio) === 0, 'vacío: debe ser 0 %');
  ok(queFalta(vacio).length === OBLIGACIONES.reduce((s, o) => s + o.huecos.length, 0), 'vacío: falta todo');
  ok(queFalta(vacio)[0].o.peso === 3, 'lo que falta empieza por lo más importante');
  const todos = (e: 'hecho' | 'enCurso'): Estados => {
    const fab = Object.fromEntries(CAMPOS_FABRICANTE.map(c => [c.id, 'x'])) as unknown as Fabricante;
    const obligaciones: Estados['obligaciones'] = Object.fromEntries(OBLIGACIONES.map(o => [o.id, { huecos: Object.fromEntries(o.huecos.map(h => [h.id, { estado: e }])) }]));
    const firma = { nombre: 'x', fecha: '2026-11-24' };
    const ensayos = Object.fromEntries(ENSAYOS.map(en => [en.id, { intentos: [{ id: 'i', fecha: '2026-11-24', unidad: '', configuracion: '', instrumentos: '', calibracion: '', condiciones: '', procedimiento: '', criterio: '', valores: {}, observaciones: '', conclusion: 'conforme' as const, adjuntos: [], ...(e === 'hecho' ? { firma } : {}) }] }]));
    const docs = Object.fromEntries(DOCUMENTOS.map(d => [d.id, { secciones: Object.fromEntries(d.secciones.map(s => [s.id, { revisada: true }])), ...(e === 'hecho' ? { aprobado: firma } : {}) }]));
    return { fab, obligaciones, ensayos, docs };
  };
  const hecho = todos('hecho');
  ok(progresoTotal(hecho) === 100 && progresoImprescindible(hecho) === 100, `todo hecho: debe ser 100 % (da ${progresoTotal(hecho)})`);
  ok(queFalta(hecho).length === 0, 'todo hecho: no falta nada');
  ok(progresoEnsayos(hecho).pct === 100 && progresoDocumentos(hecho).pct === 100 && carpetaLegal(hecho).listos === 8, 'todo hecho: ensayos, documentos y carpeta al 100 %');
  ok(hechosSinArchivo(hecho).length > 0, 'marcar «hecho» a mano sin archivo debe señalarse');
  const curso = todos('enCurso');
  ok(progresoTotal(curso) > 0 && progresoTotal(curso) < 100, `todo en curso: entre 0 y 100 (da ${progresoTotal(curso)})`);
  // «no aplica» needs its reason, and leaves the count
  const o21 = OBLIGACIONES.find(o => o.id === 'O21')!;
  const sin: Estados = { ...vacio, obligaciones: { O21: { huecos: {}, noAplica: '' } } };
  ok(progresoObligacion(o21, sin) === 0, 'no aplica sin motivo no cuenta');
  const con: Estados = { ...vacio, obligaciones: { O21: { huecos: {}, noAplica: 'solo lleva al conductor' } } };
  ok(progresoObligacion(o21, con) === null, 'no aplica con motivo sale de la cuenta');
  ok(!queFalta(con).some(f => f.o.id === 'O21'), 'no aplica con motivo no aparece en lo que falta');
  // a slot tied to a test follows the test
  const o03 = OBLIGACIONES.find(o => o.id === 'O03')!, c = o03.huecos.find(h => h.ensayo === 'e01')!;
  ok(estadoHueco(o03, c, vacio) === 'pendiente', 'el hueco de un ensayo empieza pendiente');
  const unEnsayo: Estados = { ...vacio, ensayos: { e01: { intentos: [{ ...hecho.ensayos.e01!.intentos[0], firma: undefined }] } } };
  ok(estadoHueco(o03, c, unEnsayo) === 'enCurso' && estadoEnsayo(unEnsayo.ensayos.e01) === 'enCurso', 'un intento sin firmar es «en curso»');
  ok(estadoHueco(o03, c, hecho) === 'hecho', 'un ensayo firmado conforme da el hueco por hecho');
  const noConf: Estados = { ...vacio, ensayos: { e01: { intentos: [{ ...hecho.ensayos.e01!.intentos[0], conclusion: 'noConforme' }] } } };
  ok(estadoEnsayo(noConf.ensayos.e01) === 'noConforme' && estadoHueco(o03, c, noConf) === 'enCurso', 'no conforme firmado: el ensayo lo dice y el hueco sigue abierto');
  ok(resumenEnsayo(noConf.ensayos.e01).conclusion === 'no conforme', 'resumen del ensayo no conforme');
  ok(estadoDoc({ secciones: { [DOCUMENTOS[0].secciones[0].id]: { revisada: true } } }, DOCUMENTOS[0]) === 'enCurso', 'un documento con una sección revisada está en curso');
  ok(GRUPOS_MATRIZ.every(g => progresoGrupo(g.id, vacio) === 0), 'grupos vacíos a 0');
  // the biggest value one obligation can hold must fit the server's limit (80 000 characters)
  const adj = { id: 1, url: '/uploads/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf', nombre: 'presupuesto-del-proveedor-muy-largo-de-ejemplo.pdf', tipo: 'application/pdf', bytes: 1234567, fecha: '2026-11-24T12:00:00.000Z' };
  let peor = 0;
  for (const o of OBLIGACIONES) {
    const tam = JSON.stringify({ huecos: Object.fromEntries(o.huecos.map(h => [h.id, { estado: 'hecho', nota: 'n'.repeat(1000), motivo: 'm'.repeat(300), adjuntos: Array(8).fill(adj) }])), noAplica: 'm'.repeat(300), nota: 'n'.repeat(1000) }).length;
    peor = Math.max(peor, tam);
  }
  ok(peor < 80_000, `una obligación llena al máximo ocupa ${peor} caracteres: no cabe en el servidor`);
  console.log(`la obligación más grande, llena al máximo: ${peor} caracteres de 80 000`);
}

// ── the generators on a real design
const P0: Parametros = process.argv[2] ? deDiseno(JSON.parse(readFileSync(process.argv[2], 'utf8'))) : PARAMETROS_TRICICLO;
const P = ajustarCarenado(P0), m = crearModelo(P), res = calcular(m, areas(m));
const f = fichaHomologacion(P, m, res, null, 'Diseño de prueba');
const ctx = (fab: Fabricante): ContextoDoc => ({
  f, fab, hoy: '24 de noviembre de 2026', hueco: (o, h) => estadoHueco(OBLIGACIONES.find(x => x.id === o)!, OBLIGACIONES.find(x => x.id === o)!.huecos.find(x => x.id === h)!, vacio),
  ensayo: id => resumenEnsayo(vacio.ensayos[id]), doc: id => estadoDoc(vacio.docs[id], DOCUMENTOS.find(d => d.id === id)!),
});
{
  const lleno = Object.fromEntries(CAMPOS_FABRICANTE.map(c => [c.id, `valor de ${c.id}`])) as unknown as Fabricante;
  for (const d of DOCUMENTOS) {
    for (const s of d.secciones) {
      let t0 = '', t1 = '';
      try { t0 = s.generar(ctx({ ...FABRICANTE_VACIO })); t1 = s.generar(ctx(lleno)); } catch (e: any) { ok(false, `${d.codigo}/${s.id} lanza: ${e?.message}`); continue; }
      ok(t0.trim().length > 10 && t1.trim().length > 10, `${d.codigo}/${s.id}: texto vacío`);
      ok(!/undefined|NaN|null|\[object/.test(t0 + t1), `${d.codigo}/${s.id}: aparece undefined, NaN o null en el texto`);
    }
    if (!['d02', 'd05'].includes(d.id)) ok(conPendientes(d.secciones.map(s => s.generar(ctx({ ...FABRICANTE_VACIO }))).join('\n')), `${d.codigo}: sin datos del fabricante debe haber algo por completar`);
  }
  const d06 = DOCUMENTOS.find(d => d.id === 'd06')!;
  ok(d06.secciones.length === 8, 'la declaración del RD 339/2014 debe tener los 8 datos del anexo I');
  ok(/valor de razon/.test(d06.secciones[0].generar(ctx(lleno))), 'la declaración usa la razón social del fabricante');
  console.log(`generadores: ${DOCUMENTOS.reduce((s, d) => s + d.secciones.length, 0)} secciones sin errores con el diseño «${f.vehiculo}»`);
}

console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo OK');
process.exit(fallos ? 1 : 0);
