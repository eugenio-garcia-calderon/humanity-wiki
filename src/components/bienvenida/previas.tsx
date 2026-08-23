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

const marco = 'w-full h-full';

/** Un mapa: territorios, costa y marcadores. */
export function PreviaMapa() {
  return (
    <svg viewBox="0 0 160 90" className={marco} aria-hidden preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#eff6ff" />
      <path d="M0 58 Q28 44 52 52 T104 46 T160 54 L160 90 L0 90 Z" fill="#bfdbfe" />
      <path d="M18 20 L58 14 L74 32 L60 52 L24 48 Z" fill="#a7f3d0" stroke="#34d399" strokeWidth="1.2" />
      <path d="M74 32 L112 22 L134 40 L118 58 L84 54 L60 52 Z" fill="#fde68a" stroke="#fbbf24" strokeWidth="1.2" />
      <path d="M112 22 L150 18 L156 38 L134 40 Z" fill="#fecaca" stroke="#f87171" strokeWidth="1.2" />
      <circle cx="46" cy="33" r="4.5" fill="#059669" />
      <circle cx="100" cy="40" r="4.5" fill="#d97706" />
      <circle cx="140" cy="29" r="3.5" fill="#dc2626" />
    </svg>
  );
}

/** Un esquema: nodos unidos por aristas, que es lo que es un grafo. */
export function PreviaEsquema() {
  return (
    <svg viewBox="0 0 160 90" className={marco} aria-hidden preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#f5f3ff" />
      <g stroke="#c4b5fd" strokeWidth="1.6">
        <line x1="80" y1="45" x2="34" y2="24" /><line x1="80" y1="45" x2="128" y2="26" />
        <line x1="80" y1="45" x2="30" y2="68" /><line x1="80" y1="45" x2="122" y2="70" />
        <line x1="34" y1="24" x2="30" y2="68" /><line x1="128" y1="26" x2="122" y2="70" />
      </g>
      <circle cx="80" cy="45" r="13" fill="#7c3aed" />
      <circle cx="34" cy="24" r="8" fill="#a78bfa" />
      <circle cx="128" cy="26" r="8" fill="#a78bfa" />
      <circle cx="30" cy="68" r="8" fill="#c4b5fd" />
      <circle cx="122" cy="70" r="8" fill="#c4b5fd" />
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
        <rect x="34" y="34" width="92" height="4" rx="2" /><rect x="34" y="43" width="84" height="4" rx="2" />
        <rect x="34" y="52" width="92" height="4" rx="2" /><rect x="34" y="61" width="48" height="4" rx="2" />
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
      <rect x="94" y="34" width="24" height="4" rx="2" fill="#059669" />
      <rect x="94" y="50" width="18" height="4" rx="2" fill="#059669" />
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
            <rect key={j} x={x + 6} y={29 + j * 15} width="32" height="11" rx="3"
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
      <rect x="20" y="65" width="18" height="6" rx="3" fill="#16a34a" />
      <rect x="84" y="14" width="60" height="62" rx="5" fill="#fff" stroke="#fde68a" />
      <rect x="90" y="20" width="48" height="30" rx="3" fill="#bbf7d0" />
      <path d="M104 40 l8 -10 8 10 z" fill="#22c55e" />
      <rect x="90" y="56" width="34" height="5" rx="2" fill="#0f172a" />
      <rect x="90" y="65" width="22" height="6" rx="3" fill="#16a34a" />
    </svg>
  );
}

/** Mensajes y llamadas: dos burbujas y el botón de llamar. */
export function PreviaTelecom() {
  return (
    <svg viewBox="0 0 160 90" className={marco} aria-hidden preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#eef2ff" />
      <path d="M19 20 h59 a5 5 0 0 1 5 5 v16 a5 5 0 0 1 -5 5 h-52 l-12 8 v-8 h-1 a5 5 0 0 1 -5 -5 v-16 a5 5 0 0 1 5 -5 z" fill="#fff" stroke="#c7d2fe" />
      <g fill="#cbd5e1"><rect x="24" y="27" width="44" height="4" rx="2" /><rect x="24" y="35" width="30" height="4" rx="2" /></g>
      <path d="M141 50 h-53 a5 5 0 0 0 -5 5 v14 a5 5 0 0 0 5 5 h46 l12 7 v-7 h1 a5 5 0 0 0 5 -5 v-14 a5 5 0 0 0 -5 -5 z" fill="#4f46e5" />
      <g fill="#c7d2fe"><rect x="94" y="58" width="38" height="4" rx="2" /><rect x="94" y="66" width="24" height="4" rx="2" /></g>
      <circle cx="128" cy="26" r="13" fill="#22c55e" />
      <path d="M123 21 l3 -1 2 4 -2 2 a8 8 0 0 0 4 4 l2 -2 4 2 -1 3 a3 3 0 0 1 -3 2 a13 13 0 0 1 -11 -11 a3 3 0 0 1 2 -3 z" fill="#fff" />
    </svg>
  );
}

