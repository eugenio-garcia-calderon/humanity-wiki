/*
 * LAS PREVISUALIZACIONES DE LA PORTADA (2026-08-23, agente de APP/UX)
 * ============================================================================
 * Eugenio: «cada herramienta tiene que tener una pequeña previsualización. Por
 * ejemplo, cuando pones una tarjeta de la herramienta mapa, pues tiene que
 * haber un mini mapa. Cuando pones una herramienta de la tarjeta grafo, pues
 * tiene que haber un minigrafo».
 *
 * POR QUÉ DIBUJADAS Y NO CAPTURAS DE PANTALLA. Una captura envejece sin avisar:
 * cambia un color de la aplicación y la portada sigue enseñando la de hace tres
 * meses. Además pesan —doce capturas legibles son varios megas— y esto es lo
 * primero que carga alguien que todavía no sabe si le interesa la plataforma.
 * Estas son SVG en línea: unos cientos de bytes cada una, nítidas en cualquier
 * pantalla y sin una sola petición de red.
 *
 * NO PRETENDEN SER LA HERRAMIENTA, sino que se reconozca de un vistazo cuál es.
 * Un mapa se reconoce por las manchas de territorio; un grafo por los nodos y
 * las líneas; una tabla por la rejilla con su fila de cabecera. Ese es todo el
 * trabajo que tienen que hacer, y por eso no llevan texto: un texto diminuto
 * dentro de un dibujo no se lee, solo ensucia.
 *
 * `aria-hidden` en todas: la tarjeta ya dice en palabras qué herramienta es, y
 * un lector de pantalla anunciando «gráfico» doce veces seguidas solo estorba.
 */


/* ---------------------------------------------------------------------------
 * LA ANIMACIÓN AL PASAR EL RATÓN (2026-08-23)
 * ---------------------------------------------------------------------------
 * Eugenio: «con un hover, que al poner el ratón sobre una de las herramientas
 * se despliega una animación en cada una de ellas muy chula».
 *
 * CADA UNA HACE LO QUE HACE SU HERRAMIENTA, no un efecto genérico. El mapa
 * suelta sus marcadores, el grafo se enciende del centro hacia fuera, la página
 * se escribe, la tarjeta del tablero cambia de columna, el teléfono suena. La
 * animación no es decoración: es la segunda mitad de la explicación, y por eso
 * ninguna se repite entre tarjetas.
 *
 * CSS Y NO JAVASCRIPT. Trece animaciones en trece componentes de React serían
 * trece temporizadores corriendo en la primera pantalla que carga un
 * desconocido. En CSS las mueve el compositor, cuestan ~0 en el hilo principal
 * y **solo existen mientras el ratón está encima**.
 *
 * EN MÓVIL NO HAY RATÓN, y eso no es un problema que arreglar: el dibujo
 * quieto ya cumple su trabajo, que es que se reconozca la herramienta. Una
 * animación que se dispare sola en un móvil serían trece cosas moviéndose a la
 * vez, que es ruido.
 *
 * `prefers-reduced-motion` LO APAGA TODO. No es un detalle de accesibilidad de
 * cumplir el expediente: hay gente a la que el movimiento en pantalla le
 * provoca mareo, y esto es la portada, o sea la pantalla de la que no se puede
 * escapar si quieres saber qué es esto.
 *
 * Las clases van con prefijo `pv-` para que se vea de un vistazo que son de
 * este fichero y de ningún otro.
 */
