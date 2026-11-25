// ============================================================================
// AGRICULTURA SINTRÓPICA · PLOT, GROWTH, SIMULATION AND ADVISOR (2026-11-25)
// ============================================================================
// Pure functions, no React. Everything the page shows comes from here:
//   parameters → plot (plants, paths, swales) → size of every plant at year t
//   → yearly indicators (cover, organic matter, nitrogen, water, harvest)
//   → advice (too close, competition, water, zone, frost, first steps).
//
// HONESTY RULE: the simulator is a teaching and design model, not a measurement.
// The yield of the key species under syntropic management is a HYPOTHESIS with
// three adjustable effects (water, nitrogen, microclimate); the whole point of
// the project is to measure it in the field. The page labels it that way.

import { ESPECIE, ZONAS, SENSIBLES_JUGLONA, especie, type Especie, type Zona } from './especies';
import { diseno, rol, type Asignacion, type Hueco, geometriaSonrisa } from './disenos';

export type Maquina = 'tractor' | 'estrecho' | 'motocultor';
export const MAQUINAS: Record<Maquina, { nombre: string; ancho: number }> = {
  tractor: { nombre: 'Tractor convencional (≈ 2,5 m)', ancho: 2.5 },
  estrecho: { nombre: 'Tractor estrecho / frutero (≈ 1,4 m)', ancho: 1.4 },
  motocultor: { nombre: 'Motocultor o desbrozadora (≈ 0,9 m)', ancho: 0.9 },
};

export interface Parametros {
  diseno: string;
  clave: string;
  asign: Asignacion;
  huecos: Hueco[] | null;        // positions moved by hand in the module editor (null = the design's)
  ancho: number; largo: number;  // plot (m)
  modAncho: number; modLargo: number;
  bloqueX: number; bloqueY: number;
  pasillo: number;               // path width (m)
  franja: 'zanja' | 'pavimento';
  franjaAncho: number; zanjaProf: number;
  zona: Zona; lluvia: number; pendiente: number; riego: number; mo0: number;
  poda: boolean; anuales: boolean; anosAnuales: number;
  maquina: Maquina;
  hipAgua: number; hipN: number; hipMicro: number;
}

export function porDefecto(dis = 'modulo', clave = 'almendro'): Parametros {
  const d = diseno(dis);
  return {
    diseno: d.id, clave, asign: d.asignar(clave), huecos: null,
    ancho: 100, largo: 100, modAncho: d.ancho, modLargo: d.largo,
    bloqueX: d.parcela.bloqueX, bloqueY: d.parcela.bloqueY, pasillo: 2, franja: d.parcela.franja, franjaAncho: 1, zanjaProf: 0.5,
    zona: 'MS', lluvia: 400, pendiente: 3, riego: 0, mo0: 1,
    poda: true, anuales: true, anosAnuales: 2, maquina: 'estrecho',
    hipAgua: 0.6, hipN: 0.1, hipMicro: 0.05,
  };
}

export interface Planta { x: number; y: number; esp: Especie; etiqueta: string; mod: number; macho?: boolean }
export interface Rect { x0: number; y0: number; x1: number; y1: number; tipo: 'pasillo' | 'zanja' | 'pavimento' | 'modulo' }
export interface Luna { cx: number; cy: number; r1: number; r2: number; a0: number; a1: number }
export interface Parcela { plantas: Planta[]; rects: Rect[]; lunas: Luna[]; modulos: number; ancho: number; largo: number; zanjaLargo: number }

export const huecosDe = (p: Parametros) => p.huecos ?? diseno(p.diseno).huecos(p.modAncho, p.modLargo);

function elegir(lista: string[] | undefined, n: number): Especie | null {
  const l = (lista ?? []).filter(id => ESPECIE[id]);
  if (!l.length) return null;
  return ESPECIE[l[((n * 2654435761) >>> 0) % l.length]];
}

/** Lay the module over the plot: blocks of bloqueX × bloqueY modules, a path between block
 *  columns, and under every block row (downhill, south) a swale or filtering pavement + path. */
