import { slugify } from './slugify';

// ============================================================================
// Resolver un enlace de publicación (type + id del grafo) a una ruta real de
// la aplicación, cuando existe página de detalle para ese tipo de entidad.
// Se apoya en los arrays ya cargados por useHelpers() (DataContext), que
// tienen id + título/nombre de cada entidad — así no hace falta una consulta
// de red extra solo para mostrar una etiqueta legible en el muro.
// ============================================================================

export interface ResolvedLink {
  label: string;
  to: string | null;
}

/**
 * Retos que ya tienen su propio Grafo de Conocimiento: el clic lleva
 * directamente al grafo (más rico) en vez de a la ficha genérica del reto.
 * Petición del usuario, 2026-08-05, a raíz del grafo «Incendios en España».
 */
const CHALLENGE_GRAPH_SLUG: Record<string, string> = {
  R017: 'incendios-espana', // Incendios
  R021: 'ceuta-frontera-amenazada', // Presión sobre la frontera sur
};

/** A dónde debe llevar el clic en un reto concreto, en cualquier parte de la app. */
export function challengeLinkTo(challenge: { id: string; title: string }): string {
  const graphSlug = CHALLENGE_GRAPH_SLUG[challenge.id];
  return graphSlug ? `/grafos/${graphSlug}` : `/retos/${slugify(challenge.title)}`;
}

/** Ruta al grafo del reto, o null si ese reto aún no tiene grafo propio. */
export function challengeGraphTo(challengeId: string): string | null {
  const graphSlug = CHALLENGE_GRAPH_SLUG[challengeId];
  return graphSlug ? `/grafos/${graphSlug}` : null;
}

const TYPE_LABELS: Record<string, string> = {
  territories: 'Territorio', objectives: 'Objetivo', indicators: 'Indicador',
  markers: 'Marcador', metrics: 'Métrica', challenges: 'Reto', causes: 'Causa',
  solutions: 'Solución', needs: 'Necesidad', products: 'Producto', demands: 'Demanda',
  initiatives: 'Iniciativa', success_cases: 'Caso de éxito', organizations: 'Organización',
  users: 'Persona', publications: 'Publicación', projects: 'Proyecto',
};

export function resolveEntityLink(type: string, id: string, helpers: any): ResolvedLink {
  const typeLabel = TYPE_LABELS[type] || type;
  switch (type) {
    case 'challenges': {
      const c = helpers.challenges?.find((x: any) => x.id === id);
      return c ? { label: c.title, to: challengeLinkTo(c) } : { label: `${typeLabel} ${id}`, to: null };
    }
    case 'solutions': {
      const s = helpers.solutions?.find((x: any) => x.id === id);
      return s ? { label: s.title, to: `/soluciones/${slugify(s.title)}` } : { label: `${typeLabel} ${id}`, to: null };
    }
    case 'indicators': {
      const ind = helpers.indicators?.find((x: any) => x.id === id);
      // IndicatorDetail.tsx acepta el id crudo directamente, sin slugificar.
      return ind ? { label: ind.name, to: `/indicadores/${id}` } : { label: `${typeLabel} ${id}`, to: null };
    }
    case 'territories': {
      const t = helpers.territories?.find((x: any) => x.id === id);
      return t ? { label: t.name, to: `/mapa?territorio=${slugify(t.name)}` } : { label: `${typeLabel} ${id}`, to: null };
    }
    case 'objectives': {
      const o = helpers.objectives?.find((x: any) => x.id === id);
      return o ? { label: o.title, to: `/objetivos/${o.title.toLowerCase()}` } : { label: `${typeLabel} ${id}`, to: null };
    }
    case 'organizations': {
      const o = helpers.organizations?.find((x: any) => x.id === id);
      return o ? { label: o.name, to: `/organizaciones/${slugify(o.name)}` } : { label: `${typeLabel} ${id}`, to: null };
    }
    case 'projects': {
      const p = helpers.projects?.find((x: any) => x.id === id);
      return p ? { label: p.name, to: `/proyectos/${slugify(p.name)}` } : { label: `${typeLabel} ${id}`, to: null };
    }
    case 'users':
      return { label: 'Persona', to: `/personas/${id}` };
    default:
      return { label: `${typeLabel}`, to: null };
  }
}