const ESTILOS = `
  .pv-lienzo * { transform-box: fill-box; transform-origin: center; }

  /* Marcadores del mapa: caen uno detrás de otro. */
  .group:hover .pv-cae { animation: pv-cae .55s cubic-bezier(.2,1.4,.4,1) both; }
  .group:hover .pv-cae-2 { animation-delay: .09s; }
  .group:hover .pv-cae-3 { animation-delay: .18s; }
  @keyframes pv-cae { from { transform: translateY(-14px) scale(.4); opacity: 0 } to { transform: none; opacity: 1 } }

  /* Grafo: se enciende del centro hacia fuera. */
  .group:hover .pv-nodo { animation: pv-late .6s ease-out both; }
  .group:hover .pv-nodo-2 { animation-delay: .12s }
  .group:hover .pv-nodo-3 { animation-delay: .2s }
  .group:hover .pv-arista { animation: pv-trazo .5s ease-out both; }
  @keyframes pv-late { 0% { transform: scale(.5); opacity: .3 } 60% { transform: scale(1.18) } 100% { transform: none; opacity: 1 } }
  @keyframes pv-trazo { from { stroke-dasharray: 60; stroke-dashoffset: 60 } to { stroke-dasharray: 60; stroke-dashoffset: 0 } }

  /* Renglones que se escriben. */
  .group:hover .pv-escribe { animation: pv-escribe .5s ease-out both; }
  .group:hover .pv-escribe-2 { animation-delay: .1s }
  .group:hover .pv-escribe-3 { animation-delay: .2s }
  .group:hover .pv-escribe-4 { animation-delay: .3s }
  @keyframes pv-escribe { from { transform: scaleX(0); transform-origin: left } to { transform: none; transform-origin: left } }

  /* Una fila de la tabla se subraya al pasar. */
  .group:hover .pv-fila { animation: pv-fila .8s ease-in-out both; }
  @keyframes pv-fila { 0% { opacity: 0; transform: translateX(-6px) } 40%,100% { opacity: 1; transform: none } }

  /* La tarjeta del tablero cambia de columna, que es lo que se hace en un tablero. */
  .group:hover .pv-mueve { animation: pv-mueve 1.1s cubic-bezier(.6,0,.3,1) both; }
  @keyframes pv-mueve { 0% { transform: none } 55%,100% { transform: translate(48px, 15px) } }

  /* El precio salta. */
  .group:hover .pv-salta { animation: pv-salta .6s cubic-bezier(.2,1.5,.4,1) both; }
  .group:hover .pv-salta-2 { animation-delay: .12s }
  @keyframes pv-salta { 0% { transform: scale(.6); opacity: .4 } 100% { transform: none; opacity: 1 } }

  /* Los mensajes llegan y el teléfono suena. */
  .group:hover .pv-llega { animation: pv-llega .5s cubic-bezier(.2,1.3,.4,1) both; }
  .group:hover .pv-llega-2 { animation-delay: .22s }
  .group:hover .pv-suena { animation: pv-suena .9s ease-in-out .3s infinite; }
  @keyframes pv-llega { from { transform: translateY(8px) scale(.9); opacity: 0 } to { transform: none; opacity: 1 } }
  @keyframes pv-suena { 0%,100% { transform: rotate(0) } 20% { transform: rotate(-14deg) } 40% { transform: rotate(12deg) } 60% { transform: rotate(-8deg) } }

  /* La chispa gira y la respuesta se escribe con sus tres puntos. */
  .group:hover .pv-chispa { animation: pv-chispa .9s cubic-bezier(.3,1.2,.4,1) both; }
  .group:hover .pv-punto { animation: pv-punto 1s ease-in-out infinite; }
  .group:hover .pv-punto-2 { animation-delay: .15s }
  .group:hover .pv-punto-3 { animation-delay: .3s }
  @keyframes pv-chispa { from { transform: rotate(-140deg) scale(.4); opacity: 0 } to { transform: none; opacity: 1 } }
  @keyframes pv-punto { 0%,100% { opacity: .25; transform: translateY(0) } 50% { opacity: 1; transform: translateY(-2.5px) } }

  /* Los bloques del visor 3D se levantan del suelo. */
  .group:hover .pv-sube { animation: pv-sube .7s cubic-bezier(.2,1.2,.4,1) both; }
  .group:hover .pv-sube-2 { animation-delay: .14s }
  @keyframes pv-sube { from { transform: translateY(16px); opacity: 0 } to { transform: none; opacity: 1 } }

  /* Un día del calendario se marca. */
  .group:hover .pv-marca { animation: pv-marca .6s cubic-bezier(.2,1.5,.4,1) both; }
  .group:hover .pv-marca-2 { animation-delay: .15s }
  @keyframes pv-marca { from { transform: scale(0); opacity: 0 } to { transform: none; opacity: 1 } }

  /* Las miniaturas aparecen en cascada. */
  .group:hover .pv-entra { animation: pv-entra .5s cubic-bezier(.2,1.3,.4,1) both; }
  .group:hover .pv-entra-2 { animation-delay: .06s }
  .group:hover .pv-entra-3 { animation-delay: .12s }
  .group:hover .pv-entra-4 { animation-delay: .18s }
  .group:hover .pv-entra-5 { animation-delay: .24s }
  .group:hover .pv-entra-6 { animation-delay: .3s }
  @keyframes pv-entra { from { transform: scale(.75); opacity: 0 } to { transform: none; opacity: 1 } }

  /* El navegador carga: la barra de dirección se llena. */
  .group:hover .pv-carga { animation: pv-carga 1s ease-out both; }
  @keyframes pv-carga { from { transform: scaleX(.05); transform-origin: left } to { transform: none; transform-origin: left } }

  /* Las publicaciones entran desde abajo, como un muro que se rellena. */
  .group:hover .pv-muro { animation: pv-muro .55s cubic-bezier(.2,1.2,.4,1) both; }
  .group:hover .pv-muro-2 { animation-delay: .13s }
  .group:hover .pv-muro-3 { animation-delay: .26s }
  @keyframes pv-muro { from { transform: translateY(10px); opacity: 0 } to { transform: none; opacity: 1 } }

  /* ══ EL MURO SE MUEVE COMO UNA RED SOCIAL (2026-08-24) ═══════════════════
     Eugenio: «mejora la imagen de inicio de la tarjeta de Explorar animada, que
     aparezcan iconos de vídeos e imágenes en movimiento, y que se vea que es
     como una red social con publicaciones».

     Cuatro movimientos, y cada uno cuenta una cosa distinta. Si los cuatro
     hicieran lo mismo —entrar— sería una animación larga en vez de un muro. */

  /* 1. El botón de reproducir late: eso es un vídeo, no una foto. */
  .group:hover .pv-play { animation: pv-play 1.4s ease-in-out infinite; transform-origin: center; }
  @keyframes pv-play { 0%,100% { transform: scale(1) } 50% { transform: scale(1.14) } }

  /* 2. Y suelta un aro, como el pulso de un reproductor. */
  .group:hover .pv-aro { animation: pv-aro 1.4s ease-out infinite; transform-origin: center; }
  @keyframes pv-aro { 0% { transform: scale(.7); opacity: .55 } 70%,100% { transform: scale(1.9); opacity: 0 } }

  /* 3. La foto de la derecha cambia: son varias, no una. */
  .group:hover .pv-foto-a { animation: pv-foto-a 3s ease-in-out infinite; }
  .group:hover .pv-foto-b { animation: pv-foto-b 3s ease-in-out infinite; }
  @keyframes pv-foto-a { 0%,42% { opacity: 1 } 50%,92% { opacity: 0 } 100% { opacity: 1 } }
  @keyframes pv-foto-b { 0%,42% { opacity: 0 } 50%,92% { opacity: 1 } 100% { opacity: 0 } }

  /* 4. Y alguien da un «me gusta». Es lo único que dice que hay gente detrás. */
  .group:hover .pv-late { animation: pv-late 1.8s ease-in-out infinite; transform-origin: center; }
  @keyframes pv-late { 0%,62%,100% { transform: scale(1) } 72% { transform: scale(1.45) } 82% { transform: scale(1.1) } }

  /* ══ CREAR: LA PÁGINA SE ESCRIBE SOLA ════════════════════════════════════
     Eugenio: «mejóralas para que realmente se vea el poder de esta plataforma,
     no escatimes en animaciones».

     El poder de esto no es que tenga un editor: es que en la MISMA página caben
     un texto, una foto, un mapa, una tabla y un esquema. Así que aquí no entra
     una cosa — entran cinco, una detrás de otra, encima de un texto que se está
     escribiendo mientras tanto. */

  /* El texto se escribe: cada renglón crece de izquierda a derecha. */
  .group:hover .pv-teclea { animation: pv-teclea .5s steps(14) both; transform-origin: left; }
  .group:hover .pv-teclea-2 { animation-delay: .18s }
  .group:hover .pv-teclea-3 { animation-delay: .36s }
  .group:hover .pv-teclea-4 { animation-delay: .54s }
  @keyframes pv-teclea { from { transform: scaleX(0) } to { transform: scaleX(1) } }

  /* Y el cursor parpadea al final, como en cualquier editor. */
  .group:hover .pv-cursor { animation: pv-cursor .9s steps(1) infinite; }
  @keyframes pv-cursor { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }

  /* Las herramientas brotan alrededor, una a una, con rebote. */
  .group:hover .pv-brota { animation: pv-brota .5s cubic-bezier(.2,1.7,.4,1) both; transform-box: fill-box; transform-origin: center; }
  .group:hover .pv-brota-2 { animation-delay: .5s }
  .group:hover .pv-brota-3 { animation-delay: .68s }
  .group:hover .pv-brota-4 { animation-delay: .86s }
  .group:hover .pv-brota-5 { animation-delay: 1.04s }
  @keyframes pv-brota { from { transform: scale(0) rotate(-25deg); opacity: 0 } to { transform: none; opacity: 1 } }

  /* La chispa de la IA destella sin parar: siempre está ahí para ayudar. */
  .group:hover .pv-destella { animation: pv-destella 1.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  @keyframes pv-destella { 0%,100% { transform: scale(1); opacity: .85 } 50% { transform: scale(1.25); opacity: 1 } }

  /* ══ PROYECTAR: EL TABLERO AVANZA ════════════════════════════════════════
     Un tablero quieto es una foto de tres columnas. Lo que hace que se entienda
     para qué sirve es ver una tarjeta CRUZAR de «por hacer» a «hecho»: eso es
     el trabajo pasando, y es lo único que un dibujo estático no puede contar. */

  /* La tarjeta viaja de la primera columna a la tercera, y se queda. */
  .group:hover .pv-cruza { animation: pv-cruza 2.6s cubic-bezier(.5,0,.2,1) infinite; }
  @keyframes pv-cruza {
    0%,12%   { transform: translate(0,0) rotate(0); opacity: 1 }
    38%      { transform: translate(23px,-7px) rotate(4deg) }
    64%,100% { transform: translate(46px,17px) rotate(0); opacity: 1 }
  }

  /* Las que quedan detrás suben a ocupar el hueco. */
  .group:hover .pv-recoloca { animation: pv-recoloca 2.6s cubic-bezier(.5,0,.2,1) infinite; }
  @keyframes pv-recoloca { 0%,20% { transform: translateY(0) } 50%,100% { transform: translateY(-15px) } }

  /* La barra de avance se llena. */
  .group:hover .pv-avanza { animation: pv-avanza 2.6s ease-out infinite; transform-origin: left; }
  @keyframes pv-avanza { 0%,12% { transform: scaleX(.18) } 70%,100% { transform: scaleX(1) } }

  /* Y el visto se dibuja de un trazo cuando la tarjeta llega. */
  .group:hover .pv-visto { stroke-dasharray: 14; animation: pv-visto 2.6s ease-out infinite; }
  @keyframes pv-visto { 0%,58% { stroke-dashoffset: 14 } 76%,100% { stroke-dashoffset: 0 } }

  /* Las caras del equipo asoman por turnos: un proyecto es gente. */
  .group:hover .pv-equipo { animation: pv-marca .5s cubic-bezier(.2,1.6,.4,1) both; transform-box: fill-box; transform-origin: center; }
  .group:hover .pv-equipo-2 { animation-delay: .12s }
  .group:hover .pv-equipo-3 { animation-delay: .24s }

  /* Y para quien pide que la pantalla se esté quieta, se está quieta. */
  @media (prefers-reduced-motion: reduce) {
    .group:hover .pv-lienzo *, .pv-lienzo * { animation: none !important; }
  }
`;

