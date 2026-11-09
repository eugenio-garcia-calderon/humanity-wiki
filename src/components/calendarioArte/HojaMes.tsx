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
import { Check, FolderOpen, ImagePlus, Loader2, Plus, Printer, Sparkles, Star, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { ContenidoMes, FranjaMes, TipoFranja } from '../../data/calendarioArteTipos';
import { Editable } from './Editable';
import { Button } from '../ui/core';
import { CodigoQR, urlConocerMas } from './CodigoQR';

export const NOMBRES_MES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/** Un acento por mes, en clases de Tailwind (nada de colores a mano). */
export const ACENTOS: { texto: string; borde: string; fondo: string; suave: string }[] = [
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
  /** Abre la carpeta del mes para elegir otra ilustración guardada. */
  alAbrirCarpeta?: () => void;
  subiendoImagen?: boolean;
  /** LOS DISEÑOS (2026-11-05). Eugenio: «un botón que permita transicionar
   *  entre el diseño 1 y el diseño 2, bastante evidente, en la esquina superior
   *  izquierda»; después el 3, la estrella de favorito y «Crear nuevo diseño».
   *  Solo en pantalla: al imprimir no se pasa y sale `imagen`, la elegida. */
  disenos?: DisenoVista[];
  /** El que se está mirando (por defecto, el favorito). */
  visto?: string;
  favorito?: string;
  alVer?: (url: string) => void;
  alFavorito?: (url: string) => void;
  /** Diseños pedidos con el botón que aún no están listos. */
  encargos?: EncargoDiseno[];
  alCrearDiseno?: () => void;
  /** En el «calendario completo» (los doce meses seguidos) las ilustraciones se
   *  cargan al acercarse, no las veinticuatro de golpe. NUNCA en la copia que
   *  se imprime: está fuera de pantalla, no se cargarían y la impresión
   *  esperaría para siempre a que terminaran. */
  perezosa?: boolean;
}

/** Un diseño en el selector: su imagen y su número («Diseño 3»). */
export interface DisenoVista { url: string; n: number; generado?: boolean; nota?: string | null }
/** Un diseño pedido que todavía no está: en cola, dibujándose o fallido. */
export interface EncargoDiseno { id: number; mes: number; estado: 'en_cola' | 'dibujando' | 'error'; listo_hacia: string | null; prompt: string; nota?: string | null }

/** «hacia las 15:40» o «mañana hacia las 9:10». */
export function horaDe(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const hoy = new Date();
  const hora = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === hoy.toDateString() ? `hacia las ${hora}` : `el ${d.toLocaleDateString('es-ES', { weekday: 'long' })} hacia las ${hora}`;
}

export function HojaMes({ anio, contenido: c, editando, alCambiar, alElegirImagen, alAbrirCarpeta, subiendoImagen, disenos, visto: vistoProp, favorito, alVer, alFavorito, encargos, alCrearDiseno, perezosa }: Props) {
  const acento = ACENTOS[(c.mes - 1) % 12];
  const esBoceto = !!c.imagen?.startsWith('/calendario-arte/bocetos/');
  // Si la imagen no carga, se dice («ilustración pendiente») en vez de
  // imprimir el icono de imagen rota del navegador.
  const [imagenRota, setImagenRota] = useState<string | null>(null);
  const nombre = NOMBRES_MES[c.mes - 1];

  // Con varios diseños se apilan las imágenes y se funde de una a otra. Solo
  // se cargan las que alguien ha mirado: tres o más ilustraciones de imprenta
  // por mes, en el calendario completo, serían más de cien megas de golpe.
  const comparar = !!(alVer && disenos && disenos.length > 0);
  const visto = comparar ? (vistoProp ?? c.imagen) : c.imagen;
  const nVisto = disenos?.find(d => d.url === visto)?.n;
  const [cargadas, setCargadas] = useState<string[]>([]);
  const apiladas = comparar ? disenos!.filter(d => d.url === visto || cargadas.includes(d.url)) : [];
  if (comparar && visto && !cargadas.includes(visto)) setCargadas(v => [...v, visto]);

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
      className="ca-hoja relative bg-white text-stone-800 overflow-hidden"
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
            className={cn('ca-titulo font-semibold uppercase leading-none', acento.texto)}
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
        <div className="group relative flex-1 overflow-hidden" style={{ margin: '0 9mm 9mm', borderRadius: '3mm' }}>
          {comparar ? (
            // Una encima de otra: cambiar de diseño es un fundido, no un salto.
            apiladas.map(d => (
              <img
                key={d.url}
                src={d.url}
                loading={perezosa ? 'lazy' : undefined}
                alt={`Ilustración de ${nombre}: ${c.tema} (diseño ${d.n})`}
                className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-in-out"
                style={{ objectPosition: `${c.imagen_x ?? 50}% ${c.imagen_y ?? 50}%`, opacity: visto === d.url ? 1 : 0 }}
              />
            ))
          ) : c.imagen && imagenRota !== c.imagen ? (
            <img
              src={c.imagen}
              loading={perezosa ? 'lazy' : undefined}
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
          {comparar && (
            <div className="ca-no-imprimir absolute left-4 top-4 z-10 flex max-w-[70%] flex-col items-start gap-2 font-sans">
              <div role="radiogroup" aria-label="Diseño de la ilustración" className="flex flex-wrap rounded-[1.6rem] bg-white/95 p-1.5 shadow-xl ring-1 ring-black/10">
                {disenos!.map(d => (
                  <button
                    key={d.url}
                    type="button"
                    role="radio"
                    aria-checked={visto === d.url}
                    onClick={() => alVer!(d.url)}
                    title={d.nota || undefined}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-base font-bold transition-colors',
                      visto === d.url ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100',
                    )}
                  >
                    Diseño {d.n}
                    {favorito === d.url && <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-label="favorito" />}
                    {c.imagen === d.url && <Printer className="h-3.5 w-3.5 opacity-70" aria-label="se imprime" />}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {visto === favorito ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1.5 text-sm font-bold text-stone-900 shadow-lg">
                    <Star className="h-4 w-4 fill-stone-900" />Tu favorito
                  </span>
                ) : editando && alFavorito && visto && (
                  <Button type="button" variant="outline" onClick={() => alFavorito(visto)} className="gap-1.5 rounded-full bg-white/95 shadow-lg hover:bg-white">
                    <Star className="h-4 w-4 text-amber-500" />Marcar como favorito
                  </Button>
                )}
                {visto === c.imagen ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white"><Check className="h-3.5 w-3.5" />Es el que se imprime</span>
                ) : editando && visto && (
                  <Button type="button" variant="outline" onClick={() => alCambiar({ imagen: visto })} className="gap-1.5 rounded-full bg-white/95 shadow-lg hover:bg-white">
                    <Printer className="h-4 w-4" />Imprimir el diseño {nVisto}
                  </Button>
                )}
              </div>
            </div>
          )}
          {/* «Crear nuevo diseño» y lo que está en camino: abajo a la derecha. */}
          {(alCrearDiseno || (encargos && encargos.length > 0)) && (
            <div className="ca-no-imprimir absolute bottom-4 right-4 z-10 flex max-w-[60%] flex-col items-end gap-2 font-sans">
              {encargos?.map(e => (
                <span key={e.id} title={e.prompt}
                  className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold shadow-lg',
                    e.estado === 'error' ? 'bg-rose-600 text-white' : 'bg-white/95 text-stone-700 ring-1 ring-black/10')}>
                  {e.estado === 'error' ? <X className="h-3.5 w-3.5" /> : <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {e.estado === 'error'
                    ? `Diseño nuevo: no se pudo dibujar${e.nota ? ` (${e.nota.slice(0, 80)})` : ''}`
                    : e.estado === 'dibujando'
                      ? `Dibujando un diseño nuevo${horaDe(e.listo_hacia) ? ` · listo ${horaDe(e.listo_hacia)}` : '…'}`
                      : `Diseño nuevo en cola${horaDe(e.listo_hacia) ? ` · listo ${horaDe(e.listo_hacia)}` : ''}`}
                </span>
              ))}
              {alCrearDiseno && editando && (
                <Button type="button" onClick={alCrearDiseno} className="gap-2 rounded-full shadow-xl">
                  <Sparkles className="h-4 w-4" />Crear nuevo diseño
                </Button>
              )}
            </div>
          )}
          {esBoceto && (
            <span className="ca-no-imprimir absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 font-sans text-xs font-semibold text-white">
              Boceto de composición — no es la ilustración final
            </span>
          )}
          {/* Al pasar por la ilustración: elegir otra de la carpeta o subir una
              nueva. En el móvil (sin «pasar por encima») se ven siempre. */}
          {editando && (alElegirImagen || alAbrirCarpeta) && (
            <div className="ca-no-imprimir absolute right-4 top-4 flex gap-2 transition-opacity md:opacity-0 md:group-hover:opacity-100">
              {alAbrirCarpeta && (
                <Button type="button" variant="outline" onClick={alAbrirCarpeta} className="gap-2 rounded-full bg-white/95 font-sans shadow-lg hover:bg-white">
                  <FolderOpen className="h-4 w-4" />Elegir de la carpeta
                </Button>
              )}
              {alElegirImagen && (
                <Button type="button" variant="outline" onClick={alElegirImagen} className="gap-2 rounded-full bg-white/95 font-sans shadow-lg hover:bg-white">
                  {subiendoImagen ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {c.imagen ? 'Subir otra' : 'Subir ilustración'}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── HOJA 2 (A4 apaisado): CALENDARIO 75 % + HERRAMIENTA 25 % ─────── */}
      {/* 2026-11-05, Eugenio: cabecera y franja más bajas para que los
          cuadrados de los días crezcan y quede sitio para anotar. */}
      <div className="ca-mitad flex flex-col" style={{ height: '210mm', padding: '4.5mm 9mm 6mm' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '1.5mm' }}>
          <div className="flex items-baseline" style={{ gap: '4mm' }}>
            <h3 className={cn('ca-titulo font-bold leading-none', acento.texto)} style={{ fontSize: '22pt' }}>{nombre}</h3>
            <Editable
              valor={c.subtitulo}
              editando={editando}
              multilinea={false}
              alCambiar={v => alCambiar({ subtitulo: v })}
              vacio="Subtítulo del mes"
              className="italic text-stone-500"
              style={{ fontSize: '10pt' }}
            />
          </div>
          <div className="flex items-center" style={{ gap: '3mm' }}>
            <div className="text-right leading-none">
              <span className="font-sans uppercase tracking-[0.25em] text-stone-400" style={{ fontSize: '7pt' }}>Arte para la Humanidad</span>
              <span className={cn('block font-bold', acento.texto)} style={{ fontSize: '14pt' }}>{anio}</span>
            </div>
            {/* El QR, pequeño y en la esquina: lleva a «Conocer más» del tema. */}
            <div className="flex flex-col items-center leading-none">
              <CodigoQR url={c.qr_url || urlConocerMas(c.mes)} lado="11mm" />
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
                // El número y, a continuación en la misma línea, la frase
                // (Eugenio: «aprovecha el espacio al lado del número… para que
                // haya un hueco más grande debajo para anotar cosas»).
                <div className="leading-snug text-stone-700" style={{ fontSize: '9pt' }}>
                  <span className={cn('ca-titulo font-bold', acento.texto)} style={{ fontSize: '14pt', lineHeight: 1, marginRight: '1.3mm' }}>{d}</span>
                  <Editable
                    as="span"
                    valor={c.dias[d - 1] ?? ''}
                    editando={editando}
                    alCambiar={v => cambiarDia(d, v)}
                    vacio="Frase del día…"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* El 25 % de abajo, en tres recuadros iguales (2026-11-09, Eugenio):
            la herramienta del mes, «Mi reto personal del mes» para escribir a
            mano, y la iniciativa que apoya lo recaudado. */}
        <div className="grid shrink-0 grid-cols-3" style={{ height: '41mm', marginTop: '2.5mm', gap: '3mm' }}>
          <Franja franja={c.franja} editando={editando} acento={acento} alCambiar={franja => alCambiar({ franja })} />
          <Reto c={c} editando={editando} acento={acento} alCambiar={reto => alCambiar({ reto })} />
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
    <div className={cn('flex min-w-0 flex-col rounded-[4mm] overflow-hidden', acento.suave)} style={{ padding: '2.6mm 4mm' }}>
      <span className={cn('font-sans font-bold uppercase tracking-[0.18em]', acento.texto)} style={{ fontSize: '7pt' }}>Iniciativa del mes</span>
      <Editable as="p" valor={i.nombre} editando={editando} multilinea={false} alCambiar={v => alCambiar({ ...i, nombre: v })}
        vacio="Iniciativa por elegir" className="ca-titulo font-bold leading-tight text-stone-800" style={{ fontSize: '10pt', marginTop: '1mm' }} />
      {vacia && !editando && <p className="italic text-stone-500" style={{ fontSize: '8pt' }}>Iniciativa por elegir</p>}
      <Editable as="p" valor={i.texto} editando={editando} alCambiar={v => alCambiar({ ...i, texto: v })}
        vacio="Qué hace y por qué la apoyamos…" className="flex-1 leading-snug text-stone-600" style={{ fontSize: '7.5pt', marginTop: '1mm' }} />
      <p className="font-sans italic text-stone-500" style={{ fontSize: '6.5pt' }}>
        Parte de lo recaudado con este calendario apoya a esta iniciativa. Escanea el QR para conocerla y apoyarla.
      </p>
    </div>
  );
}

/** «Mi reto personal del mes»: una pregunta y renglones para escribir a mano. */
function Reto({ c, editando, acento, alCambiar }: {
  c: ContenidoMes; editando: boolean; acento: typeof ACENTOS[number]; alCambiar: (r: string) => void;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col overflow-hidden rounded-[4mm] border-2 border-dashed', acento.borde)} style={{ padding: '2.6mm 4mm' }}>
      <span className={cn('font-sans font-bold uppercase tracking-[0.18em]', acento.texto)} style={{ fontSize: '7pt' }}>Mi reto personal del mes</span>
      <Editable as="p" valor={c.reto ?? ''} editando={editando} alCambiar={alCambiar}
        vacio="Una pregunta que invite a proponerse un reto…" className="italic leading-snug text-stone-600" style={{ fontSize: '8pt', marginTop: '1mm' }} />
      {/* Renglones para escribir a mano: líneas finas cada 6 mm. */}
      <div className="min-h-0 flex-1" aria-hidden style={{
        marginTop: '1.5mm',
        backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent calc(6mm - 0.25mm), rgb(168 162 158 / 0.7) calc(6mm - 0.25mm), rgb(168 162 158 / 0.7) 6mm)',
      }} />
    </div>
  );
}

// ── LA FRANJA: herramienta, juego o dinámica del mes ─────────────────────
// 2026-11-09: un tercio del ancho y en una sola columna. Eugenio pidió
// «simplificar los cuadraditos… en cosas más sencillas y no sopas de letras»:
// el tipo «sopa» ya no se ofrece; si quedó guardado en algún mes, se pinta
// como lista.

const TIPOS: { id: TipoFranja; nombre: string }[] = [
  { id: 'lista', nombre: 'Lista con casillas' },
  { id: 'pasos', nombre: 'Pasos numerados' },
  { id: 'texto', nombre: 'Solo texto' },
];

function Franja({ franja: f, editando, acento, alCambiar }: {
  franja: FranjaMes; editando: boolean; acento: typeof ACENTOS[number]; alCambiar: (f: FranjaMes) => void;
}) {
  const cambiar = (c: Partial<FranjaMes>) => alCambiar({ ...f, ...c });
  const cambiarItem = (i: number, v: string) => {
    const items = [...f.items];
    if (v) items[i] = v; else items.splice(i, 1);
    cambiar({ items });
  };
  const quitar = (i: number) => cambiar({ items: f.items.filter((_, k) => k !== i) });
  const anadir = () => cambiar({ items: [...f.items, 'Nuevo elemento'] });

  /** Cada elemento se edita en su sitio, como cualquier otro texto de la hoja.
   *  Funciones que devuelven JSX y NO componentes: un componente declarado aquí
   *  dentro sería «otro» en cada pintado y React desmontaría el campo mientras
   *  alguien escribe en él. */
  const item = (it: string, i: number) => (
    <span className="group/item relative min-w-0 flex-1">
      <Editable valor={it} editando={editando} multilinea={false} alCambiar={v => cambiarItem(i, v)} className="leading-snug" />
      {editando && (
        <button type="button" onClick={() => quitar(i)} aria-label="Quitar"
          className="ca-no-imprimir absolute -right-1 -top-1 hidden h-4 w-4 place-items-center rounded-full bg-stone-700 text-white group-hover/item:grid">
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
  const botonAnadir = (texto: string) => editando ? (
    <button type="button" onClick={anadir}
      className="ca-no-imprimir inline-flex items-center gap-1 rounded-full border border-dashed border-stone-300 px-2 font-sans text-stone-400 opacity-0 transition-opacity hover:border-stone-500 hover:text-stone-600 group-hover:opacity-100"
      style={{ fontSize: '7pt' }}>
      <Plus className="h-3 w-3" />{texto}
    </button>
  ) : null;

  const esPasos = f.tipo === 'pasos';
  return (
    <div className={cn('group relative flex min-w-0 flex-col overflow-hidden rounded-[4mm] border-2', acento.borde)} style={{ padding: '2.6mm 4mm' }}>
      {editando && (
        <select
          value={f.tipo === 'sopa' ? 'lista' : f.tipo}
          onChange={e => cambiar({ tipo: e.target.value as TipoFranja })}
          title="Tipo de herramienta"
          className="ca-no-imprimir absolute right-2 top-2 z-10 rounded border border-stone-300 bg-white px-1 py-0.5 font-sans text-xs opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
        >
          {TIPOS.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
      )}
      <Editable as="h3" valor={f.titulo} editando={editando} multilinea={false} alCambiar={v => cambiar({ titulo: v })}
        vacio="Título de la herramienta" className={cn('font-sans font-bold uppercase tracking-[0.18em] leading-tight', acento.texto)} style={{ fontSize: '7pt' }} />
      <Editable as="p" valor={f.texto} editando={editando} alCambiar={v => cambiar({ texto: v })}
        vacio="Cómo se usa…" className="italic leading-snug text-stone-600" style={{ fontSize: '7.4pt', marginTop: '0.8mm' }} />
      {f.tipo !== 'texto' && (
        <ul className="font-sans text-stone-700" style={{ fontSize: '7.6pt', marginTop: '1.4mm' }}>
          {f.items.map((it, i) => (
            <li key={i} className="flex items-start" style={{ gap: '1.6mm', marginBottom: '0.8mm' }}>
              {esPasos ? (
                <span className={cn('shrink-0 rounded-full text-white text-center font-bold leading-[3.6mm]', acento.fondo)} style={{ width: '3.6mm', height: '3.6mm', fontSize: '6pt' }}>{i + 1}</span>
              ) : (
                <span className={cn('shrink-0 rounded-full border', acento.borde)} style={{ width: '3.2mm', height: '3.2mm', marginTop: '0.3mm' }} />
              )}
              {item(it, i)}
            </li>
          ))}
          {editando && <li>{botonAnadir('Añadir')}</li>}
        </ul>
      )}
    </div>
  );
}
