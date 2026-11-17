/**
 * The aerodynamic study (2026-11-17) on several designs, in Node. Run with:
 *   npx tsx scripts/estudio-aerodinamico.ts [diseño.json …] [--res baja|media]
 *
 * For each design (every vehicle's defaults, a deliberately bad Triciclo, and any JSON passed) it prints the findings
 * and checks that the catalogue (src/components/aeromovil/estudio/reglas.ts) keeps its promises:
 *  · no two rules share a slider, so no two pieces of advice can pull one in opposite directions;
 *  · a «calculado» finding gains at least RUIDO in CdA, computed by the tunnel, never guessed;
 *  · every proposed change stays inside its slider's range and actually changes the value;
 *  · a finding with nothing the tunnel finds better is «descartado», never recommended.
 * It reads the tunnel only: the calibration is not touched.
 */
import { readFileSync } from 'fs';
import { PARAMETROS_A1, PARAMETROS_BALA, PARAMETROS_BASCULANTE, PARAMETROS_GOTA, PARAMETROS_TRICICLO, ajustarCarenado, areas, calcular, crearModelo, type Parametros } from '../src/components/aeromovil/geometria';
import { deDiseno } from '../src/components/aeromovil/Disenos';
import { cuerpoAeromovil, peticionDe } from '../src/components/aeromovil/tunel/nuestro';
import { calcularTunel } from '../src/components/aeromovil/tunel/calculo';
import type { Resolucion } from '../src/components/aeromovil/tunel/malla';
import { REGLAS, RUIDO, fichasDe } from '../src/components/aeromovil/estudio/reglas';
import { hacerEstudio, type Probar } from '../src/components/aeromovil/estudio/estudio';

const args = process.argv.slice(2), iRes = args.indexOf('--res');
const resolucion = (iRes >= 0 ? args[iRes + 1] : 'media') as Resolucion;
const ficheros = args.filter((a, i) => !a.startsWith('--') && (iRes < 0 || i !== iRes + 1));

let fallosScript = 0;
const ok = (c: boolean, m: string) => { if (!c) { console.log(`FALLA ${m}`); fallosScript++; } };

// ── the catalogue: no slider in two rules
{
  const visto = new Map<string, string>();
  for (const r of REGLAS) for (const k of r.claves) { ok(!visto.has(k), `«${k}» está en dos reglas: ${visto.get(k)} y ${r.id}`); visto.set(k, r.id); }
  console.log(`${REGLAS.length} reglas en el catálogo; ningún deslizador en dos reglas: ${fallosScript ? 'no' : 'sí'}`);
}

const probar: Probar = async P => {
  const m = crearModelo(ajustarCarenado(P)), res = calcular(m, areas(m)), c = cuerpoAeromovil(m, res.A);
  return { R: calcularTunel({ ...peticionDe(c, resolucion, 'pocas'), soloNumeros: true }), A: c.area };
};

const MALO: Parametros = { ...PARAMETROS_TRICICLO, tCola: 0.32, tColaPlana: 1, tColaPlanaAncho: 1.4, tAlto: 1.75, tAncho: 1.1, tSuelo: 0.3, tPuntaMorro: 1.15, tMorro: 0.25, tTraseras: 'dos', tRetrovisores: 'espejos', tPodEsc: 1.1, tPodAncho: 1.2, tPodCola: 0.75, tColaTrans: 0.15, tCaida: -0.5, tSubida: 0.6 } as Parametros;
const disenos: [string, Parametros][] = [
  ['Triciclo por defecto', PARAMETROS_TRICICLO], ['Triciclo malo a propósito', MALO], ['Cuadriciclo Bala en rombo', PARAMETROS_BALA],
  ['Cuadriciclo Basculante', PARAMETROS_BASCULANTE], ['Cuadriciclo Basculante, carrocería Smera', { ...PARAMETROS_BASCULANTE, qCarroceria: 'smera' } as Parametros],
  ['Aeromóvil 1', PARAMETROS_A1], ['Aeromóvil Gota', PARAMETROS_GOTA],
  ...ficheros.map(f => [f, deDiseno(JSON.parse(readFileSync(f, 'utf8')))] as [string, Parametros]),
];

const f3 = (v: number) => v.toFixed(3), pc = (v: number) => `${(v * 100).toFixed(1)} %`;
for (const [nombre, P] of disenos) {
  const t0 = performance.now();
  const e = await hacerEstudio(P, probar, 80);
  if (!e) { ok(false, `${nombre}: el túnel no dio resultado`); continue; }
  console.log(`\n══ ${nombre} (${resolucion}, 80 km/h): Cd ${f3(e.base.cd)} · área ${f3(e.base.A)} m² · CdA ${f3(e.base.cdA)} m² · ${e.pegas.length} pegas · ${Math.round(performance.now() - t0)} ms`);
  const fichas = fichasDe(P);
  for (const p of e.pegas) {
    const cifra = p.estado === 'calculado' ? `calculado ${pc(-(p.fraccion ?? 0))} CdA` : p.estado === 'estimado' ? `estimado −${pc(p.fraccion ?? 0)} CdA` : p.estado === 'noVisto' ? `no visto +${pc(p.fraccion ?? 0)}` : 'descartado';
    console.log(`  [${p.gravedadFinal.padEnd(5)}] ${p.estado === 'descartado' ? '·' : '›'} ${p.titulo} — ${cifra}${p.elegida ? ` — ${p.elegida.prueba.texto}` : ''}${p.elegida?.rompe.length ? ` — ROMPE: ${p.elegida.rompe.join('; ')}` : ''}`);
    if (p.estado === 'descartado') console.log(`           probadas: ${p.probadas.map(q => `${q.prueba.texto} → ${q.dCdA == null ? '—' : pc(q.dCdA / e.base.cdA)}`).join(' | ')}`);
    if (p.estado === 'calculado') ok((p.fraccion ?? 0) >= RUIDO, `${nombre}: «${p.titulo}» calculado con menos del ${pc(RUIDO)}`);
    for (const q of p.probadas) for (const [k, v] of Object.entries(q.prueba.cambios)) {
      ok(v !== (P as unknown as Record<string, unknown>)[k], `${nombre}: «${p.titulo}» propone dejar ${k} como está`);
      const f = fichas[k as keyof Parametros];
      if (f && typeof v === 'number') ok(v >= f.min - 1e-9 && v <= f.max + 1e-9, `${nombre}: «${p.titulo}» saca ${k} de su rango (${v} fuera de ${f.min}–${f.max})`);
    }
  }
  // the same slider never twice among the findings of one design
  const claves = e.pegas.flatMap(p => p.probadas.flatMap(q => Object.keys(q.prueba.cambios).map(k => [k, p.id] as const)));
  const porClave = new Map<string, Set<string>>();
  for (const [k, id] of claves) porClave.set(k, (porClave.get(k) ?? new Set()).add(id));
  for (const [k, s] of porClave) ok(s.size === 1, `${nombre}: «${k}» lo mueven dos pegas (${[...s].join(', ')})`);
}
console.log(fallosScript ? `\n${fallosScript} FALLA` : '\nTodo OK');
process.exit(fallosScript ? 1 : 0);
