// ============================================================================
// LA PORTADA DEL CALENDARIO (2026-11-05, Eugenio: «una página de portada del
// calendario donde aparezcan los temas y las ilustraciones en pequeño»)
// ============================================================================
// Mismo formato que un mes: A3 vertical = dos A4 apaisados, para que se
// imprima y se exporte igual que el resto (en A4 sale como dos páginas).
//   · Arriba: título, año, presentación, la nota de la recaudación y el QR.
//   · Abajo: los doce temas, cada uno con su ilustración en pequeño.
// Los textos se editan en su sitio y viven en la hoja 0 (`portada`), junto a
// los principios de diseño. Los temas y las ilustraciones NO se editan aquí:
// salen de cada mes, así la portada nunca contradice al calendario.
import { cn } from '../../utils/cn';
import type { ContenidoMes, PortadaCalendario } from '../../data/calendarioArteTipos';
import { Editable } from './Editable';
import { ACENTOS, NOMBRES_MES, ANCHO_MM, ALTO_MM } from './HojaMes';
import { CodigoQR } from './CodigoQR';

/** La ilustración final pesa ~1,5 MB: en la portada se usa su miniatura
 *  (900 px, de sobra para 67 mm impresos a 300 ppp). Si alguien subió otra
 *  ilustración, se usa esa tal cual: la portada enseña lo que tiene el mes. */
export function miniaturaDe(url?: string): string | undefined {
  const m = url?.match(/^\/calendario-arte\/ilustraciones\/(mes-\d{2}(?:-b)?)\.jpg$/);
  return m ? `/calendario-arte/miniaturas/${m[1]}.jpg` : url;
}

export const URL_CALENDARIO = 'https://humanity.wiki/calendario-arte';

interface Props {
  anio: number;
  meses: ContenidoMes[];
  portada: PortadaCalendario;
  editando: boolean;
  alCambiar: (cambio: Partial<PortadaCalendario>) => void;
  /** En pantalla, pinchar un tema abre su mes. Al imprimir no se pasa. */
  alAbrirMes?: (mes: number) => void;
}

