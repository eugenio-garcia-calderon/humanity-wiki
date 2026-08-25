import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Plus, LayoutGrid } from 'lucide-react';
import { EstilosPrevias, PreviaPublicaciones, PreviaCrear, PreviaProyectar } from '../components/bienvenida/previas';
import HojaCrear from '../components/navegacion/HojaCrear';

/*
 * LA PORTADA DE LOS TRES CAMINOS (2026-08-24, agente de APP/UX)
 * ============================================================================
 * Eugenio: «esta página debe estar dentro de "/explorar", no en la página de
 * inicio. En la página de inicio, una galería con 3 opciones en una sola línea:
 * "Explorar", "Crear", "Proyectar", y ahí se pone una imagen en cada una de esas
 * tarjetas con una preview animada de lo que te vas a encontrar en esas 3 formas
 * de interactuar con la plataforma. Y arriba de esas 3 pones el nombre en grande
 * de "Red de Conocimiento"» — y el 2026-08-26 volvió a ser humanity.wiki.
 *
 * QUÉ CAMBIA DE VERDAD. Hasta hoy «/» era el muro: al abrir la aplicación
 * empezabas leyendo. Eso responde a una sola de las tres cosas que se pueden
 * hacer aquí, y además a la más pasiva. Ahora la primera pantalla pregunta a qué
 * vienes, y las otras dos —crear y proyectar— dejan de estar escondidas detrás
 * de un botón que hay que saber que existe.
 *
 * TRES Y NO CUATRO, Y EN UNA LÍNEA. Son las tres formas de estar en la
 * plataforma, no un menú de secciones: si esto creciera a seis tarjetas volvería
 * a ser un menú, y un menú ya hay dos (los dos raíles).
 *
 * LOS DIBUJOS VIVEN EN `bienvenida/previas.tsx`, con los de la portada de sin
 * sesión y los del cajetín de crear: un solo fichero de dibujos para toda la
 * aplicación, importados y nunca copiados.
 *
 * PERO ESTOS TRES SON SUYOS (2026-08-24). «Explorar» usa el muro, y «Crear» y
 * «Proyectar» tienen dibujo propio —`PreviaCrear` y `PreviaProyectar`— en vez de
 * tomar prestados los de «Página» y «Tarea». La razón: en el cajetín, el dibujo
 * de «Página» tiene que parecer una página, y aquí «Crear» no es una página, son
 * las dieciséis herramientas a la vez. Reutilizarlo habría prometido un editor
 * de texto donde hay un taller.
 *
 * «CREAR» NO ES UNA DIRECCIÓN. Las otras dos llevan a una página; ésta abre el
 * cajetín de las dieciséis herramientas, que es el mismo del círculo verde. No
 * se ha inventado una página «/crear» que fuera una segunda lista de lo mismo:
 * dos sitios donde crear serían dos sitios que hay que mantener iguales.
 *
 * Y se monta `HojaCrear` aquí, con su propio interruptor, en vez de pedirle al
 * Layout que abra el suyo. La lista de herramientas sigue viviendo en un solo
 * fichero —es el mismo componente—, así que lo único que se duplica es un
 * booleano. Sale más barato que un aviso global, y no obliga a tocar el Layout,
 * que ahora mismo lo tiene reservado otro programador.
 */

interface Camino {
  clave: string;
  titulo: string;
  frase: string;
  Previa: () => any;
  Icono: any;
  /** A dónde lleva. Sin ella, la tarjeta abre el cajetín de crear. */
  ruta?: string;
}

const CAMINOS: Camino[] = [
  {
    clave: 'explorar',
    titulo: 'Explorar',
    frase: 'Lo que ha publicado la gente: vídeos, mapas, páginas y debates.',
    Previa: PreviaPublicaciones,
    Icono: Compass,
    ruta: '/explorar',
  },
  {
    clave: 'crear',
    titulo: 'Crear',
    frase: 'Escribe, dibuja, graba o publica. Dieciséis herramientas.',
    Previa: PreviaCrear,
    Icono: Plus,
    // Sin `ruta` ni `accion`: lo abre el propio componente, ver más abajo.
  },
  {
    clave: 'proyectar',
    titulo: 'Proyectar',
    frase: 'Tus proyectos y sus tableros: lo que está por hacer y lo hecho.',
    Previa: PreviaProyectar,
    Icono: LayoutGrid,
    ruta: '/proyectos',
  },
];

