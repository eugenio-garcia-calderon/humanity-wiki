import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { type Cabecera, tituloPagina, ladoIcono, letraDescripcion } from './CabeceraPagina';

// ============================================================================
// LA CABECERA POR ELEMENTOS (2026-10-20, Eugenio)
// ============================================================================
// «Que se puedan ordenar los elementos —el icono, el título, la descripción,
// la imagen, los botones, las propiedades— pinchando y arrastrando, como las
// propiedades; que se pueda cambiar el tamaño de cada uno y su visibilidad.
// Por defecto: los botones a la derecha, de derecha a izquierda; la portada
// DEBAJO del título, la descripción y el icono, abajo a la izquierda; y las
// propiedades a la derecha, justo debajo de los botones.»
//
// La cabecera son dos columnas (izquierda y derecha) con una lista de
// elementos cada una, en orden. Se guarda en `cabecera.elementos`. Esta pieza
// sólo COLOCA: quien la usa (el editor, la página publicada, la vista previa
// del creador del menú) le da cada elemento ya pintado. Sin ganchos: el
// servidor la pinta dentro del HTML (`CabeceraLectura`).
//
// ── LAS PÁGINAS DE ANTES NO CAMBIAN SOLAS ───────────────────────────────────
// Una web publicada que cambia de forma sin que su autor toque nada es un
// susto. El diseño nuevo vale para las páginas creadas desde hoy
// (`cabecera.v = 2`, lo pone el servidor al crearlas y el editor al abrir una
// recién hecha) y para las que lo elijan en «Diseño de la cabecera» (al mover
// o cambiar un elemento se guarda `elementos`). Las demás siguen con la
// disposición de siempre (`LayoutCabecera`).

export type IdElemento = 'icono' | 'titulo' | 'descripcion' | 'portada' | 'botones' | 'propiedades';
export type TallaElemento = 'xs' | 's' | 'm' | 'l' | 'xl';
export type Elemento = { id: IdElemento; col: 'izq' | 'der'; oculto?: boolean; talla?: TallaElemento };

export const NOMBRES_ELEMENTOS: Record<IdElemento, string> = {
  icono: 'Icono', titulo: 'Título', descripcion: 'Descripción', portada: 'Imagen de portada', botones: 'Botones', propiedades: 'Propiedades',
};
export const TALLAS: TallaElemento[] = ['xs', 's', 'm', 'l', 'xl'];

// LA PORTADA A LA IZQUIERDA, PEQUEÑA (2026-10-21, Eugenio: «a partir de ahora la
// portada a la izquierda como una imagen, más pequeña por defecto; un híbrido
// entre un icono y una imagen»). Va la primera: delante del título, a su lado.
export const ELEMENTOS_POR_DEFECTO: Elemento[] = [
  { id: 'portada', col: 'izq' }, { id: 'icono', col: 'izq' }, { id: 'titulo', col: 'izq' }, { id: 'descripcion', col: 'izq' },
  { id: 'botones', col: 'der' }, { id: 'propiedades', col: 'der' },
];

/** ¿Va la portada al lado del título (justo delante del icono, el título o la descripción, en su columna)? */
export function portadaAlLado(elementos: Elemento[]): boolean {
  const i = elementos.findIndex(e => e.id === 'portada');
  if (i < 0) return false;
  const sig = elementos.slice(i + 1).find(e => e.col === elementos[i].col);
  return !!sig && ['icono', 'titulo', 'descripcion'].includes(sig.id);
}

/** Las páginas creadas desde aquí nacen con el diseño nuevo (el editor les pone `v = 2` al abrirlas). */
export const DISENO_NUEVO_DESDE = '2026-10-21T00:00:00Z';

/** ¿Esta página usa la cabecera por elementos? Las de las entradas de una base de
 *  datos, también si no dicen nada (2026-10-21): son las de la red de conocimiento. */
export const usaDisenoNuevo = (c: Cabecera | undefined, esFila = false) =>
  c?.v === 2 || Array.isArray(c?.elementos) || (esFila && c?.v === undefined);

