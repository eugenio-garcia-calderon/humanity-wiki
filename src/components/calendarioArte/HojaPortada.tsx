// ============================================================================
// LA PORTADA DEL CALENDARIO
// ============================================================================
// 2026-11-05, Eugenio: primero «una página de portada donde aparezcan los temas
// y las ilustraciones en pequeño»; después «elimina las franjas de colores y
// compacta la portada en una sola página con el título y las 12 temáticas».
// Es UNA hoja A4 apaisada (297 × 210 mm): título arriba, los doce temas en dos
// filas de seis y, al pie, el QR, la nota de la recaudación y quién lo hace.
// En A3 sale en la mitad de arriba de la hoja, donde va la ilustración de los meses.
// Los textos se editan en su sitio y viven en la hoja 0 (`portada`). Los temas
// y las ilustraciones NO se editan aquí: salen de cada mes, así la portada
// nunca contradice al calendario.
import { cn } from '../../utils/cn';
import type { ContenidoMes, PortadaCalendario } from '../../data/calendarioArteTipos';
import { Editable } from './Editable';
import { ACENTOS, NOMBRES_MES, ANCHO_MM, PAPEL } from './HojaMes';
import { CodigoQR } from './CodigoQR';

/** La ilustración final pesa ~1,5 MB: en la portada se usa su miniatura
 *  (900 px, de sobra para 67 mm impresos a 300 ppp). Si alguien subió otra
 *  ilustración, se usa esa tal cual: la portada enseña lo que tiene el mes. */
export function miniaturaDe(url?: string): string | undefined {
  const m = url?.match(/^\/calendario-arte\/ilustraciones\/(mes-\d{2}(?:-[a-z])?)\.jpg$/);
  return m ? `/calendario-arte/miniaturas/${m[1]}.jpg` : url;
}

export const URL_CALENDARIO = 'https://humanity.wiki/calendario-arte';

interface Props {
  anio: number;
  meses: ContenidoMes[];
  portada: PortadaCalendario;
  editando: boolean;
  alCambiar: (cambio: Partial<PortadaCalendario>) => void;
  /** En pantalla, la ilustración que se está mirando de cada mes (el favorito
   *  por defecto). Al imprimir no se pasa y sale la que se imprime. */
  imagenes?: Record<number, string | undefined>;
  /** En pantalla, pinchar un tema lleva a su mes. Al imprimir no se pasa. */
  alAbrirMes?: (mes: number) => void;
}

/** Alto de la portada: una sola página A4 apaisada. */
export const ALTO_PORTADA_MM = 210;

export function HojaPortada({ anio, meses, portada: p, editando, alCambiar, alAbrirMes, imagenes }: Props) {
  return (
    <div className="ca-hoja relative overflow-hidden text-stone-800" style={{ width: `${ANCHO_MM}mm`, height: `${ALTO_PORTADA_MM}mm`, backgroundColor: PAPEL }}>
      <div className="ca-mitad flex flex-col overflow-hidden" style={{ height: `${ALTO_PORTADA_MM}mm`, padding: '11mm 11mm 7mm' }}>
        {/* ── EL TÍTULO ─────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center text-center">
          <span className="font-sans uppercase text-stone-400" style={{ fontSize: '8pt', letterSpacing: '0.45em' }}>Calendario {anio}</span>
          <Editable
            as="h1"
            valor={p.titulo}
            editando={editando}
            multilinea={false}
            alCambiar={v => alCambiar({ titulo: v })}
            className="ca-titulo font-semibold leading-none text-stone-800"
            style={{ fontSize: '36pt', marginTop: '3mm' }}
          />
          <Editable
            as="p"
            valor={p.subtitulo}
            editando={editando}
            alCambiar={v => alCambiar({ subtitulo: v })}
            vacio="Subtítulo"
            className="italic text-stone-500"
            style={{ fontSize: '13pt', marginTop: '2.5mm' }}
          />
          <Editable
            as="p"
            valor={p.texto}
            editando={editando}
            alCambiar={v => alCambiar({ texto: v })}
            vacio="Presentación del calendario"
            className="leading-snug text-stone-600"
            style={{ fontSize: '9pt', maxWidth: '215mm', marginTop: '2.5mm' }}
          />
        </div>

        {/* ── LOS DOCE TEMAS ────────────────────────────────────────────── */}
        <div className="grid min-h-0 flex-1 grid-cols-6" style={{ gap: '3mm', marginTop: '6mm', gridTemplateRows: 'repeat(2, minmax(0, 1fr))' }}>
          {meses.map(m => {
            const a = ACENTOS[(m.mes - 1) % 12];
            const img = miniaturaDe(imagenes?.[m.mes] ?? m.imagen);
            const Caja: any = alAbrirMes ? 'button' : 'div';
            return (
              <Caja
                key={m.mes}
                {...(Caja === 'button' ? { type: 'button', onClick: () => alAbrirMes!(m.mes), title: `Ir a ${NOMBRES_MES[m.mes - 1]}` } : {})}
                className={cn('flex min-h-0 flex-col overflow-hidden rounded-[2mm] border bg-white/40 text-left', a.borde, Caja === 'button' && 'transition hover:shadow-lg')}
              >
                <div className={cn('relative min-h-0 w-full flex-1 overflow-hidden', a.suave)}>
                  {img && (
                    <img
                      src={img}
                      alt={`${NOMBRES_MES[m.mes - 1]}: ${m.tema}`}
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{ objectPosition: `${m.imagen_x ?? 50}% ${m.imagen_y ?? 50}%` }}
                    />
                  )}
                </div>
                <div className="flex shrink-0 flex-col" style={{ padding: '1.5mm 2mm 1.8mm' }}>
                  <span className="font-sans uppercase text-stone-400" style={{ fontSize: '5.5pt', letterSpacing: '0.2em' }}>{NOMBRES_MES[m.mes - 1]}</span>
                  <span className={cn('ca-titulo font-semibold leading-tight', a.texto)} style={{ fontSize: '9.5pt' }}>{m.tema}</span>
                  {m.lema && (
                    <span className="line-clamp-2 italic leading-snug text-stone-500" style={{ fontSize: '6pt', marginTop: '0.6mm' }}>{m.lema}</span>
                  )}
                </div>
              </Caja>
            );
          })}
        </div>

        {/* ── EL PIE: QR, RECAUDACIÓN Y QUIÉN LO HACE ──────────────────── */}
        <div className="flex shrink-0 items-center" style={{ gap: '4mm', marginTop: '4.5mm' }}>
          <div className="flex shrink-0 flex-col items-center leading-none">
            <CodigoQR url={URL_CALENDARIO} lado="15mm" />
            <span className="font-sans text-stone-400" style={{ fontSize: '5pt', marginTop: '0.8mm' }}>Conoce más</span>
          </div>
          <Editable
            as="p"
            valor={p.recaudacion}
            editando={editando}
            alCambiar={v => alCambiar({ recaudacion: v })}
            vacio="A qué se destina lo recaudado"
            className="min-w-0 flex-1 leading-snug text-stone-600"
            style={{ fontSize: '8.5pt' }}
          />
          <Editable
            as="p"
            valor={p.pie}
            editando={editando}
            multilinea={false}
            alCambiar={v => alCambiar({ pie: v })}
            vacio="Quién lo hace"
            className="shrink-0 text-right font-sans uppercase text-stone-400"
            style={{ fontSize: '6.5pt', letterSpacing: '0.25em', maxWidth: '90mm' }}
          />
        </div>
      </div>
    </div>
  );
}
