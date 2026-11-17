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

const disenos: [string, Parametros][] = [
  ['Triciclo por defecto', PARAMETROS_TRICICLO],
  ['Triciclo por defecto con dos ruedas traseras', { ...PARAMETROS_TRICICLO, tTraseras: 'dos' }],
  ['Triciclo por defecto en rombo', { ...PARAMETROS_TRICICLO, tRuedas: 'rombo' }],
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
}
console.log(fallos ? `\n${fallos} fallos` : '\nTodo OK');
process.exit(fallos ? 1 : 0);
