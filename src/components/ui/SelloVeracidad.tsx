import { CircleHelp, Link2, BadgeCheck, TriangleAlert, CircleSlash } from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// EL SELLO DE VERACIDAD (2026-08-22, fase 2 de memory/13_VERACIDAD.md)
// ============================================================================
// Qué se sabe sobre una afirmación, en un vistazo y con las mismas palabras en
// todas las pantallas.
//
// LO PRIMERO QUE TIENE QUE SABER DECIR ES «NO LO SÉ». Por eso `sin_fuente`
// existe y se PINTA, en vez de dejar el hueco vacío: una afirmación sin nada
// detrás y una afirmación que nadie ha mirado se parecen mucho desde fuera, y
// un hueco en blanco lo rellena quien lee con una suposición.
//
// Y por eso `sin_fuente` es gris y no rojo: no está mal, está sin comprobar.
// El rojo se guarda para lo que alguien comprobó y resultó falso — si todo lo
// que falta llevara rojo, el rojo dejaría de significar nada.

export type Veracidad = 'sin_fuente' | 'con_fuente' | 'verificada' | 'disputada' | 'refutada';

const SELLOS: Record<Veracidad, {
  icono: typeof CircleHelp; texto: string; clase: string; explica: string;
}> = {
  sin_fuente: {
    icono: CircleHelp, texto: 'Sin fuente',
    clase: 'bg-slate-100 text-slate-500 border-slate-200',
    explica: 'Nadie ha citado nada todavía. No quiere decir que sea falso: quiere decir que está sin comprobar.',
  },
  con_fuente: {
    icono: Link2, texto: 'Con fuente',
    clase: 'bg-sky-50 text-sky-700 border-sky-200',
    explica: 'Tiene al menos una fuente, y nadie la ha revisado todavía.',
  },
  verificada: {
    icono: BadgeCheck, texto: 'Verificada',
    clase: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    explica: 'Alguien de nivel Conocimiento comprobó que la fuente sostiene lo que dice.',
  },
  disputada: {
    icono: TriangleAlert, texto: 'Disputada',
    clase: 'bg-amber-50 text-amber-800 border-amber-200',
    explica: 'Hay enfrente algo comprobado que la pone en duda. Sigue aquí para que puedas juzgar tú.',
  },
  refutada: {
    icono: CircleSlash, texto: 'Refutada',
    clase: 'bg-rose-50 text-rose-700 border-rose-200',
    explica: 'Se comprobó que no es cierta. Se queda a la vista a propósito: borrarla dejaría la conversación sin sentido y a nadie advertido.',
  },
};

/**
 * @param por     quién movió el sello. Solo lo llevan los tres escalones que
 *                decide una persona; sin firma, un «verificada» es una
 *                afirmación más.
 * @param motivo  por qué. Obligatorio al disputar o refutar.
 */
export default function SelloVeracidad({ estado, por, motivo, fuentes, compacto }: {
  estado: string | null | undefined;
  por?: string | null;
  motivo?: string | null;
  /** Cuántas fuentes lo sostienen. Un número dice más que la palabra sola. */
  fuentes?: number;
  compacto?: boolean;
}) {
  // Un estado que no reconocemos NO se pinta como si fuera el primero de la
  // lista: eso es inventarse un dato. Se dice que no se sabe.
  const clave = (estado && estado in SELLOS ? estado : 'sin_fuente') as Veracidad;
  const s = SELLOS[clave];
  const Icono = s.icono;

  const titulo = [
    s.explica,
    por ? `Lo marcó ${por}.` : null,
    motivo ? `Motivo: ${motivo}` : null,
  ].filter(Boolean).join(' ');

  return (
    <span
      title={titulo}
      className={cn('inline-flex items-center gap-1 rounded-full border font-bold whitespace-nowrap',
        s.clase, compacto ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]')}
    >
      <Icono className={compacto ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {s.texto}
      {!!fuentes && <span className="opacity-60">· {fuentes}</span>}
    </span>
  );
}