/** Se inyecta UNA vez, no una por tarjeta: trece copias del mismo CSS es peso
 *  tonto y hace que buscar una regla en el inspector devuelva trece. */
export function EstilosPrevias() {
  return <style dangerouslySetInnerHTML={{ __html: ESTILOS }} />;
}

const marco = 'pv-lienzo w-full h-full';

/** Un mapa: territorios, costa y marcadores. */
export function PreviaMapa() {
  return (
    <svg viewBox="0 0 160 90" className={marco} aria-hidden preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#eff6ff" />
      <path d="M0 58 Q28 44 52 52 T104 46 T160 54 L160 90 L0 90 Z" fill="#bfdbfe" />
      <path d="M18 20 L58 14 L74 32 L60 52 L24 48 Z" fill="#a7f3d0" stroke="#34d399" strokeWidth="1.2" />
      <path d="M74 32 L112 22 L134 40 L118 58 L84 54 L60 52 Z" fill="#fde68a" stroke="#fbbf24" strokeWidth="1.2" />
      <path d="M112 22 L150 18 L156 38 L134 40 Z" fill="#fecaca" stroke="#f87171" strokeWidth="1.2" />
      <circle className="pv-cae" cx="46" cy="33" r="4.5" fill="#059669" />
      <circle className="pv-cae pv-cae-2" cx="100" cy="40" r="4.5" fill="#d97706" />
      <circle className="pv-cae pv-cae-3" cx="140" cy="29" r="3.5" fill="#dc2626" />
    </svg>
  );
}

