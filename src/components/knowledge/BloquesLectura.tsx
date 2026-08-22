import { FileText, Paperclip } from 'lucide-react';
import { cn } from '../../utils/cn';
import Rejilla from '../tablas/Rejilla';
import ProductoPublico from './ProductoPublico';

// ============================================================================
// LEER UNA PÁGINA — el mismo contenido, sin nada con lo que tocarlo
// ============================================================================
// `Documento.tsx` sabe pintar bloques, pero lo sabe hacer ENTERO: 1.974 líneas
// donde cada bloque va enredado con el bloque activo, el guardado automático,
// el foco del cursor y los menús. Nada de eso existe para quien llega por un
// enlace a leer.
//
// Así que esto es lo que se ve cuando NO se puede escribir, y vive aparte para
// que la página pública no arrastre el editor entero.
//
// ── UNA SOLA TABLA DE ESTILOS ───────────────────────────────────────────────
// `CLASES_TEXTO` se declara AQUÍ y `Documento.tsx` la importa de aquí. Si cada
// uno tuviera la suya, el día que se cambie el tamaño de un título cambiaría en
// una pantalla y no en la otra, y el fallo aparecería en la que nadie mira: la
// pública. Lo que se lee y lo que se escribe tienen que verse igual.
//
// ── LO QUE TODAVÍA NO HACE ──────────────────────────────────────────────────
// Los bloques que apuntan a otra cosa de la plataforma (`producto`,
// `publicacion`, `ventana`) se pintan como una tarjeta con su título y su
// enlace, no con la ficha entera: la ficha necesita datos que un visitante sin
// cuenta no tiene derecho a pedir. Enseñar el título y adónde lleva es honesto;
// inventarse la ficha, no.

export const CLASES_TEXTO: Record<string, string> = {
  parrafo: 'text-[15px] leading-relaxed text-slate-700',
  titulo1: 'text-3xl font-black tracking-tight text-slate-900 mt-4',
  titulo2: 'text-xl font-black text-slate-900 mt-3',
  titulo3: 'text-base font-black text-slate-800 mt-2',
  lista: 'text-[15px] leading-relaxed text-slate-700',
  numerada: 'text-[15px] leading-relaxed text-slate-700',
  tarea: 'text-[15px] leading-relaxed text-slate-700',
  cita: 'text-[15px] leading-relaxed text-slate-600 italic',
  codigo: 'font-mono text-[13px] leading-relaxed text-slate-100 whitespace-pre-wrap',
};

export default function BloquesLectura({ bloques }: { bloques: any[] }) {
  if (!Array.isArray(bloques) || bloques.length === 0) {
    return <p className="text-sm text-slate-400">Esta página todavía no tiene contenido.</p>;
  }
  return (
    <div className="space-y-2.5">
      {bloques.map((b, i) => <Bloque key={b?.id || i} b={b} indice={i} bloques={bloques} />)}
    </div>
  );
}

