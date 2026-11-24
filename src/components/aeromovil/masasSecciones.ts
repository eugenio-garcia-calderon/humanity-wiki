/**
 * The weight of each side-panel section («desplegable») — 2026-11-17, Eugenio: «en todos los demás desplegables de toda
 * la herramienta … tiene que aparecer el peso sumado de toda esa sección. Por ejemplo de la cúpula, pues el peso de la
 * cúpula. El chasis, pues el peso del chasis tubular, los tubos, los tornillos … separa la parte de tubos de tornillería».
 *
 * ONE source: the same parts list as the «Peso: todos los componentes» list and the department tabs
 * (`res.triciclo.piezas` grouped by `grupoPieza`, `res.basculante.piezas` by their `grupo`, `res.masas` for the Gota and
 * the Aeromóvil 1). Nothing here invents a mass; it only says which section each part belongs to, and splits two lumps
 * into their pieces with the model's own numbers:
 *  - the body's laminate («Carrocería») by where it is: nose, tail, flanks and belly, and under the solar panel and the
 *    roof frame (`pielBala`'s areas × the same kg/m²);
 *  - the frame («Bastidor») into its tubes, group by group (length × section × density, the formula of the parts list),
 *    and its joints (the rest of the part: the model's «Uniones, chapas y tornillería»), estimated into bolts, brackets
 *    and gussets/welds.
 * Each split adds up to the part it splits, exactly (the remainder goes to the last piece), and every part is in one
 * section or in `sinSeccion`: `scripts/pesos-secciones.ts` checks that sections + sinSeccion = department = vehicle.
 *
 * Two kinds of section:
 *  - `propia`: the parts it owns (they add up to the department);
 *  - `ajusta`: a section whose sliders set the mass of parts owned by other sections («Masas», «Material y espesores»).
 *    It shows that sum too, said differently («ajusta 62 kg»), and does not count in the sums.
 */
import type { Resultados } from './geometria';
import { MATERIALES_CHASIS, largoTubo, type Tubo } from './geometria';
import { pielBala } from './geometriaBala';
import { grupoPieza, type DepTriciclo, type ModeloTriciclo } from './geometriaTriciclo';

export interface PartePeso { nombre: string; kg: number; nota?: string; hijos?: PartePeso[] }
export interface SeccionPeso { kg: number; tipo: 'propia' | 'ajusta'; partes: PartePeso[]; nota?: string }
export type DepPeso = DepTriciclo | 'gota' | 'a1';
/** Sections by `clave(dep, bloque)`; parts with no section of their own by department. */
export interface PesosSecciones { secciones: Record<string, SeccionPeso>; sinSeccion: Partial<Record<DepPeso, PartePeso[]>> }

/** A section's key: the block's title is not unique across departments («Masas» is in Interior and in Rodaje). */
export const clave = (dep: string, bloque: string) => `${dep}|${bloque}`;
const suma = (ps: { kg: number }[]) => ps.reduce((a, p) => a + p.kg, 0);
const f1 = (v: number) => v.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const f2 = (v: number) => v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** The weight of one section, or null (a section with no mass shows nothing). */
export function pesoSeccion(p: PesosSecciones | null, dep: string, bloque: string): SeccionPeso | null {
  const s = p?.secciones[clave(dep, bloque)];
  return s && s.kg > 0.005 ? s : null;
}

/** «8,4 kg» for a section's header; «ajusta 62,0 kg» for one that only sets the mass of other sections' parts. */
export const textoPesoSeccion = (s: SeccionPeso | null) => (s ? `${s.tipo === 'ajusta' ? 'ajusta ' : ''}${f1(s.kg)} kg` : null);

// ------------------------------------------------------------------ building the sections from a parts list
type Regla = [dep: DepPeso, bloque: string, nombre: RegExp];
function agrupar(piezas: (PartePeso & { dep: DepPeso })[], reglas: Regla[], ajustes: [DepPeso, string, RegExp, string?][]): PesosSecciones {
  const out: PesosSecciones = { secciones: {}, sinSeccion: {} };
  for (const p of piezas) {
    const r = reglas.find(([d, , re]) => d === p.dep && re.test(p.nombre));
    const { dep, ...parte } = p;
    if (!r) { (out.sinSeccion[dep] ??= []).push(parte); continue; }
    const s = (out.secciones[clave(r[0], r[1])] ??= { kg: 0, tipo: 'propia', partes: [] });
    s.partes.push(parte); s.kg += parte.kg;
  }
  for (const [d, b, re, nota] of ajustes) {
    const ps = piezas.filter(p => re.test(p.nombre)).map(({ dep: _d, ...q }) => q);
    if (ps.length) out.secciones[clave(d, b)] = { kg: suma(ps), tipo: 'ajusta', partes: ps, nota };
  }
  return out;
}

