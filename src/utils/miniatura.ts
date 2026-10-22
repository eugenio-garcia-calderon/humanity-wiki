// ============================================================================
// LA MINIATURA DE UNA IMAGEN (2026-10-22) — ver `server/miniaturas.ts`
// ============================================================================
// Lo que se sube a la plataforma (`/uploads/…`) se pinta por su miniatura WebP
// del tamaño en que se ve (el doble, para pantallas retina). Lo de fuera (una
// imagen de otra web, un SVG, un GIF que se mueve) se deja como está.

/** Los anchos que se fabrican. Pocos y fijos: cada uno es un fichero en disco. */
export const ANCHOS_MINIATURA = [96, 200, 400, 800, 1600];

/** La dirección de la miniatura de `url` para pintarla a `ancho` píxeles de CSS. */
export function miniatura(url: string | null | undefined, ancho: number): string {
  if (!url) return url || '';
  const [limpia, query] = url.split('?');
  if (query || !/^\/uploads\/(?!privado\/)/.test(limpia) || !/\.(png|jpe?g|webp|avif|tiff?)$/i.test(limpia)) return url;
  const objetivo = Math.min(1600, Math.round(ancho * 2));
  const w = ANCHOS_MINIATURA.find(a => a >= objetivo) || 1600;
  return `${limpia}?w=${w}`;
}
