// ============================================================================
// TABLAS · LOS TIPOS DE CELDA
// ============================================================================
// Un tipo es dos cosas: saber ACEPTAR o RECHAZAR lo que llega, y saber en qué
// forma se guarda. Nada más. Cómo se pinta es del cliente, y cómo se calcula es
// de la fase 6.
//
// LA REGLA QUE NO SE ROMPE: se guarda el valor TIPADO, nunca el texto que se
// escribió. Un porcentaje se guarda 0,15 y no «15 %»; una duración se guarda en
// segundos y no «1:30». El formato es del que pinta. Si se guardara el texto ya
// formateado, la primera suma de la fase 6 tendría que analizarlo para volver a
// sacar el número, y ahí es donde empiezan los intérpretes que nadie quería.
//
// Y LA OTRA: `undefined` significa VACIAR la celda, y es distinto de `0`, de
// `false` y de `''`. Esa distinción es la que sostiene los tres estados.
import type { Celda } from './celdas';

export const TIPOS = [
  'texto', 'numero', 'fecha', 'seleccion', 'casilla',
  'texto_largo', 'url', 'email', 'telefono',
  'moneda', 'porcentaje', 'duracion', 'valoracion',
  'seleccion_multiple',
  // Fase 2: los que APUNTAN. No pasan por `tipar()` — su valor no vive en el
  // jsonb de la fila sino en `bd_enlaces`, y la ruta los desvía antes. Están en
  // esta lista porque es la que dice qué tipos de columna existen.
  'persona', 'proyecto', 'publicacion', 'relacion',
  // Fase 3: los que llevan FICHEROS. Tampoco pasan por `tipar()`: sus bytes
  // viven en `/data/uploads` y su ficha en `archivos`, igual que los del chat y
  // los del editor. Ver `bd/ficheros.ts`.
  'imagen', 'video', 'documento',
  // Fases 5-8: las que se CALCULAN. No guardan nada — su valor sale de
  // `bd/calculo.ts` al leer. Guardar el resultado daría dos verdades: lo
  // guardado y lo que sale de recalcular.
  'formula', 'agregado', 'condicional',
] as const;

export type Tipo = typeof TIPOS[number];

export type Opcion = { id: string; label: string; color?: string | null };
export type Resultado = { ok: true; valor: any } | { ok: false; error: string };

const ok = (valor: any): Resultado => ({ ok: true, valor });
const mal = (error: string): Resultado => ({ ok: false, error });

/** El número que hay detrás de lo que sea que hayan escrito, o `null`.
 *
 *  Acepta la coma decimal española y los puntos de millar, porque el usuario
 *  escribe «1.500,50» y rechazárselo por el formato de su propio idioma sería
 *  trasladarle un problema nuestro. `Number('')` vale 0, por eso el vacío se
 *  resuelve ANTES de llegar aquí: si no, una celda vacía se guardaría como cero
 *  y ya no habría forma de distinguir «no lo sé» de «es cero». */