// ------------------------------------------------------------------ the frame: tubes and joints
/** The group a frame tube belongs to, from its name (both sides and every crossbar together). */
export function grupoTubo(nombre: string): string {
  if (/^Larguero trasero/.test(nombre)) return 'Largueros traseros';
  if (/^Larguero/.test(nombre)) return 'Largueros';
  if (/^Travesaño/.test(nombre)) return 'Travesaños';
  if (/^Arco/.test(nombre)) return 'Arco de seguridad';
  if (/^Torre (delantera|trasera)/.test(nombre)) return 'Torres de los paralelogramos';
  if (/^Torreta/.test(nombre)) return 'Torreta del amortiguador';
  if (/^Soporte del (sillín|asiento)/.test(nombre)) return 'Soportes de los asientos';
  return nombre.split(':')[0].replace(/ (izq\.|der\.|izquierd[oa]|derech[oa])$/, '');
}

/**
 * Fasteners and brackets, counted from what is bolted to the frame (an estimate, not a bill of materials): each
 * suspension corner's two wishbones by two pivots plus the shock's top (5 bolts), the swing arm's pivot and its shock
 * (4), each seat (4), each battery box (4), the controller (4), the steering column (4), the tilt system (8) and the
 * body on the frame (16 smaller ones). M8 bolt with its nut and two washers ≈ 30 g; M6 for the body ≈ 12 g. One welded
 * tab (3 mm plate, 40 × 50 mm, ≈ 47 g in steel; in aluminium the same size at 2 700 kg/m³) for every two bolts.
 */
export interface Fijaciones { m8: number; m6: number; soportes: number }
export const KG_M8 = 0.030, KG_M6 = 0.012, CHAPA_SOPORTE = 0.003 * 0.04 * 0.05;

function desgloseBastidor(tubos: Tubo[], kgPieza: number, densidad: number, fij: Fijaciones, densSoporte: number): PartePeso[] {
  const grupos = new Map<string, { kg: number; m: number; n: number; d: number; pared: number }>();
  for (const t of tubos) {
    const l = largoTubo(t), kg = Math.PI * ((t.d / 2) ** 2 - (t.d / 2 - t.pared) ** 2) * l * densidad, g = grupoTubo(t.nombre);
    const a = grupos.get(g) ?? { kg: 0, m: 0, n: 0, d: t.d, pared: t.pared };
    a.kg += kg; a.m += l; a.n++; grupos.set(g, a);
  }
  const tubosP: PartePeso[] = [...grupos].map(([g, a]) => ({ nombre: g, kg: a.kg, nota: `${a.n} tubo${a.n > 1 ? 's' : ''}, ${f2(a.m)} m de Ø${Math.round(a.d * 1000)} × ${f1(a.pared * 1000)} mm` }));
  const kgTubos = suma(tubosP), metros = [...grupos.values()].reduce((s, a) => s + a.m, 0);
  // the joints are the rest of the part (the model: «Uniones, chapas y tornillería», at least 15 % of the tubes on the Triciclo)
  const U = Math.max(0, kgPieza - kgTubos);
  let tor = fij.m8 * KG_M8 + fij.m6 * KG_M6, sop = fij.soportes * CHAPA_SOPORTE * densSoporte, aviso = '';
  if (tor + sop > U) { const k = U / (tor + sop); tor *= k; sop *= k; aviso = ' Los tornillos y soportes contados pesarían más que lo que deja «Uniones, chapas y tornillería»: se reparten en proporción; más realista, subir ese deslizador.'; }
  const nudos = new Set(tubos.flatMap(t => [t.a, t.b].map(p => p.map(v => Math.round(v * 50)).join(',')))).size;
  return [
    { nombre: 'Tubos', kg: kgTubos, nota: `${f1(metros)} m de tubo: largo × sección × densidad`, hijos: tubosP },
    {
      nombre: 'Uniones (reparto estimado)', kg: U, nota: `el total es el del modelo; cómo se reparte, una estimación.${aviso}`, hijos: [
        { nombre: 'Tornillería', kg: tor, nota: `unos ${fij.m8} tornillos M8 con tuerca y arandelas (30 g) y ${fij.m6} M6 de la carrocería (12 g)` },
        { nombre: 'Soportes y anclajes', kg: sop, nota: `unos ${fij.soportes} soportes de chapa de 3 mm para las suspensiones, los asientos, la batería y la carrocería` },
        { nombre: 'Cartelas, nudos y soldaduras', kg: U - tor - sop, nota: `unos ${nudos} nudos donde se juntan los tubos` },
      ],
    },
  ];
}