export default function TresCaminos() {
  const navegar = useNavigate();
  const [creando, setCreando] = useState(false);

  return (
    <div className="h-full overflow-y-auto">
      <EstilosPrevias />
      {/* PEGADO A LA BARRA DE ARRIBA (2026-08-24, Eugenio: «sube el nombre
          más hacia el menú de arriba»). Estaba a `8vh`, que
          en una pantalla alta son 80 px de nada antes de empezar: el nombre
          flotaba en medio y las tarjetas se iban hacia abajo. Ahora arranca a
          24 px de la barra —36 en escritorio—, que es la misma distancia a la
          que empieza el contenido en el resto de las páginas. */}
      <div className="mx-auto max-w-[1200px] px-5 pb-24 pt-6 sm:px-8 sm:pt-9">
        {/* EL NOMBRE, EN GRANDE, Y DEBAJO LO QUE ES (2026-08-26, Eugenio).
            Mismo par que en la portada de sin sesión, a propósito: las dos son
            la primera pantalla, sólo que de gente distinta, y dos primeras
            pantallas que se presentan con nombres distintos son dos productos.
            `.wiki` en el mismo `emerald-600` de la barra de arriba: es el verde
            de la marca, y un segundo verde parecido lo estropearía. */}
        <h1 className="text-center text-4xl font-black tracking-tight text-slate-900 sm:text-6xl">
          humanity<span className="text-emerald-600">.wiki</span>
        </h1>
        <p className="mt-2 text-center text-sm font-bold uppercase tracking-[0.18em] text-slate-400 sm:text-base">
          La red de conocimiento
        </p>
        {/* EN UNA SOLA LÍNEA, TAMBIÉN EN EL MÓVIL, que es lo que se pidió. A
            375 px cada tarjeta mide unos 105 px: el dibujo se sigue leyendo
            —son formas grandes, no texto— y la frase de debajo se esconde,
            porque tres frases de dos palabras por línea no se leen, se
            adivinan. El nombre de cada camino no se esconde nunca. */}
        {/* Sin subtítulo (2026-08-24, Eugenio: «quita la frase de ¿a qué vienes
            hoy?»). El hueco que dejaba lo asume la rejilla, que sube de 8 a 10 y
            de 12 a 14: si no, el nombre y las tarjetas se quedaban pegados. */}
        <div className="mt-10 grid grid-cols-3 gap-3 sm:mt-14 sm:gap-5">
          {CAMINOS.map(c => (
            <button
              key={c.clave}
              onClick={() => { if (c.ruta) navegar(c.ruta); else setCreando(true); }}
              /* `group` enciende la animación de dentro del dibujo: cada
                 previsualización se mueve con `group-hover`. */
              /* `min-w-0`: una celda de rejilla nace con `min-width: auto`, así
                 que lo más ancho de dentro empuja la celda entera. Sin esto, a
                 360 px la tercera tarjeta se salía de la pantalla y «Proyectar»
                 quedaba cortado a media palabra. */
              className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition-all hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl"
            >
              <span className="block aspect-[16/10] w-full overflow-hidden border-b border-slate-100">
                <span className="block h-full w-full transition-transform duration-300 ease-out group-hover:scale-[1.06]">
                  <c.Previa />
                </span>
              </span>
              {/* EN EL MÓVIL, SIN ICONO Y UN PUNTO MÁS PEQUEÑO. A 360 px cada
                  tarjeta tiene 105 px: «Proyectar» a 13 px con su icono delante
                  pide 112 y se salía. El icono es lo que sobra —el dibujo de
                  arriba ya dice de qué va— y la palabra es lo que no puede
                  faltar. Lo dijo una captura hecha con el ancho de un teléfono
                  de verdad; a 1080 px de ancho en CSS no se veía. */}
              <span className="flex items-center justify-center gap-1.5 px-1.5 pt-2.5 sm:justify-start sm:px-4 sm:pt-4">
                <c.Icono className="hidden h-4 w-4 shrink-0 text-emerald-600 sm:block" />
                <span className="text-[12px] font-black leading-tight text-slate-900 sm:text-lg">{c.titulo}</span>
              </span>
              <span className="hidden px-4 pb-4 pt-1 text-[12px] font-bold leading-snug text-slate-400 sm:block">
                {c.frase}
              </span>
              <span className="block pb-2.5 sm:hidden" />
            </button>
          ))}
        </div>
      </div>

      {creando && <HojaCrear onCerrar={() => setCreando(false)} />}
    </div>
  );
}
