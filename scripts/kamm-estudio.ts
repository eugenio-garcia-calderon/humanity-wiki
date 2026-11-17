/**
 * The Kamm tail study (2026-11-17): Eugenio's «Rombo Bala» (his «Modelo 1»-like design) with its long tail and cut at
 * several places, through the same tunnel the editor uses (media resolution, 80 km/h, as the calibration), plus the
 * literature's estimate of the base drag. Run: npx tsx scripts/kamm-estudio.ts
 */
import * as fs from 'fs';
import { crearModelo, calcular, areas, PARAMETROS_TRICICLO, type Parametros } from '../src/components/aeromovil/geometria';
import { deDiseno } from '../src/components/aeromovil/Disenos';
import type { ModeloTriciclo } from '../src/components/aeromovil/geometriaTriciclo';
import { calcularTunel } from '../src/components/aeromovil/tunel/calculo';
import { cuerpoAeromovil, peticionDe } from '../src/components/aeromovil/tunel/cuerpos';
import { estimacionKamm } from '../src/components/aeromovil/garaje/kamm';

const ROMBO = '/tmp/claude-0/-home-claude/4986d662-b311-56d1-afc9-c523879a4ca6/scratchpad/rombo/rombo_bala.json';
const rombo = JSON.parse(fs.readFileSync(ROMBO, 'utf8'));
const casos: [string, Record<string, unknown>][] = [];
const SOLO = process.argv.includes('--extra');
for (const cola of SOLO ? [] : [0.63, 1.2, 1.8]) {
  casos.push([`cola ${cola} m larga`, { tCola: cola }]);
  for (const f of [0.4, 0.5, 0.6]) casos.push([`cola ${cola} m cortada al ${f * 100} %`, { tCola: cola, tColaCorte: 'kamm', tKammSeccion: f }]);
}
for (const f of [0.3, 0.4, 0.5]) casos.push([`cola 1.8, caída +0.8, punta 0.9, al ${f * 100} %`, { tCola: 1.8, tCaida: 0.8, tPuntaCola: 0.9, tColaCorte: 'kamm', tKammSeccion: f }]);
casos.push(['cola 1.8, caída +0.8, punta 0.9, larga', { tCola: 1.8, tCaida: 0.8, tPuntaCola: 0.9 }]);
casos.push(['cola 1.8 m cortada al 50 %, hueco 8 cm', { tCola: 1.8, tColaCorte: 'kamm', tKammSeccion: 0.5, tKammCavidad: 0.08 }]);
for (const [n, o] of casos) {
  const P = deDiseno(JSON.parse(JSON.stringify({ ...PARAMETROS_TRICICLO, ...rombo, ...o, disposicion: 'triciclo' }))) as Parametros;
  const m = crearModelo(P) as ModeloTriciclo, res = calcular(m, areas(m));
  const c = cuerpoAeromovil(m, res.A);
  const R = calcularTunel({ ...peticionDe(c, 'media', 'pocas'), soloNumeros: true });
  const v = R.porVelocidad.find(p => p.kmh === 80)!, d = v.cd;
  const k = m.F.kamm, e = k ? estimacionKamm(k, c.area) : null;
  console.log(`${n.padEnd(42)} largo ${m.F.LARGO.toFixed(3)} m  Cd ${d.total.toFixed(4)} (fricción ${d.friccion.toFixed(4)}, forma ${d.forma.toFixed(4)}, estela ${d.estela.toFixed(4)})  base sep ${v.areaBase.toFixed(3)} m²  Aref ${c.area.toFixed(3)}` +
    (k ? `\n${''.padEnd(42)} corte x ${k.x.toFixed(3)} ahorra ${k.ahorro.toFixed(3)} m, culote ${k.area.toFixed(3)} m² (${k.alto.toFixed(2)}×${k.ancho.toFixed(2)}), ángulos techo ${k.angTecho.toFixed(1)}° lado ${k.angLado.toFixed(1)}° bajos ${k.angBajos.toFixed(1)}°; literatura culote ΔCd ${e!.min.toFixed(4)}–${e!.max.toFixed(4)}${e!.aviso ? ' · ' + e!.aviso : ''}` : ''));
}
