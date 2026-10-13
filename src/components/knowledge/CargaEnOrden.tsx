import { useEffect, useRef, useState, type ReactNode } from 'react';

// ============================================================================
// LAS TABLAS SE CARGAN DE ARRIBA ABAJO (2026-10-13)
// ============================================================================
// Eugenio: en una página con muchas tablas se pedían todas a la vez y tardaban segundos en enseñar la primera y la
// segunda, que son las importantes. Ahora, por defecto, cada tabla arranca cuando le toca según su sitio en la
// página: las dos primeras ya, y las siguientes en cuanto la anterior está montada y la tabla se acerca a la pantalla.
// Va en la página publicada; el editor sigue montando las tablas de inmediato para poder trabajar en ellas.

const ADELANTO_PX = 600;
const AVANZADAS_SIN_ESPERAR = 2;

let siguienteTurno = 0;
let registradas = 0;
const saltadas = new Set<number>();
const escuchas = new Set<() => void>();
const avisar = () => escuchas.forEach(f => f());

export function CargaEnOrden({ children, alto = 520 }: { children: ReactNode; alto?: number }) {
  const [turno] = useState(() => registradas++);
  const [montada, setMontada] = useState(false);
  const montadaRef = useRef(false);
  const caja = useRef<HTMLDivElement>(null);
  const cerca = useRef(false);

  useEffect(() => {
    const mirar = () => {
      while (saltadas.has(siguienteTurno)) siguienteTurno++;
      if (montadaRef.current || turno !== siguienteTurno) return;
      if (turno >= AVANZADAS_SIN_ESPERAR && !cerca.current) return;
      montadaRef.current = true;
      siguienteTurno++;
      setMontada(true);
      avisar();
    };
    escuchas.add(mirar);
    const observador = new IntersectionObserver(entradas => {
      if (entradas.some(e => e.isIntersecting)) { cerca.current = true; mirar(); }
    }, { rootMargin: `${ADELANTO_PX}px 0px` });
    if (caja.current) observador.observe(caja.current);
    mirar();
    return () => {
      escuchas.delete(mirar);
      observador.disconnect();
      if (!montadaRef.current) { saltadas.add(turno); avisar(); }
    };
  }, [turno]);

  if (!montada) {
    return <div ref={caja} style={{ minHeight: alto }} className="grid place-items-center text-xs font-bold text-slate-300">Cargando…</div>;
  }
  return <>{children}</>;
}
