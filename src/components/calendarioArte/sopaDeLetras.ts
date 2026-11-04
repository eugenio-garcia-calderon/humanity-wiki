// Sopa de letras determinista: las mismas palabras dan siempre la misma sopa,
// para que lo que se ve en pantalla sea exactamente lo que se imprime.

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Generador pseudoaleatorio con semilla (mulberry32). */
function aleatorio(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Quita tildes y deja solo A-Z: una sopa impresa no admite «Ñ» ni espacios. */
export function normalizarPalabra(p: string): string {
  return p.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/Ñ/g, 'N').replace(/[^A-Z]/g, '');
}

const DIRECCIONES: [number, number][] = [[0, 1], [1, 0], [1, 1], [-1, 1]];

export interface Sopa {
  filas: string[][];
  colocadas: string[];
  noCaben: string[];
}

export function generarSopa(palabrasCrudas: string[], ancho = 18, alto = 9): Sopa {
  const palabras = palabrasCrudas.map(normalizarPalabra).filter(p => p.length >= 2);
  const rnd = aleatorio(hash(palabras.join('|')) || 1);
  const g: (string | null)[][] = Array.from({ length: alto }, () => Array(ancho).fill(null));
  const colocadas: string[] = [];
  const noCaben: string[] = [];

  // Las largas primero: son las que más cuesta colocar.
  for (const p of [...palabras].sort((a, b) => b.length - a.length)) {
    let ok = false;
    for (let intento = 0; intento < 400 && !ok; intento++) {
      const [df, dc] = DIRECCIONES[Math.floor(rnd() * DIRECCIONES.length)];
      const f0 = Math.floor(rnd() * alto);
      const c0 = Math.floor(rnd() * ancho);
      const fFin = f0 + df * (p.length - 1);
      const cFin = c0 + dc * (p.length - 1);
      if (fFin < 0 || fFin >= alto || cFin < 0 || cFin >= ancho) continue;
      let cabe = true;
      for (let i = 0; i < p.length; i++) {
        const v = g[f0 + df * i][c0 + dc * i];
        if (v !== null && v !== p[i]) { cabe = false; break; }
      }
      if (!cabe) continue;
      for (let i = 0; i < p.length; i++) g[f0 + df * i][c0 + dc * i] = p[i];
      ok = true;
    }
    (ok ? colocadas : noCaben).push(p);
  }
  const filas = g.map(f => f.map(v => v ?? LETRAS[Math.floor(rnd() * LETRAS.length)]));
  return { filas, colocadas, noCaben };
}
