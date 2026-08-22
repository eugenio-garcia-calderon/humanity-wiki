/*
 * LA TEXTURA DE CUBOS, DIBUJADA AQUÍ (2026-08-22, agente de APP/UX)
 * ===========================================================================
 * Antes las dos cabeceras que la usan pedían este fondo a
 * `transparenttextures.com`. Es una textura decorativa al 10 % de opacidad que
 * casi no se ve — y a cambio, **cada visita a un objetivo o a un reto le
 * entregaba la IP de esa persona a un servidor de terceros**, sin que nadie lo
 * hubiera decidido y sin que apareciera en ninguna parte.
 *
 * Importa por tres razones, y solo una es la privacidad:
 *
 *   1. Las fichas de App Store y Google Play obligan a DECLARAR con quién se
 *      comparten datos y para qué. «Un fondo de cubos» no es una respuesta que
 *      se pueda escribir en ese formulario.
 *   2. Si ese dominio se cae o cambia, la cabecera se queda a medias, y el
 *      fallo llega desde fuera sin avisar.
 *   3. Sin conexión no cargaba. La aplicación se instala en un móvil.
 *
 * VA COMO `style` Y NO COMO CLASE DE TAILWIND. Un `bg-[url('data:…')]` con un
 * SVG dentro no funciona: las comillas del SVG cierran las del `url()` y los
 * espacios cortan el valor arbitrario. La primera versión de este arreglo se
 * escribió así y quedó rota sin que TypeScript dijera nada — se veía mirando el
 * atributo, no compilando.
 */

const SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='40' height='70'>" +
  "<g fill='none' stroke='%23ffffff' stroke-width='1'>" +
  "<path d='M0 34.5 20 46 40 34.5M20 46v23M0 34.5v-23L20 0l20 11.5v23L20 46z'/>" +
  "</g></svg>";

/** Para un `<div className="absolute inset-0 opacity-10 mix-blend-overlay" style={TEXTURA_CUBOS} />`. */
export const TEXTURA_CUBOS: React.CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(SVG).replace(/%253A/g, '%3A')}")`,
};
