// AUTOSCROLL AL ARRASTRAR (2026-10-08)
// Eugenio: «arrastro una entrada hacia el borde de arriba o de abajo y la pantalla no se mueve».
// El navegador sólo desliza la ventana, y aquí quien hace scroll es un contenedor (`<main>`, un panel…), así que
// al arrastrar con el arrastre NATIVO (tarjetas de galería, páginas del menú, archivos que vienen de fuera) no se
// movía nada. Un solo oyente para toda la aplicación: mientras llegan `dragover`, busca desde lo que hay bajo el
// puntero el primer contenedor que pueda hacer scroll hacia ese lado y lo desliza, más deprisa cuanto más cerca del
// borde. Se para solo al soltar, al cancelar o cuando dejan de llegar `dragover`.
// (Los bloques del editor se arrastran con eventos de puntero y llevan el suyo, en `Documento.tsx`.)

const ZONA = 90;      // px desde el borde en los que empieza a deslizar
const MAX = 26;       // px por fotograma, en el mismo borde
const SIN_NOTICIAS = 400;  // ms sin `dragover` = el arrastre ya terminó

let raf = 0;
let ultimo = { x: 0, y: 0, t: 0 };

function conScroll(desde: Element | null, haciaAbajo: boolean): HTMLElement | null {
  for (let el = desde as HTMLElement | null; el && el !== document.body; el = el.parentElement) {
    const oy = getComputedStyle(el).overflowY;
    if (oy !== 'auto' && oy !== 'scroll' && oy !== 'overlay') continue;
    if (el.scrollHeight <= el.clientHeight + 1) continue;
    if (haciaAbajo ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0) return el;
  }
  return null;
}

function paso() {
  raf = 0;
  if (Date.now() - ultimo.t > SIN_NOTICIAS) return;
  const bajo = document.elementFromPoint(ultimo.x, ultimo.y);
  // Los bordes son los de la ventana: arrastrando hacia el borde de la pantalla es adonde se quiere ir.
  const alto = window.innerHeight;
  const arriba = ultimo.y < ZONA, abajo = ultimo.y > alto - ZONA;
  if (arriba || abajo) {
    const f = arriba ? 1 - Math.max(0, ultimo.y) / ZONA : 1 - Math.max(0, alto - ultimo.y) / ZONA;
    const px = Math.max(1, Math.round(Math.min(1, f) * MAX));
    // Bajo el puntero, en el mismo borde, a veces sólo hay una barra fija (el pie, el feedback): se mira también un poco
    // más adentro, en la misma vertical, hasta dar con quien sí desliza.
    let el = conScroll(bajo, abajo);
    for (const dy of [110, 220, 360]) {
      if (el) break;
      el = conScroll(document.elementFromPoint(ultimo.x, abajo ? ultimo.y - dy : ultimo.y + dy), abajo);
    }
    if (el) el.scrollTop += abajo ? px : -px;
    else window.scrollBy(0, abajo ? px : -px);
  }
  raf = requestAnimationFrame(paso);
}

export function instalarAutoscrollArrastre() {
  if (typeof window === 'undefined' || (window as any).__autoscrollArrastre) return;
  (window as any).__autoscrollArrastre = true;
  window.addEventListener('dragover', e => {
    ultimo = { x: e.clientX, y: e.clientY, t: Date.now() };
    if (!raf) raf = requestAnimationFrame(paso);
  }, true);
  const parar = () => { ultimo.t = 0; };
  window.addEventListener('drop', parar, true);
  window.addEventListener('dragend', parar, true);
}
