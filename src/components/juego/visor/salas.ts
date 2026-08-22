// ============================================================================
// LAS SALAS DEL VISOR (2026-08-22)
// ============================================================================
// Eugenio: «la sala 3D inicial donde arranca siempre el visor será como un
// espacio donde el usuario pueda elegir en qué portal se adentra: Proyectos,
// Personas, Publicaciones, Herramientas; y luego en una sala de proyecto, por
// ejemplo, si hay personas asociadas estarán en esa sala».
//
// EL RECORRIDO, EN UNA LÍNEA:
//
//     inicio ──▶ proyectos ──▶ (un proyecto concreto: su sala, con su gente)
//            ├─▶ personas
//            ├─▶ publicaciones
//            └─▶ herramientas
//
// LAS SALAS DE SECCIÓN VIVEN DENTRO DE LA ESCENA, no en la página. Entrar en
// «Proyectos» no cambia de dirección ni pide nada al servidor: son los mismos
// datos que ya están cargados, puestos en otro anillo. Solo entrar en un
// PROYECTO concreto sube a la página, porque eso sí trae sus tarjetas y su
// gente. Meter las cuatro salas en el estado de la página habría sido cuatro
// veces el trasiego de antes para no enseñar nada nuevo.
//
// TODAS LAS SALAS SON IGUALES POR DENTRO (Eugenio: «todas las salas tienen las
// mismas características»): suelo blanco, un centro, un anillo de cosas y un
// portal de vuelta. Lo único que cambia es QUÉ hay en el anillo. Por eso esto
// es una lista de datos y no cuatro componentes.

export type ClaveSala = 'inicio' | 'proyectos' | 'personas' | 'publicaciones' | 'herramientas';

export interface DefinicionSala {
  clave: ClaveSala;
  nombre: string;
  /** Una línea bajo el nombre, en el rótulo del centro. */
  descripcion: string;
}

export const SALAS: Record<ClaveSala, DefinicionSala> = {
  inicio: {
    clave: 'inicio', nombre: 'Inicio',
    descripcion: 'Elige por dónde entrar',
  },
  proyectos: {
    clave: 'proyectos', nombre: 'Proyectos',
    descripcion: 'Cada portal es un proyecto tuyo',
  },
  personas: {
    clave: 'personas', nombre: 'Personas',
    descripcion: 'Quién anda contigo',
  },
  publicaciones: {
    clave: 'publicaciones', nombre: 'Publicaciones',
    descripcion: 'Lo que has ido dejando escrito',
  },
  herramientas: {
    clave: 'herramientas', nombre: 'Herramientas',
    descripcion: 'Lo que tienes puesto en el mundo',
  },
};

/** El orden de los cuatro portales de la sala de inicio. Es el mismo que el
 *  del menú de la izquierda: cambiar de sitio las cosas entre una pantalla y
 *  otra obliga a aprenderse dos mapas de la misma casa. */
export const PORTALES_INICIO: ClaveSala[] = ['proyectos', 'personas', 'publicaciones', 'herramientas'];

/** El color con el que cada sección se anuncia en las previas de los portales.
 *  Son los de la plataforma, no unos nuevos: el verde ya significa «proyecto»
 *  en el menú y en las tarjetas. */
export const COLOR_SECCION: Record<ClaveSala, string> = {
  inicio: '#0f172a',
  proyectos: '#10b981',
  personas: '#f59e0b',
  publicaciones: '#6366f1',
  herramientas: '#0ea5e9',
};