/** Un esquema: nodos unidos por aristas, que es lo que es un grafo. */
export function PreviaEsquema() {
  return (
    <svg viewBox="0 0 160 90" className={marco} aria-hidden preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#f5f3ff" />
      <g className="pv-arista" stroke="#c4b5fd" strokeWidth="1.6">
        <line x1="80" y1="45" x2="34" y2="24" /><line x1="80" y1="45" x2="128" y2="26" />
        <line x1="80" y1="45" x2="30" y2="68" /><line x1="80" y1="45" x2="122" y2="70" />
        <line x1="34" y1="24" x2="30" y2="68" /><line x1="128" y1="26" x2="122" y2="70" />
      </g>
      <circle className="pv-nodo" cx="80" cy="45" r="13" fill="#7c3aed" />
      <circle className="pv-nodo pv-nodo-2" cx="34" cy="24" r="8" fill="#a78bfa" />
      <circle className="pv-nodo pv-nodo-2" cx="128" cy="26" r="8" fill="#a78bfa" />
      <circle className="pv-nodo pv-nodo-3" cx="30" cy="68" r="8" fill="#c4b5fd" />
      <circle className="pv-nodo pv-nodo-3" cx="122" cy="70" r="8" fill="#c4b5fd" />
    </svg>
  );
}

/**
 * Un debate: la tesis arriba y, colgando, lo que la sostiene y lo que la tumba
 * — con las barras del voto debajo, que es lo que decide cuál sube.
 *
 * VERDE A UN LADO Y ROJO AL OTRO, los mismos dos colores con los que el grafo
 * dice «apoya» y «contradice» en toda la plataforma. Un dibujo que estrenara
 * colores enseñaría un vocabulario que después nadie vuelve a ver.
 */
export function PreviaDebate() {
  return (
    <svg viewBox="0 0 160 90" className={marco} aria-hidden preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#faf5ff" />
      {/* La tesis */}
      <rect x="40" y="8" width="80" height="16" rx="4" fill="#fff" stroke="#c4b5fd" strokeWidth="1.4" />
      <rect x="46" y="13" width="52" height="3.5" rx="1.75" fill="#7c3aed" />
      <rect x="46" y="19" width="34" height="2.5" rx="1.25" fill="#ddd6fe" />
      {/* Las dos ramas */}
      <path className="pv-arista" d="M70 24 L44 38" stroke="#a7f3d0" strokeWidth="1.6" fill="none" />
      <path className="pv-arista" d="M90 24 L116 38" stroke="#fecaca" strokeWidth="1.6" fill="none" />
      <g className="pv-sube">
        <rect x="14" y="38" width="60" height="18" rx="4" fill="#fff" stroke="#34d399" strokeWidth="1.3" />
        <rect x="20" y="43" width="40" height="3" rx="1.5" fill="#059669" />
        <rect x="20" y="49" width="28" height="2.5" rx="1.25" fill="#d1fae5" />
      </g>
      <g className="pv-sube pv-sube-2">
        <rect x="86" y="38" width="60" height="18" rx="4" fill="#fff" stroke="#f87171" strokeWidth="1.3" />
        <rect x="92" y="43" width="40" height="3" rx="1.5" fill="#dc2626" />
        <rect x="92" y="49" width="24" height="2.5" rx="1.25" fill="#fee2e2" />
      </g>
      {/* El voto: cinco barras que crecen, que es lo que ordena las ramas */}
      <g className="pv-cae">
        <rect x="20" y="72" width="7" height="10" rx="1.5" fill="#34d399" />
        <rect x="30" y="66" width="7" height="16" rx="1.5" fill="#10b981" />
        <rect x="40" y="70" width="7" height="12" rx="1.5" fill="#6ee7b7" />
      </g>
      <g className="pv-cae pv-cae-2">
        <rect x="106" y="76" width="7" height="6" rx="1.5" fill="#fca5a5" />
        <rect x="116" y="68" width="7" height="14" rx="1.5" fill="#ef4444" />
        <rect x="126" y="74" width="7" height="8" rx="1.5" fill="#fca5a5" />
      </g>
    </svg>
  );
}

/** Una página: un título y renglones de texto. */
export function PreviaPagina() {
  return (
    <svg viewBox="0 0 160 90" className={marco} aria-hidden preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#f8fafc" />
      <rect x="24" y="10" width="112" height="70" rx="4" fill="#fff" stroke="#e2e8f0" />
      <rect x="34" y="20" width="56" height="7" rx="2" fill="#0f172a" />
      <g fill="#cbd5e1">
        <rect className="pv-escribe" x="34" y="34" width="92" height="4" rx="2" />
        <rect className="pv-escribe pv-escribe-2" x="34" y="43" width="84" height="4" rx="2" />
        <rect className="pv-escribe pv-escribe-3" x="34" y="52" width="92" height="4" rx="2" />
        <rect className="pv-escribe pv-escribe-4" x="34" y="61" width="48" height="4" rx="2" />
      </g>
      <rect x="96" y="30" width="30" height="22" rx="3" fill="#d1fae5" />
    </svg>
  );
}

/** Una tabla: rejilla con cabecera y columna de cifras. */
export function PreviaTabla() {
  return (
    <svg viewBox="0 0 160 90" className={marco} aria-hidden preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#f8fafc" />
      <rect x="16" y="14" width="128" height="62" rx="4" fill="#fff" stroke="#e2e8f0" />
      <rect x="16" y="14" width="128" height="14" fill="#0f172a" />
      <g fill="#fff">
        <rect x="24" y="19" width="22" height="4" rx="2" /><rect x="60" y="19" width="22" height="4" rx="2" />
        <rect x="96" y="19" width="22" height="4" rx="2" />
      </g>
      <g stroke="#e2e8f0">
        <line x1="52" y1="28" x2="52" y2="76" /><line x1="88" y1="28" x2="88" y2="76" /><line x1="124" y1="28" x2="124" y2="76" />
        <line x1="16" y1="44" x2="144" y2="44" /><line x1="16" y1="60" x2="144" y2="60" />
      </g>
      <g fill="#cbd5e1">
        <rect x="22" y="34" width="24" height="4" rx="2" /><rect x="58" y="34" width="20" height="4" rx="2" />
        <rect x="22" y="50" width="20" height="4" rx="2" /><rect x="58" y="50" width="24" height="4" rx="2" />
        <rect x="22" y="66" width="24" height="4" rx="2" />
      </g>
      <rect className="pv-fila" x="94" y="34" width="24" height="4" rx="2" fill="#059669" />
      <rect className="pv-fila pv-escribe-2" x="94" y="50" width="18" height="4" rx="2" fill="#059669" />
    </svg>
  );
}

