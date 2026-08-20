// ============================================================================
// EL MENÚ LATERAL — el molde de un nodo (2026-08-20)
// ============================================================================
// Un solo molde para las cuatro secciones. El menú del mapa hacía esto mismo
// con cuatro niveles escritos a mano, uno dentro de otro: 120 líneas de JSX
// anidado que solo servían para objetivos → indicadores → marcadores →
// métricas. Aquí el nodo es RECURSIVO, así que la misma pieza vale para
// «Camión camperizado → Tareas → Ducha» y para cualquier profundidad futura
// sin escribir un nivel más.

export interface NodoMenu {
  /** Único dentro de su rama; es también la llave de «esto está desplegado». */
  id: string;
  label: string;
  icono?: any;
  /** Emoji o inicial cuando no hay icono (personas, proyectos). */
  insignia?: string;
  /** A dónde lleva pulsarlo. Sin destino, pulsar solo despliega. */
  destino?: string;
  /** `ventana` abre en el escritorio; `navegar` cambia la página de fondo. */
  abrir?: 'ventana' | 'navegar';
  /** Hijos ya conocidos. */
  hijos?: NodoMenu[];
  /**
   * Hijos que se piden al desplegar. Es lo que hace que el menú no tenga que
   * cargar el árbol entero de todo para enseñar cinco líneas: se paga por lo
   * que abres. Se llama UNA vez y el resultado se queda.
   */
  cargarHijos?: () => Promise<NodoMenu[]>;
  /** Un número a la derecha (cuántas tareas, cuántas páginas…). */
  cuantos?: number;
  /** Color del punto de estado, si la cosa tiene estados. */
  punto?: string;
}