export function construirParcela(p: Parametros): Parcela {
  const huecos = huecosDe(p), d = diseno(p.diseno);
  const plantas: Planta[] = [], rects: Rect[] = [], lunas: Luna[] = [];
  const W = p.modAncho, H = p.modLargo;
  const xs: number[] = [];
  for (let x = 0, k = 0; x + W <= p.ancho + 1e-6; k++) {
    xs.push(x); x += W;
    if ((k + 1) % p.bloqueX === 0 && x + p.pasillo + W <= p.ancho) { rects.push({ x0: x, y0: 0, x1: x + p.pasillo, y1: p.largo, tipo: 'pasillo' }); x += p.pasillo; }
  }
  const ys: number[] = [];
  let zanjaLargo = 0;
  const franjaTot = p.franja === 'zanja' ? p.franjaAncho + p.pasillo : p.pasillo;
  for (let y = p.largo, k = 0; y - H >= -1e-6; k++) {
    y -= H; ys.push(y);
    if ((k + 1) % p.bloqueY === 0 && y - franjaTot - H >= 0) {
      if (p.franja === 'zanja') {
        rects.push({ x0: 0, y0: y - p.franjaAncho, x1: p.ancho, y1: y, tipo: 'zanja' }); zanjaLargo += p.ancho;
        rects.push({ x0: 0, y0: y - franjaTot, x1: p.ancho, y1: y - p.franjaAncho, tipo: 'pasillo' });
      } else rects.push({ x0: 0, y0: y - franjaTot, x1: p.ancho, y1: y, tipo: 'pavimento' });
      y -= franjaTot;
    }
  }
  let m = 0, nClave = 0;
  for (const y of ys) for (const x of xs) {
    rects.push({ x0: x, y0: y, x1: x + W, y1: y + H, tipo: 'modulo' });
    const cx = x + W / 2, cy = y + H / 2;
    if (d.mediaLuna) { const g = geometriaSonrisa(W, H); lunas.push({ ...g, cx: cx + g.cx, cy: cy + g.cy }); }
    huecos.forEach((h, i) => {
      const esp = elegir(p.asign[h.etiqueta], m * 131 + i);
      if (!esp) return;
      const pl: Planta = { x: cx + h.u * W, y: cy + h.v * H, esp, etiqueta: h.etiqueta, mod: m };
      if (rol(h.etiqueta) === 1 && esp.id === 'pistacho') pl.macho = nClave++ % 9 === 4;
      plantas.push(pl);
    });
    m++;
  }
  return { plantas, rects, lunas, modulos: m, ancho: p.ancho, largo: p.largo, zanjaLargo };
}

/** Today's model: the key species alone, at the spacing of a big tractor, bare soil. */
export const MARCO_CONVENCIONAL: Record<string, { dx: number; dy: number; nombre: string }> = {
  almendro: { dx: 7, dy: 7, nombre: 'almendral de secano 7 × 7 m' },
  olivo: { dx: 10, dy: 10, nombre: 'olivar tradicional de secano 10 × 10 m' },
  vid: { dx: 2.5, dy: 2.5, nombre: 'viña en vaso 2,5 × 2,5 m' },
  pistacho: { dx: 7, dy: 6, nombre: 'pistachar 7 × 6 m' },
};
export function construirConvencional(p: Parametros): Parcela {
  const mc = MARCO_CONVENCIONAL[p.clave] ?? MARCO_CONVENCIONAL.almendro, esp = especie(p.clave);
  const plantas: Planta[] = [];
  let n = 0;
  for (let y = mc.dy / 2; y < p.largo; y += mc.dy) for (let x = mc.dx / 2; x < p.ancho; x += mc.dx) {
    plantas.push({ x, y, esp, etiqueta: '1', mod: 0, macho: esp.id === 'pistacho' ? n % 9 === 4 : undefined }); n++;
  }
  return { plantas, rects: [], lunas: [], modulos: 0, ancho: p.ancho, largo: p.largo, zanjaLargo: 0 };
}

// ---------------------------------------------------------------- growth
export interface Tam { h: number; c: number; vis: number }
export const aguaDisponible = (p: Parametros, sintropico: boolean) => p.lluvia + p.riego + (sintropico ? Math.min(150, p.lluvia * 0.15) : 0);

