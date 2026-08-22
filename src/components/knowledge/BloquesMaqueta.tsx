import type React from 'react';
import ProductoPublico from './ProductoPublico';

// ============================================================================
// MAQUETACIÓN — fase 9 del plan de tiendas (2026-08-22)
// ============================================================================
// Eugenio: «dentro de scope es también crear landing pages y una web
// atractivas con múltiples productos».
//
// Hasta aquí una página publicada era UNA COLUMNA de bloques, uno debajo de
// otro. Sirve para leer y no sirve para vender: una tienda con seis tarros en
// fila es una lista de la compra, no un escaparate.
//
// Tres bloques nuevos, y ninguno inventa una manera nueva de guardar nada: son
// bloques normales dentro del mismo `config.bloques`, así que una página vieja
// sigue funcionando y una nueva no necesita otra tabla.
//
// ── POR QUÉ NO UN CONSTRUCTOR DE ARRASTRAR Y SOLTAR ─────────────────────────
// Porque lo que hace falta primero es que EXISTAN las formas. Un editor visual
// sobre tres formas que no existen no se puede probar; tres formas que se ven
// bien se pueden poner desde el editor de bloques que ya hay, y el arrastrar
// llega después sabiendo qué se arrastra.

// ── LOS COLORES DE UNA PÁGINA ───────────────────────────────────────────────
// Se eligen de una lista corta y cerrada, no de un campo de texto libre. Un
// color escrito a mano en cada página son 24 colores sueltos en un mes —ya
// pasó en este proyecto y está contado en `src/pages/CLAUDE.md`— y además deja
// meter `#fff` sobre blanco, que es una página en blanco con texto invisible.
const TONOS: Record<string, { fondo: string; texto: string; suave: string }> = {
  pizarra: { fondo: 'bg-slate-900', texto: 'text-white', suave: 'bg-slate-50' },
  verde:   { fondo: 'bg-emerald-700', texto: 'text-white', suave: 'bg-emerald-50' },
  ambar:   { fondo: 'bg-amber-600', texto: 'text-white', suave: 'bg-amber-50' },
  indigo:  { fondo: 'bg-indigo-700', texto: 'text-white', suave: 'bg-indigo-50' },
  rosa:    { fondo: 'bg-rose-600', texto: 'text-white', suave: 'bg-rose-50' },
  arena:   { fondo: 'bg-stone-200', texto: 'text-stone-900', suave: 'bg-stone-50' },
};

function tono(nombre: unknown) {
  return TONOS[typeof nombre === 'string' ? nombre : ''] || TONOS.pizarra;
}

/**
 * LA PORTADA — lo primero que se ve al abrir una tienda.
 *
 * Un título grande, una frase, y opcionalmente una foto de fondo y un botón.
 * Es la diferencia entre «una página de alguien» y «la tienda de alguien».
 */
export function Portada({ b }: { b: any }) {
  const t = tono(b.tono);
  const conFoto = typeof b.imagen === 'string' && b.imagen;

  return (
    <section className={`relative -mx-5 sm:-mx-8 mb-8 overflow-hidden ${conFoto ? '' : t.fondo}`}>
      {conFoto && (
        <>
          <img src={b.imagen} alt="" className="absolute inset-0 w-full h-full object-cover" />
          {/* La capa oscura no es decoración: sin ella, un texto blanco sobre
              una foto clara no se lee. Y quien sube la foto no sabe todavía
              qué foto subirá mañana. */}
          <div className="absolute inset-0 bg-slate-900/55" />
        </>
      )}
      <div className={`relative px-6 sm:px-10 py-12 sm:py-20 ${conFoto ? 'text-white' : t.texto}`}>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.1] max-w-2xl">
          {b.titulo || ''}
        </h1>
        {b.subtitulo && (
          <p className="mt-3 text-base sm:text-lg opacity-90 max-w-xl">{b.subtitulo}</p>
        )}
        {b.boton_texto && (
          <a href={typeof b.boton_url === 'string' ? b.boton_url : '#'}
             className="inline-block mt-6 h-12 leading-[3rem] px-6 rounded-xl bg-white text-slate-900 text-sm font-black">
            {b.boton_texto}
          </a>
        )}
      </div>
    </section>
  );
}

/**
 * LA REJILLA DE PRODUCTOS — varios a la vez, no en fila india.
 *
 * En móvil siempre UNA columna, pase lo que pase. Dos tarjetas de producto a
 * 375 px son dos columnas de 160 px donde no cabe ni el precio junto a la
 * disponibilidad, y en móvil es donde se mira casi todo.
 */
export function RejillaProductos({ b }: { b: any }) {
  const ids: string[] = Array.isArray(b.productos)
    ? b.productos.filter((x: any) => typeof x === 'string').slice(0, 24)
    : [];
  if (ids.length === 0) return null;

  const columnas = b.columnas === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';

  return (
    <section className="my-6">
      {b.titulo && <h2 className="text-xl font-black text-slate-900 mb-4">{b.titulo}</h2>}
      <div className={`grid grid-cols-1 ${columnas} gap-4`}>
        {ids.map(id => <ProductoPublico key={id} id={id} />)}
      </div>
    </section>
  );
}

/**
 * DOS O TRES COLUMNAS de contenido.
 *
 * Cada columna es una lista de bloques normales, así que dentro cabe lo mismo
 * que fuera. Se apilan en móvil por la misma razón que la rejilla.
 *
 * `Dentro` se recibe como prop en vez de importarse: `BloquesLectura` ya
 * importa este fichero, e importarlo de vuelta sería un círculo que Vite
 * resuelve a veces y otras no.
 */
export function Columnas({ b, Dentro }: { b: any; Dentro: (p: { bloques: any[] }) => React.ReactElement }) {
  const cols: any[][] = Array.isArray(b.columnas)
    ? b.columnas.filter(Array.isArray).slice(0, 3)
    : [];
  if (cols.length === 0) return null;

  const rejilla = cols.length === 3 ? 'sm:grid-cols-3' : cols.length === 2 ? 'sm:grid-cols-2' : '';

  return (
    <section className={`my-6 grid grid-cols-1 ${rejilla} gap-6`}>
      {cols.map((bloques, i) => (
        <div key={i} className="min-w-0">
          {/* Misma razón que en la franja: una columna vacía se queda vacía,
              no anuncia que la página no tiene nada. */}
          {bloques.length > 0 && <Dentro bloques={bloques} />}
        </div>
      ))}
    </section>
  );
}

/** Una franja de color con texto dentro, para separar secciones de una tienda. */
export function Franja({ b, Dentro }: { b: any; Dentro: (p: { bloques: any[] }) => React.ReactElement }) {
  const t = tono(b.tono);
  const dentro = Array.isArray(b.bloques) ? b.bloques : [];
  // Una franja sin nada dentro no se pinta. Si se le pasara la lista vacía al
  // lector, éste diría «esta página todavía no tiene contenido» —que es su
  // respuesta correcta para una página entera y una mentira dentro de una
  // franja, porque la página sí tiene contenido: lo que está vacío es esto.
  if (dentro.length === 0 && !b.titulo) return null;
  return (
    <section className={`-mx-5 sm:-mx-8 my-8 px-6 sm:px-10 py-8 ${t.suave}`}>
      {b.titulo && <h2 className="text-xl font-black text-slate-900 mb-3">{b.titulo}</h2>}
      {dentro.length > 0 && <Dentro bloques={dentro} />}
    </section>
  );
}
