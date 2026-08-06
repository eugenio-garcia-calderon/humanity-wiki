// ============================================================================
// Paleta SEMÁNTICA de las relaciones (decisión del usuario, 2026-08-06)
// ============================================================================
// Cada concepto tiene SIEMPRE el mismo color en toda la plataforma: historia
// y contexto en azules, causas en amarillo, apoyo/soluciones en verde,
// conflicto en rojo, matiz en naranja. `color` es el trazo de las flechas;
// `bg`/`text` pintan el círculo de la relación.
// Vive aquí (y no en una página) porque la comparten el lienzo del grafo y
// la Esfera de Conocimiento — el mismo lenguaje visual en ambos sitios.

export interface RelationStyle {
  color: string;
  bg: string;
  text: string;
  label: string;
}

export const RELATION_STYLE: Record<string, RelationStyle> = {
  contexto:   { color: '#2563eb', bg: '#2563eb', text: '#ffffff', label: 'contexto' },
  dato:       { color: '#0ea5e9', bg: '#0ea5e9', text: '#ffffff', label: 'dato' },
  fuente:     { color: '#1e40af', bg: '#1e40af', text: '#ffffff', label: 'fuente' },
  causa:      { color: '#eab308', bg: '#facc15', text: '#422006', label: 'causa' },
  apoya:      { color: '#16a34a', bg: '#16a34a', text: '#ffffff', label: 'apoya' },
  contradice: { color: '#dc2626', bg: '#dc2626', text: '#ffffff', label: 'contradice' },
  matiza:     { color: '#f97316', bg: '#f97316', text: '#ffffff', label: 'matiza' },
};

export const RELATIONS = Object.keys(RELATION_STYLE);

/** Estilo de una relación, con `contexto` como respaldo seguro. */
export const relStyle = (relation?: string | null): RelationStyle =>
  RELATION_STYLE[relation || ''] || RELATION_STYLE.contexto;
