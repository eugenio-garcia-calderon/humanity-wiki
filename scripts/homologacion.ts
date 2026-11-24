/**
 * The homologation pre-check (2026-11-17) on several designs, in Node. Run with:
 *   npx tsx scripts/homologacion.ts [diseño.json …]
 *
 * For each design (every vehicle's defaults, the Triciclo's four-wheel variants and any JSON passed, e.g. Rombo Bala)
 * it prints the category it falls in, why the cheaper ones were ruled out, every measurable requirement with its
 * margin, and what fails. It also checks the catalogue (src/components/aeromovil/homologacion/normas.ts): unique ids,
 * every category with at least one requirement, every limit on a category the requirement lists, every source known.
 * The top speed needs the tunnel's Cd (computed here at «media», numbers only): the tunnel is only read.
 */
import { readFileSync } from 'fs';
import { PARAMETROS_A1, PARAMETROS_BALA, PARAMETROS_BASCULANTE, PARAMETROS_GOTA, PARAMETROS_TRICICLO, ajustarCarenado, areas, calcular, crearModelo, type Parametros } from '../src/components/aeromovil/geometria';
import { deDiseno } from '../src/components/aeromovil/Disenos';
import { cuerpoAeromovil, peticionDe } from '../src/components/aeromovil/tunel/nuestro';
import { calcularTunel } from '../src/components/aeromovil/tunel/calculo';
import { camposTriciclo, nombreTriciclo } from '../src/components/aeromovil/geometriaTriciclo';
import { CATEGORIAS, FUENTES, REQUISITOS, ETIQUETA_ESTADO } from '../src/components/aeromovil/homologacion/normas';
import { fichaHomologacion } from '../src/components/aeromovil/homologacion/ficha';
import { elegirCategoria, evaluarCategoria, fraseMargen } from '../src/components/aeromovil/homologacion/evaluar';
import { ETIQUETA_L7E, estudioL7e } from '../src/components/aeromovil/homologacion/l7e';
import { electronicaTriciclo } from '../src/components/aeromovil/triciclo/electronica';
import { GUIAS, VIAS } from '../src/components/aeromovil/homologacion/guias';

let fallos = 0;
const ok = (c: boolean, m: string) => { if (!c) { console.log(`FALLA ${m}`); fallos++; } };

// ── the catalogue
{
  const ids = new Set<string>();
  for (const r of REQUISITOS) {
    ok(!ids.has(r.id), `el requisito «${r.id}» está dos veces`); ids.add(r.id);
    ok(r.fuente in FUENTES, `«${r.id}»: fuente desconocida ${r.fuente}`);
    ok(r.categorias.length > 0, `«${r.id}» no se aplica a ninguna categoría`);
    for (const c of Object.keys(r.medida?.limite ?? {})) ok(r.categorias.includes(c as never), `«${r.id}»: límite para ${c}, que no está en sus categorías`);
    ok(!!r.medida || !!r.comprobar || !!r.queHaceFalta, `«${r.id}»: ni medida, ni comprobación, ni «qué hace falta»`);
  }
  for (const c of CATEGORIAS) ok(REQUISITOS.some(r => r.categorias.includes(c.id)), `${c.id} no tiene requisitos`);
  console.log(`${REQUISITOS.length} requisitos, ${CATEGORIAS.length} categorías, ${Object.keys(FUENTES).length} fuentes`);
}

// ── the written guides (guias.ts): every row tied to a requirement of its category, every source known, nothing left out
{
  for (const g of GUIAS) {
    const delGuia = REQUISITOS.filter(r => g.categorias.some(c => r.categorias.includes(c)));
    for (const f of g.tabla) {
      ok(f.fuente in FUENTES, `guía ${g.id}: la fila «${f.concepto}» cita una fuente desconocida`);
      if (f.req) ok(delGuia.some(r => r.id === f.req), `guía ${g.id}: la fila «${f.concepto}» apunta al requisito «${f.req}», que no es de sus categorías`);
    }
    for (const r of g.revision) if (r.fuente) ok(r.fuente in FUENTES, `guía ${g.id}: una revisión cita una fuente desconocida`);
    for (const id of g.vias) ok(VIAS.some(v => v.id === id), `guía ${g.id}: vía «${id}» desconocida`);
    for (const f of g.propia?.fuentes ?? []) ok(f in FUENTES, `guía ${g.id}: la vía propia cita una fuente desconocida`);
    ok(g.categorias.includes(g.porDefecto), `guía ${g.id}: la categoría por defecto no es suya`);
    ok(new Set(g.pasos.map(p => p.titulo)).size === g.pasos.length, `guía ${g.id}: pasos repetidos`);
    console.log(`guía ${g.id}: ${g.tabla.length} filas, ${g.revision.length} revisiones, ${g.pasos.length} pasos, ${g.vias.length || (g.propia ? 1 : 0)} vías`);
  }
  // the pedal-cycle guide shows each of its own requirements in the table (nothing the design is checked against is hidden)
  const epac = GUIAS.find(g => g.id === 'epac')!;
  for (const r of REQUISITOS.filter(r => r.categorias.includes('EPAC') && r.id !== 'permiso')) ok(epac.tabla.some(f => f.req === r.id), `guía epac: el requisito «${r.id}» no sale en su tabla`);
}