function Bloque({ b, indice, bloques }: { b: any; indice: number; bloques: any[] }) {
  if (!b || typeof b !== 'object') return null;

  const texto = (extra?: string) => (
    <div className={cn(CLASES_TEXTO[b.tipo] || CLASES_TEXTO.parrafo, extra)}
         style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
      {b.texto || ''}
    </div>
  );

  switch (b.tipo) {
    case 'separador':
      return <hr className="border-slate-200 my-2" />;

    case 'cita':
      return <blockquote className="border-l-[3px] border-emerald-300 pl-3">{texto()}</blockquote>;

    case 'codigo':
      return <pre className="bg-slate-900 rounded-xl px-4 py-3 overflow-x-auto">{texto()}</pre>;

    case 'lista':
    case 'numerada': {
      // El número se cuenta sobre los hermanos seguidos del mismo tipo, igual
      // que en el editor: si no, una lista partida por un párrafo vuelve a
      // empezar en 1 en una pantalla y no en la otra.
      let n = 1;
      if (b.tipo === 'numerada') {
        for (let i = indice - 1; i >= 0 && bloques[i]?.tipo === 'numerada'; i--) n++;
      }
      return (
        <div className="flex gap-2">
          <span className="text-slate-400 select-none shrink-0 w-5 text-right leading-relaxed text-[15px]">
            {b.tipo === 'lista' ? '•' : `${n}.`}
          </span>
          {texto('flex-1 min-w-0')}
        </div>
      );
    }

    case 'tarea':
      return (
        <div className="flex gap-2 items-start">
          {/* Marcado o no, pero apagado: quien lee no cambia la lista de otro. */}
          <input type="checkbox" checked={!!b.hecho} disabled readOnly
                 className="mt-1.5 accent-emerald-600 shrink-0" />
          {texto(cn('flex-1 min-w-0', b.hecho && 'line-through text-slate-400'))}
        </div>
      );

    case 'imagen':
      if (!b.url) return null;
      return (
        <figure>
          <img src={b.url} alt={b.pie || ''} loading="lazy"
               className="w-full rounded-xl border border-slate-200" />
          {b.pie && <figcaption className="text-xs text-slate-400 mt-1">{b.pie}</figcaption>}
        </figure>
      );

    case 'medio': {
      const pie = b.pie ? <figcaption className="text-xs text-slate-400 mt-1">{b.pie}</figcaption> : null;
      if (b.medio === 'video') {
        return (
          <figure>
            <video src={b.url} controls playsInline preload="metadata"
                   className="w-full rounded-xl bg-black max-h-[70vh]" />
            {pie}
          </figure>
        );
      }
      if (b.medio === 'youtube' || b.medio === 'vimeo') {
        const src = b.medio === 'youtube'
          ? `https://www.youtube.com/embed/${b.medioId}`
          : `https://player.vimeo.com/video/${b.medioId}`;
        return (
          <figure>
            <div className="aspect-video rounded-xl overflow-hidden bg-black">
              <iframe src={src} title={b.pie || 'Vídeo'} className="w-full h-full"
                      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen />
            </div>
            {pie}
          </figure>
        );
      }
      if (b.medio === 'audio') {
        return (
          <figure className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <audio src={b.url} controls preload="none" className="w-full" />
            {pie}
          </figure>
        );
      }
      // PDF y archivo: tarjeta con el nombre y el enlace, la misma decisión que
      // tomó Eugenio para el editor el 2026-08-22 (un visor de 70vh parte la
      // lectura en dos).
      return (
        <a href={b.url} target="_blank" rel="noopener noreferrer"
           className="flex items-center gap-3 p-2.5 border border-slate-200 rounded-xl bg-white hover:border-emerald-300 transition-colors">
          <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm text-slate-700 truncate">{b.pie || 'Archivo adjunto'}</span>
        </a>
      );
    }

    case 'tabla': {
      const filas: string[][] = Array.isArray(b.filas) ? b.filas : [];
      if (filas.length === 0) return null;
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <tbody>
              {filas.map((fila, fi) => (
                <tr key={fi}>
                  {fila.map((celda, ci) => (
                    <td key={ci}
                        className={cn('border border-slate-200 px-2.5 py-1.5 align-top',
                          fi === 0 ? 'bg-slate-50 font-bold text-slate-800' : 'text-slate-600')}>
                      {celda}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'basedatos':
      // La tabla de verdad, en modo mirar. `Rejilla` ya sabe no dejar escribir.
      return b.tablaId ? <Rejilla tablaId={b.tablaId} editable={false} alto={520} /> : null;

    case 'producto':
      // Ficha de verdad: foto, precio y disponibilidad. Ver `ProductoPublico`
      // para por qué todavía no lleva botón de comprar.
      return b.entityId
        ? <ProductoPublico id={b.entityId} titulo={b.pubTitulo || b.texto} />
        : null;

    case 'publicacion':
    case 'ventana':
      // Ver la nota de arriba: título y destino, no la ficha entera.
      return (
        <a href={b.pubUrl || '#'} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-white hover:border-emerald-300 transition-colors">
          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm font-bold text-slate-700 truncate">{b.pubTitulo || b.texto || 'Contenido enlazado'}</span>
        </a>
      );

    default:
      // Un tipo de bloque que esta pantalla no conoce todavía. Se enseña su
      // texto si lo tiene y se calla si no: nunca un hueco sin explicación ni
      // un `[object Object]`.
      return b.texto ? texto() : null;
  }
}
