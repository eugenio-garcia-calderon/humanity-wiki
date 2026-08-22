import { useSyncExternalStore } from 'react';
import { suscribir, leerEstado, type EstadoTelecom } from './motor';

// ============================================================================
// MIRAR EL MOTOR DESDE REACT (2026-08-22)
// ============================================================================
// `useSyncExternalStore` y no un `useState` con suscripción a mano: es la
// herramienta que React trae exactamente para esto —un dato que vive fuera de
// React— y evita el fallo clásico de perderse un cambio que ocurre entre que
// el componente se pinta y que se suscribe. En una llamada eso sería quedarse
// con el teléfono sonando en la pantalla después de haber colgado.
export function useTelecom(): EstadoTelecom {
  return useSyncExternalStore(suscribir, leerEstado, leerEstado);
}
