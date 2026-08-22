// ============================================================================
// LA MARCA DE DE DÓNDE SALE UNA CIFRA (2026-08-22)
// ============================================================================
// El `CLAUDE.md` de este proyecto abre diciendo que confundir un dato simulado
// con uno medido es el error más caro que se ha cometido aquí. Medido hoy: de
// 20.557 observaciones, **20.499 están simuladas** — los 179 municipios de
// Madrid y los 32 países europeos— y hasta hoy se veían exactamente igual que
// las 58 que salen del INE, del MITECO o de una estación de medida.
//
// Esta es la marca. Va donde se pinta la cifra, no en una nota al pie.
//
// ── POR QUÉ ROJO PARA «SIMULADO» Y NO UN GRIS DISCRETO ─────────────────────
// Porque el daño de este error no es que alguien se confunda un rato: es que
// cite una cifra inventada como si fuera medida, delante de gente que decide
// con ella. Una marca discreta se aprende a no mirar en dos días. Esta tiene
// que interrumpir.
//
// ── Y POR QUÉ «SIN FUENTE» TAMBIÉN AVISA ───────────────────────────────────
// Porque no saber de dónde sale un número no es mejor que saber que está
// inventado: es lo mismo con menos información. La tentación de pintarlo como
// bueno «porque seguramente lo sea» es justo lo que hay que evitar.
import { AlertTriangle, CheckCircle2, Sigma, HelpCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { origenDe, ETIQUETA_ORIGEN, type OrigenDelDato } from '../../utils/origenDelDato';

export { origenDe };
export type { OrigenDelDato };

// AQUÍ SOLO VIVE EL ASPECTO. El nombre («Simulado») y la explicación viven en
// `src/utils/origenDelDato.ts`, junto a la regla que decide cuál es cuál.
// Estuvieron escritos también aquí durante un día: dos textos sobre lo mismo
// que se separan la primera vez que alguien reformule uno.
const ESTILO: Record<OrigenDelDato, { clase: string; Icono: any }> = {
  medido:      { clase: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icono: CheckCircle2 },
  estimado:    { clase: 'bg-sky-50 text-sky-700 border-sky-200',             Icono: Sigma },
  simulado:    { clase: 'bg-rose-50 text-rose-700 border-rose-300',          Icono: AlertTriangle },
  desconocido: { clase: 'bg-amber-50 text-amber-800 border-amber-200',       Icono: HelpCircle },
};

export default function MarcaOrigen({ origen, tamano = 'normal', className }: {
  origen: OrigenDelDato | string | null | undefined;
  /** `pequeno` para meterla dentro de una fila; `normal` junto a un titular. */
  tamano?: 'pequeno' | 'normal';
  className?: string;
}) {
  // UN VALOR QUE NO ENTENDEMOS NO SE PINTA COMO BUENO. Si el servidor manda
  // algo que esta pantalla no conoce, se trata como «sin fuente» — nunca se
  // esconde la marca, porque esconderla es lo que la cifra parecía antes.
  const clave: OrigenDelDato =
    origen === 'medido' || origen === 'estimado' || origen === 'simulado' ? origen : 'desconocido';
  const { clase, Icono } = ESTILO[clave];
  const { corto: texto, explicacion } = ETIQUETA_ORIGEN[clave];

  return (
    <span
      title={explicacion}
      className={cn('inline-flex items-center gap-1 rounded-full border font-black uppercase tracking-wider shrink-0',
        tamano === 'pequeno' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
        clase, className)}
    >
      <Icono className={tamano === 'pequeno' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {texto}
    </span>
  );
}

/**
 * El aviso grande, para cuando TODO lo que se está mirando es inventado.
 *
 * Una pastilla pequeña vale para una fila de una tabla. Cuando alguien abre la
 * ficha de un territorio entero cuyas cifras son todas simuladas, hace falta
 * algo que no se pueda leer por encima: se va a quedar mirando esos números un
 * rato, y puede apuntarlos.
 */
export function AvisoDatoSimulado({ origen }: { origen: OrigenDelDato | string | null | undefined }) {
  if (origen !== 'simulado' && origen !== 'desconocido') return null;
  const esSimulado = origen === 'simulado';
  return (
    <div className={cn('flex items-start gap-2 rounded-xl border px-3 py-2 text-[11px] leading-snug',
      esSimulado ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-900')}>
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
      <span>
        {esSimulado ? (
          <>
            <b>Estas cifras están simuladas.</b> Se pusieron para poder enseñar cómo
            funciona la plataforma. No son medidas de nada y no se pueden citar.
          </>
        ) : (
          <>
            <b>No consta de dónde salen estas cifras.</b> Hasta que se sepa, trátalas
            como no comprobadas.
          </>
        )}
      </span>
    </div>
  );
}
