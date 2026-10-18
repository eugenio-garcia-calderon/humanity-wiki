// ============================================================================
// HOW A STORED CELL VALUE READS (moved here from `components/tablas/Celda.tsx`
// on 2026-10-18)
// ============================================================================
// Pure, no React: the grid, the published page and the server-side HTML of a
// product sheet (Wikiproducts) all print a value the same way. If each had its
// own copy, «15 %» on the screen and «0.15» in the HTML Google reads would be
// the same datum saying two different things.

export type Celda =
  | { estado: 'vacia' }
  | { estado: 'ok'; valor: any }
  | { estado: 'sin_calcular' }
  | { estado: 'error'; mensaje: string };

export type Columna = {
  id: string; nombre: string; tipo: string;
  opciones?: Array<{ id: string; label: string; color?: string | null }>;
  config?: any;
};

/** Los tipos que no se escriben a mano: se calculan o se eligen de una lista. */
const CALCULADOS = new Set(['formula', 'agregado', 'condicional']);
const APUNTAN = new Set(['persona', 'proyecto', 'publicacion', 'relacion']);
const FICHEROS = new Set(['imagen', 'video', 'documento']);

/** Cómo se LEE un valor ya guardado. El formato vive aquí y no en el servidor
 *  porque es cosa de quien mira: el mismo 0,15 es «15 %» para una persona y un
 *  número para una suma. */
export function formatear(c: Celda, col: Columna, extra?: { apuntados?: any[]; archivos?: any[] }): string {
  if (c.estado !== 'ok') return '';
  const v = c.valor;
  // The buy button as text (cards, lists): its price. The button itself is
  // drawn by the grid and the gallery.
  if (col.tipo === 'compra') {
    return v?.precio_centimos == null ? '' : new Intl.NumberFormat('es-ES', { style: 'currency', currency: v.moneda || 'EUR' }).format(v.precio_centimos / 100);
  }

  // UNA COLUMNA CALCULADA NO TIENE TIPO PROPIO, así que no sabría cómo
  // enseñarse: multiplicar euros por unidades daba «360000» pelado. Se mira el
  // formato que haya elegido quien la creó, y si no eligió ninguno, al menos se
  // separan los miles — un número de siete cifras sin separar no lo lee nadie.
  if (CALCULADOS.has(col.tipo)) {
    if (typeof v === 'boolean') return v ? 'Sí' : 'No';
    if (typeof v !== 'number') return String(v);
    const f = col.config?.formato;
    if (f === 'moneda') {
      return new Intl.NumberFormat('es-ES', { style: 'currency', currency: col.config?.moneda || 'EUR' }).format(v);
    }
    if (f === 'porcentaje') {
      return new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 2 }).format(v);
    }
    if (f === 'duracion') {
      const h = Math.floor(v / 3600), m = Math.floor((v % 3600) / 60);
      return `${h}:${String(m).padStart(2, '0')}`;
    }
    return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 4 }).format(v);
  }

  switch (col.tipo) {
    case 'moneda': {
      const m = col.config?.moneda || 'EUR';
      return new Intl.NumberFormat('es-ES', { style: 'currency', currency: m }).format(Number(v));
    }
    case 'porcentaje':
      return new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: col.config?.decimales ?? 2 }).format(Number(v));
    case 'numero':
      return new Intl.NumberFormat('es-ES', { maximumFractionDigits: col.config?.decimales ?? 10 }).format(Number(v));
    case 'duracion': {
      const s = Number(v); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60);
      return col.config?.formato === 'h:mm:ss'
        ? `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
        : `${h}:${String(m).padStart(2, '0')}`;
    }
    case 'fecha':
      // Se parte la cadena en vez de usar `new Date`: construir una fecha desde
      // «2026-07-14» la interpreta en UTC y en España se ve el día 13.
      return String(v).split('-').reverse().join('/');
    case 'casilla': return v ? 'Sí' : 'No';
    case 'seleccion': return col.opciones?.find(o => o.id === v)?.label ?? String(v);
    case 'seleccion_multiple':
      return (Array.isArray(v) ? v : [v]).map(id => col.opciones?.find(o => o.id === id)?.label ?? id).join(', ');
    default:
      if (APUNTAN.has(col.tipo)) return (extra?.apuntados || []).map(a => a.etiqueta).join(', ');
      if (FICHEROS.has(col.tipo)) return (extra?.archivos || []).map(a => a.nombre).join(', ');
      return String(v);
  }
}