/** Tareas: tres columnas con tarjetas, que es un tablero. */
export function PreviaTareas() {
  return (
    <svg viewBox="0 0 160 90" className={marco} aria-hidden preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#f8fafc" />
      {[10, 58, 106].map((x, i) => (
        <g key={x}>
          <rect x={x} y="12" width="44" height="66" rx="4" fill="#fff" stroke="#e2e8f0" />
          <rect x={x + 8} y="19" width={[20, 16, 14][i]} height="4" rx="2" fill="#94a3b8" />
          {[0, 1, 2].slice(0, [3, 2, 1][i]).map(j => (
            <rect key={j}
              // La de arriba del todo de la primera columna es la que viaja:
              // «por hacer» → «en curso», que es el gesto del tablero.
              className={i === 0 && j === 0 ? 'pv-mueve' : undefined}
              x={x + 6} y={29 + j * 15} width="32" height="11" rx="3"
              fill={['#e0e7ff', '#fef3c7', '#d1fae5'][i]} />
          ))}
        </g>
      ))}
    </svg>
  );
}

/** Comercio: dos productos con su precio. */
export function PreviaComercio() {
  return (
    <svg viewBox="0 0 160 90" className={marco} aria-hidden preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#fffbeb" />
      <rect x="14" y="14" width="60" height="62" rx="5" fill="#fff" stroke="#fde68a" />
      <rect x="20" y="20" width="48" height="30" rx="3" fill="#fed7aa" />
      <circle cx="34" cy="34" r="6" fill="#fb923c" />
      <rect x="20" y="56" width="30" height="5" rx="2" fill="#0f172a" />
      <rect className="pv-salta" x="20" y="65" width="18" height="6" rx="3" fill="#16a34a" />
      <rect x="84" y="14" width="60" height="62" rx="5" fill="#fff" stroke="#fde68a" />
      <rect x="90" y="20" width="48" height="30" rx="3" fill="#bbf7d0" />
      <path d="M104 40 l8 -10 8 10 z" fill="#22c55e" />
      <rect x="90" y="56" width="34" height="5" rx="2" fill="#0f172a" />
      <rect className="pv-salta pv-salta-2" x="90" y="65" width="22" height="6" rx="3" fill="#16a34a" />
    </svg>
  );
}

/** Mensajes y llamadas: dos burbujas y el botón de llamar. */
export function PreviaTelecom() {
  return (
    <svg viewBox="0 0 160 90" className={marco} aria-hidden preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#eef2ff" />
      <path className="pv-llega" d="M19 20 h59 a5 5 0 0 1 5 5 v16 a5 5 0 0 1 -5 5 h-52 l-12 8 v-8 h-1 a5 5 0 0 1 -5 -5 v-16 a5 5 0 0 1 5 -5 z" fill="#fff" stroke="#c7d2fe" />
      <g fill="#cbd5e1"><rect x="24" y="27" width="44" height="4" rx="2" /><rect x="24" y="35" width="30" height="4" rx="2" /></g>
      <path className="pv-llega pv-llega-2" d="M141 50 h-53 a5 5 0 0 0 -5 5 v14 a5 5 0 0 0 5 5 h46 l12 7 v-7 h1 a5 5 0 0 0 5 -5 v-14 a5 5 0 0 0 -5 -5 z" fill="#4f46e5" />
      <g fill="#c7d2fe"><rect x="94" y="58" width="38" height="4" rx="2" /><rect x="94" y="66" width="24" height="4" rx="2" /></g>
      <g className="pv-suena">
      <circle cx="128" cy="26" r="13" fill="#22c55e" />
      <path d="M123 21 l3 -1 2 4 -2 2 a8 8 0 0 0 4 4 l2 -2 4 2 -1 3 a3 3 0 0 1 -3 2 a13 13 0 0 1 -11 -11 a3 3 0 0 1 2 -3 z" fill="#fff" />
      </g>
    </svg>
  );
}

/** La IA: la chispa y una respuesta escribiéndose. */
export function PreviaIA() {
  return (
    <svg viewBox="0 0 160 90" className={marco} aria-hidden preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#faf5ff" />
      <rect x="18" y="16" width="124" height="58" rx="6" fill="#fff" stroke="#e9d5ff" />
      <path className="pv-chispa" d="M40 26 l3.5 8.5 8.5 3.5 -8.5 3.5 -3.5 8.5 -3.5 -8.5 -8.5 -3.5 8.5 -3.5 z" fill="#a855f7" />
      <g fill="#e9d5ff"><rect x="60" y="28" width="66" height="5" rx="2.5" /><rect x="60" y="38" width="52" height="5" rx="2.5" /></g>
      <rect x="30" y="54" width="80" height="5" rx="2.5" fill="#d8b4fe" />
      <circle className="pv-punto" cx="120" cy="57" r="3" fill="#a855f7" />
      <circle className="pv-punto pv-punto-2" cx="129" cy="57" r="3" fill="#c084fc" />
      <circle className="pv-punto pv-punto-3" cx="138" cy="57" r="3" fill="#e9d5ff" />
    </svg>
  );
}

