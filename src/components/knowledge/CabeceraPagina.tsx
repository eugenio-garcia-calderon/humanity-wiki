import type { CSSProperties, ReactNode } from 'react';
import { PanelTop, PanelBottom, PanelLeft, PanelRight } from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// LA CABECERA DE UNA PÁGINA: IMAGEN, ICONO Y TÍTULO (2026-09-30)
// ============================================================================
// Eugenio: «algo que nunca me ha gustado de Notion es que la portada queda
// siempre arriba. Que el usuario elija: la imagen arriba y el título debajo,
// el título arriba y la imagen debajo, o a un lado el título y al otro la
// imagen. Y con una barra que cambie el tamaño del título respecto a la
// imagen. Y el icono».
//
// Una sola pieza para el editor y para la página publicada: si fueran dos,
// lo que se ve al editar y lo que ve el lector acabarían siendo distintos.
//
// ── MÓVIL Y ESCRITORIO NO SE PISAN ──────────────────────────────────────────
// La elección es UNA y vale para las dos pantallas; lo que cambia es cómo se
// traduce:
//   · A un lado → en un teléfono se apila (imagen arriba, título debajo).
//     En 390 px, dos columnas son dos tiras ilegibles.
//   · El alto de la imagen y el tamaño del icono se escalan a la baja en
//     pantallas estrechas, para que la cabecera nunca se coma la pantalla.
// Así no hay dos ajustes que puedan contradecirse.

export type Disposicion = 'arriba' | 'debajo' | 'izquierda' | 'derecha';

export type Cabecera = {
  /** Dónde va la imagen respecto al título. Sin valor, a la derecha. */
  disposicion?: Disposicion;
  /** 20–80. Arriba/debajo: el alto de la imagen. A un lado: qué parte del
   *  ancho es imagen (el resto es título). */
  tamano?: number;
  /** Lado del icono en píxeles, 32–128. */
  icono?: number;
  /** Tamaño de letra de la descripción bajo el título, 12–32 px. */
  descripcion?: number;
  /** El icono al lado del título (por defecto) o encima. */
  iconoPos?: 'lado' | 'encima';
};

/**
 * El icono y el título (con su descripción) como un bloque. Por defecto el
 * icono va A LA IZQUIERDA del título (Eugenio, 2026-09-30); «encima» es la
 * forma de Notion. En un teléfono también va al lado: es más corto en alto,
 * que es lo que falta en una pantalla vertical.
 */
