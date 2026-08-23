import { useEffect, useRef, useState } from 'react';

// ============================================================================
// EL SITIO DONDE CABE LA GRÁFICA (2026-08-23)
// ============================================================================
// Una gráfica necesita saber cuántos píxeles tiene ANTES de dibujar: los ejes,
// los rótulos y el reparto del espacio dependen del tamaño real, no de un
// porcentaje de CSS. Se mide el contenedor con `ResizeObserver`, que es lo que
// avisa también cuando cambia por algo que no es la ventana —abrir un panel,
// arrastrar el borde de una ventana del lienzo—.

export interface Medida { ancho: number; alto: number }

export function useMedida<T extends HTMLElement>(): [React.RefObject<T | null>, Medida] {
  const ref = useRef<T | null>(null);
  const [medida, setMedida] = useState<Medida>({ ancho: 0, alto: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(entradas => {
      const r = entradas[0]?.contentRect;
      if (!r) return;
      // Redondeado: medio píxel de diferencia repinta la gráfica entera y no
      // se ve, así que no vale la pena volver a dibujar por eso.
      setMedida(m => {
        const a = Math.round(r.width), b = Math.round(r.height);
        return m.ancho === a && m.alto === b ? m : { ancho: a, alto: b };
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, medida];
}

/** Los márgenes donde viven los ejes y los rótulos del final de línea. */
export const MARGEN = { arriba: 12, derecha: 116, abajo: 30, izquierda: 56 };

export interface Marco {
  ancho: number; alto: number;
  /** El rectángulo donde se dibujan los datos. */
  x0: number; y0: number; x1: number; y1: number;
  anchoDatos: number; altoDatos: number;
}

export function marcoDe(m: Medida, margen = MARGEN): Marco {
  const x0 = margen.izquierda;
  const y0 = margen.arriba;
  const x1 = Math.max(x0 + 1, m.ancho - margen.derecha);
  const y1 = Math.max(y0 + 1, m.alto - margen.abajo);
  return { ancho: m.ancho, alto: m.alto, x0, y0, x1, y1, anchoDatos: x1 - x0, altoDatos: y1 - y0 };
}