/** El visor 3D: bloques isométricos sobre el suelo. */
export function PreviaMundo() {
  return (
    <svg viewBox="0 0 160 90" className={marco} aria-hidden preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#ecfeff" />
      <path d="M80 20 L142 52 L80 84 L18 52 Z" fill="#cffafe" stroke="#a5f3fc" />
      <g className="pv-sube">
        <path d="M62 44 L80 54 L80 72 L62 62 Z" fill="#0891b2" />
        <path d="M98 44 L80 54 L80 72 L98 62 Z" fill="#0e7490" />
        <path d="M62 44 L80 34 L98 44 L80 54 Z" fill="#22d3ee" />
      </g>
      <g className="pv-sube pv-sube-2">
        <path d="M104 40 L116 47 L116 58 L104 51 Z" fill="#059669" />
        <path d="M128 40 L116 47 L116 58 L128 51 Z" fill="#047857" />
        <path d="M104 40 L116 33 L128 40 L116 47 Z" fill="#34d399" />
      </g>
      <ellipse cx="42" cy="56" rx="9" ry="4" fill="#a7f3d0" />
    </svg>
  );
}

/** El calendario: rejilla de mes con dos días marcados. */
export function PreviaCalendario() {
  return (
    <svg viewBox="0 0 160 90" className={marco} aria-hidden preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#f8fafc" />
      <rect x="26" y="12" width="108" height="66" rx="5" fill="#fff" stroke="#e2e8f0" />
      <path d="M31 12 h98 a5 5 0 0 1 5 5 v9 h-108 v-9 a5 5 0 0 1 5 -5 z" fill="#0f172a" />
      {[0, 1, 2, 3].map(f => [0, 1, 2, 3, 4, 5, 6].map(c => (
        <rect key={`${f}-${c}`}
          className={f === 1 && c === 3 ? 'pv-marca' : f === 2 && c === 5 ? 'pv-marca pv-marca-2' : undefined}
          x={33 + c * 14} y={32 + f * 11} width="9" height="7" rx="2"
          fill={f === 1 && c === 3 ? '#059669' : f === 2 && c === 5 ? '#fbbf24' : '#e2e8f0'} />
      )))}
    </svg>
  );
}

/** Archivos: miniaturas de lo que subes. */
export function PreviaArchivos() {
  return (
    <svg viewBox="0 0 160 90" className={marco} aria-hidden preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#f8fafc" />
      <rect className="pv-entra" x="14" y="16" width="40" height="30" rx="4" fill="#bfdbfe" />
      <circle cx="26" cy="27" r="4" fill="#60a5fa" /><path d="M18 42 l10 -9 8 7 6 -5 10 9 z" fill="#3b82f6" />
      <rect className="pv-entra pv-entra-2" x="60" y="16" width="40" height="30" rx="4" fill="#fff" stroke="#e2e8f0" />
      <g fill="#cbd5e1"><rect x="66" y="23" width="26" height="3" rx="1.5" /><rect x="66" y="30" width="20" height="3" rx="1.5" /><rect x="66" y="37" width="24" height="3" rx="1.5" /></g>
      <rect className="pv-entra pv-entra-3" x="106" y="16" width="40" height="30" rx="4" fill="#1e293b" />
      <path d="M121 25 l10 6 -10 6 z" fill="#fff" />
      <rect className="pv-entra pv-entra-4" x="14" y="52" width="40" height="26" rx="4" fill="#fde68a" />
      <rect className="pv-entra pv-entra-5" x="60" y="52" width="40" height="26" rx="4" fill="#fecdd3" />
      <rect className="pv-entra pv-entra-6" x="106" y="52" width="40" height="26" rx="4" fill="#ddd6fe" />
    </svg>
  );
}

/** El navegador: una ventana con su barra de dirección. */
export function PreviaNavegador() {
  return (
    <svg viewBox="0 0 160 90" className={marco} aria-hidden preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#f1f5f9" />
      <rect x="14" y="14" width="132" height="62" rx="5" fill="#fff" stroke="#e2e8f0" />
      <path d="M19 14 h122 a5 5 0 0 1 5 5 v9 h-132 v-9 a5 5 0 0 1 5 -5 z" fill="#e2e8f0" />
      <circle cx="23" cy="21" r="2.5" fill="#f87171" /><circle cx="31" cy="21" r="2.5" fill="#fbbf24" /><circle cx="39" cy="21" r="2.5" fill="#34d399" />
      <rect x="48" y="17" width="90" height="8" rx="4" fill="#fff" />
      <rect className="pv-carga" x="54" y="20" width="40" height="3" rx="1.5" fill="#cbd5e1" />
      <rect x="22" y="36" width="52" height="32" rx="3" fill="#dbeafe" />
      <g fill="#cbd5e1"><rect x="82" y="36" width="56" height="4" rx="2" /><rect x="82" y="46" width="48" height="4" rx="2" /><rect x="82" y="56" width="56" height="4" rx="2" /><rect x="82" y="64" width="30" height="4" rx="2" /></g>
    </svg>
  );
}

/** Publicaciones: el muro, con autor y texto. */
/**
 * EL MURO (2026-08-24). Antes eran dos tarjetas de texto gris, y por eso podía
 * ser cualquier cosa: una bandeja de correo, una lista de tareas, un chat.
 *
 * Ahora se ve QUÉ hay dentro: un vídeo con su botón latiendo, una foto que
 * cambia por otra, caras, y un corazón que alguien acaba de pulsar. Son las
 * cuatro señales que hacen que una pantalla se lea como una red social sin
 * necesidad de una sola palabra.
 */