/** Los elementos guardados, completados con los que falten (en su sitio por defecto). */
export function elementosDe(c: Cabecera | undefined): Elemento[] {
  const guardados = (Array.isArray(c?.elementos) ? c!.elementos : [])
    .filter((e: any) => e && NOMBRES_ELEMENTOS[e.id as IdElemento] && (e.col === 'izq' || e.col === 'der')) as Elemento[];
  const vistos = new Set(guardados.map(e => e.id));
  const unicos = guardados.filter((e, i) => guardados.findIndex(x => x.id === e.id) === i);
  return [...unicos, ...ELEMENTOS_POR_DEFECTO.filter(e => !vistos.has(e.id))];
}

/** ¿Se queda arriba al bajar? Por defecto sí en el diseño nuevo y no en el de antes. */
export const cabeceraFija = (c: Cabecera | undefined, esFila = false) => (typeof c?.fija === 'boolean' ? c.fija : usaDisenoNuevo(c, esFila));

// ── LOS TAMAÑOS ────────────────────────────────────────────────────────────
// Sin talla elegida, el número de antes (la barra de «Tamaño del título»…),
// así una página que pase al diseño nuevo conserva sus tamaños.
const T = <V,>(t: TallaElemento | undefined, tabla: Record<TallaElemento, V>, def: V) => (t ? tabla[t] : def);

// EN UN TELÉFONO, TOPES (2026-10-20, bot evaluador: «la cabecera ocupa casi
// media pantalla en móvil»): el título como mucho 26 px, el icono 40, la
// descripción 16 y la portada 160 de alto.
export const tamTitulo = (c: Cabecera | undefined, e?: Elemento, esMovil = false) => {
  const t = T(e?.talla, { xs: 18, s: 22, m: 28, l: 36, xl: 48 }, tituloPagina(c));
  return esMovil ? Math.min(t, 26) : t;
};
export const tamIcono = (c: Cabecera | undefined, esMovil: boolean, e?: Elemento) => {
  const t = T(e?.talla, { xs: 28, s: 36, m: 48, l: 64, xl: 88 }, Math.min(ladoIcono(c, esMovil), 64));
  return esMovil ? Math.min(t, 40) : t;
};
export const tamDescripcion = (c: Cabecera | undefined, esMovil: boolean, e?: Elemento) => {
  const t = T(e?.talla, { xs: 13, s: 15, m: 17, l: 20, xl: 24 }, Math.min(letraDescripcion(c, esMovil), 20));
  return esMovil ? Math.min(t, 16) : t;
};
/** El alto MÁXIMO de la portada (la imagen nunca se recorta). */
/** La portada al lado del título: un cuadrado entre icono e imagen. «La M, mucho más pequeña.» */
export const ladoPortada = (e?: Elemento, esMovil = false) => {
  const t = T(e?.talla, { xs: 64, s: 88, m: 120, l: 168, xl: 240 }, 120);
  return esMovil ? Math.min(t, 96) : t;
};
export const altoPortada = (c: Cabecera | undefined, e?: Elemento, esMovil = false) => {
  const porTamano = typeof c?.tamano === 'number' ? Math.round(120 + ((Math.min(80, Math.max(20, c.tamano)) - 20) / 60) * 300) : 220;
  const t = T(e?.talla, { xs: 110, s: 160, m: 220, l: 300, xl: 420 }, porTamano);
  return esMovil ? Math.min(t, 160) : t;
};
export const tallaBotones = (c: Cabecera | undefined, e?: Elemento): TallaElemento =>
  e?.talla || (c?.botonesTalla === 's' ? 's' : c?.botonesTalla === 'l' ? 'l' : 'm');
export const zoomPropiedades = (e?: Elemento) => T(e?.talla, { xs: 0.78, s: 0.88, m: 1, l: 1.12, xl: 1.25 }, 1);

/**
 * Coloca los elementos en sus dos columnas. `piezas[id]` es el elemento ya
 * pintado o `null` si no hay (sin descripción, sin portada…): un hueco vacío
 * no ocupa nada, y una columna vacía deja toda la anchura a la otra.
 * El icono justo antes del título va A SU LADO (lo más compacto); si el título
 * va seguido de la descripción, los dos juntos a la derecha del icono.
 */
