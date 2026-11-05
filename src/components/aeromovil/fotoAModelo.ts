// ============================================================================
// AEROMÓVIL GOTA · de una foto a un modelo de referencia (2026-11-05)
// ============================================================================
// Recorta la silueta de un vehículo en una foto de perfil (y, si la hay, en
// una de planta) y la convierte en el perfil de un `Referencia`. Todo en el
// navegador: la foto no sale del dispositivo; lo que se guarda es la silueta.
//
// Cómo recorta: el color del fondo se toma de las cuatro esquinas; es
// vehículo todo píxel que se aleja de ese color más que la tolerancia y que
// está unido a la mancha más grande. Funciona con fondo liso (cielo, pared,
// estudio). Con fondo cargado se ajusta la tolerancia o se usa otra foto.
import type { PerfilRef } from './referencias';

export interface Mascara { ancho: number; alto: number; dentro: Uint8Array; caja: [number, number, number, number] }

/** Lee un archivo de imagen y lo devuelve en un canvas de, como mucho, `max` px de ancho. */
export async function cargarImagen(archivo: File, max = 900): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => mal(new Error('No se ha podido abrir la imagen.')); i.src = url; });
    const k = Math.min(1, max / img.naturalWidth);
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally { URL.revokeObjectURL(url); }
}

/** La silueta: fondo por las esquinas, umbral de color y la mancha conexa más grande. */
export function recortar(c: HTMLCanvasElement, tolerancia: number): Mascara {
  const w = c.width, h = c.height, d = c.getContext('2d')!.getImageData(0, 0, w, h).data;
  const muestra = (x0: number, y0: number) => {
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = y0; y < y0 + 8; y++) for (let x = x0; x < x0 + 8; x++) { const i = (y * w + x) * 4; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    return [r / n, g / n, b / n];
  };
  const fondos = [muestra(0, 0), muestra(w - 8, 0), muestra(0, h - 8), muestra(w - 8, h - 8)];
  const distinto = new Uint8Array(w * h);
  const t2 = tolerancia * tolerancia;
  for (let p = 0; p < w * h; p++) {
    const r = d[p * 4], g = d[p * 4 + 1], b = d[p * 4 + 2];
    let cerca = false;
    for (const f of fondos) { const dr = r - f[0], dg = g - f[1], db = b - f[2]; if (dr * dr + dg * dg + db * db < t2) { cerca = true; break; } }
    distinto[p] = cerca ? 0 : 1;
  }
  // La mancha conexa más grande (4 vecinos), con una pila para no desbordar.
  const etiqueta = new Int32Array(w * h);
  let mejor = 0, mejorN = 0, sig = 1;
  const pila: number[] = [];
  for (let p = 0; p < w * h; p++) {
    if (!distinto[p] || etiqueta[p]) continue;
    let n = 0; pila.push(p); etiqueta[p] = sig;
    while (pila.length) {
      const q = pila.pop()!; n++;
      const x = q % w, y = (q / w) | 0;
      for (const v of [x > 0 ? q - 1 : -1, x < w - 1 ? q + 1 : -1, y > 0 ? q - w : -1, y < h - 1 ? q + w : -1]) {
        if (v >= 0 && distinto[v] && !etiqueta[v]) { etiqueta[v] = sig; pila.push(v); }
      }
    }
    if (n > mejorN) { mejorN = n; mejor = sig; }
    sig++;
  }
  const dentro = new Uint8Array(w * h);
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let p = 0; p < w * h; p++) if (etiqueta[p] === mejor && mejor) {
    dentro[p] = 1; const x = p % w, y = (p / w) | 0;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { ancho: w, alto: h, dentro, caja: [x0, y0, x1, y1] };
}

/** Pinta la silueta encima de la foto, para ver si el recorte es bueno. */
export function pintarMascara(c: HTMLCanvasElement, m: Mascara, destino: HTMLCanvasElement, marcas: number[] = []) {
  destino.width = c.width; destino.height = c.height;
  const g = destino.getContext('2d')!;
  g.drawImage(c, 0, 0);
  const capa = g.getImageData(0, 0, c.width, c.height);
  for (let p = 0; p < m.dentro.length; p++) if (m.dentro[p]) {
    capa.data[p * 4] = capa.data[p * 4] * 0.45 + 14 * 0.55; capa.data[p * 4 + 1] = capa.data[p * 4 + 1] * 0.45 + 160 * 0.55; capa.data[p * 4 + 2] = capa.data[p * 4 + 2] * 0.45 + 170 * 0.55;
  }
  g.putImageData(capa, 0, 0);
  const [x0, y0, x1, y1] = m.caja;
  g.strokeStyle = 'rgba(14,94,107,0.9)'; g.lineWidth = 2; g.setLineDash([6, 4]); g.strokeRect(x0, y0, x1 - x0, y1 - y0); g.setLineDash([]);
  g.fillStyle = 'rgba(220,60,40,0.95)';
  for (const mx of marcas) { g.beginPath(); g.arc(mx, y1 - 6, 7, 0, Math.PI * 2); g.fill(); g.fillRect(mx - 1, y0, 2, y1 - y0); }
}