function aNumero(bruto: any): number | null {
  if (typeof bruto === 'number') return Number.isFinite(bruto) ? bruto : null;
  const t = String(bruto).trim().replace(/\s/g, '');
  if (!t) return null;
  // «1.500,50» → «1500.50».  «1500.50» se deja como está.
  const normal = /,\d{1,8}$/.test(t) ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

/** AAAA-MM-DD, sin hora y sin zona horaria.
 *
 *  Una fecha de vencimiento no tiene hora, y arrastrar zona horaria hace que la
 *  misma fecha se vea distinta según quién la mire — el fallo clásico de que un
 *  plazo del día 14 aparezca como día 13 a las 23:00 para media oficina. */
function aFecha(bruto: any): string | null {
  const t = String(bruto).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (iso) {
    const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return null;
    // Comprueba que la fecha EXISTE: «2026-02-31» pasa la expresión regular y
    // `Date` la convierte en el 3 de marzo sin decir nada.
    return d.toISOString().slice(0, 10) === `${iso[1]}-${iso[2]}-${iso[3]}`
      ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
  }
  // «14/07/2026», que es como se escribe aquí.
  const es = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (es) {
    const [, d, m, a] = es;
    const p = `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    return aFecha(p);
  }
  return null;
}

/** «1:30» → 5400 segundos. También acepta «1:30:00» y un número de segundos. */
function aDuracion(bruto: any): number | null {
  if (typeof bruto === 'number') return Number.isFinite(bruto) && bruto >= 0 ? Math.round(bruto) : null;
  const t = String(bruto).trim();
  if (!t) return null;
  const partes = t.split(':');
  if (partes.length === 1) { const n = aNumero(t); return n === null || n < 0 ? null : Math.round(n); }
  if (partes.length > 3) return null;
  const nums = partes.map(p => Number(p.trim()));
  if (nums.some(n => !Number.isFinite(n) || n < 0)) return null;
  const [a, b, c] = partes.length === 3 ? nums : [0, nums[0], nums[1]];
  if (partes.length === 3 && (b >= 60 || c >= 60)) return null;
  if (partes.length === 2 && nums[1] >= 60) return null;
  return partes.length === 3 ? a * 3600 + b * 60 + c : nums[0] * 3600 + nums[1] * 60;
}

// Deliberadamente permisiva: la expresión regular «perfecta» para un correo no
// existe, y una demasiado estricta rechaza direcciones válidas raras — que es
// peor que aceptar una inválida, porque el usuario no puede hacer nada al
// respecto. Se comprueba la forma, no la existencia.
const EMAIL = /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/;

/**
 * Valida y tipa un valor para una columna.
 *
 * `valor === undefined` en la respuesta significa BORRAR la celda.
 */
export function tipar(tipo: Tipo, bruto: any, opciones: Opcion[] = [], config: any = {}): Resultado {
  // Vaciar. `false` y `0` NO entran aquí: son valores, no ausencias.
  if (bruto === null || bruto === undefined || bruto === '') return ok(undefined);
  // Una lista vacía también es vaciar, en selección múltiple.
  if (Array.isArray(bruto) && bruto.length === 0) return ok(undefined);

  switch (tipo) {
    case 'texto':
      return ok(String(bruto).replace(/\s+/g, ' ').trim().slice(0, 2000));

    case 'texto_largo':
      // Aquí SÍ se conservan los saltos de línea: es la diferencia con `texto`.
      return ok(String(bruto).slice(0, 100000));

    case 'numero': {
      const n = aNumero(bruto);
      if (n === null) return mal('No es un número.');
      const dec = Number(config?.decimales);
      return ok(Number.isFinite(dec) && dec >= 0 && dec <= 8 ? Number(n.toFixed(dec)) : n);
    }

    case 'moneda': {
      const n = aNumero(String(bruto).replace(/[€$£¥]/g, ''));
      if (n === null) return mal('No es una cantidad.');
      const dec = Number.isFinite(Number(config?.decimales)) ? Number(config.decimales) : 2;
      return ok(Number(n.toFixed(Math.min(Math.max(dec, 0), 8))));
    }

    case 'porcentaje': {
      // Se guarda la FRACCIÓN: «15 %» y «15» son 0,15. Guardar 15 haría que la
      // primera media de la fase 6 saliera cien veces mayor sin que nadie lo
      // notara hasta mirar el resultado.
      const t = String(bruto).trim();
      const n = aNumero(t.replace('%', ''));
      if (n === null) return mal('No es un porcentaje.');
      return ok(n / 100);
    }

    case 'duracion': {
      const s = aDuracion(bruto);
      if (s === null) return mal('No es una duración. Prueba «1:30» o «1:30:00».');
      return ok(s);
    }

    case 'valoracion': {
      const n = aNumero(bruto);
      if (n === null) return mal('No es una valoración.');
      const max = Number.isFinite(Number(config?.maximo)) ? Number(config.maximo) : 5;
      const v = Math.round(n);
      if (v < 0 || v > max) return mal(`La valoración va de 0 a ${max}.`);
      return ok(v);
    }

    case 'fecha': {
      const f = aFecha(bruto);
      if (f === null) return mal('La fecha tiene que ser AAAA-MM-DD o DD/MM/AAAA.');
      return ok(f);
    }

    case 'casilla':
      return ok(bruto === true || bruto === 'true' || bruto === 1 || bruto === '1');

    case 'url': {
      const t = String(bruto).trim();
      // Se acepta «humanity.wiki» y se guarda «https://humanity.wiki»: pedirle
      // el protocolo al usuario es pedirle que sepa qué es un protocolo.
      const conEsquema = /^https?:\/\//i.test(t) ? t : `https://${t}`;
      try {
        const u = new URL(conEsquema);
        if (!u.hostname.includes('.')) return mal('No parece una dirección web.');
        return ok(u.toString());
      } catch { return mal('No parece una dirección web.'); }
    }

    case 'email': {
      const t = String(bruto).trim().toLowerCase();
      if (!EMAIL.test(t)) return mal('No parece un correo.');
      return ok(t);
    }

    case 'telefono': {
      // Se conserva TAL CUAL salvo espacios de más: los teléfonos del mundo no
      // caben en un formato, y «normalizarlos» rompe extensiones y prefijos.
      const t = String(bruto).trim().replace(/\s+/g, ' ');
      if (!/^[+()\d][\d\s()\-.]{4,24}$/.test(t)) return mal('No parece un teléfono.');
      return ok(t);
    }

    case 'seleccion': {
      // SE GUARDA EL `id`, NUNCA EL TEXTO. Es lo que hace que renombrar una
      // opción no cambie el significado de las filas que la usan.
      const id = String(bruto);
      if (!opciones.some(o => o?.id === id)) return mal('Esa opción no existe en la columna.');
      return ok(id);
    }

    case 'seleccion_multiple': {
      const lista = Array.isArray(bruto) ? bruto : [bruto];
      const ids = lista.map(String);
      const desconocida = ids.find(id => !opciones.some(o => o?.id === id));
      if (desconocida) return mal('Hay una opción que no existe en la columna.');
      // Sin repetidos y en el orden de la columna, no en el que llegaron: así
      // dos filas con las mismas etiquetas se ven iguales.
      const unicos = [...new Set(ids)];
      const orden = new Map(opciones.map((o, i) => [o.id, i]));
      unicos.sort((a, b) => (orden.get(a) ?? 1e9) - (orden.get(b) ?? 1e9));
      return ok(unicos);
    }

    case 'formula': case 'agregado': case 'condicional':
      return mal('Esta columna se calcula sola: no se puede escribir en ella.');

    case 'imagen': case 'video': case 'documento':
      return mal('Esta columna guarda archivos: no se escribe como un valor.');

    case 'persona': case 'proyecto': case 'publicacion': case 'relacion':
      // No debería llegar aquí nunca: la ruta desvía las columnas que apuntan a
      // `bd/enlaces.ts` antes de llamar a esta función. Si llega, es un fallo
      // nuestro y se dice, en vez de guardar el identificador como si fuera
      // texto y crear una celda que parece un enlace y no lo es.
      return mal('Esta columna guarda enlaces: no se escribe como un valor.');

    default:
      return mal('Tipo de columna desconocido.');
  }
}

/** Lo que hay guardado, en forma de celda etiquetada. Nunca un `null` pelado. */
export function aCelda(valor: any): Celda {
  return valor === undefined || valor === null ? { estado: 'vacia' } : { estado: 'ok', valor };
}