export function CabeceraElementos({ elementos, piezas, editando, iconoEncima }: {
  elementos: Elemento[];
  piezas: Partial<Record<IdElemento, ReactNode | null>>;
  /** En el editor lo oculto se ve atenuado (para poder escribirlo); al publicar no está. */
  editando?: boolean;
  iconoEncima?: boolean;
}) {
  const envolver = (x: Elemento, n: ReactNode) => (
    <div key={x.id} data-elemento-cabecera={x.id} className={cn('min-w-0', editando && x.oculto && 'opacity-40')}
      title={editando && x.oculto ? 'Oculto al publicar' : undefined}>{n}</div>
  );
  const columna = (col: 'izq' | 'der') => {
    const lista = elementos.filter(e => e.col === col && piezas[e.id] != null && (editando || !e.oculto));
    const out: ReactNode[] = [];
    for (let i = 0; i < lista.length; i++) {
      const e = lista[i];
      // LA PORTADA AL LADO: delante del icono, el título y la descripción que la siguen.
      if (e.id === 'portada' && ['icono', 'titulo', 'descripcion'].includes(lista[i + 1]?.id)) {
        let j = i + 1;
        while (j < lista.length && ['icono', 'titulo', 'descripcion'].includes(lista[j].id)) j++;
        out.push(
          <div key="portada-al-lado" className={cn('flex min-w-0 items-center gap-4 sm:gap-5', col === 'der' && 'flex-row-reverse text-right')}>
            <div data-elemento-cabecera="portada" className={cn('shrink-0', editando && e.oculto && 'opacity-40')}>{piezas.portada}</div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">{grupoTitulo(lista.slice(i + 1, j), col)}</div>
          </div>,
        );
        i = j - 1;
        continue;
      }
      if (e.id === 'icono' && !iconoEncima && lista[i + 1]?.id === 'titulo') {
        const t = lista[i + 1];
        const d = lista[i + 2]?.id === 'descripcion' ? lista[i + 2] : null;
        out.push(
          <div key="icono-titulo" className={cn('flex min-w-0 items-center gap-3', col === 'der' && 'flex-row-reverse text-right')}>
            <div data-elemento-cabecera="icono" className={cn('shrink-0', editando && e.oculto && 'opacity-40')}>{piezas.icono}</div>
            <div className="min-w-0 flex-1">
              {envolver(t, piezas.titulo)}
              {d && envolver(d, piezas.descripcion)}
            </div>
          </div>,
        );
        i += d ? 2 : 1;
        continue;
      }
      out.push(envolver(e, piezas[e.id]));
    }
    return out;
  };
  /** Icono, título y descripción seguidos: el icono a su lado (o encima). */
  const grupoTitulo = (lista: Elemento[], col: 'izq' | 'der') => {
    const out: ReactNode[] = [];
    for (let i = 0; i < lista.length; i++) {
      const e = lista[i];
      if (e.id === 'icono' && !iconoEncima && lista[i + 1]?.id === 'titulo') {
        const t = lista[i + 1];
        const d = lista[i + 2]?.id === 'descripcion' ? lista[i + 2] : null;
        out.push(
          <div key="icono-titulo" className={cn('flex min-w-0 items-center gap-3', col === 'der' && 'flex-row-reverse text-right')}>
            <div data-elemento-cabecera="icono" className={cn('shrink-0', editando && e.oculto && 'opacity-40')}>{piezas.icono}</div>
            <div className="min-w-0 flex-1">{envolver(t, piezas.titulo)}{d && envolver(d, piezas.descripcion)}</div>
          </div>,
        );
        i += d ? 2 : 1;
        continue;
      }
      out.push(envolver(e, piezas[e.id]));
    }
    return out;
  };
  const izq = columna('izq');
  const der = columna('der');
  if (!der.length) return <div className="flex flex-col gap-3">{izq}</div>;
  if (!izq.length) return <div className="flex flex-col items-end gap-3 text-right">{der}</div>;
  // Las dos columnas según el ancho de la PROPIA cabecera (consulta de
  // contenedor), no de la ventana: así la vista previa «Teléfono» del creador
  // del menú se ve como en un teléfono.
  return (
    <div className="@container">
      <div className="flex flex-col gap-4 @xl:grid @xl:grid-cols-[minmax(0,1fr)_minmax(0,auto)] @xl:items-start @xl:gap-8">
        <div className="flex min-w-0 flex-col gap-3">{izq}</div>
        {/* La derecha, pegada a la derecha y como mucho la mitad del ancho. */}
        <div className="flex min-w-0 flex-col items-stretch gap-3 @xl:max-w-[50cqw] @xl:items-end @xl:text-right">{der}</div>
      </div>
    </div>
  );
}
