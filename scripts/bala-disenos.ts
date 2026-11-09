/**
 * Saved designs and the Cuadriciclo Bala (2026-11-09). Run with: npx tsx scripts/bala-disenos.ts
 *
 * The server keeps a design as opaque JSON (`/api/aeromovil/disenos`), so a design travels as
 * JSON.stringify(aDiseno(P)) and comes back through deDiseno (Disenos.tsx). This checks:
 *  1. a Bala design round-trips: same parameters, same model, same figures;
 *  2. a Gota design saved before 2026-11-06 (no `disposicion`) still opens as the Gota, exactly as the
 *     code before the Bala opened it (same object, no Bala field added);
 *  3. an Aeromóvil 1 design opens as the A1, likewise;
 *  4. a Bala design with broken or out-of-range values opens, and its model stays within the ranges;
 *  5. the editor's default Bala is the garage's: same tunnel silhouette and the same reference area.
 */
import { aDiseno, deDiseno } from '../src/components/aeromovil/Disenos';
import { PARAMETROS_A1, PARAMETROS_BALA, PARAMETROS_GOTA, areas, calcular, crearModelo, type Parametros } from '../src/components/aeromovil/geometria';
import { DESLIZADORES_BALA } from '../src/components/aeromovil/geometriaBala';
import { cuerpoAeromovil } from '../src/components/aeromovil/tunel/nuestro';
import { cuerpoGaraje } from '../src/components/aeromovil/tunel/cuerpos';

let fallos = 0;
const ok = (cond: boolean, msg: string) => { console.log(`${cond ? 'OK   ' : 'FALLA'} ${msg}`); if (!cond) fallos++; };
const viaje = (P: Parametros) => deDiseno(JSON.parse(JSON.stringify(aDiseno(P))));
const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const claves = (o: object) => Object.keys(o).filter(k => /^b[A-Z]/.test(k));

// 1. a Bala design round-trips
{
  const P: Parametros = { ...PARAMETROS_BALA, bBatalla: 2.6, bAlto: 1.5, bCola: 0.8, bRuedaLat: '24', bPilX: 1.1, bPasX: 1.6 };
  const Q = viaje(P);
  ok(Q.disposicion === 'bala', `un Bala guardado vuelve como Bala (disposicion «${Q.disposicion}»)`);
  ok(igual(aDiseno(Q), aDiseno(P)), 'y con los mismos parámetros, uno a uno');
  const m = crearModelo(Q), r = calcular(m, areas(m)), m0 = crearModelo(P), r0 = calcular(m0, areas(m0));
  ok(m.tipo === 'bala' && Math.abs(m.Lf - 0.6 - 2.6 - 0.8) < 1e-9, `su modelo es un Bala de ${m.Lf.toFixed(3)} m (morro 0,60 + batalla 2,60 + cola 0,80)`);
  ok(igual(r.comprobaciones, r0.comprobaciones) && r.A === r0.A, `mismas cifras: área frontal ${r.A.toFixed(3)} m², ${r.comprobaciones.length} comprobaciones`);
}
// 2. a Gota design from before 2026-11-06: no `disposicion`
{
  const viejo: Partial<Parametros> = { B: 2.7, W: 1.31, H: 1.30, xPil: 1.15, tail: 0.5, wF: '26', puerta: 'gaviota' };
  const Q = deDiseno(JSON.parse(JSON.stringify(viejo)));
  // what the code opened before the Bala existed: the Gota's defaults, the saved values, 'rombo', comp 0
  const antes = { ...PARAMETROS_GOTA, ...viejo, disposicion: 'rombo', comp: 0 };
  ok(Q.disposicion === 'rombo', 'un diseño sin «disposicion» abre como Gota («rombo»)');
  ok(igual(Q, antes), 'exactamente el mismo objeto que antes del Bala');
  ok(claves(Q).length === 0 && claves(PARAMETROS_GOTA).length === 0, 'sin ningún campo del Bala (b…)');
  ok(crearModelo(Q).tipo === 'gota', 'y su modelo es el del Gota');
}
// 3. an Aeromóvil 1 design
{
  const guardado: Partial<Parametros> = { disposicion: 'cuatro', L: 4.0, W: 1.6, plazas: 1, neumF: '145/80R13' };
  const Q = deDiseno(JSON.parse(JSON.stringify(guardado)));
  ok(Q.disposicion === 'cuatro' && igual(Q, { ...PARAMETROS_A1, ...guardado, comp: 0 }), 'un Aeromóvil 1 abre como Aeromóvil 1, igual que antes');
  ok(claves(Q).length === 0 && crearModelo(Q).tipo === 'a1', 'sin campos del Bala, y su modelo es el del A1');
}
// 4. broken or out-of-range values
{
  const Q = deDiseno(JSON.parse(JSON.stringify({ disposicion: 'bala', bBatalla: 'larga', bAncho: 9, bRuedaDT: '99', bPasX: 0.2 })));
  const m = crearModelo(Q);
  ok(Q.bBatalla === 2.45, 'un número guardado como texto se ignora: batalla de serie (2,45)');
  ok(m.tipo === 'bala' && m.D.ancho === 1.0, `un ancho de 9 m se queda en el máximo del deslizador (${m.tipo === 'bala' ? m.D.ancho : '?'} m)`);
  ok(m.tipo === 'bala' && m.rF === 0.305, 'una rueda que no existe vuelve a la de serie (24″)');
  ok(m.tipo === 'bala' && Math.abs(-m.sillines.xPasajero - (1.06 + 0.40)) < 1e-9, 'un pasajero imposible (delante del piloto) se coloca a 40 cm detrás de él');
  const hueco = calcular(m, areas(m)).comprobaciones.find(c => c.nombre.startsWith('Carenado lateral'))!.holgura;
  ok(m.tipo === 'bala' && m.F.VIA_LAT > 1.10 && hueco >= 0.028, `con 1 m de carrocería, la vía sube a ${m.tipo === 'bala' ? m.F.VIA_LAT.toFixed(2) : '?'} m y deja ${(hueco * 100).toFixed(1)} cm entre carenado y carrocería`);
}
// 5. the editor's default Bala and the garage's, in the tunnel
{
  const m = crearModelo(PARAMETROS_BALA), r = calcular(m, areas(m));
  const nuestro = cuerpoAeromovil(m, r.A), garaje = cuerpoGaraje({ id: 'bala', x: 0, z: 0 })!;
  ok(igual(nuestro.envolvente, garaje.envolvente), `la silueta del túnel es la del Bala del garaje (${nuestro.envolvente.length} estaciones)`);
  ok(nuestro.area === garaje.area && igual(nuestro.ruedas, garaje.ruedas), `misma área de referencia (${nuestro.area.toFixed(3)} m²) y mismas ruedas`);
}
// the slider table: every key is a Bala field with its default inside the range
for (const f of DESLIZADORES_BALA) {
  const v = PARAMETROS_BALA[f.clave] as number;
  if (!(v >= f.min && v <= f.max)) ok(false, `el valor de serie de «${f.n}» (${v}) está fuera de su rango [${f.min}, ${f.max}]`);
}
console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo OK');
process.exit(fallos ? 1 : 0);