const disenos: [string, Parametros][] = [
  ['Triciclo por defecto', PARAMETROS_TRICICLO],
  ['Triciclo por defecto con dos ruedas traseras', { ...PARAMETROS_TRICICLO, tTraseras: 'dos' }],
  ['Triciclo por defecto en rombo', { ...PARAMETROS_TRICICLO, tRuedas: 'rombo' }],
  // 2026-11-17 (electronica): the case of Eugenio's L7e-A2 study (15 kW engine, 13 kW continuous / 30 kW peak e-motor), as it
  // is and with the power electronics that fit it (a 15 kW dynamic limit and two independent limiters)
  ['Híbrido del estudio L7e-A2, sin gestión', { ...PARAMETROS_TRICICLO, tTraseras: 'dos', tAsientos: 'butacas', tPropulsion: 'phev', tPhevKW: 15, tKWNom: 13, tKWPico: 30 } as Parametros],
  ['Híbrido del estudio L7e-A2, límite dinámico de 15 kW', { ...PARAMETROS_TRICICLO, tTraseras: 'dos', tAsientos: 'butacas', tPropulsion: 'phev', tPhevKW: 15, tKWNom: 13, tKWPico: 30, tEpEstrategia: 'dinamica', tEpLimCont: 15, tEpLim1: 'hcu', tEpLim2: 'velocidad' } as Parametros],
  ['Cuadriciclo Basculante', PARAMETROS_BASCULANTE], ['Aeromóvil 1', PARAMETROS_A1], ['Aeromóvil Gota', PARAMETROS_GOTA], ['Cuadriciclo Bala', PARAMETROS_BALA],
  ...process.argv.slice(2).map(f => [f.split('/').pop()!, deDiseno(JSON.parse(readFileSync(f, 'utf8')))] as [string, Parametros]),
];

