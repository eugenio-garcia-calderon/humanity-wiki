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
  /** De dónde nació la ventana (con lo que se casa al reabrirla desde el menú). */
  destino: string;
  /** Dónde está AHORA. Es lo que decide el icono de la pestaña, igual que en
   *  un navegador el favicon es el de la página que estás viendo. */
  ruta?: string;
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

/** Cerrar todas las ventanas de golpe (2026-08-22). */
export const cerrarTodasLasVentanas = () =>
  window.dispatchEvent(new Event('humanity:cerrar-todas'));

/** Recolocar las pestañas arrastrando. Viaja el orden ENTERO de ids: el gestor
 *  no tiene que adivinar de dónde a dónde ha ido nada, y si llega un id que ya
 *  no existe (ventana cerrada a la vez) simplemente se ignora. */
export const ordenarVentanas = (ids: string[]) =>
  window.dispatchEvent(new CustomEvent('humanity:ordenar-ventanas', { detail: ids }));

/** La web abierta en el navegador, para que el asistente sepa qué estás
 *  mirando. Antes lo recogía la página «Escritorio», que ya no existe. */
export const publicarPaginaWeb = (url: string | null) =>
  window.dispatchEvent(new CustomEvent('humanity:pagina-web', { detail: url }));

/** Doble clic en una pestaña: agrandar a pantalla completa (Eugenio,
 *  2026-08-20). Es un conmutador — si ya está a pantalla completa, vuelve a su
 *  tamaño, que es lo que hace la barra de título de cualquier ventana. */
export const maximizarVentana = (id: string) =>
  window.dispatchEvent(new CustomEvent('humanity:maximizar-ventana', { detail: id }));

/** ══ ABRIR ALGO AL LADO (2026-08-22) ═════════════════════════════════════
 *  Eugenio: «haz que se abra en una ventana lateral, y que permita luego
 *  expandirse a ventana superior […] también que permita cerrarlo con una X».
 *
 *  Va por el mismo hilo de eventos que las ventanas del escritorio, y no por
 *  un contexto nuevo, por la misma razón que aquéllas: el estado vive en un
 *  solo sitio —el panel— y por aquí solo viajan avisos. Cualquier página puede
 *  pedirlo sin saber quién lo pinta. */
export interface AbrirLateral {
  titulo: string;
  /** Una ruta de la propia aplicación. Se carga con `embed=1`. */
  destino: string;
  /** `true` cuando `destino` NO es una ruta de la app sino un archivo suelto
   *  (un PDF subido, una imagen). Entonces no se le añade `embed=1`: ese
   *  parámetro solo lo entiende la aplicación, y colgárselo a un fichero es
   *  ensuciar una dirección que alguien puede copiar. */
  crudo?: boolean;
}

export const abrirLateral = (a: AbrirLateral) =>
  window.dispatchEvent(new CustomEvent('humanity:abrir-lateral', { detail: a }));

/*
 * APARTAR TODAS LAS VENTANAS, SIN CERRAR NINGUNA (2026-08-22, Eugenio: «cuando
 * hago click en Humanity Wiki me lleve a INICIO "/" y ahora no ocurre cuando
 * hay otras pestañas abierto, esto es terrible»).
 *
 * QUÉ PASABA. El logo SÍ navegaba: `navigate('/')` funcionaba perfectamente. Lo
 * que no pasaba es que se viera, porque las ventanas del escritorio se pintan
 * ENCIMA de la página y no se enteran de que la ruta ha cambiado. Desde fuera es
 * indistinguible de un botón roto — y por eso «esto es terrible» es la
 * descripción correcta: un botón que hace su trabajo y no lo parece es peor que
 * uno que no lo hace, porque lo pulsas más veces.
 *
 * POR QUÉ MINIMIZAR Y NO CERRAR. Cerrar tira el escritorio de alguien por
 * pulsar el logo, y `humanity:cerrar-todas` ya existe para cuando eso es lo que
 * se quiere. Minimizar es exactamente lo que la propia aplicación ya hacía al
 * entrar por un enlace de dos tramos: «siguen en la barra de arriba, a un clic,
 * pero no tapan lo que venías a ver». Mismo caso, misma respuesta.
 */
export const minimizarTodas = () =>
  window.dispatchEvent(new Event('humanity:minimizar-todas'));
