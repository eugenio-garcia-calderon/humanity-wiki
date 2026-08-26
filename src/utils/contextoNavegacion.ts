import { useLocation, useSearchParams } from 'react-router-dom';
import { OBJETIVOS } from './objetivos';

/*
 * DÓNDE ESTOY — EL CONTEXTO DE LA NAVEGACIÓN (2026-08-25, agente de APP/UX)
 * ============================================================================
 * Eugenio: «si estoy en la página de un proyecto y le doy a una herramienta
 * inferior de crear una tarea, que la tarea se asigne directamente a ese
 * proyecto. Si le doy a crear un mapa, que se asigne a ese proyecto… Y si estoy
 * explorando la parte de movilidad y le doy a páginas, me tienen que aparecer
 * todas las páginas de movilidad. Crea esta sofisticación en cuanto a la
 * navegación de la red del conocimiento, donde todos los menús están
 * funcionales en cuanto a lo que se ve en el centro de la pantalla».
 *
 * ── LA IDEA, EN UNA FRASE ──────────────────────────────────────────────────
 * Las tres barras dejan de ser una lista de sitios y pasan a ser **verbos que
 * se aplican a donde estás**. «Páginas» no significa «todas las páginas del
 * mundo»: significa «las páginas de esto». Y «esto» es lo que hay en el centro
 * de la pantalla.
 *
 * ── DE DÓNDE SALE, Y POR QUÉ DE LA DIRECCIÓN Y NO DE UN ESTADO GLOBAL ──────
 * Sale de la URL. Es la única fuente que ya es correcta al recargar, al
 * compartir un enlace y al volver atrás con el botón del navegador. Un estado
 * global «proyecto actual» sería una segunda verdad sobre dónde estás, y esas
 * dos siempre acaban discrepando — normalmente después de un «atrás».
 *
 * ── LO QUE NO HACE ─────────────────────────────────────────────────────────
 * No adivina. Si la dirección no dice en qué proyecto ni en qué tema estás, el
 * contexto es `null` y las herramientas se comportan como siempre. Un contexto
 * inventado es peor que ninguno: crearía tareas dentro de un proyecto que quien
 * las crea no sabía que estaba mirando.
 */

export interface Contexto {
  /** El proyecto en cuya página estás, si estás en una. */
  proyecto: { slug: string } | null;
  /** El tema que estás explorando, si estás explorando uno. */
  tema: { id: string; titulo: string } | null;
}

/** Vacío, para cuando no hay nada que decir. */
export const SIN_CONTEXTO: Contexto = { proyecto: null, tema: null };

/**
 * Lee el contexto de una dirección. Está separado del enganche para poder
 * probarlo sin montar React — es la parte con reglas, y las reglas se prueban.
 */
export function contextoDe(camino: string, parametros: URLSearchParams): Contexto {
  // ── EL PROYECTO ──────────────────────────────────────────────────────────
  // `/proyectos/:slug` es la ficha de un proyecto. `/proyectos` a secas es la
  // lista de todos, y ahí NO hay contexto: estar mirando la lista de proyectos
  // no es estar dentro de ninguno.
  const enProyecto = camino.match(/^\/proyectos\/([^/?#]+)/);
  const porParametro = parametros.get('proyecto');
  const proyecto = enProyecto
    ? { slug: decodeURIComponent(enProyecto[1]) }
    : porParametro
      ? { slug: porParametro }
      : null;

  // ── EL TEMA ──────────────────────────────────────────────────────────────
  // Dos formas de estar en un tema, y las dos existen hoy: el filtro del muro
  // (`?objetivo=`) y la ficha de un objetivo (`/objetivos/:id`).
  const enObjetivo = camino.match(/^\/objetivos\/([^/?#]+)/);
  const idTema = parametros.get('objetivo') || (enObjetivo ? enObjetivo[1] : null);
  const encontrado = idTema ? OBJETIVOS.find(o => o.id === idTema) : undefined;
  const tema = encontrado ? { id: encontrado.id, titulo: encontrado.titulo } : null;

  // UN CONTEXTO A LA VEZ, y manda el proyecto. Se puede estar en un proyecto
  // filtrando por tema; en ese caso «crear una tarea» tiene que meterla en el
  // proyecto, que es lo concreto. El tema es de qué habla; el proyecto es
  // dónde vive.
  return { proyecto, tema: proyecto ? null : tema };
}

export function useContextoNavegacion(): Contexto {
  const location = useLocation();
  const [parametros] = useSearchParams();
  return contextoDe(location.pathname, parametros);
}

/**
 * Le pega el contexto a una dirección. Devuelve la dirección tal cual cuando no
 * hay contexto, así que se puede llamar siempre sin preguntar antes.
 */
export function conContexto(ruta: string, contexto: Contexto): string {
  if (!contexto.proyecto && !contexto.tema) return ruta;
  const [base, cola = ''] = ruta.split('?');
  const q = new URLSearchParams(cola);
  if (contexto.proyecto) q.set('proyecto', contexto.proyecto.slug);
  else if (contexto.tema) q.set('objetivo', contexto.tema.id);
  return `${base}?${q.toString()}`;
}
