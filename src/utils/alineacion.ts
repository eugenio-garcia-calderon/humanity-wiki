// ============================================================================
// ALINEAR, REPARTIR, IGUALAR Y LAS GUÍAS — la aritmética del lienzo
// ============================================================================
// (2026-08-22, Eugenio: «que los murales/lienzos lleguen al nivel de Miro».)
//
// Miro tiene estas operaciones en una barra que aparece en cuanto marcas dos
// elementos, y guías rosas que salen mientras arrastras. Todo eso es
// geometría pura, así que vive aquí suelto de React: entran rectángulos,
// salen correcciones. Quien las llama decide qué hacer con el resultado —
// pintarlo, guardarlo o registrarlo en el historial.
//
// Un detalle importante: las cuentas se hacen sobre la posición GUARDADA de
// cada pieza, no sobre la que se ve. El lienzo tiene un «imán» anti-solape
// que separa las tarjetas al pintarlas, y alinear lo que se ve dejaría en la
// base de datos unas coordenadas que no están alineadas.

export interface Caja { id: string; x: number; y: number; w: number; h: number }

/** Lo único que se devuelve es lo que cambia: nada de reescribir cajas enteras. */
export interface Correccion { id: string; x?: number; y?: number; w?: number; h?: number }

export type Alineacion = 'izquierda' | 'centroH' | 'derecha' | 'arriba' | 'centroV' | 'abajo';
export type Reparto = 'horizontal' | 'vertical';
export type Igualado = 'ancho' | 'alto' | 'ambos';

const redondear = (n: number) => Math.round(n);

/** El rectángulo que envuelve a todas. */
export function envolvente(cajas: Caja[]) {
  const x1 = Math.min(...cajas.map(c => c.x));
  const y1 = Math.min(...cajas.map(c => c.y));
  const x2 = Math.max(...cajas.map(c => c.x + c.w));
  const y2 = Math.max(...cajas.map(c => c.y + c.h));
  return { x1, y1, x2, y2, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2 };
}

/**
 * Alinear contra el borde de la envolvente (o su centro). Es la lectura que
 * espera cualquiera que venga de Miro, Figma o PowerPoint: «a la izquierda»
 * significa al borde izquierdo del conjunto, no al del primero que marcaste.
 */
export function alinear(cajas: Caja[], modo: Alineacion): Correccion[] {
  if (cajas.length < 2) return [];
  const e = envolvente(cajas);
  const out: Correccion[] = [];
  for (const c of cajas) {
    switch (modo) {
      case 'izquierda': if (redondear(e.x1) !== c.x) out.push({ id: c.id, x: redondear(e.x1) }); break;
      case 'centroH':   if (redondear(e.cx - c.w / 2) !== c.x) out.push({ id: c.id, x: redondear(e.cx - c.w / 2) }); break;
      case 'derecha':   if (redondear(e.x2 - c.w) !== c.x) out.push({ id: c.id, x: redondear(e.x2 - c.w) }); break;
      case 'arriba':    if (redondear(e.y1) !== c.y) out.push({ id: c.id, y: redondear(e.y1) }); break;
      case 'centroV':   if (redondear(e.cy - c.h / 2) !== c.y) out.push({ id: c.id, y: redondear(e.cy - c.h / 2) }); break;
      case 'abajo':     if (redondear(e.y2 - c.h) !== c.y) out.push({ id: c.id, y: redondear(e.y2 - c.h) }); break;
    }
  }
  return out;
}

/**
 * Repartir con HUECOS IGUALES entre bordes (no centros equidistantes): con
 * piezas de tamaños distintos —que es lo normal en un mural— los centros
 * equidistantes se ven torcidos y los huecos iguales se ven bien. Las dos de
 * los extremos no se mueven; son el marco del reparto.
 */
