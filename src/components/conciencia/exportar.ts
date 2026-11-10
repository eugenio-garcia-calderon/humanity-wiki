// Download the consciousness map as a picture (SVG or PNG) or as data (JSON).
//
// The picture is the SAME svg the screen shows, cloned, with the interface
// (selection, «+» handle) removed and the view reset to frame every concept.
// Fonts: an SVG opened as an image cannot load our web fonts, so the PNG uses
// the system serif/sans fallbacks. Acceptable for a download; noted here so
// nobody chases it as a bug.
import type { MapaConciencia } from '../../data/concienciaMapa';
import { limites } from './geometria';

function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function svgComoTexto(svg: SVGSVGElement, mapa: MapaConciencia): { texto: string; w: number; h: number } {
  const { x0, y0, x1, y1 } = limites(mapa.nodos);
  const pad = 40;
  const x = x0 - pad, y = y0 - pad, w = x1 - x0 + pad * 2, h = y1 - y0 + pad * 2;
  const copia = svg.cloneNode(true) as SVGSVGElement;
  copia.querySelectorAll('[data-ui]').forEach(e => e.remove());
  copia.querySelector('[data-mundo-g]')?.setAttribute('transform', '');
  const fondo = copia.querySelector('[data-fondo]');
  if (fondo) {
    fondo.setAttribute('x', String(x)); fondo.setAttribute('y', String(y));
    fondo.setAttribute('width', String(w)); fondo.setAttribute('height', String(h));
  }
  copia.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  copia.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
  copia.setAttribute('width', String(Math.round(w)));
  copia.setAttribute('height', String(Math.round(h)));
  copia.removeAttribute('style');
  return { texto: '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(copia), w, h };
}

const fecha = () => new Date().toISOString().slice(0, 10);

export function descargarSVG(svg: SVGSVGElement, mapa: MapaConciencia) {
  const { texto } = svgComoTexto(svg, mapa);
  descargar(new Blob([texto], { type: 'image/svg+xml' }), `mapa-teoria-sintergica-${fecha()}.svg`);
}

export async function descargarPNG(svg: SVGSVGElement, mapa: MapaConciencia, escala = 2): Promise<void> {
  const { texto, w, h } = svgComoTexto(svg, mapa);
  const url = URL.createObjectURL(new Blob([texto], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    await new Promise<void>((ok, mal) => { img.onload = () => ok(); img.onerror = () => mal(new Error('No se pudo dibujar la imagen.')); img.src = url; });
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(w * escala);
    lienzo.height = Math.round(h * escala);
    const ctx = lienzo.getContext('2d');
    if (!ctx) throw new Error('Este navegador no permite crear la imagen.');
    ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
    const blob = await new Promise<Blob | null>(ok => lienzo.toBlob(ok, 'image/png'));
    if (!blob) throw new Error('No se pudo crear el PNG.');
    descargar(blob, `mapa-teoria-sintergica-${fecha()}.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function descargarJSON(mapa: MapaConciencia) {
  descargar(new Blob([JSON.stringify(mapa, null, 2)], { type: 'application/json' }), `mapa-teoria-sintergica-${fecha()}.json`);
}
