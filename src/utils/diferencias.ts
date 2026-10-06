// ============================================================================
// DIFERENCIAS ENTRE DOS VERSIONES DE UNA PÁGINA (2026-10-06, carril acceso, #8)
// ============================================================================
// Para el panel de historial: qué bloques se añadieron, se quitaron o
// cambiaron, y dentro de un bloque cambiado, qué palabras. Sin dependencias:
// una LCS por palabras, con tope de tamaño para que una página enorme no
// congele el navegador (por encima del tope, el bloque sale entero como
// «cambiado», que sigue siendo verdad).

export type Trozo = { t: string; tipo: 'igual' | 'mas' | 'menos' };
export type Diferencia =
  | { tipo: 'igual' | 'nuevo' | 'quitado'; bloque: any; texto: string }
  | { tipo: 'cambiado'; bloque: any; texto: string; trozos: Trozo[] };

/** Los bloques de un árbol, en orden de lectura. */
export const planos = (lista: any[] = [], out: any[] = []): any[] => {
  for (const b of lista || []) { if (b && typeof b === 'object') { out.push(b); if (Array.isArray(b.bloques)) planos(b.bloques, out); } }
  return out;
};

/** El texto que se lee de un bloque, sin marcas. */
export function textoDe(b: any): string {
  const partes = [b?.texto, b?.pubTitulo, b?.pie, b?.url, b?.enlaceTitulo].filter(x => typeof x === 'string' && x.trim());
  const t = partes.join(' · ').replace(/\*\*|__|`|~~/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').trim();
  return t || (b?.tipo ? `[${b.tipo}]` : '');
}

const TOPE = 400 * 400;

export function porPalabras(viejo: string, nuevo: string): Trozo[] {
  const a = viejo.split(/(\s+)/), b = nuevo.split(/(\s+)/);
  if (a.length * b.length > TOPE) return [{ t: viejo, tipo: 'menos' }, { t: nuevo, tipo: 'mas' }];
  const n = a.length, m = b.length;
  const L: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out: Trozo[] = [];
  const push = (t: string, tipo: Trozo['tipo']) => { const u = out[out.length - 1]; if (u && u.tipo === tipo) u.t += t; else out.push({ t, tipo }); };
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { push(a[i], 'igual'); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) push(a[i++], 'menos');
    else push(b[j++], 'mas');
  }
  while (i < n) push(a[i++], 'menos');
  while (j < m) push(b[j++], 'mas');
  return out;
}

/**
 * De `antes` a `despues`, bloque a bloque. Se emparejan por id (el editor los
 * conserva); lo que no tiene pareja es nuevo o quitado.
 */
export function diferencias(antes: any[], despues: any[]): Diferencia[] {
  const A = planos(antes), D = planos(despues);
  const porId = new Map(A.map(b => [b.id, b]));
  const usados = new Set<string>();
  const out: Diferencia[] = [];
  for (const b of D) {
    const v = b.id ? porId.get(b.id) : undefined;
    const tn = textoDe(b);
    if (!v) { out.push({ tipo: 'nuevo', bloque: b, texto: tn }); continue; }
    usados.add(b.id);
    const tv = textoDe(v);
    if (tv === tn && v.tipo === b.tipo) out.push({ tipo: 'igual', bloque: b, texto: tn });
    else out.push({ tipo: 'cambiado', bloque: b, texto: tn, trozos: porPalabras(tv, tn) });
  }
  // Lo quitado, cerca de donde estaba: detrás del bloque que tenía antes.
  A.forEach((b, i) => {
    if (b.id && usados.has(b.id)) return;
    const previo = A.slice(0, i).reverse().find(x => x.id && usados.has(x.id));
    const donde = previo ? out.findIndex(d => d.bloque.id === previo.id) + 1 : 0;
    out.splice(donde, 0, { tipo: 'quitado', bloque: b, texto: textoDe(b) });
  });
  return out;
}