export function tamano(pl: Planta, t: number, p: Parametros, sintropico = true): Tam {
  const s = pl.esp, r = rol(pl.etiqueta);
  if (s.ciclo === 'anual') {
    const limite = p.anuales ? Math.max(p.anosAnuales, s.id === 'abonoverde' ? 1 : 0) : (s.id === 'abonoverde' ? 1 : 0);
    if (t >= limite) return { h: 0, c: 0, vis: 0 };
    const f = 0.2 + 0.8 * Math.sin(Math.PI * ((t % 1) * 0.9 + 0.05));
    return { h: s.altura * f, c: s.copa * f, vis: 1 };
  }
  let vis = 1;
  if (s.sale && r !== 1) { if (t > s.sale + 0.5) return { h: 0, c: 0, vis: 0 }; if (t > s.sale) vis = 1 - (t - s.sale) / 0.5; }
  const agua = aguaDisponible(p, sintropico);
  const deficit = Math.max(0, Math.min(0.6, (s.mm - agua) / s.mm));
  const zonaF = s.zonas.includes(p.zona) ? 1 : 0.7;
  const s0 = s.altura > 3 ? 0.08 : s.altura > 1 ? 0.2 : 0.05;
  const k = 3 / (Math.max(0.3, s.madurez) * (1 + deficit));
  const f = s0 + (1 - s0) * (1 - Math.exp(-k * t));
  const tope = (1 - 0.5 * deficit) * zonaF;
  const podada = p.poda && sintropico && (r === 2 || r === 3) && s.altura > 2 ? 0.75 : 1;
  return { h: s.altura * f * tope, c: s.copa * f * tope * podada, vis };
}

// ---------------------------------------------------------------- yearly indicators
export interface Paso { t: number; porArbol: number; cobertura: number; suelo: number; biomasa: number; n: number; mo: number; escorrentia: number; aguaUtil: number; clave: number; extra: number; especies: number }
export const ANOS = 30, DT = 0.5;

/** Share of the module's same-stratum pairs that end up competing (0 … 1): it lowers the key's harvest. */
function fraccionSolape(p: Parametros): number {
  return Math.min(1, consejosDeSolape(vecindario(p), p, ANOS).length / 6);
}

