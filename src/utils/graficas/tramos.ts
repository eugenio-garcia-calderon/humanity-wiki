// ============================================================================
// LOS TRAMOS DE COLOR DEL MAPA (2026-08-23)
// ============================================================================
// Un mapa coroplético reparte los países en tramos de color. Cómo se corten
// esos tramos CAMBIA lo que el mapa parece decir, así que la decisión se toma
// aquí, escrita, y no escondida dentro del componente.
//
// SE CORTA POR CUANTILES, no en trozos iguales. Casi todo lo que se mapea
// —renta, emisiones, población— está muy torcido: cuatro países enormes y
// ciento setenta pequeños. En trozos iguales, ciento setenta países salen del
// mismo color y el mapa no dice nada. Por cuantiles, cada color agrupa un
// número parecido de países y se ve dónde están las diferencias.
//
// Y LOS CORTES SE REDONDEAN a dos cifras significativas: un límite en
// «12 473,8194» no lo lee nadie, y la leyenda es la mitad del mapa.

/** Dos cifras significativas: 12473,8 → 12000; 0,00341 → 0,0034. */
function redondearBonito(v: number): number {
  if (v === 0 || !Number.isFinite(v)) return 0;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(v))) - 1);
  return Math.round(v / mag) * mag;
}

export interface Tramo { desde: number; hasta: number; color: string }

/**
 * Los tramos para unos valores y una rampa. `cuantos` es cuántos colores se
 * quieren; si los datos no dan para tantos tramos distintos, salen menos —
 * antes que repetir un corte y fingir que hay más detalle del que hay.
 */
export function tramosPorCuantiles(valores: number[], rampa: readonly string[], cuantos = 6): Tramo[] {
  const orden = valores.filter(Number.isFinite).sort((a, b) => a - b);
  if (!orden.length) return [];
  if (orden[0] === orden[orden.length - 1]) {
    return [{ desde: orden[0], hasta: orden[0], color: rampa[Math.floor(rampa.length / 2)] }];
  }

  const cortes: number[] = [orden[0]];
  for (let i = 1; i < cuantos; i++) {
    const pos = (orden.length - 1) * (i / cuantos);
    const bajo = Math.floor(pos), alto = Math.ceil(pos);
    const v = orden[bajo] + (orden[alto] - orden[bajo]) * (pos - bajo);
    cortes.push(redondearBonito(v));
  }
  cortes.push(orden[orden.length - 1]);

  // Redondear puede juntar dos cortes en el mismo número: ese tramo desaparece.
  const limpios = [...new Set(cortes)].sort((a, b) => a - b);
  const n = limpios.length - 1;
  const paso = (rampa.length - 1) / Math.max(1, n - 1);
  return Array.from({ length: n }, (_, i) => ({
    desde: limpios[i],
    hasta: limpios[i + 1],
    color: rampa[Math.round(i * paso)],
  }));
}

/** En qué tramo cae un valor. `null` si está fuera (no debería pasar). */
export function colorDe(tramos: Tramo[], v: number): string | null {
  for (let i = 0; i < tramos.length; i++) {
    const t = tramos[i];
    // El último tramo incluye su tope; los demás no, para que un valor no
    // pueda estar en dos sitios.
    if (v >= t.desde && (i === tramos.length - 1 ? v <= t.hasta : v < t.hasta)) return t.color;
  }
  return null;
}
