/*
 * LA PORTADA, A TU MANERA (2026-08-22, petición de Eugenio)
 * ============================================================================
 * «Quiero que la pantalla de inicio pueda ser personalizada y que puedas
 * escoger los elementos que se muestran y el orden de los mismos. Por defecto
 * habrá 3 plantillas con diferentes vistas de contenido que fácilmente puedes
 * cambiar de una a otra, pero podrás crear la tuya personalizada.»
 *
 * DÓNDE SE GUARDA, Y POR QUÉ NO HIZO FALTA TOCAR EL SERVIDOR. `users.ui_settings`
 * ya existe: un `jsonb` por persona con fusión superficial
 * (`updateUiSettings` en `AuthContext`), que hoy guarda el tamaño de letra.
 * Guardar aquí la portada sale gratis y **te sigue a cualquier dispositivo**,
 * que es lo que se espera de «mi portada» — configurarla en el ordenador y
 * abrir el móvil con otra cosa sería el mismo fallo de dos verdades.
 *
 * QUIEN NO HA ENTRADO NO PUEDE PERSONALIZAR, y no es un olvido: sin cuenta no
 * hay dónde guardarlo, y guardarlo solo en ese navegador sería prometer algo
 * que se pierde al cambiar de móvil. Sin sesión se ve la plantilla «Completa».
 */

/** Cada trozo de la portada que se puede encender, apagar y mover. */
/*
 * TRES BLOQUES SE HAN IDO (2026-08-24). Eugenio, mirando la portada: «elimina
 * todo esto de los círculos de estados de personas, el buscador secundario
 * metido en la página, la ristra de temáticas… y deja solo las publicaciones».
 *
 * No se apagan por defecto: **se quitan del registro**. `leerPortada` filtra lo
 * que no reconoce, así que borrarlos de aquí los hace desaparecer también para
 * quien los tuviera guardados en su portada de antes. Apagarlos sólo por
 * defecto habría dejado a Eugenio viéndolos igual, que es exactamente lo que ha
 * pedido que no pase.
 *
 * Y no se pierde nada de lo que hacían: **buscar** está ahora en la barra de
 * arriba, y **los catorce temas** son el menú de la izquierda, donde además
 * filtran de verdad. Estaban repetidos, y la copia de dentro de la página era
 * la peor de las dos.
 */
export type IdBloque = 'tuyo' | 'carpetas' | 'contenido';

export interface DefinicionBloque {
  id: IdBloque;
  titulo: string;
  descripcion: string;
  /** El contenido no se puede apagar: sin él la portada está vacía. */
  fijo?: boolean;
}

export const BLOQUES: DefinicionBloque[] = [
  { id: 'tuyo', titulo: 'Lo tuyo', descripcion: 'Tus tareas y lo que tienes a medias' },
  {
    id: 'carpetas',
    titulo: 'Tus carpetas',
    descripcion: 'Una tira con tus carpetas, para filtrar por ellas',
  },
  { id: 'contenido', titulo: 'Las publicaciones', descripcion: 'Lo que hay, en tarjetas', fijo: true },
];

export interface Portada {
  /** Qué plantilla se eligió, o `propia` si se ha tocado algo a mano. */
  plantilla: string;
  /** En orden. Lo que no está en la lista, no se pinta. */
  bloques: IdBloque[];
}

export interface Plantilla {
  id: string;
  titulo: string;
  descripcion: string;
  bloques: IdBloque[];
}

/*
 * LAS TRES, Y CADA UNA RESPONDE A UNA PREGUNTA DISTINTA AL ABRIR LA APP.
 * No son «tres cantidades de lo mismo»: si las tres enseñaran lo mismo en
 * distinto orden, elegir no serviría de nada.
 */
export const PLANTILLAS: Plantilla[] = [
  {
    id: 'completa',
    titulo: 'Completa',
    descripcion: 'Lo tuyo y tus carpetas encima de las publicaciones.',
    bloques: ['tuyo', 'carpetas', 'contenido'],
  },
  {
    id: 'trabajo',
    titulo: 'A trabajar',
    /* AL RETIRAR TRES BLOQUES, ÉSTA Y «COMPLETA» SE QUEDARON IGUALES
       (2026-08-24). Con las mismas piezas, elegir entre las dos no significaba
       nada — y `plantillaDe` devolvía siempre la primera, así que la de trabajo
       era imposible de reconocer. Lo cazó la prueba, no la vista.
       Ahora se distinguen por lo que de verdad las separa: aquí lo tuyo y nada
       más, para venir a hacer; en «Completa» además tus carpetas. */
    descripcion: 'Lo tuyo primero y nada más. Para venir a hacer, no a mirar.',
    bloques: ['tuyo', 'contenido'],
  },
  {
    id: 'lectura',
    titulo: 'Solo leer',
    descripcion: 'Las publicaciones y nada más. Sin filtros ni barras encima.',
    bloques: ['contenido'],
  },
];

/* POR DEFECTO, SOLO LAS PUBLICACIONES. Es lo que pidió Eugenio y además es la
 * portada que tiene sentido para quien llega: lo primero que se ve es lo que
 * hay, no los mandos para filtrarlo. */
export const PORTADA_POR_DEFECTO: Portada = {
  plantilla: 'lectura',
  bloques: ['contenido'],
};

/**
 * Lee lo guardado y devuelve algo utilizable pase lo que pase.
 *
 * DEFENSIVO A PROPÓSITO: esto viene de un `jsonb` que se puede haber escrito
 * con otra versión de la aplicación, y una portada rota deja a alguien con la
 * pantalla en blanco en su casa sin forma de arreglarlo. Se ignora lo que no
 * se reconoce y se garantiza que `contenido` esté siempre.
 */
export function leerPortada(guardado: unknown): Portada {
  const g = guardado as Partial<Portada> | undefined;
  if (!g || !Array.isArray(g.bloques)) return PORTADA_POR_DEFECTO;

  const validos = new Set(BLOQUES.map(b => b.id));
  const bloques = g.bloques.filter((b): b is IdBloque => validos.has(b as IdBloque));
  // Sin duplicados: dos veces el mismo bloque pintaría dos veces lo mismo.
  const unicos = [...new Set(bloques)];
  if (!unicos.includes('contenido')) unicos.push('contenido');

  return { plantilla: typeof g.plantilla === 'string' ? g.plantilla : 'propia', bloques: unicos };
}

/** ¿Coincide exactamente con una plantilla? Se usa para marcar cuál está puesta. */
export function plantillaDe(bloques: IdBloque[]): string {
  const igual = PLANTILLAS.find(
    p => p.bloques.length === bloques.length && p.bloques.every((b, i) => b === bloques[i]),
  );
  return igual ? igual.id : 'propia';
}
