// ============================================================================
// LAS PALABRAS DE CADA TEMA, SIN REACT (2026-10-05)
// ============================================================================
// The stems `objetivos.ts` uses to tell whether a text talks about a theme,
// moved here so the SERVER can use the same list (`src/server/feedTema.ts`):
// `objetivos.ts` imports lucide icons and cannot be loaded by Node. One list,
// read from both sides — two copies would drift the first time someone adds
// a word. The title is here too for the same reason.

export const TEMAS_SERVIDOR: Record<string, { titulo: string; palabras: string[] }> = {
  O001: { titulo: 'AGUA', palabras: ['agua', 'hidric', 'riego', 'acuifer', 'potable', 'saneamiento', 'sequia', 'rio', 'embalse'] },
  O002: { titulo: 'ALIMENTACIÓN', palabras: ['aliment', 'comida', 'nutricion', 'cultivo', 'agricultura', 'huerto', 'cosecha', 'hambre'] },
  O003: { titulo: 'VIVIENDA', palabras: ['vivienda', 'casa', 'hogar', 'alquiler', 'construccion', 'habitab', 'alojamiento'] },
  O004: { titulo: 'SALUD', palabras: ['salud', 'medic', 'sanitar', 'hospital', 'enfermedad', 'bienestar', 'farmac'] },
  O005: { titulo: 'CONVIVENCIA', palabras: ['convivencia', 'comunidad', 'vecin', 'paz', 'conflicto', 'seguridad', 'cohesion'] },
  O006: { titulo: 'ECOSISTEMAS', palabras: ['ecosistema', 'bosque', 'biodiversidad', 'fauna', 'flora', 'natural', 'conservacion', 'incendio'] },
  O007: { titulo: 'EDUCACIÓN', palabras: ['educacion', 'escuela', 'aprendizaje', 'formacion', 'curso', 'alumn', 'ensenanza'] },
  O008: { titulo: 'MOVILIDAD', palabras: ['movilidad', 'transporte', 'coche', 'bici', 'camion', 'tren', 'viaje', 'carretera'] },
  O009: { titulo: 'ENERGÍA', palabras: ['energia', 'solar', 'electric', 'bateria', 'fotovoltaic', 'eolic', 'combustible', 'renovable'] },
  O010: { titulo: 'TECNOLOGÍA', palabras: ['tecnolog', 'software', 'digital', 'datos', 'internet', 'robot', 'inteligencia artificial'] },
  O011: { titulo: 'EMPLEO', palabras: ['empleo', 'trabajo', 'salario', 'laboral', 'oficio', 'contrat'] },
  O012: { titulo: 'GOBERNANZA', palabras: ['gobernanza', 'gobierno', 'politic', 'ley', 'norma', 'participacion', 'democra', 'institucion'] },
  O013: { titulo: 'ECONOMÍA', palabras: ['economia', 'dinero', 'inversion', 'financ', 'coste', 'precio', 'mercado', 'presupuesto'] },
  O014: { titulo: 'CULTURA', palabras: ['cultura', 'arte', 'musica', 'patrimonio', 'literatura', 'cine', 'tradicion'] },
  O015: { titulo: 'ESPIRITUALIDAD', palabras: ['espiritual', 'meditacion', 'contemplat', 'religion', 'religios', 'fe ', 'sentido de la vida',
               'conciencia', 'mindfulness', 'sagrado', 'ritual', 'oracion', 'yoga', 'duelo', 'proposito'] },
};

export const ES_TEMA = (id: unknown): id is string => typeof id === 'string' && id in TEMAS_SERVIDOR;