/** Columnas de la silueta: para cada x, el primer y el último píxel de vehículo. */
function columnas(m: Mascara) {
  const [x0, y0, x1, y1] = m.caja, w = m.ancho;
  const arriba: number[] = [], abajo: number[] = [];
  for (let x = x0; x <= x1; x++) {
    let a = -1, b = -1;
    for (let y = y0; y <= y1; y++) if (m.dentro[y * w + x]) { if (a < 0) a = y; b = y; }
    arriba.push(a); abajo.push(b);
  }
  return { arriba, abajo, x0, x1, y0, y1 };
}

const suavizar = (v: number[], r: number) => v.map((_, i) => { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const j = i + k; if (j >= 0 && j < v.length && Number.isFinite(v[j])) { s += v[j]; n++; } } return n ? s / n : v[i]; });

/**
 * El perfil, en metros y con el origen del Aeromóvil (eje delantero en x = 0,
 * suelo en y = 0). `morroIzq`: el morro está a la izquierda de la foto.
 * `ejeDelanteroPx`: la x (en píxeles de la foto de perfil) del eje delantero.
 */
export function perfilDesdeFotos(o: {
  lateral: Mascara; planta?: Mascara | null; L: number; W: number; clear: number; morroIzq: boolean; ejeDelanteroPx: number;
}): { perfil: PerfilRef; H: number } {
  const c = columnas(o.lateral), anchoPx = c.x1 - c.x0 + 1, k = o.L / anchoPx;
  const N = 90, x: number[] = [], top: number[] = [], bot: number[] = [], hw: number[] = [];
  const sueloPx = c.y1;              // lo más bajo de la silueta son las ruedas: el suelo
  const arriba = suavizar(c.arriba.map(v => (v < 0 ? NaN : (sueloPx - v) * k)), 3);
  const abajo = suavizar(c.abajo.map(v => (v < 0 ? NaN : (sueloPx - v) * k)), 6);
  let anchoPlanta: number[] | null = null;
  if (o.planta) {
    const p = columnas(o.planta), kp = o.L / (p.x1 - p.x0 + 1);
    const semi = p.arriba.map((a, i) => (a < 0 ? 0 : (p.abajo[i] - a) * kp / 2));
    anchoPlanta = suavizar(semi, 3);
    const max = Math.max(...anchoPlanta);
    if (max > 0) anchoPlanta = anchoPlanta.map(v => v * (o.W / 2) / max);   // la planta manda en forma; el ancho real, en escala
  }
  const altoMax = Math.max(...arriba.filter(Number.isFinite));
  const ejeM = (o.morroIzq ? (o.ejeDelanteroPx - c.x0) : (c.x1 - o.ejeDelanteroPx)) * k;   // del morro al eje delantero
  for (let i = 0; i <= N; i++) {
    const u = (1 - Math.cos(Math.PI * i / N)) / 2;            // 0 = morro, 1 = cola
    const col = Math.min(anchoPx - 1, Math.round(o.morroIzq ? u * (anchoPx - 1) : (1 - u) * (anchoPx - 1)));
    const t = Number.isFinite(arriba[col]) ? arriba[col] : 0;
    // El fondo: lo de abajo de la silueta, pero nunca por debajo de la altura
    // libre (por debajo asoman las ruedas, no el carenado).
    let b = Number.isFinite(abajo[col]) ? abajo[col] : o.clear;
    b = Math.max(b, o.clear);
    const extremo = i === 0 || i === N;
    const tt = extremo ? (t + b) / 2 : Math.max(t, b + 0.01);
    x.push(ejeM - u * o.L);
    top.push(tt);
    bot.push(extremo ? tt : Math.min(b, tt - 0.01));
    if (anchoPlanta) {
      const pc = Math.min(anchoPlanta.length - 1, Math.round(o.morroIzq ? u * (anchoPlanta.length - 1) : (1 - u) * (anchoPlanta.length - 1)));
      hw.push(extremo ? 0.005 : anchoPlanta[pc]);
    } else {
      // Sin planta: la anchura sigue a la altura de la sección.
      const h = Math.max(0, tt - b) / Math.max(0.01, altoMax - o.clear);
      hw.push(extremo ? 0.005 : (o.W / 2) * Math.pow(Math.min(1, h), 0.8));
    }
  }
  return { perfil: { x, top, bot, hw }, H: altoMax };
}

/** Pasa marcas de la foto (píxeles) a posiciones de eje en metros desde el eje delantero. */
export function ejesDesdeMarcas(lateral: Mascara, marcas: number[], L: number, morroIzq: boolean) {
  const c = columnas(lateral), k = L / (c.x1 - c.x0 + 1);
  const orden = [...marcas].sort((a, b) => (morroIzq ? a - b : b - a));
  const primero = orden[0];
  return orden.map(px => -Math.abs(px - primero) * k);
}