export function simular(p: Parametros, parcela: Parcela, sintropico: boolean): Paso[] {
  const A = p.ancho * p.largo, ha = A / 1e4;
  const base = Math.min(0.5, Math.max(0.05, 0.1 + 0.02 * p.pendiente));
  const capacidad = sintropico ? parcela.zanjaLargo * p.franjaAncho * p.zanjaProf * 0.5 : 0;   // m³
  const penal = sintropico ? 1 - 0.3 * fraccionSolape(p) : 1;
  const out: Paso[] = [];
  let mo = p.mo0;
  for (let t = 0; t <= ANOS + 1e-9; t += DT) {
    let copas = 0, aux = 0, fijadoras = 0, anuales = 0, claveKg = 0, extraKg = 0, hembras = 0;
    const activas = new Set<string>();
    for (const pl of parcela.plantas) {
      const z = tamano(pl, t, p, sintropico);
      if (z.vis <= 0) continue;
      activas.add(pl.esp.id);
      const area = Math.PI * (z.c / 2) ** 2 * z.vis;
      copas += area;
      const r = rol(pl.etiqueta), s = pl.esp;
      if (r !== 1) {
        aux += area * (s.funciones.includes('biomasa') ? 1.2 : 0.4) * (p.poda ? 1 : 0.4);
        if (s.ciclo === 'anual') anuales += area;
      }
      if (s.funciones.includes('fijaN')) fijadoras += area;
      const madura = t >= s.fruto && s.fruto > 0;
      if (madura) {
        const f = Math.min(1, (z.c / (s.copa || 1)) ** 1.5);
        if (r === 1) { if (!pl.macho) { claveKg += (s.kgPlanta ?? 0) * f; hembras++; } }
        else if (s.kgPlanta) extraKg += s.kgPlanta * f * z.vis;
      }
    }
    const cobertura = 1 - Math.exp(-copas / A);
    const biomasa = (aux + anuales * 0.6) / 1000 / ha + (sintropico ? 0 : 0.8 * cobertura);          // t/ha/año
    const acolchado = sintropico ? Math.min(0.9, biomasa / 8 + (t < 1.5 ? 0.3 : 0)) : 0;
    const suelo = Math.min(0.97, Math.max(cobertura, acolchado));
    const n = fijadoras * 0.015 / ha;                                                                    // kg N/ha/año
    // water
    const coef = sintropico ? base * (1 - 0.65 * suelo) : base;
    const volEsc = coef * p.lluvia * 10 * ha;                                                            // m³
    const captada = Math.min(volEsc, capacidad * 6);
    const escNeta = (volEsc - captada) / (10 * ha);                                                      // mm
    const retenida = p.lluvia - escNeta + p.riego;
    const evap = 0.12 + 0.45 * (1 - suelo);
    const aguaUtil = retenida * (1 - evap);
    // organic matter
    mo += DT * (biomasa * 0.005 - (sintropico ? 0.02 : 0.035) * mo);
    out.push({ t, porArbol: hembras ? claveKg / hembras : 0, cobertura, suelo, biomasa, n, mo, escorrentia: escNeta / p.lluvia, aguaUtil, clave: claveKg / ha, extra: extraKg / ha, especies: activas.size });
  }
  // the hypothesis: the key species' harvest scales with the extra useful water, nitrogen and shade
  // compared with the conventional plot in the same year.
  if (sintropico) {
    const conv = simular(p, construirConvencional(p), false);
    const esp = especie(p.clave), techo = (esp.kgRegadio ?? esp.kgPlanta ?? 1) / (esp.kgPlanta ?? 1);
    for (const [i, x] of out.entries()) {
      const ratio = Math.min(2.5, x.aguaUtil / Math.max(1, conv[i].aguaUtil));
      const fa = Math.min(techo, Math.max(0.6, 1 + p.hipAgua * (ratio - 1)));
      const fn = 1 + p.hipN * Math.min(1, x.n / 80);
      const fm = 1 + p.hipMicro * x.cobertura;
      x.clave *= fa * fn * fm * penal; x.porArbol *= fa * fn * fm * penal;
    }
  }
  return out;
}
// ---------------------------------------------------------------- stages of the succession
export const ETAPAS = [
  { desde: 0, hasta: 0.5, nombre: 'Placenta I', desc: 'Abono verde, hortalizas y hierbas pioneras cubren el suelo desnudo. Se siembra todo a la vez, pero ahora mandan las de ciclo corto.' },
  { desde: 0.5, hasta: 2, nombre: 'Placenta II', desc: 'Fijadoras y arbustos de crecimiento rápido (retamas, tagasaste, alfalfa) toman el relevo; las primeras podas alimentan el suelo.' },
  { desde: 2, hasta: 10, nombre: 'Secundaria I', desc: 'Frutales y especies clave entran en producción (almendro y olivo hacia el año 3–5, pistacho hacia el 6). Las pioneras se podan o se retiran.' },
  { desde: 10, hasta: 30, nombre: 'Secundaria II', desc: 'Árboles altos y emergentes dan sombra parcial y biomasa; el suelo ya tiene más materia orgánica y retiene más agua.' },
  { desde: 30, hasta: 999, nombre: 'Clímax', desc: 'Encinas, nogales y algarrobos: el sistema se parece al bosque mediterráneo y casi no necesita insumos.' },
];
export const etapa = (t: number) => ETAPAS.find(e => t >= e.desde && t < e.hasta) ?? ETAPAS[ETAPAS.length - 1];

// ---------------------------------------------------------------- advisor
export type Nivel = 'alerta' | 'aviso' | 'ok' | 'idea';
export interface Consejo { nivel: Nivel; titulo: string; texto: string; especies?: string[] }

/** Plants of the central tile and its 8 neighbours, for pairwise checks without the whole plot. */
export function vecindario(p: Parametros): Planta[] {
  const huecos = huecosDe(p), W = p.modAncho, H = p.modLargo, out: Planta[] = [];
  let m = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++, m++) huecos.forEach((h, k) => {
    const esp = elegir(p.asign[h.etiqueta], (m + 7) * 131 + k);
    if (esp) out.push({ x: (i + h.u) * W, y: (j + h.v) * H, esp, etiqueta: h.etiqueta, mod: i === 0 && j === 0 ? 0 : 1 });
  });
  return out;
}

