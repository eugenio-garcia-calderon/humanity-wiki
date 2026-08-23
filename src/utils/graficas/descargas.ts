// ============================================================================
// LLEVARSE LA GRÁFICA (2026-08-23)
// ============================================================================
// Una gráfica que solo se puede mirar en su pantalla no sirve para un informe,
// ni para una presentación, ni para una denuncia. Se descarga en SVG (que se
// puede seguir editando y no se pixela) y en PNG (que se pega en cualquier
// sitio).
//
// EL SVG SE LLEVA SUS ESTILOS PUESTOS. Un `<svg>` arrancado del navegador
// pierde todo lo que le daban las hojas de estilo: se copian los estilos ya
// calculados a cada elemento antes de serializar. Sin esto el fichero abre en
// blanco y negro y sin tipografía, que es el fallo clásico de «exportar SVG».

const ATRIBUTOS = [
  'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-dasharray',
  'stroke-linecap', 'stroke-linejoin', 'opacity',
  'font-size', 'font-family', 'font-weight', 'text-anchor',
];

function clonarConEstilos(svg: SVGSVGElement): SVGSVGElement {
  const copia = svg.cloneNode(true) as SVGSVGElement;
  const origen = svg.querySelectorAll('*');
  const destino = copia.querySelectorAll('*');
  for (let i = 0; i < origen.length; i++) {
    const calc = window.getComputedStyle(origen[i]);
    const el = destino[i] as SVGElement;
    for (const a of ATRIBUTOS) {
      const v = calc.getPropertyValue(a);
      if (v && v !== 'none' && v !== 'normal') el.setAttribute(a, v);
    }
  }
  copia.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  // Un fondo blanco explícito: sin él, un PNG con transparencia pegado sobre
  // una diapositiva oscura deja el texto negro invisible.
  const fondo = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  fondo.setAttribute('width', '100%');
  fondo.setAttribute('height', '100%');
  fondo.setAttribute('fill', '#ffffff');
  copia.insertBefore(fondo, copia.firstChild);
  return copia;
}

const nombreLimpio = (t: string) =>
  (t || 'grafica').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60).toLowerCase() || 'grafica';

function bajar(url: string, nombre: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
}

export function descargarSVG(svg: SVGSVGElement, titulo: string) {
  const texto = new XMLSerializer().serializeToString(clonarConEstilos(svg));
  const url = URL.createObjectURL(new Blob([texto], { type: 'image/svg+xml;charset=utf-8' }));
  bajar(url, `${nombreLimpio(titulo)}.svg`);
  URL.revokeObjectURL(url);
}

/** PNG al doble de resolución: en una pantalla normal se ve nítido. */
export async function descargarPNG(svg: SVGSVGElement, titulo: string, escala = 2) {
  const texto = new XMLSerializer().serializeToString(clonarConEstilos(svg));
  const url = URL.createObjectURL(new Blob([texto], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    await new Promise<void>((ok, mal) => {
      img.onload = () => ok();
      img.onerror = () => mal(new Error('No se ha podido convertir la gráfica a imagen.'));
      img.src = url;
    });
    const w = svg.width.baseVal.value || svg.clientWidth;
    const h = svg.height.baseVal.value || svg.clientHeight;
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(w * escala);
    lienzo.height = Math.round(h * escala);
    const ctx = lienzo.getContext('2d');
    if (!ctx) throw new Error('El navegador no ha dado un lienzo para dibujar.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, lienzo.width, lienzo.height);
    ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
    bajar(lienzo.toDataURL('image/png'), `${nombreLimpio(titulo)}.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}
