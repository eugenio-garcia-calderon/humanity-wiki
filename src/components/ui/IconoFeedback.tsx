/*
 * EL ICONO DE FEEDBACK (2026-08-22, dibujo de Eugenio)
 * ============================================================================
 * Dos bocadillos —uno que habla, otro que contesta— dentro de una flecha
 * circular: alguien dice algo, se hace, y vuelve. Eso es el ciclo que la página
 * describe, y por eso el círculo importa tanto como los bocadillos.
 *
 * POR QUÉ NO SE USA UNO DE LA LIBRERÍA. `MessagesSquare` de lucide son los dos
 * bocadillos y nada más: sin el círculo, el icono dice «mensajes», que es otra
 * cosa —y en esta plataforma ya hay mensajes de verdad, en la Red—. La flecha es
 * la mitad del significado.
 *
 * UNA BURBUJA Y NO DOS, Y ESTO ES UN COMPROMISO CONSCIENTE. El dibujo de
 * Eugenio lleva dos bocadillos y tres puntos. Dibujado y mirado a los tamaños
 * reales del menú —16 y 20 px—, las dos burbujas se tocan y los tres puntos se
 * convierten en suciedad: sale un borrón, no un icono. Con una sola burbuja
 * dentro del ciclo se lee a 16 px y el significado aguanta: algo se dice, y
 * vuelve.
 *
 * Si se prefiere fidelidad al dibujo por encima de legibilidad, la versión de
 * dos burbujas está probada y es cambiar cuatro líneas — pero entonces el icono
 * hay que sacarlo del menú a un tamaño mayor.
 *
 * ESTILO: mismo lenguaje que lucide (24×24, `currentColor`, trazo 1.5,
 * `stroke-linecap="round"`). Hereda el color de quien lo monta, que es lo que
 * permite que se ponga verde al estar activo igual que el resto.
 */

export function IconoFeedback({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* El ciclo: una vuelta casi entera, abierta arriba a la derecha, con la
          punta ahí. Es un ciclo, no un círculo — algo se dice y vuelve. */}
      <path d="M21.2 12a9.2 9.2 0 1 1-2.9-6.7" />
      <path d="M17.9 2.2 21.6 5.1 18.7 8.8" />
      {/* Y dentro, la voz. Centrada, con holgura suficiente para no tocar el
          aro al pintarse a 16px. */}
      <rect x="7.4" y="8.2" width="9.2" height="5.6" rx="1.8" />
      <path d="M10.3 13.8v2.4l2.6-2.4" />
    </svg>
  );
}