export function PreviaPublicaciones() {
  return (
    <svg viewBox="0 0 160 90" className={marco} aria-hidden preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#f8fafc" />

      {/* ── LA PUBLICACIÓN CON VÍDEO ─────────────────────────────────────── */}
      <g className="pv-muro">
        <rect x="8" y="8" width="70" height="74" rx="6" fill="#fff" stroke="#e2e8f0" />
        {/* Quién publica: cara y nombre, arriba, como en la tarjeta de verdad. */}
        <circle cx="18" cy="18" r="5" fill="#34d399" />
        <rect x="26" y="16" width="26" height="4" rx="2" fill="#0f172a" />
        {/* El fotograma del vídeo: cielo, monte y noche, para que se lea como
            una imagen y no como un rectángulo. */}
        <rect x="14" y="27" width="58" height="33" rx="4" fill="#1e293b" />
        <path d="M14 52 L28 40 L38 49 L48 38 L72 56 L72 56 L14 60 Z" fill="#334155" />
        <circle cx="62" cy="35" r="4" fill="#64748b" />
        {/* El botón de reproducir, latiendo y soltando su aro. */}
        <g transform="translate(43 43.5)">
          <circle className="pv-aro" r="9" fill="none" stroke="#fff" strokeWidth="1.6" />
          <g className="pv-play">
            <circle r="8" fill="#000" fillOpacity=".55" />
            <path d="M-2.6 -4 L5 0 L-2.6 4 Z" fill="#fff" />
          </g>
        </g>
        <rect x="14" y="65" width="46" height="4" rx="2" fill="#0f172a" />
        {/* Y el corazón, que es lo que dice que hay gente al otro lado. */}
        <g transform="translate(17 76)">
          <path className="pv-late" d="M0 -1.6 C0 -4.2 -4 -4.2 -4 -1.2 C-4 1.2 0 3.4 0 3.4 C0 3.4 4 1.2 4 -1.2 C4 -4.2 0 -4.2 0 -1.6 Z" fill="#f43f5e" />
        </g>
        <rect x="24" y="74" width="10" height="3.5" rx="1.75" fill="#cbd5e1" />
        <rect x="40" y="74" width="18" height="3.5" rx="1.75" fill="#cbd5e1" />
      </g>

      {/* ── LA PUBLICACIÓN CON FOTO, QUE VA CAMBIANDO ────────────────────── */}
      <g className="pv-muro pv-muro-2">
        <rect x="84" y="8" width="68" height="42" rx="6" fill="#fff" stroke="#e2e8f0" />
        <circle cx="94" cy="18" r="5" fill="#93c5fd" />
        <rect x="102" y="16" width="22" height="4" rx="2" fill="#0f172a" />
        {/* Dos fotos en el mismo hueco: una se apaga y la otra se enciende. */}
        <g clipPath="url(#pv-recorte-foto)">
          <g className="pv-foto-a">
            <rect x="90" y="26" width="56" height="18" fill="#bae6fd" />
            <path d="M90 44 L104 33 L114 40 L124 31 L146 44 Z" fill="#38bdf8" />
            <circle cx="136" cy="31" r="3.4" fill="#fde68a" />
          </g>
          <g className="pv-foto-b">
            <rect x="90" y="26" width="56" height="18" fill="#fed7aa" />
            <path d="M90 44 L100 35 L112 44 Z" fill="#fb923c" />
            <path d="M112 44 L126 32 L146 44 Z" fill="#f97316" />
          </g>
        </g>
      </g>

      {/* ── Y UNA TERCERA, SÓLO TEXTO: no todo lleva foto ─────────────────── */}
      <g className="pv-muro pv-muro-3">
        <rect x="84" y="56" width="68" height="26" rx="6" fill="#fff" stroke="#e2e8f0" />
        <circle cx="94" cy="66" r="5" fill="#ddd6fe" />
        <rect x="102" y="64" width="20" height="4" rx="2" fill="#0f172a" />
        <rect x="90" y="73" width="56" height="3.5" rx="1.75" fill="#cbd5e1" />
        <rect x="90" y="78" width="36" height="3.5" rx="1.75" fill="#cbd5e1" />
      </g>

      <defs>
        <clipPath id="pv-recorte-foto">
          <rect x="90" y="26" width="56" height="18" rx="3" />
        </clipPath>
      </defs>
    </svg>
  );
}

/**
 * CREAR (2026-08-24). No es «un editor»: es que en una misma página quepan un
 * texto, una foto, un mapa, una tabla y un esquema, y que la IA esté al lado.
 * Por eso el texto se está escribiendo mientras las cinco herramientas brotan
 * alrededor: si sólo hubiera una hoja con renglones, esta tarjeta prometería un
 * bloc de notas.
 */
