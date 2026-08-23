import { useState } from 'react';
import { FileText, Paperclip, ChevronRight, Info, AlertTriangle, Lightbulb, CheckCircle2, List } from 'lucide-react';
import { cn } from '../../utils/cn';
import Rejilla from '../tablas/Rejilla';
import ProductoPublico from './ProductoPublico';
import { Portada, RejillaProductos, Columnas, Franja } from './BloquesMaqueta';

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

  // LOS TÍTULOS LLEVAN ANCLA. Sin ella, el índice enlaza a `#algo` que no
  // existe en la página y el navegador no salta a ninguna parte: un índice que
  // se ve bien y no funciona. Se pone sólo en los títulos porque es lo único a
  // lo que se salta, y `scroll-mt` deja aire arriba para que el título no
  // quede pegado al borde al llegar.
  const esTitulo = b.tipo === 'titulo1' || b.tipo === 'titulo2' || b.tipo === 'titulo3';

  const texto = (extra?: string) => (
    <div id={esTitulo && b.id ? String(b.id) : undefined}
         className={cn(CLASES_TEXTO[b.tipo] || CLASES_TEXTO.parrafo, esTitulo && 'scroll-mt-20', extra)}
         style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
      {b.texto || ''}
    </div>
  );

  switch (b.tipo) {
    case 'separador':
      return <hr className="border-slate-200 my-2" />;

    case 'desplegable':
      return <Desplegable b={b} />;

    case 'aviso':
      return <Aviso b={b} />;

    case 'indice':
      // El índice necesita ver la página entera, no sólo su bloque.
      return <Indice bloques={bloques} />;

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
        // YOUTUBE SIN COOKIES (2026-08-22). `youtube-nocookie.com` es el mismo
        // reproductor sin la cookie de seguimiento: existe exactamente para
        // incrustarse en la web de otro sin dejarle a Google un rastro de quién ha
        // mirado qué. La decisión ya estaba tomada —el Navegador y el Juego lo usaban
        // desde antes— y aquí no se había aplicado: cuatro sitios, dos criterios.
        // Importa además para la ficha de las tiendas, donde hay que DECLARAR con qué
        // terceros se comparte y para qué.
          ? `https://www.youtube-nocookie.com/embed/${b.medioId}`
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

    // ── LOS BLOQUES DE MAQUETACIÓN (fase 9) ────────────────────────────
    // Sólo se ven al leer. En el editor se siguen tratando como bloques
    // normales, así que una página con portada se puede seguir editando sin
    // que el editor sepa dibujarla todavía.
    case 'portada':
      return <Portada b={b} />;

    case 'rejilla':
      return <RejillaProductos b={b} />;

    case 'columnas':
      return <Columnas b={b} Dentro={BloquesLectura} />;

    case 'franja':
      return <Franja b={b} Dentro={BloquesLectura} />;

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

/**
 * UN DESPLEGABLE — un título que esconde lo de dentro.
 *
 * Es lo que hace legible una página larga. Sin él todo está siempre abierto, y
 * hay que leerlo entero para saber si te interesa algo.
 *
 * ── ABIERTO O CERRADO LO DECIDE QUIEN ESCRIBE, NO QUIEN LEE ─────────────────
 * `b.abierto` viene del documento: quien lo escribió decide si al llegar se ve
 * abierto o cerrado. Guardar el estado de cada lector obligaría a saber quién
 * es, y quien lee una página pública no tiene por qué serlo.
 *
 * Se usa `<details>` del navegador y no un `useState` propio: así funciona sin
 * JavaScript, el buscador de la página (Ctrl+F) encuentra lo de dentro aunque
 * esté cerrado, y el teclado lo abre solo.
 */
function Desplegable({ b }: { b: any }) {
  const dentro: any[] = Array.isArray(b.bloques) ? b.bloques : [];
  return (
    <details open={b.abierto === true} className="group">
      <summary className="flex items-start gap-2 cursor-pointer list-none py-1 -ml-1 pl-1 rounded-lg hover:bg-slate-50">
        <ChevronRight className="w-4 h-4 mt-1 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
        <span className="text-[15px] font-bold text-slate-800 leading-relaxed">
          {b.texto || 'Sin título'}
        </span>
      </summary>
      <div className="ml-6 mt-1 space-y-2.5">
        {/* Dos formas de tener contenido, y las dos valen: bloques anidados
            —lo que llegará cuando el editor sepa anidar— o el texto del propio
            bloque, que es como se escribe hoy. Aceptar sólo la primera dejaría
            vacío todo lo que se escriba con el editor actual. */}
        {dentro.length > 0
          ? <BloquesLectura bloques={dentro} />
          : b.detalle
            ? <p className="text-[15px] leading-relaxed text-slate-700"
                 style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{b.detalle}</p>
            : <p className="text-sm text-slate-400">Aquí todavía no hay nada.</p>}
      </div>
    </details>
  );
}

/**
 * UN AVISO — el recuadro con icono.
 *
 * Para lo que hay que destacar sin gritar en mayúsculas ni poner tres signos
 * de admiración.
 *
 * Cuatro tonos y ninguno más, de una lista cerrada. Un color libre acaba en
 * texto ilegible sobre su propio fondo, y en veinte páginas con veinte
 * amarillos distintos.
 */
const AVISOS: Record<string, { fondo: string; borde: string; texto: string; Icono: any }> = {
  info:    { fondo: 'bg-sky-50',     borde: 'border-sky-200',     texto: 'text-sky-900',     Icono: Info },
  ojo:     { fondo: 'bg-amber-50',   borde: 'border-amber-200',   texto: 'text-amber-900',   Icono: AlertTriangle },
  idea:    { fondo: 'bg-violet-50',  borde: 'border-violet-200',  texto: 'text-violet-900',  Icono: Lightbulb },
  hecho:   { fondo: 'bg-emerald-50', borde: 'border-emerald-200', texto: 'text-emerald-900', Icono: CheckCircle2 },
};

function Aviso({ b }: { b: any }) {
  const t = AVISOS[typeof b.tono === 'string' ? b.tono : ''] || AVISOS.info;
  const dentro: any[] = Array.isArray(b.bloques) ? b.bloques : [];
  return (
    <div className={`flex gap-3 p-3.5 rounded-xl border ${t.fondo} ${t.borde}`}>
      <t.Icono className={`w-4 h-4 shrink-0 mt-0.5 ${t.texto}`} />
      <div className={`min-w-0 flex-1 text-[15px] leading-relaxed ${t.texto}`}>
        {dentro.length > 0
          ? <BloquesLectura bloques={dentro} />
          : <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{b.texto || ''}</p>}
      </div>
    </div>
  );
}

/**
 * EL ÍNDICE — la lista de títulos de esta misma página.
 *
 * NO GUARDA NADA. Se calcula al pintar, recorriendo los bloques que ya están
 * ahí. Un índice guardado se queda viejo en cuanto alguien cambia un título, y
 * entonces miente sobre su propia página — que es peor que no tenerlo.
 *
 * Los enlaces llevan al bloque por su `id`, que ya es único dentro de la
 * página. Sin `id` no se puede saltar, así que ese título se lista sin enlace
 * en vez de con uno roto.
 */
function Indice({ bloques }: { bloques: any[] }) {
  const titulos = (bloques || []).filter(b =>
    b && (b.tipo === 'titulo1' || b.tipo === 'titulo2' || b.tipo === 'titulo3')
    && typeof b.texto === 'string' && b.texto.trim());

  if (titulos.length === 0) {
    // Sin títulos no hay índice, y decirlo es mejor que dejar un hueco: quien
    // lo puso sabe entonces que le faltan títulos, no que el bloque falle.
    return (
      <p className="text-sm text-slate-400 flex items-center gap-1.5">
        <List className="w-3.5 h-3.5" /> El índice aparecerá cuando la página tenga títulos.
      </p>
    );
  }

  return (
    <nav className="my-2 py-2 pl-3 border-l-2 border-slate-200">
      <ul className="space-y-1">
        {titulos.map((t, i) => (
          <li key={t.id || i}
              className={t.tipo === 'titulo3' ? 'ml-6' : t.tipo === 'titulo2' ? 'ml-3' : ''}>
            {t.id
              ? <a href={`#${t.id}`} className="text-sm text-slate-600 hover:text-slate-900 hover:underline">
                  {t.texto}
                </a>
              : <span className="text-sm text-slate-600">{t.texto}</span>}
          </li>
        ))}
      </ul>
    </nav>
  );
}
