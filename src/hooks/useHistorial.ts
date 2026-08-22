import { useCallback, useRef, useState } from 'react';

// ============================================================================
// DESHACER Y REHACER — la red de seguridad del lienzo (2026-08-22)
// ============================================================================
// (Eugenio: «que los murales/lienzos lleguen al nivel de Miro».)
//
// Hasta hoy el lienzo no tenía Ctrl+Z. Mover treinta tarjetas y arrepentirse
// significaba volver a colocarlas a mano, así que la gente no se atrevía a
// probar nada — y un lienzo en el que no te atreves a mover cosas no es un
// lienzo.
//
// Cada acción registra CÓMO se deshace y CÓMO se rehace, no una copia del
// lienzo entero: el estado vive en el servidor y una foto completa sería
// mentira en cuanto otra pestaña tocara algo. Deshacer una colocación vuelve
// a mandar las coordenadas de antes, que es una operación tan legítima como
// la original.
//
// El hueco conocido: lo que hagan OTRAS personas sobre el mismo lienzo no
// entra en esta pila. Cuando llegue la edición en vivo habrá que descartar
// los pasos que pisen algo que ya cambió alguien.

export interface PasoHistorial {
  /** Lo que se le enseña a la persona: «Mover 3 elementos». */
  etiqueta: string;
  deshacer: () => void | Promise<void>;
  rehacer: () => void | Promise<void>;
}

/** Cuántos pasos se recuerdan. Miro guarda ~50; sesenta es holgado y barato. */
const TOPE = 60;

export function useHistorial() {
  const pila = useRef<PasoHistorial[]>([]);
  const rehacibles = useRef<PasoHistorial[]>([]);
  // Las pilas viven en refs (se tocan desde callbacks que no deben cambiar de
  // identidad); este contador es lo único que repinta los botones.
  const [, repintar] = useState(0);
  // Mientras se deshace, lo que la propia acción provoque NO vuelve a la pila:
  // si no, deshacer generaría un paso nuevo y Ctrl+Z se quedaría en bucle.
  const corriendo = useRef(false);

  const registrar = useCallback((paso: PasoHistorial) => {
    if (corriendo.current) return;
    pila.current.push(paso);
    if (pila.current.length > TOPE) pila.current.shift();
    rehacibles.current = [];
    repintar(v => v + 1);
  }, []);

  const mover = useCallback(async (
    origen: { current: PasoHistorial[] },
    destino: { current: PasoHistorial[] },
    cual: 'deshacer' | 'rehacer',
  ) => {
    const paso = origen.current.pop();
    if (!paso) return null;
    corriendo.current = true;
    try { await paso[cual](); } finally { corriendo.current = false; }
    destino.current.push(paso);
    repintar(v => v + 1);
    return paso.etiqueta;
  }, []);

  const deshacer = useCallback(() => mover(pila, rehacibles, 'deshacer'), [mover]);
  const rehacer = useCallback(() => mover(rehacibles, pila, 'rehacer'), [mover]);

  /** Al cambiar de lienzo la pila anterior ya no significa nada. */
  const olvidar = useCallback(() => {
    pila.current = [];
    rehacibles.current = [];
    repintar(v => v + 1);
  }, []);

  return {
    registrar, deshacer, rehacer, olvidar,
    puedeDeshacer: pila.current.length > 0,
    puedeRehacer: rehacibles.current.length > 0,
    proximoDeshacer: pila.current[pila.current.length - 1]?.etiqueta ?? null,
    proximoRehacer: rehacibles.current[rehacibles.current.length - 1]?.etiqueta ?? null,
  };
}