function consejosDeSolape(pls: Planta[], p: Parametros, t: number): Consejo[] {
  const out: Consejo[] = [], visto = new Set<string>();
  for (let a = 0; a < pls.length; a++) {
    const A = pls[a]; if (A.mod !== 0) continue;
    for (let b = 0; b < pls.length; b++) {
      if (a === b) continue;
      const B = pls[b];
      if (A.esp.estrato !== B.esp.estrato || A.esp.estrato === 'suelo') continue;
      if (A.esp.ciclo === 'anual' || B.esp.ciclo === 'anual') continue;
      const ta = tamano(A, t, p), tb = tamano(B, t, p);
      if (ta.vis <= 0 || tb.vis <= 0) continue;
      // Low shrubs are meant to form a dense, pruned hedge: they tolerate more overlap than trees.
      const d = Math.hypot(A.x - B.x, A.y - B.y), suma = (ta.c + tb.c) / 2, tolera = A.esp.estrato === 'bajo' ? 0.45 : 0.7;
      if (d < suma * tolera) {
        const k = [A.esp.id, B.esp.id].sort().join('|');
        if (visto.has(k)) continue; visto.add(k);
        out.push({ nivel: 'aviso', titulo: `${A.esp.nombre} y ${B.esp.nombre} demasiado juntos`,
          texto: `Son del mismo estrato (${A.esp.estrato}) y están a ${d.toFixed(1).replace('.', ',')} m; ${t >= ANOS ? 'de adultos' : `en el año ${Math.round(t)}`} sus copas miden ${ta.c.toFixed(1).replace('.', ',')} y ${tb.c.toFixed(1).replace('.', ',')} m. Sepáralos al menos ${(suma * 0.8).toFixed(1).replace('.', ',')} m, cambia uno de estrato o pódalos.`,
          especies: [A.esp.id, B.esp.id] });
      }
    }
  }
  return out;
}