export function PreviaCrear() {
  return (
    <svg viewBox="0 0 160 90" className={marco} aria-hidden preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#f8fafc" />

      {/* La hoja, escribiéndose. */}
      <rect x="37" y="14" width="86" height="62" rx="6" fill="#fff" stroke="#e2e8f0" />
      <rect className="pv-teclea" x="46" y="24" width="44" height="6" rx="3" fill="#0f172a" />
      <rect className="pv-teclea pv-teclea-2" x="46" y="37" width="66" height="4" rx="2" fill="#cbd5e1" />
      <rect className="pv-teclea pv-teclea-3" x="46" y="46" width="58" height="4" rx="2" fill="#cbd5e1" />
      <rect className="pv-teclea pv-teclea-4" x="46" y="55" width="38" height="4" rx="2" fill="#cbd5e1" />
      <rect className="pv-cursor" x="86" y="53" width="1.8" height="8" fill="#059669" />

      {/* Y dentro de la hoja, un bloque que no es texto: una foto. */}
      <g className="pv-brota pv-brota-5">
        <rect x="94" y="44" width="23" height="18" rx="3" fill="#bae6fd" />
        <path d="M94 62 L102 54 L108 59 L113 51 L117 62 Z" fill="#38bdf8" />
        <circle cx="112" cy="49" r="2.4" fill="#fde68a" />
      </g>

      {/* LAS HERRAMIENTAS, BROTANDO ALREDEDOR DE LA HOJA. Van a 13 y a 129 y no
          pegadas al borde: la tarjeta se acerca un 6 % al pasar el ratón, y a
          menos de ~5 px del canto se quedaban cortadas justo cuando la estás
          mirando — que es el único momento en que se ven. */}
      {/* Mapa */}
      <g className="pv-brota">
        <rect x="13" y="16" width="18" height="18" rx="5" fill="#fff" stroke="#e2e8f0" />
        <path d="M16 30 L21 19 L28 23 L28 31 Z" fill="#6ee7b7" />
        <circle cx="22" cy="24" r="2" fill="#059669" />
      </g>
      {/* Tabla */}
      <g className="pv-brota pv-brota-2">
        <rect x="13" y="42" width="18" height="18" rx="5" fill="#fff" stroke="#e2e8f0" />
        <rect x="17" y="46" width="10" height="3" rx="1.5" fill="#0f172a" />
        <rect x="17" y="51" width="10" height="2.5" rx="1.25" fill="#cbd5e1" />
        <rect x="17" y="55.5" width="7" height="2.5" rx="1.25" fill="#cbd5e1" />
      </g>
      {/* Esquema */}
      <g className="pv-brota pv-brota-3">
        <rect x="129" y="16" width="18" height="18" rx="5" fill="#fff" stroke="#e2e8f0" />
        <path d="M133 30 L138 21 L143 27" stroke="#c4b5fd" strokeWidth="1.4" fill="none" />
        <circle cx="133" cy="30" r="2.2" fill="#8b5cf6" />
        <circle cx="138" cy="21" r="2.2" fill="#8b5cf6" />
        <circle cx="143" cy="27" r="2.2" fill="#a78bfa" />
      </g>
      {/* Vídeo */}
      <g className="pv-brota pv-brota-4">
        <rect x="129" y="42" width="18" height="18" rx="5" fill="#fff" stroke="#e2e8f0" />
        <rect x="132.5" y="46.5" width="11" height="9" rx="2" fill="#1e293b" />
        <path d="M136.5 48.8 L140.6 51 L136.5 53.2 Z" fill="#fff" />
      </g>

      {/* La IA, siempre encendida al lado de lo que escribes. */}
      <g className="pv-destella" transform="translate(118 21)">
        <path d="M0 -7 L1.9 -1.9 L7 0 L1.9 1.9 L0 7 L-1.9 1.9 L-7 0 L-1.9 -1.9 Z" fill="#f59e0b" />
      </g>
    </svg>
  );
}

/**
 * PROYECTAR (2026-08-24). Un tablero quieto es una foto de tres columnas. Lo que
 * explica para qué sirve es ver una tarjeta CRUZAR de «por hacer» a «hecho»,
 * las de detrás subir a ocupar el hueco, la barra de avance llenarse y el visto
 * dibujarse. Eso es trabajo pasando, y es justo lo que un dibujo quieto no puede
 * contar.
 */
export function PreviaProyectar() {
  return (
    <svg viewBox="0 0 160 90" className={marco} aria-hidden preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#f8fafc" />

      {/* El proyecto: su nombre, su equipo y su barra de avance. */}
      <rect x="8" y="6" width="40" height="4" rx="2" fill="#0f172a" />
      <g>
        <circle className="pv-equipo" cx="118" cy="8" r="4.5" fill="#6ee7b7" />
        <circle className="pv-equipo pv-equipo-2" cx="128" cy="8" r="4.5" fill="#93c5fd" />
        <circle className="pv-equipo pv-equipo-3" cx="138" cy="8" r="4.5" fill="#fcd34d" />
      </g>
      <rect x="8" y="14" width="144" height="3" rx="1.5" fill="#e2e8f0" />
      <rect className="pv-avanza" x="8" y="14" width="144" height="3" rx="1.5" fill="#10b981" />

      {/* Las tres columnas. */}
      <rect x="8" y="23" width="44" height="60" rx="5" fill="#eef2ff" />
      <rect x="58" y="23" width="44" height="60" rx="5" fill="#fffbeb" />
      <rect x="108" y="23" width="44" height="60" rx="5" fill="#ecfdf5" />
      <rect x="13" y="27" width="18" height="3" rx="1.5" fill="#a5b4fc" />
      <rect x="63" y="27" width="18" height="3" rx="1.5" fill="#fcd34d" />
      <rect x="113" y="27" width="18" height="3" rx="1.5" fill="#6ee7b7" />

      {/* Por hacer: dos tarjetas, y la de arriba es la que se va. */}
      <g className="pv-cruza">
        <rect x="13" y="34" width="34" height="14" rx="3" fill="#fff" stroke="#e0e7ff" />
        <rect x="17" y="38" width="20" height="3" rx="1.5" fill="#0f172a" />
        <rect x="17" y="43" width="14" height="2.5" rx="1.25" fill="#cbd5e1" />
      </g>
      <g className="pv-recoloca">
        <rect x="13" y="52" width="34" height="14" rx="3" fill="#fff" stroke="#e0e7ff" />
        <rect x="17" y="56" width="16" height="3" rx="1.5" fill="#0f172a" />
        <rect x="17" y="61" width="22" height="2.5" rx="1.25" fill="#cbd5e1" />
      </g>

      {/* En curso. */}
      <rect x="63" y="34" width="34" height="14" rx="3" fill="#fff" stroke="#fde68a" />
      <rect x="67" y="38" width="22" height="3" rx="1.5" fill="#0f172a" />
      <rect x="67" y="43" width="12" height="2.5" rx="1.25" fill="#cbd5e1" />

      {/* Hecho: la que ya estaba, con su visto dibujándose. */}
      <rect x="113" y="34" width="34" height="14" rx="3" fill="#fff" stroke="#a7f3d0" />
      <circle cx="120" cy="41" r="4.5" fill="#10b981" />
      <path className="pv-visto" d="M117.8 41 L119.6 42.8 L122.6 39.2" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="128" y="39.5" width="15" height="3" rx="1.5" fill="#0f172a" />
    </svg>
  );
}
