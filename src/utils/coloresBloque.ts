// ============================================================================
// LOS COLORES DE UN BLOQUE (2026-09-30)
// ============================================================================
// Como en Notion: un color de texto o un color de fondo por bloque, de una
// lista CERRADA. Un color libre acaba en texto ilegible sobre su propio fondo
// (es la misma decisión que con los tonos de `aviso`). Se guarda la clave
// —`rojo`, `fondo-rojo`— y no la clase, para poder cambiar el tono sin migrar
// páginas.

export const COLORES = [
  { clave: 'gris', nombre: 'Gris' },
  { clave: 'marron', nombre: 'Marrón' },
  { clave: 'naranja', nombre: 'Naranja' },
  { clave: 'amarillo', nombre: 'Amarillo' },
  { clave: 'verde', nombre: 'Verde' },
  { clave: 'azul', nombre: 'Azul' },
  { clave: 'morado', nombre: 'Morado' },
  { clave: 'rosa', nombre: 'Rosa' },
  { clave: 'rojo', nombre: 'Rojo' },
] as const;

// Escritas enteras (no montadas con plantillas) para que Tailwind las vea.
const TEXTO: Record<string, string> = {
  gris: 'text-slate-500', marron: 'text-amber-800', naranja: 'text-orange-600',
  amarillo: 'text-yellow-600', verde: 'text-emerald-600', azul: 'text-sky-600',
  morado: 'text-violet-600', rosa: 'text-pink-600', rojo: 'text-rose-600',
};
const FONDO: Record<string, string> = {
  gris: 'bg-slate-100', marron: 'bg-amber-100/70', naranja: 'bg-orange-100',
  amarillo: 'bg-yellow-100', verde: 'bg-emerald-100', azul: 'bg-sky-100',
  morado: 'bg-violet-100', rosa: 'bg-pink-100', rojo: 'bg-rose-100',
};

/** Las clases de un color guardado; cadena vacía si no hay o no se conoce. */
export function claseColor(color?: string | null): string {
  if (!color) return '';
  if (color.startsWith('fondo-')) {
    const f = FONDO[color.slice(6)];
    return f ? `${f} rounded-md px-2 py-0.5` : '';
  }
  return TEXTO[color] || '';
}

/** ══ EL COLOR DE UN BLOQUE QUE PINTA SUS PROPIOS COLORES (2026-10-01) ═══
 *  Una base de datos (galería o tabla) tiene fondo blanco y textos grises
 *  propios, así que el color puesto en su envoltorio no se veía: Eugenio,
 *  «coges morado o verde y no cambia nada». Se le pasa el color y ella
 *  decide dónde va: el de texto tiñe su nombre y los títulos de las
 *  tarjetas; el de fondo tiñe el marco (las tarjetas siguen blancas para que
 *  se lean). */
export function tonoDe(color?: string | null): { texto: string; fondo: string } {
  if (!color) return { texto: '', fondo: '' };
  if (color.startsWith('fondo-')) return { texto: '', fondo: FONDO[color.slice(6)] || '' };
  return { texto: TEXTO[color] || '', fondo: '' };
}

/** Los bloques que reciben el color en vez de llevarlo en el envoltorio. */
export const PINTAN_SU_COLOR = new Set(['basedatos']);
