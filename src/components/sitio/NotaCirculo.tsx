import type { ReactNode } from 'react';
import { colorDeNota, textoNota } from '../../utils/nota';
import { cn } from '../../utils/cn';

// ============================================================================
// LA NOTA EN SU CÍRCULO (2026-10-28, Eugenio)
// ============================================================================
// «Me ha gustado que aparezca el nombre arriba de la nota y debajo, en vez de
// "media de 10", "sobre 10"; y que el color esté en un círculo en vez de en el
// fondo: que el fondo sea blanco.» Un círculo blanco con el aro del color de la
// nota (la escala de siempre, `utils/nota.ts`), la cifra grande en tinta y
// «sobre 10» debajo; en el tamaño grande, también el nombre encima. Lo usan la
// barra del sitio, las tarjetas de las galerías, los objetivos y los círculos.

type Tam = 'barra' | 'pequena' | 'tarjeta' | 'grande';

// Tamaños en píxeles y en estilo propio (no en clases): dentro de una tarjeta, las clases de letra de quien la
// contiene podían ganar a las suyas y «sobre 10» salía más grande, pegado al aro.
const MEDIDAS: Record<Tam, { lado: number; aro: number; cifra: number; sobre: number; etiqueta: number }> = {
  barra: { lado: 46, aro: 3, cifra: 17, sobre: 8, etiqueta: 0 },
  pequena: { lado: 54, aro: 3, cifra: 20, sobre: 8.5, etiqueta: 0 },
  tarjeta: { lado: 66, aro: 4, cifra: 25, sobre: 9.5, etiqueta: 0 },
  grande: { lado: 120, aro: 5, cifra: 42, sobre: 13, etiqueta: 14 },
};

export default function NotaCirculo({ nota, tam = 'tarjeta', etiqueta, titulo, className, children }: {
  nota: number;
  tam?: Tam;
  /** El nombre encima de la cifra (solo en el tamaño grande): «España». */
  etiqueta?: string | null;
  /** Para los lectores de pantalla: «Movilidad en España». */
  titulo?: string;
  className?: string;
  /** Lo que va encima, ocupándolo entero (el desplegable para cambiar la nota en el editor). */
  children?: ReactNode;
}) {
  const m = MEDIDAS[tam];
  const conEtiqueta = tam === 'grande' && !!etiqueta;
  return (
    <span data-nota-circulo aria-label={`${titulo || etiqueta ? `${titulo || etiqueta}: ` : ''}${textoNota(nota)} sobre 10`}
      className={cn('relative inline-flex shrink-0 flex-col items-center justify-center rounded-full bg-white text-center tabular-nums leading-none shadow-[0_2px_6px_-2px_rgba(15,23,42,0.18)]', className)}
      style={{ width: m.lado, height: m.lado, border: `${m.aro}px solid ${colorDeNota(nota)}` }}>
      {conEtiqueta && <span className="block max-w-[85%] truncate font-bold text-slate-600" style={{ fontSize: m.etiqueta, lineHeight: 1, marginBottom: 4 }}>{etiqueta}</span>}
      <span className="block font-black tracking-tight text-slate-900" style={{ fontSize: m.cifra, lineHeight: 1 }}>{textoNota(nota)}</span>
      <span className="block font-semibold text-slate-600" style={{ fontSize: m.sobre, lineHeight: 1, marginTop: 2 }}>sobre 10</span>
      {children}
    </span>
  );
}