export function HojaPortada({ anio, meses, portada: p, editando, alCambiar, alAbrirMes }: Props) {
  return (
    <div className="ca-hoja relative overflow-hidden bg-white text-stone-800" style={{ width: `${ANCHO_MM}mm`, height: `${ALTO_MM}mm` }}>
      {/* ── HOJA 1: EL TÍTULO ─────────────────────────────────────────── */}
      <div className="ca-mitad relative flex flex-col items-center justify-center overflow-hidden bg-stone-50 text-center" style={{ height: '210mm', padding: '16mm 30mm 14mm' }}>
        {/* Una franja con los doce colores del año, arriba y abajo. */}
        <div className="absolute inset-x-0 top-0 flex" style={{ height: '5mm' }}>
          {ACENTOS.map((a, i) => <div key={i} className={cn('flex-1', a.fondo)} />)}
        </div>

        <span className="font-sans uppercase text-stone-400" style={{ fontSize: '10pt', letterSpacing: '0.45em' }}>Calendario {anio}</span>
        <Editable
          as="h1"
          valor={p.titulo}
          editando={editando}
          multilinea={false}
          alCambiar={v => alCambiar({ titulo: v })}
          className="ca-titulo font-semibold leading-none text-stone-800"
          style={{ fontSize: '46pt', marginTop: '6mm' }}
        />
        <Editable
          as="p"
          valor={p.subtitulo}
          editando={editando}
          alCambiar={v => alCambiar({ subtitulo: v })}
          vacio="Subtítulo"
          className="italic text-stone-500"
          style={{ fontSize: '16pt', marginTop: '5mm' }}
        />
        <div className="flex items-center" style={{ gap: '2.5mm', margin: '9mm 0' }}>
          {ACENTOS.map((a, i) => <span key={i} className={cn('rounded-full', a.fondo)} style={{ width: '2.6mm', height: '2.6mm' }} />)}
        </div>
        <Editable
          as="p"
          valor={p.texto}
          editando={editando}
          alCambiar={v => alCambiar({ texto: v })}
          vacio="Presentación del calendario"
          className="leading-relaxed text-stone-700"
          style={{ fontSize: '13pt', maxWidth: '200mm' }}
        />

        <div className="flex items-center text-left" style={{ gap: '6mm', marginTop: '10mm', maxWidth: '210mm' }}>
          <div className="flex shrink-0 flex-col items-center leading-none">
            <CodigoQR url={URL_CALENDARIO} lado="22mm" />
            <span className="font-sans text-stone-400" style={{ fontSize: '6pt', marginTop: '1mm' }}>Conoce más</span>
          </div>
          <Editable
            as="p"
            valor={p.recaudacion}
            editando={editando}
            alCambiar={v => alCambiar({ recaudacion: v })}
            vacio="A qué se destina lo recaudado"
            className="leading-snug text-stone-600"
            style={{ fontSize: '10.5pt' }}
          />
        </div>

        <Editable
          as="p"
          valor={p.pie}
          editando={editando}
          multilinea={false}
          alCambiar={v => alCambiar({ pie: v })}
          vacio="Quién lo hace"
          className="absolute inset-x-0 font-sans uppercase text-stone-400"
          style={{ bottom: '8mm', fontSize: '7.5pt', letterSpacing: '0.3em' }}
        />
      </div>

      {/* ── HOJA 2: LOS DOCE TEMAS ────────────────────────────────────── */}
      <div className="ca-mitad flex flex-col" style={{ height: '210mm', padding: '9mm 9mm 8mm' }}>
        <div className="flex items-baseline justify-between" style={{ marginBottom: '4mm' }}>
          <h2 className="ca-titulo font-semibold text-stone-800" style={{ fontSize: '20pt' }}>Los doce temas</h2>
          <span className="font-sans uppercase text-stone-400" style={{ fontSize: '7pt', letterSpacing: '0.25em' }}>Arte para la Humanidad · {anio}</span>
        </div>
        <div className="grid flex-1 grid-cols-4" style={{ gap: '4mm', gridTemplateRows: 'repeat(3, minmax(0, 1fr))' }}>
          {meses.map(m => {
            const a = ACENTOS[(m.mes - 1) % 12];
            const img = miniaturaDe(m.imagen);
            const Caja: any = alAbrirMes && !editando ? 'button' : 'div';
            return (
              <Caja
                key={m.mes}
                {...(Caja === 'button' ? { type: 'button', onClick: () => alAbrirMes!(m.mes), title: `Abrir ${NOMBRES_MES[m.mes - 1]}` } : {})}
                className={cn('flex min-h-0 flex-col overflow-hidden rounded-[2.5mm] border bg-white text-left', a.borde, Caja === 'button' && 'transition hover:shadow-lg')}
              >
                <div className={cn('relative w-full overflow-hidden', a.suave)} style={{ aspectRatio: '297 / 170' }}>
                  {img && (
                    <img
                      src={img}
                      alt={`${NOMBRES_MES[m.mes - 1]}: ${m.tema}`}
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{ objectPosition: `${m.imagen_x ?? 50}% ${m.imagen_y ?? 50}%` }}
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col" style={{ padding: '1.8mm 2.5mm' }}>
                  <span className="font-sans uppercase text-stone-400" style={{ fontSize: '6pt', letterSpacing: '0.2em' }}>{NOMBRES_MES[m.mes - 1]}</span>
                  <span className={cn('ca-titulo font-semibold leading-tight', a.texto)} style={{ fontSize: '10.5pt' }}>{m.tema}</span>
                  {m.lema && (
                    <span className="line-clamp-3 italic leading-snug text-stone-500" style={{ fontSize: '6.8pt', marginTop: '0.8mm' }}>{m.lema}</span>
                  )}
                </div>
              </Caja>
            );
          })}
        </div>
      </div>
    </div>
  );
}