export function consejos(p: Parametros, t: number = ANOS): Consejo[] {
  const out: Consejo[] = [];
  const pls = vecindario(p), centro = pls.filter(x => x.mod === 0);
  const usadas = [...new Set(centro.map(x => x.esp.id))].map(id => ESPECIE[id]);
  const clave = especie(p.clave), z = ZONAS.find(x => x.id === p.zona)!;
  const agua = p.lluvia + p.riego;

  // 1. too close / same stratum. The Miyawaki smile is dense on purpose: one note instead of a list.
  const solapes = consejosDeSolape(pls, p, t);
  if (p.diseno === 'sonrisa' && solapes.length) out.push({ nivel: 'idea', titulo: `Competencia buscada: ${solapes.length} parejas se tocarán`, texto: 'En el método Miyawaki se planta muy denso (0,75 m) a propósito: la competencia hace crecer rápido hacia la luz. A partir del año 2–3 se aclara: se poda o se retira la planta más débil de cada pareja y se deja como acolchado.', especies: [...new Set(solapes.flatMap(c => c.especies ?? []))].slice(0, 8) });
  else out.push(...solapes);

  // 2. shade on the key from the south
  for (const k of centro.filter(x => rol(x.etiqueta) === 1)) {
    for (const o of pls) {
      if (o === k || o.esp.altura <= k.esp.altura || rol(o.etiqueta) === 1) continue;
      const d = Math.hypot(o.x - k.x, o.y - k.y);
      const copaO = o.esp.copa * (p.poda ? 0.75 : 1);
      if (o.y < k.y - 0.3 && d < ((copaO + k.esp.copa) / 2) * 0.8) {
        out.push({ nivel: 'aviso', titulo: `${o.esp.nombre} da sombra a ${k.esp.nombre}`, texto: `Está al sur de la clave (por donde viene el sol) y es más alto. Ponlo al norte o mantenlo podado por debajo de la clave.`, especies: [o.esp.id] });
        break;
      }
    }
  }
  // 3. allelopathy (walnut)
  if (usadas.some(s => s.id === 'nogal')) {
    const sens = usadas.filter(s => SENSIBLES_JUGLONA.has(s.id) || s.clave);
    if (sens.length) out.push({ nivel: 'alerta', titulo: 'El nogal no colabora con sus vecinos', texto: `La juglona de sus raíces y hojas frena a ${sens.map(s => s.nombre.toLowerCase()).join(', ')}. Llévalo al borde de la parcela o a la cara norte de una sonrisa, lejos de la clave.`, especies: ['nogal'] });
  }
  // 4. water
  const sedientas = usadas.filter(s => s.mm > agua + (s.ciclo === 'anual' ? 50 : 100));
  if (sedientas.length) out.push({ nivel: 'alerta', titulo: 'Especies que pasarán sed', texto: `${sedientas.map(s => `${s.nombre} (≥ ${s.mm} mm)`).join(', ')}. Tu parcela recibe ${agua} mm al año${p.riego ? ' contando el riego de apoyo' : ''}. Cámbialas por especies de secano, ponlas junto a la zanja o añade riego de apoyo.`, especies: sedientas.map(s => s.id) });
  // 5. zone and frost
  const fueraZona = usadas.filter(s => !s.zonas.includes(p.zona));
  if (fueraZona.length) out.push({ nivel: 'aviso', titulo: `No son de ${z.corto}`, texto: `${fueraZona.map(s => s.nombre).join(', ')} no se recomiendan en ${z.nombre}.`, especies: fueraZona.map(s => s.id) });
  const heladas = usadas.filter(s => s.helada > z.tMin && s.ciclo !== 'anual');
  if (heladas.length) out.push({ nivel: 'alerta', titulo: 'Riesgo de helada', texto: `En ${z.corto} se esperan mínimas de ${z.tMin} °C. ${heladas.map(s => `${s.nombre} aguanta hasta ${s.helada} °C`).join('; ')}.`, especies: heladas.map(s => s.id) });
  if (clave.id === 'almendro' && z.tMin <= -8) out.push({ nivel: 'idea', titulo: 'Almendro con heladas tardías', texto: 'Elige variedades de floración tardía o extra-tardía. Los emergentes al norte y las zanjas en curva de nivel ayudan a que el aire frío no se estanque en la flor.' });
  // 6. nitrogen and placenta
  if (!usadas.some(s => s.funciones.includes('fijaN') && s.ciclo !== 'anual')) out.push({ nivel: 'alerta', titulo: 'Empieza nitrogenando', texto: 'No hay ninguna fijadora de nitrógeno perenne. Añade retama de olor, espantalobos, tagasaste o esparceta en los puestos 3–5 y siembra un abono verde (veza + avena) el primer otoño.' });
  else out.push({ nivel: 'ok', titulo: 'Hay fijadoras de nitrógeno', texto: usadas.filter(s => s.funciones.includes('fijaN')).map(s => s.nombre).join(', ') + '.' });
  if (!usadas.some(s => s.estrato === 'suelo')) out.push({ nivel: 'aviso', titulo: 'El suelo queda desnudo', texto: 'No hay nada en el estrato suelo. Pon cubiertas perennes (tomillo, esparceta, fresa) en el puesto 5 para que la tierra no se caliente ni se lave.' });
  // 7. strata
  const estratos = new Set(usadas.map(s => s.estrato));
  const faltan = (['emergente', 'alto', 'medio', 'bajo', 'suelo'] as const).filter(e => !estratos.has(e));
  if (faltan.includes('emergente') && faltan.includes('alto')) out.push({ nivel: 'aviso', titulo: 'Falta el estrato alto', texto: 'Sin árboles por encima de la clave no hay quien produzca biomasa ni sombra parcial en verano. Pon un almez, fresno o morera al norte (puesto 2c).' });
  else if (faltan.length) out.push({ nivel: 'idea', titulo: `Estratos sin ocupar: ${faltan.join(', ')}`, texto: 'Cuantos más estratos, más luz se aprovecha por metro cuadrado.' });
  else out.push({ nivel: 'ok', titulo: 'Los cinco estratos están ocupados', texto: 'Emergente, alto, medio, bajo y suelo: el sistema aprovecha la luz en todas las alturas.' });
  // 8. diversity
  const todas = new Set(Object.values(p.asign).flat().filter(id => ESPECIE[id]));
  if (todas.size < 10) out.push({ nivel: 'idea', titulo: `Solo ${todas.size} especies`, texto: 'El bosque mediterráneo tiene entre 10 y 40 especies por metro cuadrado. Añade mezclas a los puestos 4 y 5 (aromáticas y herbáceas distintas).' });
  else out.push({ nivel: 'ok', titulo: `${todas.size} especies distintas`, texto: 'Buena diversidad.' });
  // 9. warnings of each species
  for (const s of usadas) if (s.aviso && !s.clave) out.push({ nivel: 'aviso', titulo: s.nombre, texto: s.aviso, especies: [s.id] });
  if (clave.id === 'pistacho') out.push({ nivel: 'idea', titulo: 'Pistachos macho', texto: 'El plano marca 1 de cada 9 pistachos como macho (♂), repartidos por la parcela, para que haya polinización.' });
  if (clave.id === 'vid' && !usadas.some(s => s.funciones.includes('tutor') || s.estrato === 'alto')) out.push({ nivel: 'idea', titulo: 'La vid busca tutor', texto: 'Pon una morera o un almez cerca para que la vid trepe, como en la «vid casada» tradicional.' });
  // 10. machinery
  const maq = MAQUINAS[p.maquina];
  if (p.pasillo < maq.ancho + 0.4) out.push({ nivel: 'alerta', titulo: 'La máquina no cabe por el pasillo', texto: `El pasillo mide ${p.pasillo} m y la máquina elegida ${maq.ancho} m. Ensancha el pasillo a ${(maq.ancho + 0.5).toFixed(1).replace('.', ',')} m o usa una máquina más estrecha.` });
  return out;
}