// ------------------------------------------------------------------ the Triciclo family
export function seccionesTriciclo(res: Resultados, m: ModeloTriciclo): PesosSecciones | null {
  const rt = res.triciclo; if (!rt) return null;
  const T = m.campos;
  const piezas: (PartePeso & { dep: DepPeso })[] = [];
  for (const p of rt.piezas) {
    const dep = grupoPieza(p.nombre);
    if (p.nombre === 'Carrocería' && res.areas.carroceria > 0) {
      // the laminate by zone, with the parts list's own kg/m²: everything not ahead of or behind the canopy, and not
      // under the solar panel or the roof frame, is the flanks and the belly («Forma»)
      const kgm2 = p.kg / res.areas.carroceria, z = pielBala(m.F, m.cup);
      const morro = z.pielMorro * kgm2, cola = z.pielCola * kgm2, lados = (z.piel - z.cristal - z.pielMorro - z.pielCola) * kgm2;
      const nota = (a: number) => `${f2(a)} m² de laminado a ${f2(kgm2)} kg/m²`;
      piezas.push({ dep, nombre: 'Carrocería: morro', kg: morro, nota: nota(z.pielMorro) });
      piezas.push({ dep, nombre: 'Carrocería: cola', kg: cola, nota: nota(z.pielCola) });
      piezas.push({ dep, nombre: 'Carrocería: costados y panza', kg: lados, nota: nota(lados / kgm2) });
      const techo = p.kg - morro - cola - lados;
      if (techo > 0.005) piezas.push({ dep, nombre: 'Carrocería: bajo el panel solar y el marco del techo', kg: techo, nota: nota(techo / kgm2) });
      continue;
    }
    if (p.nombre === 'Bastidor') {
      const nAsientos = m.filas ? m.asientosFilas.length : 2;
      const traseras = m.cuatro ? 10 : 4;
      const m8 = 10 + traseras + 4 * nAsientos + 4 * m.baterias.length + 4 + 4 + (m.bascula ? 8 : 0);
      const fij = { m8, m6: 16, soportes: Math.round(m8 / 2) };
      const dens = MATERIALES_CHASIS[T.tChMat].densidad;
      piezas.push({ dep, nombre: p.nombre, kg: p.kg, nota: p.nota, hijos: desgloseBastidor(m.tubos, p.kg, dens, fij, T.tChMat === 'cromoly' ? dens : 2700) });
      continue;
    }
    // the canopy is its glass: area × thickness × 1,2 kg/m²·mm (the parts list's own rule)
    const nota = p.nombre === 'Cúpula' && res.areas.cristal > 0 ? `${f2(res.areas.cristal)} m² de cristal de ${f1(p.kg / res.areas.cristal / 1.2)} mm (1,2 kg por m² y mm)` : p.nota;
    piezas.push({ dep, nombre: p.nombre, kg: p.kg, nota });
  }
  return agrupar(piezas, [
    ['carroceria', 'Morro', /^(Carrocería: morro|Faro|Barra de luz)/],
    ['carroceria', 'Cola', /^Carrocería: cola/],
    ['carroceria', 'Forma', /^Carrocería: costados/],
    ['carroceria', 'Cúpula', /^Cúpula$/],
    ['carroceria', 'Techo solar y ventanas', /^(Carrocería: bajo el panel|Paneles solares)/],
    ['carroceria', 'Carenados', /^Carenados/],
    // 2026-11-17: the blended-wing-body fairing (triciclo/bwb.ts)
    ['carroceria', 'Carenado BWB (ala integrada)', /^Carenado BWB/],
    ['carroceria', 'Puertas y maletero', /^(Puertas|Portón|Montantes|Retrovisores)/],
    ['chasis', 'Bastidor', /^Bastidor$/],
    ['rodaje', 'Ejes y ruedas', /^(Ruedas?\b|Frenos)/],
    ['rodaje', 'Suspensión y dirección', /^(Suspensión|Basculante y|Dirección)/],
    ['rodaje', 'Basculación', /^Basculación/],
    // (2026-11-17, capo) the hybrid's cooling: radiator, fan, pipes, coolant, intake ducts (triciclo/refrigeracion.ts)
    ['propulsion', 'Refrigeración', /^Motor: (radiador|ventilador del radiador|tubos de refrigeración|refrigerante|conductos de la toma)/],
    ['propulsion', 'Híbrido enchufable', /^(Motor de gasolina|Motor: (engranaje|generador|embrague|motor-generador|árbol)|Depósito)/],
    ['propulsion', 'Motor eléctrico', /^(Motor(es)? de buje|Motor eléctrico|Controlador|Motor: reductora)/],
    // (2026-11-24) the driver's chainless pedals: bici/pedales.ts, its own block (BiciTriciclo.tsx)
    ['propulsion', 'Pedales', /^Pedales:/],
    ['energia', 'Batería', /^Batería/],
    ['energia', 'Varios', /^Varios/],
    ['interior', 'Asientos', /^Asientos/],
    ['interior', 'Mandos', /^Volante/],
    ['interior', 'Salpicadero', /^Salpicadero/],
    ['interior', 'Acabado interior', /^Interior/],
    ['interior', 'Tapicería', /^(Tapicería|Cinturones)/],
  ], [
    ['carroceria', 'Material y espesores', /^(Carrocería|Carenados|Cúpula$)/, 'el material y los espesores deciden lo que pesan el laminado y el cristal'],
    ['rodaje', 'Masas', /^(Ruedas?\b|Frenos|Suspensión|Basculante y|Dirección)/, 'lo menos que pesa cada pieza; si la carga pide más, cuenta la carga'],
    ['interior', 'Masas', /^Asientos/, 'la masa de los ocupantes no es del vehículo'],
    ['energia', 'Techo solar', /^Paneles solares/, 'kg por m² de panel'],
  ]);
}

