import { useSyncExternalStore } from 'react';

// ============================================================================
// MOSTRAR U OCULTAR LAS CALIFICACIONES (2026-10-28, Eugenio)
// ============================================================================
// «Un botón en el menú superior, "Mostrar" / "Ocultar" calificaciones, y que se
// muestre o se oculte todo el sistema de calificaciones de forma coherente con
// todo el contenido de la plataforma.» Un solo interruptor para todo: pone la
// clase `sin-calificaciones` en <html>, y cada nota de la web lleva la marca
// `data-calificacion`, que `index.css` esconde con esa clase. Así ninguna pieza
// tiene que acordarse de leer el interruptor. Se recuerda en este navegador
// (`localStorage`) y llega también al mapa, que va en su propio marco: el evento
// `storage` avisa a los demás documentos de la misma web.

const CLAVE = 'calificaciones-ocultas';
// OCULTAS POR DEFECTO (2026-10-28, Eugenio: «que las calificaciones estén ocultas por defecto»): solo se ven si la
// persona las ha pedido en este navegador.
const leer = () => { try { return localStorage.getItem(CLAVE) !== '0'; } catch { return true; } };
let ocultas = typeof window !== 'undefined' ? leer() : true;
const oyentes = new Set<() => void>();
const aplicar = () => { if (typeof document !== 'undefined') document.documentElement.classList.toggle('sin-calificaciones', ocultas); };
aplicar();
if (typeof window !== 'undefined') window.addEventListener('storage', e => {
  if (e.key !== CLAVE) return;
  ocultas = e.newValue === '1'; aplicar(); oyentes.forEach(f => f());
});

export function ponerCalificacionesOcultas(v: boolean) {
  ocultas = v;
  try { localStorage.setItem(CLAVE, v ? '1' : '0'); } catch { /* sin almacenamiento: solo esta visita */ }
  aplicar(); oyentes.forEach(f => f());
}

export function useCalificacionesOcultas(): boolean {
  return useSyncExternalStore(f => { oyentes.add(f); return () => { oyentes.delete(f); }; }, () => ocultas, () => true);
}
