// ============================================================================
// EL HILO ENTRE EL MENÚ Y EL ESCRITORIO (2026-08-19, petición de Eugenio:
// «solo tiene que haber un menú arriba, uno solo… y en ese uno es donde deben
// estar las ventanas en forma de iconos»).
// ============================================================================
// La única barra de arriba es la cabecera de la app (Layout), y las ventanas
// viven en la página del Escritorio. Son dos componentes lejanos que ahora
// tienen que hablarse: el menú ☰ ABRE ventanas, y la cabecera ENSEÑA las que
// hay abiertas. Este módulo es ese hilo, con eventos del navegador — sin un
// contexto global nuevo ni estado duplicado: el estado sigue viviendo en un
// solo sitio (el gestor), y aquí solo viajan avisos.

export interface AbrirVentana {
  titulo: string;
  clase: 'app' | 'navegador';
  destino: string;
}

/** Lo que la cabecera necesita para pintar un icono por ventana. */
export interface VentanaEstado {
  id: string;
  titulo: string;
  clase: 'app' | 'navegador';
  destino: string;
  minimizada: boolean;
  delante: boolean;
}

export const abrirVentana = (a: AbrirVentana) =>
  window.dispatchEvent(new CustomEvent('humanity:abrir-ventana', { detail: a }));

/** Pulsar el icono de una ventana en la cabecera. */
export const pulsarVentana = (id: string) =>
  window.dispatchEvent(new CustomEvent('humanity:pulsar-ventana', { detail: id }));

/** El gestor publica su estado cada vez que cambia. */
export const publicarVentanas = (v: VentanaEstado[]) =>
  window.dispatchEvent(new CustomEvent('humanity:ventanas', { detail: v }));

/** La cabecera pide el estado al montarse. Hace falta porque React ejecuta los
 *  efectos del HIJO antes que los del padre: el gestor publica su primera foto
 *  antes de que la cabecera esté escuchando, y sin esta petición los iconos de
 *  las ventanas restauradas no aparecerían hasta el siguiente cambio. */
export const pedirVentanas = () =>
  window.dispatchEvent(new Event('humanity:pedir-ventanas'));

/** El navegador remoto (Chromium en el servidor) avisa de su sesión para que
 *  el chat del Escritorio lea la página VIVA en vez de descargar una copia. */
export const avisarNavegadorRemoto = (sesion: string | null) =>
  window.dispatchEvent(new CustomEvent('humanity:navegador-remoto', { detail: sesion }));

/** Cerrar una ventana desde la barra de arriba, como la ✕ de una pestaña
 *  (Eugenio, 2026-08-20: «permite cerrarlas desde ahí arriba como si fuese un
 *  navegador»). */
export const cerrarVentana = (id: string) =>
  window.dispatchEvent(new CustomEvent('humanity:cerrar-ventana', { detail: id }));

/** Recolocar las pestañas arrastrando. Viaja el orden ENTERO de ids: el gestor
 *  no tiene que adivinar de dónde a dónde ha ido nada, y si llega un id que ya
 *  no existe (ventana cerrada a la vez) simplemente se ignora. */
export const ordenarVentanas = (ids: string[]) =>
  window.dispatchEvent(new CustomEvent('humanity:ordenar-ventanas', { detail: ids }));
