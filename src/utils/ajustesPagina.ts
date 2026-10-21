import { todosLosBloques } from './bloques';

// ============================================================================
// COMO SE VE UNA PÁGINA, SEGÚN SUS AJUSTES (2026-10-06, carril editorB, #29)
// ============================================================================
// Tipo de letra, texto pequeño y ancho viven en la `config` de la página (junto
// a portada, icono y bloques) y los respetan DOS pantallas: el editor y la
// página publicada —que además se pinta en el servidor—. Por eso esto es un
// módulo sin React ni navegador: una sola tabla de clases, y que editor y
// lectura no puedan acabar con dos aspectos distintos para la misma página.

export type Letra = 'defecto' | 'serif' | 'mono';
export type Ancho = 'normal' | 'completo';

interface Cfg { letra?: Letra; textoPequeno?: boolean; ancho?: Ancho }

/** Clases del contenido de la página: su letra y su tamaño. */
export function clasesDePagina(cfg: Cfg | undefined | null): string {
  const c = cfg || {};
  return [
    c.letra === 'serif' ? 'font-serif' : c.letra === 'mono' ? 'font-mono' : '',
    c.textoPequeno ? 'pagina-chica' : '',
  ].filter(Boolean).join(' ');
}

/** El ancho máximo. Sin valor es COMPLETO: es lo que decidió Eugenio el
 *  2026-10-02 para todas las páginas, y las que ya existen no cambian. */
// MENOS MARGEN A LOS LADOS (2026-10-21, Eugenio: «en ancho completo hay mucho
// espacio en los laterales: redúcelo un 50 %»). El ancho completo era un tope fijo
// de 1152 px; ahora es 1152 px más la MITAD de lo que sobre de la ventana, así que
// el hueco de cada lado queda en la mitad. Incluye el relleno lateral (px-5/sm:px-8).
export const ANCHO_COMPLETO = 'max-w-[calc(576px+50vw)]';
export const anchoDePagina = (cfg: Cfg | undefined | null) => (cfg?.ancho === 'normal' ? 'max-w-3xl' : ANCHO_COMPLETO);
/** El mismo ancho de CONTENIDO en el editor, que tiene 16 px más de relleno por
 *  lado (px-12 frente a px-8, para el «+» y el asa): así lo que se edita y lo que
 *  se publica caben igual (mismas columnas en una galería). */
export const anchoDeEditor = (cfg: Cfg | undefined | null) => (cfg?.ancho === 'normal' ? 'max-w-[calc(48rem+32px)]' : 'max-w-[calc(608px+50vw)]');

/** El texto que se lee de un bloque, sin la sintaxis markdown: enlaces como su
 *  texto, sin asteriscos ni signos de fórmula. */
function textoPlano(t: string): string {
  return t.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*`$]/g, '');
}

/** Palabras de una página (árbol o lista) y minutos de lectura. */
export function contarPagina(bloques: any[] | undefined, textos?: Record<string, string>) {
  let palabras = 0, caracteres = 0;
  for (const b of todosLosBloques(bloques)) {
    // Una fórmula o un código no se leen como prosa.
    if (b.tipo === 'ecuacion' || b.tipo === 'codigo' || b.tipo === 'separador') continue;
    const partes: string[] = [];
    const t = textos && b.id && textos[b.id] !== undefined ? textos[b.id] : b.texto;
    if (typeof t === 'string') partes.push(textoPlano(t));
    if (typeof b.pie === 'string') partes.push(b.pie);
    if (Array.isArray(b.filas)) for (const f of b.filas) if (Array.isArray(f)) for (const c of f) if (typeof c === 'string') partes.push(textoPlano(c));
    const s = partes.join(' ').trim();
    if (!s) continue;
    caracteres += s.length;
    palabras += s.split(/\s+/).filter(Boolean).length;
  }
  // 200 palabras por minuto: la cifra que usan los medios para el tiempo de lectura.
  return { palabras, caracteres, minutos: palabras ? Math.max(1, Math.round(palabras / 200)) : 0 };
}

export const textoLectura = (palabras: number, minutos: number) =>
  `${palabras.toLocaleString('es-ES')} ${palabras === 1 ? 'palabra' : 'palabras'} · ${minutos <= 1 ? 'menos de 1 min' : `${minutos} min`} de lectura`;