// ------------------------------------------------------------------ the Cuadriciclo Basculante
export function seccionesBasculante(res: Resultados): PesosSecciones | null {
  const rb = res.basculante; if (!rb) return null;
  return agrupar(rb.piezas.map(p => ({ dep: p.grupo as DepPeso, nombre: p.nombre, kg: p.kg, nota: p.nota })), [
    ['carroceria', 'Forma', /^(Carrocería|Suelo)/],
    ['carroceria', 'Cúpula', /^(Cúpula|Marco de la cúpula)/],
    ['chasis', 'Bastidor', /^Bastidor$/],
    ['rodaje', 'Ejes y ruedas', /^(Ruedas?\b|Neumátic|Llanta|Frenos)/],
    ['rodaje', 'Suspensión y dirección', /^(Pilares|Dirección)/],
    ['rodaje', 'Basculación', /^(Paralelogramos|Actuador)/],
    ['propulsion', 'Motores', /^(Motor|Controlador)/],
    ['energia', 'Batería', /^Batería/],
    ['energia', 'Varios', /^Varios/],
    ['energia', 'Techo solar', /^Paneles solares/],
    ['interior', 'Asientos', /^Asientos/],
    ['interior', 'Mandos', /^Volante/],
  ], [
    ['carroceria', 'Material y espesores', /^(Carrocería|Cúpula)/, 'el material y los espesores deciden lo que pesan el laminado y la cúpula'],
    ['rodaje', 'Masas', /^(Ruedas?\b|Neumátic|Llanta|Frenos|Pilares|Paralelogramos|Actuador|Dirección)/, 'lo menos que pesa cada pieza'],
    ['interior', 'Masas', /^Asientos/, 'la masa de los ocupantes no es del vehículo'],
  ]);
}

// ------------------------------------------------------------------ the Gota and the Aeromóvil 1 (one list, `res.masas`)
const deMasas = (res: Resultados, dep: DepPeso) => Object.entries(res.masas ?? {}).map(([nombre, kg]) => ({ dep, nombre, kg }));
export function seccionesGota(res: Resultados): PesosSecciones {
  return agrupar(deMasas(res, 'gota'), [
    ['gota', 'Chasis y ruedas', /^(Chasis|Suspensión|Ruedas)/],
    ['gota', 'Asientos', /^Asientos/],
    ['gota', 'Carenado aerodinámico', /^(Carenado|Cristales|Paneles solares)/],
  ], []);
}
export function seccionesA1(res: Resultados): PesosSecciones {
  return agrupar(deMasas(res, 'a1'), [
    ['a1', 'Carrocería y cúpula', /^(Carrocería|Cúpula)/],
    ['a1', 'Chasis', /^Chasis/],
    ['a1', 'Ejes, ruedas y suspensión', /^(Suspensión|Ruedas|Frenos|Dirección)/],
    ['a1', 'Motor y transmisión', /^Motor/],
    ['a1', 'Batería y energía solar', /^(Batería|Paneles solares)/],
    ['a1', 'Plazas y asientos', /^Asientos/],
    ['a1', 'Varios', /^Varios/],
  ], [
    ['a1', 'Material y espesores', /^(Carrocería|Cúpula)/, 'el material y los espesores deciden lo que pesan la carrocería y la cúpula'],
  ]);
}

/** Every vehicle: the sections of this design (null for the Cuadriciclo Bala, which has no masses). */
export function pesosSecciones(res: Resultados, m: { tipo: string }): PesosSecciones | null {
  if (m.tipo === 'triciclo') return seccionesTriciclo(res, m as ModeloTriciclo);
  if (m.tipo === 'basculante') return seccionesBasculante(res);
  if (m.tipo === 'a1') return seccionesA1(res);
  if (m.tipo === 'gota') return seccionesGota(res);
  return null;
}
