// ============================================================================
// NÚMEROS QUE SE LEEN (2026-08-23)
// ============================================================================
// Una gráfica es, sobre todo, números escritos. Si el eje dice `1234567.8912`
// la gráfica está mal aunque el dibujo sea perfecto.
//
// Todo en español: punto para los miles y coma para los decimales. Se usa
// `Intl.NumberFormat`, que ya sabe hacerlo, en vez de recortar cadenas a mano.

/** Cómo se escribe una columna de datos. */
export interface Unidad {
  /** Lo que va detrás del número: `%`, `kg`, `t CO₂`… */
  sufijo?: string | null;
  /** Lo que va delante: `€`, `$`… */
  prefijo?: string | null;
  /** Decimales fijos. Sin esto se eligen según la magnitud. */
  decimales?: number | null;
  /** Abreviar los grandes: 1 200 000 → «1,2 M». */
  abreviar?: boolean;
}

const ESCALAS: Array<[number, string]> = [
  [1e12, ' B'],   // billón español (10¹²), no el «billion» inglés
  [1e9, ' mil M'],
  [1e6, ' M'],
  [1e3, ' mil'],
];

/**
 * Cuántos decimales pide un número para que se entienda. 0,00034 con cero
 * decimales es «0» —o sea, nada—, y 1 234 567 con dos son cifras de más que
 * solo hacen ruido.
 */
function decimalesNaturales(n: number): number {
  const a = Math.abs(n);
  if (a === 0) return 0;
  if (a >= 100) return 0;
  if (a >= 10) return 1;
  if (a >= 1) return 2;
  if (a >= 0.01) return 3;
  return Math.min(8, Math.ceil(-Math.log10(a)) + 1);
}

/** Un número suelto, ya legible. */
export function numero(n: number | null | undefined, u: Unidad = {}): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';

  let valor = n;
  let escala = '';
  if (u.abreviar) {
    for (const [corte, texto] of ESCALAS) {
      if (Math.abs(n) >= corte) { valor = n / corte; escala = texto; break; }
    }
  }

  const dec = u.decimales ?? (escala ? Math.min(1, decimalesNaturales(valor)) : decimalesNaturales(valor));
  const cuerpo = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(valor);

  return `${u.prefijo || ''}${cuerpo}${escala}${u.sufijo ? (u.sufijo === '%' ? '' : ' ') + u.sufijo : ''}`;
}

/** El rótulo corto de un eje: siempre abreviado, siempre sin decimales de más. */
export function rotuloEje(n: number, u: Unidad = {}): string {
  return numero(n, { ...u, abreviar: u.abreviar ?? true, prefijo: null });
}

/**
 * Las marcas «bonitas» de un eje lineal: 0, 25, 50… y no 0, 23,7, 47,4.
 * Es el mismo criterio de D3 (`ticks`), escrito aquí para que el eje logarítmico
 * y el lineal salgan del mismo sitio y se comporten igual.
 */
export function marcasLineales(min: number, max: number, cuantas = 6): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) return [min];
  const bruto = (max - min) / Math.max(1, cuantas);
  const magnitud = Math.pow(10, Math.floor(Math.log10(bruto)));
  const norm = bruto / magnitud;
  const paso = (norm >= 7.5 ? 10 : norm >= 3.5 ? 5 : norm >= 1.5 ? 2 : 1) * magnitud;
  const marcas: number[] = [];
  for (let v = Math.ceil(min / paso) * paso; v <= max + paso * 1e-9; v += paso) {
    // El redondeo evita los 0,30000000000000004 de la coma flotante.
    marcas.push(Number(v.toFixed(10)));
  }
  return marcas;
}

/**
 * Las marcas de un eje LOGARÍTMICO: las potencias de diez, y si caben pocas,
 * también el 2 y el 5 de cada década. Un eje log con dos marcas no se lee.
 */
export function marcasLogaritmicas(min: number, max: number): number[] {
  const lo = Math.max(min, 1e-12);
  if (!(max > lo)) return [];
  const d1 = Math.floor(Math.log10(lo));
  const d2 = Math.ceil(Math.log10(max));
  const potencias: number[] = [];
  for (let d = d1; d <= d2; d++) potencias.push(Math.pow(10, d));
  const dentro = potencias.filter(v => v >= lo && v <= max);
  if (dentro.length >= 4) return dentro;

  const finas: number[] = [];
  for (let d = d1; d <= d2; d++) {
    for (const m of [1, 2, 5]) {
      const v = m * Math.pow(10, d);
      if (v >= lo && v <= max) finas.push(v);
    }
  }
  return finas;
}

/** Un año o una fecha, según lo que sea la columna de tiempo. */
export function rotuloTiempo(v: number, porDias: boolean): string {
  if (!porDias) return String(Math.round(v));
  // Los días se guardan como días desde 1970-01-01, igual que hace OWID: un
  // entero se compara y se interpola sin arrastrar husos horarios.
  const f = new Date(Math.round(v) * 86400000);
  return f.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