/** La IA: la chispa y una respuesta escribiéndose. */
export function PreviaIA() {
  return (
    <svg viewBox="0 0 160 90" className={marco} aria-hidden preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#faf5ff" />
      <rect x="18" y="16" width="124" height="58" rx="6" fill="#fff" stroke="#e9d5ff" />
      <path d="M40 26 l3.5 8.5 8.5 3.5 -8.5 3.5 -3.5 8.5 -3.5 -8.5 -8.5 -3.5 8.5 -3.5 z" fill="#a855f7" />
      <g fill="#e9d5ff"><rect x="60" y="28" width="66" height="5" rx="2.5" /><rect x="60" y="38" width="52" height="5" rx="2.5" /></g>
      <rect x="30" y="54" width="80" height="5" rx="2.5" fill="#d8b4fe" />
      <circle cx="120" cy="57" r="3" fill="#a855f7" /><circle cx="129" cy="57" r="3" fill="#c084fc" /><circle cx="138" cy="57" r="3" fill="#e9d5ff" />
    </svg>
  );
}

/** El visor 3D: bloques isométricos sobre el suelo. */
export function PreviaMundo() {
  return (
    <svg viewBox="0 0 160 90" className={marco} aria-hidden preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#ecfeff" />
      <path d="M80 20 L142 52 L80 84 L18 52 Z" fill="#cffafe" stroke="#a5f3fc" />
      <path d="M62 44 L80 54 L80 72 L62 62 Z" fill="#0891b2" />
      <path d="M98 44 L80 54 L80 72 L98 62 Z" fill="#0e7490" />
      <path d="M62 44 L80 34 L98 44 L80 54 Z" fill="#22d3ee" />
      <path d="M104 40 L116 47 L116 58 L104 51 Z" fill="#059669" />
      <path d="M128 40 L116 47 L116 58 L128 51 Z" fill="#047857" />
      <path d="M104 40 L116 33 L128 40 L116 47 Z" fill="#34d399" />
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
        <rect key={`${f}-${c}`} x={33 + c * 14} y={32 + f * 11} width="9" height="7" rx="2"
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
      <rect x="14" y="16" width="40" height="30" rx="4" fill="#bfdbfe" />
      <circle cx="26" cy="27" r="4" fill="#60a5fa" /><path d="M18 42 l10 -9 8 7 6 -5 10 9 z" fill="#3b82f6" />
      <rect x="60" y="16" width="40" height="30" rx="4" fill="#fff" stroke="#e2e8f0" />
      <g fill="#cbd5e1"><rect x="66" y="23" width="26" height="3" rx="1.5" /><rect x="66" y="30" width="20" height="3" rx="1.5" /><rect x="66" y="37" width="24" height="3" rx="1.5" /></g>
      <rect x="106" y="16" width="40" height="30" rx="4" fill="#1e293b" />
      <path d="M121 25 l10 6 -10 6 z" fill="#fff" />
      <rect x="14" y="52" width="40" height="26" rx="4" fill="#fde68a" />
      <rect x="60" y="52" width="40" height="26" rx="4" fill="#fecdd3" />
      <rect x="106" y="52" width="40" height="26" rx="4" fill="#ddd6fe" />
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
      <rect x="54" y="20" width="40" height="3" rx="1.5" fill="#cbd5e1" />
      <rect x="22" y="36" width="52" height="32" rx="3" fill="#dbeafe" />
      <g fill="#cbd5e1"><rect x="82" y="36" width="56" height="4" rx="2" /><rect x="82" y="46" width="48" height="4" rx="2" /><rect x="82" y="56" width="56" height="4" rx="2" /><rect x="82" y="64" width="30" height="4" rx="2" /></g>
    </svg>
  );
}

/** Publicaciones: el muro, con autor y texto. */
export function PreviaPublicaciones() {
  return (
    <svg viewBox="0 0 160 90" className={marco} aria-hidden preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#f8fafc" />
      <rect x="16" y="12" width="128" height="32" rx="5" fill="#fff" stroke="#e2e8f0" />
      <circle cx="30" cy="24" r="6" fill="#a7f3d0" />
      <rect x="42" y="20" width="34" height="4" rx="2" fill="#0f172a" />
      <rect x="42" y="29" width="86" height="4" rx="2" fill="#cbd5e1" />
      <rect x="42" y="36" width="58" height="4" rx="2" fill="#cbd5e1" />
      <rect x="16" y="50" width="128" height="32" rx="5" fill="#fff" stroke="#e2e8f0" />
      <circle cx="30" cy="62" r="6" fill="#bfdbfe" />
      <rect x="42" y="58" width="28" height="4" rx="2" fill="#0f172a" />
      <rect x="42" y="67" width="76" height="4" rx="2" fill="#cbd5e1" />
      <rect x="42" y="74" width="44" height="4" rx="2" fill="#cbd5e1" />
    </svg>
  );
}
