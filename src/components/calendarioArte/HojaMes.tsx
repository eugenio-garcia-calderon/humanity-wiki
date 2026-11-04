// ============================================================================
// UNA HOJA DEL CALENDARIO: A3 vertical = dos A4 apaisados uno encima del otro
// ============================================================================
// Hoja 1 (297 × 210 mm): el tema, la frase y la ilustración (sin letras).
// Hoja 2 (297 × 210 mm): el calendario con una enseñanza por día (75 %) y la
// herramienta, juego o dinámica del mes (25 %). Eugenio, 2026-11-04.
//
// La hoja se dibuja SIEMPRE en milímetros reales. En pantalla se escala para
// que quepa; al imprimir se usa tal cual, así lo que ves es lo que sale.
import { useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { ContenidoMes, FranjaMes, TipoFranja } from '../../data/calendarioArteTipos';
import { Editable } from './Editable';
import { Button } from '../ui/core';
import { generarSopa, normalizarPalabra } from './sopaDeLetras';
import { CodigoQR, urlConocerMas } from './CodigoQR';

export const NOMBRES_MES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/** Un acento por mes, en clases de Tailwind (nada de colores a mano). */
const ACENTOS: { texto: string; borde: string; fondo: string; suave: string }[] = [
  { texto: 'text-indigo-700', borde: 'border-indigo-300', fondo: 'bg-indigo-600', suave: 'bg-indigo-50' },   // Cosmos y Vida
  { texto: 'text-rose-700', borde: 'border-rose-300', fondo: 'bg-rose-600', suave: 'bg-rose-50' },           // Relaciones
  { texto: 'text-sky-700', borde: 'border-sky-300', fondo: 'bg-sky-600', suave: 'bg-sky-50' },               // Agua
  { texto: 'text-emerald-700', borde: 'border-emerald-300', fondo: 'bg-emerald-700', suave: 'bg-emerald-50' }, // Bosque
  { texto: 'text-fuchsia-700', borde: 'border-fuchsia-300', fondo: 'bg-fuchsia-600', suave: 'bg-fuchsia-50' }, // Arte
  { texto: 'text-amber-700', borde: 'border-amber-300', fondo: 'bg-amber-600', suave: 'bg-amber-50' },       // Tecnología y Energía
  { texto: 'text-orange-700', borde: 'border-orange-300', fondo: 'bg-orange-600', suave: 'bg-orange-50' },   // Hogar
  { texto: 'text-teal-700', borde: 'border-teal-300', fondo: 'bg-teal-600', suave: 'bg-teal-50' },           // Salud
  { texto: 'text-yellow-800', borde: 'border-yellow-300', fondo: 'bg-yellow-700', suave: 'bg-yellow-50' },   // Economía
  { texto: 'text-lime-800', borde: 'border-lime-300', fondo: 'bg-lime-700', suave: 'bg-lime-50' },           // Alimentación
  { texto: 'text-violet-700', borde: 'border-violet-300', fondo: 'bg-violet-600', suave: 'bg-violet-50' },   // Política
  { texto: 'text-pink-700', borde: 'border-pink-300', fondo: 'bg-pink-600', suave: 'bg-pink-50' },           // Valores
];

export const ANCHO_MM = 297;
export const ALTO_MM = 420;

interface Props {
  anio: number;
  contenido: ContenidoMes;
  editando: boolean;
  alCambiar: (cambio: Partial<ContenidoMes>) => void;
  alElegirImagen?: () => void;
  subiendoImagen?: boolean;
}

export function HojaMes({ anio, contenido: c, editando, alCambiar, alElegirImagen, subiendoImagen }: Props) {
  const acento = ACENTOS[(c.mes - 1) % 12];
  const esBoceto = !!c.imagen?.startsWith('/calendario-arte/bocetos/');
  // Si la imagen no carga, se dice («ilustración pendiente») en vez de
  // imprimir el icono de imagen rota del navegador.
  const [imagenRota, setImagenRota] = useState<string | null>(null);
  const nombre = NOMBRES_MES[c.mes - 1];

  const primerDia = (new Date(anio, c.mes - 1, 1).getDay() + 6) % 7; // lunes = 0
  const diasMes = new Date(anio, c.mes, 0).getDate();
  const filas = Math.ceil((primerDia + diasMes) / 7);
  const celdas = Array.from({ length: filas * 7 }, (_, i) => {
    const d = i - primerDia + 1;
    return d >= 1 && d <= diasMes ? d : null;
  });
  const cambiarDia = (d: number, v: string) => {
    const dias = [...c.dias];
    while (dias.length < diasMes) dias.push('');
    dias[d - 1] = v;
    alCambiar({ dias });
  };

  return (
    <div
      className="ca-hoja relative bg-white text-stone-800 font-serif overflow-hidden"
      style={{ width: `${ANCHO_MM}mm`, height: `${ALTO_MM}mm` }}
    >
      {/* ── HOJA 1 (A4 apaisado): TEMA, FRASE E ILUSTRACIÓN ───────────────── */}
      {/* La ilustración no lleva letras: el tema y la frase van encima, fuera
          del dibujo (principio «La ilustración no lleva letras»). */}
      <div className="ca-mitad relative flex flex-col overflow-hidden" style={{ height: '210mm' }}>
        <div className="flex flex-col items-center justify-center text-center" style={{ height: '40mm', padding: '4mm 20mm 3mm' }}>
          <Editable
            as="h2"
            valor={c.tema}
            editando={editando}
            multilinea={false}
            alCambiar={v => alCambiar({ tema: v })}
            className={cn('font-semibold uppercase leading-none', acento.texto)}
            style={{ fontSize: '24pt', letterSpacing: '0.12em' }}
          />
          <Editable
            as="p"
            valor={c.lema}
            editando={editando}
            alCambiar={v => alCambiar({ lema: v })}
            vacio="La frase que no se olvida…"
            className="italic leading-snug text-stone-600"
            style={{ fontSize: '13pt', marginTop: '3mm', maxWidth: '240mm' }}
          />
        </div>
        <div className="relative flex-1 overflow-hidden" style={{ margin: '0 9mm 9mm', borderRadius: '3mm' }}>
          {c.imagen && imagenRota !== c.imagen ? (
            <img
              src={c.imagen}
              alt={`Ilustración de ${nombre}: ${c.tema}`}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: `${c.imagen_x ?? 50}% ${c.imagen_y ?? 50}%` }}
              onError={() => setImagenRota(c.imagen ?? null)}
            />
          ) : (
            <div className={cn('absolute inset-0 flex flex-col items-center justify-center text-center', acento.suave)} style={{ padding: '12mm 30mm' }}>
              <p className="font-sans uppercase tracking-[0.3em] text-stone-400" style={{ fontSize: '9pt' }}>Ilustración pendiente</p>
            </div>
          )}
          {esBoceto && (
            <span className="ca-no-imprimir absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 font-sans text-xs font-semibold text-white">
              Boceto de composición — no es la ilustración final
            </span>
          )}
          {editando && alElegirImagen && (
            <Button
              type="button"
              variant="outline"
              onClick={alElegirImagen}
              className="ca-no-imprimir absolute right-4 top-4 gap-2 rounded-full bg-white/95 font-sans shadow-lg hover:bg-white"
            >
              {subiendoImagen ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {c.imagen ? 'Cambiar ilustración' : 'Subir ilustración'}
            </Button>
          )}
        </div>
        {/* El encargo para quien ilustra: luz, sombra y escena. Solo en pantalla. */}
        {editando && (
          <div className="ca-no-imprimir absolute inset-x-0 bottom-0 bg-white/95 font-sans" style={{ padding: '2mm 12mm' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Encargo de la ilustración</span>
            <Editable
              as="p"
              valor={c.ilustracion_idea}
              editando
              alCambiar={v => alCambiar({ ilustracion_idea: v })}
              vacio="Escena, parte luminosa y parte oscura del tema…"
              className="text-stone-600"
              style={{ fontSize: '9pt' }}
            />
          </div>
        )}
      </div>

      {/* ── HOJA 2 (A4 apaisado): CALENDARIO 75 % + HERRAMIENTA 25 % ─────── */}
      <div className="ca-mitad flex flex-col" style={{ height: '210mm', padding: '6mm 9mm 7mm' }}>
        <div className="flex items-baseline justify-between" style={{ marginBottom: '2mm' }}>
          <div className="flex items-baseline" style={{ gap: '4mm' }}>
            <h3 className={cn('font-bold leading-none', acento.texto)} style={{ fontSize: '30pt' }}>{nombre}</h3>
            <Editable
              valor={c.subtitulo}
              editando={editando}
              multilinea={false}
              alCambiar={v => alCambiar({ subtitulo: v })}
              vacio="Subtítulo del mes"
              className="italic text-stone-500"
              style={{ fontSize: '11pt' }}
            />
          </div>
          <div className="flex items-center" style={{ gap: '3mm' }}>
            <div className="text-right leading-none">
              <span className="font-sans uppercase tracking-[0.25em] text-stone-400" style={{ fontSize: '7pt' }}>Arte para la Humanidad</span>
              <span className={cn('block font-bold', acento.texto)} style={{ fontSize: '18pt' }}>{anio}</span>
            </div>
            {/* El QR, pequeño y en la esquina: lleva a «Conocer más» del tema. */}
            <div className="flex flex-col items-center leading-none">
              <CodigoQR url={c.qr_url || urlConocerMas(c.mes)} lado="13mm" />
              <span className="font-sans text-stone-400" style={{ fontSize: '5pt', marginTop: '0.6mm' }}>Conoce más</span>
            </div>
          </div>
        </div>

        {/* La rejilla del mes */}
        <div className="grid grid-cols-7 font-sans uppercase tracking-wider text-stone-500" style={{ fontSize: '6.5pt', marginBottom: '1mm' }}>
          {DIAS_SEMANA.map(d => <div key={d} className="text-center">{d}</div>)}
        </div>
        <div
          className={cn('grid grid-cols-7 flex-1 border-l border-t', acento.borde)}
          style={{ gridTemplateRows: `repeat(${filas}, minmax(0, 1fr))` }}
        >
          {celdas.map((d, i) => (
            <div
              key={i}
              className={cn('border-r border-b overflow-hidden', acento.borde, !d && 'bg-stone-50', i % 7 >= 5 && d && acento.suave)}
              style={{ padding: '1.2mm 1.6mm' }}
            >
              {d && (
                <>
                  <div className={cn('font-bold leading-none', acento.texto)} style={{ fontSize: '11pt' }}>{d}</div>
                  <Editable
                    as="div"
                    valor={c.dias[d - 1] ?? ''}
                    editando={editando}
                    alCambiar={v => cambiarDia(d, v)}
                    vacio="Frase del día…"
                    className="leading-snug text-stone-700"
                    style={{ fontSize: '6.6pt', marginTop: '0.8mm' }}
                  />
                </>
              )}
            </div>
          ))}
        </div>

        {/* El 25 % de abajo: la herramienta del mes y la iniciativa que apoya. */}
        <div className="flex shrink-0" style={{ height: '44mm', marginTop: '3mm', gap: '3mm' }}>
          <Franja franja={c.franja} editando={editando} acento={acento} alCambiar={franja => alCambiar({ franja })} />
          <Iniciativa c={c} editando={editando} acento={acento} alCambiar={iniciativa => alCambiar({ iniciativa })} />
        </div>
      </div>
    </div>
  );
}

function Iniciativa({ c, editando, acento, alCambiar }: {
  c: ContenidoMes; editando: boolean; acento: typeof ACENTOS[number]; alCambiar: (i: NonNullable<ContenidoMes['iniciativa']>) => void;
}) {
  const i = c.iniciativa ?? { nombre: '', texto: '' };
  const vacia = !i.nombre;
  return (
    <div className={cn('flex flex-col rounded-[4mm] overflow-hidden', acento.suave)} style={{ width: '74mm', padding: '3mm 4mm' }}>
      <span className={cn('font-sans font-bold uppercase tracking-[0.18em]', acento.texto)} style={{ fontSize: '7pt' }}>Iniciativa del mes</span>
      <Editable as="p" valor={i.nombre} editando={editando} multilinea={false} alCambiar={v => alCambiar({ ...i, nombre: v })}
        vacio="Iniciativa por elegir" className="font-bold leading-tight text-stone-800" style={{ fontSize: '10pt', marginTop: '1mm' }} />
      {vacia && !editando && <p className="italic text-stone-500" style={{ fontSize: '8pt' }}>Iniciativa por elegir</p>}
      <Editable as="p" valor={i.texto} editando={editando} alCambiar={v => alCambiar({ ...i, texto: v })}
        vacio="Qué hace y por qué la apoyamos…" className="flex-1 leading-snug text-stone-600" style={{ fontSize: '7.5pt', marginTop: '1mm' }} />
      <p className="font-sans italic text-stone-500" style={{ fontSize: '6.5pt' }}>
        Parte de lo recaudado con este calendario apoya a esta iniciativa. Escanea el QR para conocerla y apoyarla.
      </p>
    </div>
  );
}

// ── LA FRANJA: herramienta, juego o dinámica del mes ─────────────────────

const TIPOS: { id: TipoFranja; nombre: string }[] = [
  { id: 'lista', nombre: 'Lista con casillas' },
  { id: 'pasos', nombre: 'Pasos numerados' },
  { id: 'sopa', nombre: 'Sopa de letras' },
  { id: 'texto', nombre: 'Solo texto' },
];

function Franja({ franja: f, editando, acento, alCambiar }: {
  franja: FranjaMes; editando: boolean; acento: typeof ACENTOS[number]; alCambiar: (f: FranjaMes) => void;
}) {
  const cambiar = (c: Partial<FranjaMes>) => alCambiar({ ...f, ...c });
  const sopa = f.tipo === 'sopa' ? generarSopa(f.items) : null;

  return (
    <div className={cn('flex-1 min-w-0 rounded-[4mm] border-2 flex overflow-hidden', acento.borde)} style={{ padding: '3mm 5mm', gap: '4mm' }}>
      <div className="flex flex-col" style={{ width: f.tipo === 'texto' ? '100%' : '58mm', flexShrink: 0 }}>
        {editando && (
          <select
            value={f.tipo}
            onChange={e => cambiar({ tipo: e.target.value as TipoFranja })}
            className="ca-no-imprimir mb-1 self-start rounded border border-stone-300 bg-white px-1 py-0.5 font-sans text-xs"
          >
            {TIPOS.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        )}
        <Editable as="h3" valor={f.titulo} editando={editando} multilinea={false} alCambiar={v => cambiar({ titulo: v })}
          vacio="Título de la herramienta" className={cn('font-sans font-bold uppercase tracking-[0.18em] leading-tight', acento.texto)} style={{ fontSize: '9pt' }} />
        <Editable as="p" valor={f.texto} editando={editando} alCambiar={v => cambiar({ texto: v })}
          vacio="Cómo se usa…" className="leading-snug text-stone-600" style={{ fontSize: '8pt', marginTop: '1.5mm' }} />
      </div>

      {f.tipo !== 'texto' && (
        editando && f.tipo !== 'sopa' ? (
          <ItemsEditables f={f} cambiar={cambiar} />
        ) : f.tipo === 'sopa' && sopa ? (
          <div className="flex flex-1 min-w-0" style={{ gap: '4mm' }}>
            <div className="grid font-sans font-semibold text-stone-700" style={{ gridTemplateColumns: `repeat(${sopa.filas[0].length}, 4.1mm)`, gridAutoRows: '4.1mm', fontSize: '8pt' }}>
              {sopa.filas.flat().map((l, i) => <div key={i} className="flex items-center justify-center">{l}</div>)}
            </div>
            <div className="flex-1 min-w-0">
              {editando ? (
                <ItemsEditables f={f} cambiar={cambiar} ayuda="Una palabra por línea (sin tildes)" />
              ) : (
                <ul className="font-sans text-stone-600 columns-2" style={{ fontSize: '7.5pt', columnGap: '3mm' }}>
                  {f.items.map(normalizarPalabra).filter(Boolean).map(p => (
                    <li key={p} className={cn(!sopa.colocadas.includes(p) && 'line-through text-rose-500')}>{p}</li>
                  ))}
                </ul>
              )}
              {sopa.noCaben.length > 0 && (
                <p className="ca-no-imprimir font-sans text-rose-600" style={{ fontSize: '7pt' }}>
                  No caben en la sopa: {sopa.noCaben.join(', ')}. Acórtalas o quita alguna.
                </p>
              )}
            </div>
          </div>
        ) : (
          <ul className={cn('flex-1 min-w-0 font-sans text-stone-700', f.tipo === 'pasos' ? 'columns-2' : 'columns-3')} style={{ fontSize: '8pt', columnGap: '5mm' }}>
            {f.items.map((it, i) => (
              <li key={i} className="flex items-start break-inside-avoid" style={{ gap: '1.6mm', marginBottom: '1.3mm' }}>
                {f.tipo === 'pasos' ? (
                  <span className={cn('shrink-0 rounded-full text-white text-center font-bold leading-[3.6mm]', acento.fondo)} style={{ width: '3.6mm', height: '3.6mm', fontSize: '6pt' }}>{i + 1}</span>
                ) : (
                  <span className={cn('shrink-0 rounded-full border', acento.borde)} style={{ width: '3.2mm', height: '3.2mm', marginTop: '0.3mm' }} />
                )}
                <span className="leading-snug">{it}</span>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

/** En edición, los elementos de la lista se escriben uno por línea. */
function ItemsEditables({ f, cambiar, ayuda = 'Un elemento por línea' }: { f: FranjaMes; cambiar: (c: Partial<FranjaMes>) => void; ayuda?: string }) {
  return (
    <label className="ca-no-imprimir flex flex-1 min-w-0 flex-col font-sans">
      <span className="text-[10px] text-stone-400">{ayuda}</span>
      <textarea
        defaultValue={f.items.join('\n')}
        key={f.items.join('\n')}
        onBlur={e => {
          const items = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
          if (items.join('\n') !== f.items.join('\n')) cambiar({ items });
        }}
        className="flex-1 resize-none rounded border border-sky-300 bg-white/90 p-1 text-xs leading-snug outline-none focus:ring-2 focus:ring-sky-500"
      />
    </label>
  );
}