/** The steps to establish the design, in order, with the species of this design. */
export function pasos(p: Parametros): { cuando: string; que: string }[] {
  const nombres = (f: (s: Especie) => boolean) => [...new Set(Object.values(p.asign).flat())].map(id => ESPECIE[id]).filter(s => s && f(s)).map(s => s.nombre.toLowerCase());
  const fij = nombres(s => s.funciones.includes('fijaN') && s.ciclo !== 'anual');
  const bio = nombres(s => s.funciones.includes('biomasa') && s.ciclo !== 'anual');
  const clave = especie(p.clave).nombre.toLowerCase();
  return [
    { cuando: 'Verano (año 0)', que: 'Análisis de suelo, curvas de nivel y replanteo. Marcar los módulos, pasillos y zanjas en el terreno con el plano exportado.' },
    { cuando: 'Septiembre–octubre', que: p.franja === 'zanja' ? `Abrir las zanjas de infiltración en curva de nivel (${p.franjaAncho} m de ancho, ${p.zanjaProf} m de fondo) y los alcorques; la tierra sacada forma el caballón aguas abajo.` : 'Preparar el pavimento filtrante de los pasillos y los alcorques alrededor de cada clave.' },
    { cuando: 'Primeras lluvias de otoño', que: 'Nitrogenar: sembrar abono verde (veza + avena) en toda la superficie y habas en las calles. Acolchar con paja o restos de poda.' },
    { cuando: 'Noviembre–febrero', que: `Plantar todo a la vez, en el orden del plano: ${clave} (1), las auxiliares altas, ${fij.length ? 'las fijadoras (' + fij.join(', ') + ')' : 'las fijadoras'}, arbustos, aromáticas y cubiertas. A raíz desnuda o en alvéolo forestal.` },
    { cuando: 'Primavera (año 1)', que: `Segar el abono verde y dejarlo como acolchado al pie de cada árbol clave.${p.anuales ? ' Sembrar hortalizas de verano (calabaza, judía, tomate) en las calles: son la «placenta» comestible.' : ''}` },
    { cuando: 'Verano (años 1–2)', que: p.riego ? `Riego de apoyo (${p.riego} mm/año) solo a los plantones, idealmente por goteo enterrado.` : 'Sin riego: el acolchado y las zanjas sostienen a los plantones. Vigilar marras y reponer en otoño.' },
    { cuando: 'Cada invierno', que: `Poda de las auxiliares (${bio.slice(0, 4).join(', ') || 'biomasa'}): cortar y dejar en el suelo (chop & drop). La clave siempre al sol, ninguna auxiliar al sur por encima de ella.` },
    { cuando: 'Años 3–6', que: `Entrada en producción de la especie clave (${clave}). Retirar o rebajar las pioneras que ya cumplieron (retamas, tagasaste, alfalfa) cuando su sombra moleste.` },
    { cuando: 'Cada año', que: 'Medir: humedad del suelo, materia orgánica, cosecha por árbol, horas de trabajo y costes, frente a la parcela de control convencional.' },
  ];
}

// ---------------------------------------------------------------- static figures
export function cifras(p: Parametros, parcela: Parcela) {
  const ha = (p.ancho * p.largo) / 1e4;
  const claves = parcela.plantas.filter(x => rol(x.etiqueta) === 1).length;
  const sup = (tipo: Rect['tipo']) => parcela.rects.filter(r => r.tipo === tipo).reduce((s, r) => s + (r.x1 - r.x0) * (r.y1 - r.y0), 0);
  return {
    ha, plantas: parcela.plantas.length, plantasHa: parcela.plantas.length / ha, claves, clavesHa: claves / ha,
    especies: new Set(parcela.plantas.map(x => x.esp.id)).size,
    pasillos: sup('pasillo') + sup('pavimento'), zanjas: sup('zanja'), zanjaLargo: parcela.zanjaLargo,
    capacidad: parcela.zanjaLargo * p.franjaAncho * p.zanjaProf * 0.5,
  };
}