export function FilaTitulo({ cabecera, icono, children, centrado }: {
  cabecera?: Cabecera;
  icono: ReactNode | null;
  children: ReactNode;
  /** Icono, título y descripción al centro de la página (2026-10-02,
   *  Eugenio: «que estén centradas en la página, no en un lateral
   *  izquierdo»). Lo usa la página publicada. */
  centrado?: boolean;
}) {
  if (!icono) return <div className={centrado ? 'text-center' : undefined}>{children}</div>;
  if (cabecera?.iconoPos === 'encima') {
    return <div className={centrado ? 'text-center' : undefined}><div className={cn('mb-2', centrado && 'flex justify-center')}>{icono}</div>{children}</div>;
  }
  if (centrado) {
    return (
      <div className="flex items-center justify-center gap-3 sm:gap-4 text-center">
        <div className="shrink-0">{icono}</div>
        <div className="min-w-0">{children}</div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 sm:gap-4">
      <div className="shrink-0">{icono}</div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export const TAMANO_POR_DEFECTO = 50;
/** Por defecto la imagen a la DERECHA y a la izquierda el icono, el título y
 *  la descripción (Eugenio, 2026-10-01). En un teléfono se apila igual que
 *  cualquier disposición lateral: imagen arriba, texto debajo. */
export const DISPOSICION_POR_DEFECTO: Disposicion = 'derecha';
export const ICONO_POR_DEFECTO = 56;
export const DESCRIPCION_POR_DEFECTO = 18;

/** El tamaño de letra de la descripción. En un teléfono, como mucho 22 px:
 *  una entradilla enorme empuja el contenido fuera de la primera pantalla. */
export function letraDescripcion(cabecera: Cabecera | undefined, esMovil: boolean): number {
  const t = acotar(cabecera?.descripcion, 12, 32, DESCRIPCION_POR_DEFECTO);
  return esMovil ? Math.min(t, 22) : t;
}

const acotar = (n: number | undefined, min: number, max: number, def: number) =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;

/** El alto de la imagen apilada, en px de escritorio: 20 → 120, 80 → 480. */
const altoDe = (t: number) => Math.round(120 + ((t - 20) / 60) * 360);

/**
 * Coloca la imagen y el cuerpo (icono + título + lo demás) según la
 * disposición elegida. No sabe qué hay dentro: eso lo pone quien la usa.
 */
export function LayoutCabecera({ cabecera, imagen, cuerpo, centrado }: {
  /** La imagen de arriba o de abajo, al centro (página publicada). */
  centrado?: boolean;
  cabecera?: Cabecera;
  /** La imagen ya pintada, o `null` si la página no tiene. */
  imagen: ReactNode | null;
  cuerpo: ReactNode;
}) {
  const d = cabecera?.disposicion || DISPOSICION_POR_DEFECTO;
  const t = acotar(cabecera?.tamano, 20, 80, TAMANO_POR_DEFECTO);

  if (!imagen) return <div>{cuerpo}</div>;

  if (d === 'izquierda' || d === 'derecha') {
    // `--img` es la parte del ancho que es imagen. En el teléfono no se usa:
    // la rejilla sólo existe a partir de `sm`.
    const estilo = { '--img': `${t}fr`, '--txt': `${100 - t}fr` } as CSSProperties;
    return (
      <div style={estilo}
        className={cn('flex flex-col gap-5 sm:grid sm:items-center sm:gap-8',
          d === 'izquierda' ? 'sm:[grid-template-columns:var(--img)_var(--txt)]' : 'sm:[grid-template-columns:var(--txt)_var(--img)]')}>
        {/* En móvil la imagen va siempre primero, como en «arriba». */}
        <div className={cn('min-w-0 [&_img]:w-full [&_img]:h-auto [&_img]:object-contain', d === 'derecha' && 'sm:order-2')}>{imagen}</div>
        <div className={cn('min-w-0', d === 'derecha' && 'sm:order-1')}>{cuerpo}</div>
      </div>
    );
  }

  const estilo = { '--alto': `${altoDe(t)}px` } as CSSProperties;
  const caja = (
    <div style={estilo}
      // LA IMAGEN ENTERA, SIN RECORTAR (2026-09-30, Eugenio: «que el
      // cuadradito se ajuste al tamaño de la imagen para que no salga
      // cortada»). La barra fija el alto MÁXIMO; el ancho sale solo de la
      // proporción de la imagen, así que nunca se recorta ni se deforma.
      className={cn(centrado && 'flex justify-center', '[&_img]:w-auto [&_img]:max-w-full [&_img]:h-auto [&_img]:object-contain',
        '[&_img]:max-h-[calc(var(--alto)*0.8)] sm:[&_img]:max-h-[var(--alto)]')}>
      {imagen}
    </div>
  );
  return d === 'debajo'
    ? <div className="space-y-5">{cuerpo}{caja}</div>
    : <div className="space-y-5">{caja}{cuerpo}</div>;
}

/** El lado del icono en píxeles. En un teléfono, como mucho 72: un icono de
 *  128 ocuparía un tercio de la pantalla. */
export function ladoIcono(cabecera: Cabecera | undefined, esMovil: boolean): number {
  const lado = acotar(cabecera?.icono, 32, 128, ICONO_POR_DEFECTO);
  return esMovil ? Math.min(lado, 72) : lado;
}

// ── LOS MANDOS (sólo en el editor) ─────────────────────────────────────────

const OPCIONES: { d: Disposicion; label: string; Icono: any }[] = [
  { d: 'arriba', label: 'Imagen arriba', Icono: PanelTop },
  { d: 'debajo', label: 'Imagen debajo', Icono: PanelBottom },
  { d: 'izquierda', label: 'Imagen a la izquierda', Icono: PanelLeft },
  { d: 'derecha', label: 'Imagen a la derecha', Icono: PanelRight },
];

export function MandosCabecera({ cabecera, hayImagen, hayIcono, hayDescripcion = false, onCambio }: {
  cabecera?: Cabecera;
  hayImagen: boolean;
  hayIcono: boolean;
  hayDescripcion?: boolean;
  onCambio: (c: Cabecera) => void;
}) {
  const c = cabecera || {};
  const d = c.disposicion || DISPOSICION_POR_DEFECTO;
  const lateral = d === 'izquierda' || d === 'derecha';
  const pon = (x: Partial<Cabecera>) => onCambio({ ...c, ...x });

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 p-3 rounded-xl border border-slate-200 bg-white shadow-sm">
      {hayImagen && (
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Dónde va la imagen">
          {OPCIONES.map(o => (
            <button key={o.d} role="radio" aria-checked={d === o.d} title={o.label} aria-label={o.label}
              onClick={() => pon({ disposicion: o.d })}
              className={cn('w-11 h-11 sm:w-9 sm:h-9 grid place-items-center rounded-lg border transition-colors',
                d === o.d ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-400 hover:text-slate-700')}>
              <o.Icono className="w-4 h-4" />
            </button>
          ))}
        </div>
      )}
      {hayImagen && (
        <Deslizador
          etiqueta={lateral ? 'Imagen ↔ título' : 'Tamaño de la imagen'}
          valor={acotar(c.tamano, 20, 80, TAMANO_POR_DEFECTO)} min={20} max={80}
          texto={v => (lateral ? `${v} / ${100 - v}` : `${v}%`)}
          onCambio={v => pon({ tamano: v })} />
      )}
      {hayDescripcion && (
        <Deslizador
          etiqueta="Descripción"
          valor={acotar(c.descripcion, 12, 32, DESCRIPCION_POR_DEFECTO)} min={12} max={32}
          texto={v => `${v} px`}
          onCambio={v => pon({ descripcion: v })} />
      )}
      {hayIcono && (
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Dónde va el icono">
          <span className="text-[11px] font-bold text-slate-500 mr-1">Icono</span>
          {([['lado', 'Al lado'], ['encima', 'Encima']] as const).map(([v, label]) => (
            <button key={v} role="radio" aria-checked={(c.iconoPos || 'lado') === v} onClick={() => pon({ iconoPos: v })}
              className={cn('h-11 sm:h-8 px-2.5 rounded-lg border text-[11px] font-bold transition-colors',
                (c.iconoPos || 'lado') === v ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-400 hover:text-slate-700')}>
              {label}
            </button>
          ))}
        </div>
      )}
      {hayIcono && (
        <Deslizador
          etiqueta="Tamaño del icono"
          valor={acotar(c.icono, 32, 128, ICONO_POR_DEFECTO)} min={32} max={128}
          texto={v => `${v} px`}
          onCambio={v => pon({ icono: v })} />
      )}
    </div>
  );
}

function Deslizador({ etiqueta, valor, min, max, texto, onCambio }: {
  etiqueta: string; valor: number; min: number; max: number;
  texto: (v: number) => string; onCambio: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 basis-full sm:basis-[calc(50%-0.75rem)] min-w-0">
      <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">{etiqueta}</span>
      <input type="range" min={min} max={max} value={valor}
        onChange={e => onCambio(Number(e.target.value))}
        className="flex-1 min-w-0 w-full h-11 sm:h-6 accent-emerald-600" />
      <span className="w-16 shrink-0 whitespace-nowrap text-right text-[11px] font-bold text-slate-400 tabular-nums">{texto(valor)}</span>
    </label>
  );
}