export function repartir(cajas: Caja[], eje: Reparto): Correccion[] {
  if (cajas.length < 3) return [];
  const h = eje === 'horizontal';
  const orden = [...cajas].sort((a, b) => (h ? a.x - b.x : a.y - b.y));
  const inicio = h ? orden[0].x : orden[0].y;
  const ultima = orden[orden.length - 1];
  const fin = h ? ultima.x + ultima.w : ultima.y + ultima.h;
  const suma = orden.reduce((s, c) => s + (h ? c.w : c.h), 0);
  const hueco = (fin - inicio - suma) / (orden.length - 1);

  const out: Correccion[] = [];
  let cursor = inicio;
  for (let i = 0; i < orden.length; i++) {
    const c = orden[i];
    const destino = redondear(cursor);
    if (i > 0 && i < orden.length - 1) {
      if (h && destino !== c.x) out.push({ id: c.id, x: destino });
      if (!h && destino !== c.y) out.push({ id: c.id, y: destino });
    }
    cursor += (h ? c.w : c.h) + hueco;
  }
  return out;
}

/**
 * Igualar tamaños tomando como patrón la pieza MÁS GRANDE. Miro y Figma usan
 * «la primera que marcaste», pero el orden de selección no se ve en pantalla
 * y la más grande sí: la regla se puede predecir mirando el lienzo.
 */
export function igualar(cajas: Caja[], que: Igualado): Correccion[] {
  if (cajas.length < 2) return [];
  const w = Math.max(...cajas.map(c => c.w));
  const h = Math.max(...cajas.map(c => c.h));
  const out: Correccion[] = [];
  for (const c of cajas) {
    const p: Correccion = { id: c.id };
    if (que !== 'alto' && c.w !== w) p.w = redondear(w);
    if (que !== 'ancho' && c.h !== h) p.h = redondear(h);
    if (p.w !== undefined || p.h !== undefined) out.push(p);
  }
  return out;
}

// ----------------------------------------------------------------------------
// GUÍAS DE ARRASTRE
// ----------------------------------------------------------------------------

export interface Guia {
  /** 'x' = línea vertical (alinea columnas); 'y' = línea horizontal. */
  eje: 'x' | 'y';
  /** Dónde cae la línea, en coordenadas del lienzo. */
  v: number;
  /** Hasta dónde se dibuja: envuelve la pieza movida y su pareja. */
  desde: number;
  hasta: number;
}

export interface Enganche { guias: Guia[]; dx: number; dy: number }

/**
 * Qué guías salen al arrastrar `movida` cerca de `otras`, y cuánto habría que
 * corregirla para que encaje. Se comparan los tres puntos notables de cada eje
 * —borde inicial, centro y borde final— contra los tres de cada vecina: nueve
 * parejas por eje, y gana la más cercana dentro de la tolerancia.
 *
 * NO se corrige durante el arrastre (mover el nodo bajo el ratón mientras
 * React Flow lo está moviendo produce temblor); se pinta la guía y el enganche
 * se aplica AL SOLTAR. El resultado en pantalla es el mismo y el arrastre no
 * pelea con la mano.
 */
export function guiasDeArrastre(movida: Caja, otras: Caja[], tolerancia = 6): Enganche {
  const puntos = (c: Caja, eje: 'x' | 'y') => (eje === 'x'
    ? [c.x, c.x + c.w / 2, c.x + c.w]
    : [c.y, c.y + c.h / 2, c.y + c.h]);

  const guias: Guia[] = [];
  const correccion: Record<'x' | 'y', number> = { x: 0, y: 0 };

  for (const eje of ['x', 'y'] as const) {
    let mejor: { delta: number; v: number; otra: Caja } | null = null;
    const mios = puntos(movida, eje);
    for (const o of otras) {
      for (const p of puntos(o, eje)) {
        for (const m of mios) {
          const delta = p - m;
          if (Math.abs(delta) > tolerancia) continue;
          if (!mejor || Math.abs(delta) < Math.abs(mejor.delta)) mejor = { delta, v: p, otra: o };
        }
      }
    }
    if (!mejor) continue;
    correccion[eje] = mejor.delta;
    // La línea se dibuja a lo largo del OTRO eje, cubriendo ambas piezas.
    const perp = eje === 'x' ? 'y' : 'x';
    const a = perp === 'y' ? [movida.y, movida.y + movida.h] : [movida.x, movida.x + movida.w];
    const b = perp === 'y' ? [mejor.otra.y, mejor.otra.y + mejor.otra.h] : [mejor.otra.x, mejor.otra.x + mejor.otra.w];
    guias.push({
      eje,
      v: mejor.v,
      desde: Math.min(a[0], b[0]) - 24,
      hasta: Math.max(a[1], b[1]) + 24,
    });
  }

  return { guias, dx: correccion.x, dy: correccion.y };
}