const n0 = (v: number | null | undefined, d = 0) => v == null ? '—' : v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
for (const [nombre, P0] of disenos) {
  const P = ajustarCarenado(P0), m = crearModelo(P), res = calcular(m, areas(m));
  let cd: { cd: number; areaRef: number } | null = null;
  if (m.tipo === 'triciclo' || m.tipo === 'basculante') {
    const c = cuerpoAeromovil(m, res.A), R = calcularTunel({ ...peticionDe(c, 'media', 'pocas'), soloNumeros: true });
    const v = m.tipo === 'triciclo' ? camposTriciclo(P).tVel : 80;
    const q = [...R.porVelocidad].sort((a, b) => Math.abs(a.kmh - v) - Math.abs(b.kmh - v))[0];
    cd = { cd: q.cd.total, areaRef: c.area };
  }
  const titulo = m.tipo === 'triciclo' ? `${nombre} (${nombreTriciclo(camposTriciclo(P))})` : nombre;
  const f = fichaHomologacion(P, m, res, cd, titulo);
  const { cat, descartadas } = elegirCategoria(f), e = evaluarCategoria(f, cat);
  console.log(`\n══ ${titulo}: ${cat}`);
  console.log(`   ${f.ruedasFisicas} ruedas (${f.ruedasLegales} para la ley) · ${n0(f.plazas)} plazas${f.horcajadas ? ' a horcajadas' : ''} · ${f.manillar ? 'manillar' : 'volante'} · masa ${n0(f.masaVacio)} kg, batería ${n0(f.masaBateria)} kg → en orden de marcha ${n0(f.masaOrdenMarcha)} kg · ${n0(f.potenciaCategoria, 1)} kW continuos (${n0(f.potenciaPico, 1)} de pico) · vmax ${n0(f.vmax)} km/h (diseño ${n0(f.velocidadDiseno)}) · ${n0(f.largo, 2)} × ${n0(f.ancho, 2)} × ${n0(f.alto, 2)} m${cd ? ` · Cd ${cd.cd.toFixed(3)}` : ''}`);
  for (const d of descartadas) console.log(`   descartada ${d.cat}: ${d.bloqueantes.map(b => `${b.req.titulo} (${b.texto})`).join('; ')}`);
  console.log(`   ${fraseMargen(e)}`);
  console.log(`   cumple ${e.cuenta.cumple} · no cumple ${e.cuenta.no} · se arregla limitando ${e.cuenta.condicion} · a comprobar ${e.cuenta.comprobar}`);
  for (const r of e.resultados) if (r.estado !== 'comprobar') console.log(`   [${ETIQUETA_ESTADO[r.estado].padEnd(9).slice(0, 9)}] ${r.req.titulo}: ${r.texto}`);
  // sanity: a measured result carries numbers; the chosen category is one of the candidates
  for (const r of e.resultados) if (r.limite != null && r.valor != null) ok(Number.isFinite(r.valor) && Number.isFinite(r.margen ?? 0), `${titulo}: «${r.req.id}» sin cifra`);
  ok(f.ruedasLegales >= 2, `${titulo}: ${f.ruedasLegales} ruedas legales`);
  // (2026-11-17) the L7e power study and the tests (l7e.ts), for the Triciclo family
  const l7 = estudioL7e(f);
  if (m.tipo === 'triciclo') {
    ok(!!l7, `${titulo}: sin estudio L7e`);
    if (l7) {
      const el = f.electronica!;
      console.log(`   L7e-A2: ${l7.resumen} Continua total ${n0(el.contTotal, 1)} kW («${el.modoCont.nombre}»), pico ${n0(el.picoTotal, 1)} kW${f.vmaxConjunta != null ? `, con los dos a la vez ${n0(f.vmaxConjunta)} km/h` : ''}`);
      for (const p of l7.puntos) console.log(`     [${ETIQUETA_L7E[p.estado].padEnd(11)}] ${p.campo ? p.campo + ' ' : ''}${p.titulo}: ${p.valor}`);
      for (const e of l7.ensayos) {
        console.log(`     ensayo ${e.corto} — ${ETIQUETA_L7E[e.expectativa.estado]}: ${e.expectativa.texto}`);
        ok(e.pasos.length > 0 && e.declarar.length > 0 && e.valores.length > 0 && e.fuente in FUENTES, `${titulo}: el ensayo «${e.id}» está incompleto`);
      }
      ok(new Set(l7.ensayos.map(e => e.id)).size === l7.ensayos.length, `${titulo}: ensayos repetidos`);
      ok(l7.puntos.every(p => p.fuente in FUENTES), `${titulo}: un punto del estudio L7e con fuente desconocida`);
      // the category's power is the electronics' strongest mode, and with the defaults it is what it always was
      ok(Math.abs((f.potenciaCategoria ?? 0) - el.contTotal) < 1e-9, `${titulo}: la potencia de la categoría no es la continua total`);
      const T = camposTriciclo(P);
      const sinGestion = T.tEpEstrategia === 'libre' && T.tEpLimCont === 0 && T.tEpSport === 'no' && T.tEpMapa === 'normal';
      if (sinGestion) ok(Math.abs(el.contTotal - (T.tKWNom + (T.tPropulsion === 'phev' ? T.tPhevKW : 0))) < 1e-9, `${titulo}: sin electrónica configurada la potencia cambió (${el.contTotal})`);
    }
  }
}
// ── the power electronics alone (triciclo/electronica.ts): the study's numbers
{
  const base = { ...PARAMETROS_TRICICLO, tPropulsion: 'phev', tPhevKW: 15, tKWNom: 13, tKWPico: 30 } as Parametros;
  const el = (o: Record<string, unknown>) => electronicaTriciclo(camposTriciclo({ ...base, ...o } as Parametros));
  ok(el({}).contTotal === 28 && el({}).picoTotal === 45, 'estudio: sin gestión, 28 kW continuos y 45 de pico');
  ok(el({ tEpEstrategia: 'dinamica', tEpLimCont: 15 }).contTotal === 15, 'estudio: con límite dinámico de 15 kW, 15 continuos');
  ok(el({ tEpEstrategia: 'termico', tEpLimCont: 15 }).termicoNeto === 2, 'estudio: térmico rebajado a 2 kW para sumar 15 con los 13 eléctricos');
  ok(el({ tEpEstrategia: 'dinamica', tEpLimCont: 15, tEpSport: 'si' }).contTotal === 45, 'estudio: un modo sport sin límite continuo vuelve a dar el pico (45)');
  ok(el({ tEpEstrategia: 'libre', tEpLimCont: 15 }).contTotal === 28, 'estudio: un límite sin gestión no limita la suma');
}
console.log(fallos ? `\n${fallos} fallos` : '\nTodo OK');
process.exit(fallos ? 1 : 0);
