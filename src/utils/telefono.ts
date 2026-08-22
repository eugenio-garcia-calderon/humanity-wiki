// ============================================================================
// UN NÚMERO DE TELÉFONO, ESCRITO SIEMPRE IGUAL (2026-08-22)
// ============================================================================
// Hace falta para lo que pidió Eugenio en el hormiguero: traerse los contactos
// del teléfono y poder escribirles por WhatsApp. Y hace falta AQUÍ, en un solo
// sitio, porque el mismo número llega escrito de seis maneras:
//
//     600 12 34 56 · 600123456 · +34600123456 · 0034 600 123 456 · (+34) 600-12-34-56
//
// Si cada pantalla lo guarda como venga, la misma persona entra tres veces en tu
// mundo y ninguna de las tres se reconoce con las otras. Se normaliza al
// entrar: **solo dígitos, con prefijo de país**, que es además lo único que
// WhatsApp acepta en un enlace `wa.me`.
//
// EL PREFIJO POR DEFECTO ES ESPAÑA (34) Y ESO ES UN SUPUESTO, no una verdad.
// Un número de nueve cifras que empieza por 6, 7, 8 o 9 es español casi con
// seguridad, y esta plataforma se usa desde España. Pero se declara aquí en vez
// de esconderlo: el día que haya gente de fuera, este es el sitio donde se
// arregla, y `normalizar` acepta que le pasen otro prefijo.
//
// Y SI NO SE PUEDE, DEVUELVE null. Un número que no se entiende no se
// «arregla» a medias: quien llama decide si lo rechaza o lo guarda como texto.
// Inventar un prefijo para que parezca válido es exactamente el fallo que ya
// nos ha costado caro — un dato incorrecto presentado como correcto.

export const PREFIJO_POR_DEFECTO = '34';

/**
 * Deja el número en dígitos, con prefijo de país y sin el `+`.
 * `null` si no hay forma de entenderlo.
 */
export function normalizarTelefono(bruto: string | null | undefined, prefijo = PREFIJO_POR_DEFECTO): string | null {
  if (!bruto) return null;
  const texto = String(bruto).trim();
  // Un `+` inicial significa que el prefijo YA viene puesto. Se recuerda antes
  // de tirar los símbolos, porque después es indistinguible.
  const traePrefijo = texto.startsWith('+') || texto.startsWith('00');
  const digitos = texto.replace(/\D+/g, '').replace(/^00/, '');
  if (digitos.length < 6) return null;          // no es un teléfono
  if (digitos.length > 15) return null;         // más de lo que existe (E.164)
  if (traePrefijo) return digitos;
  // Nueve cifras españolas: se le pone el 34. Cualquier otra longitud sin
  // prefijo se deja como está —añadirle uno sería inventárselo.
  if (digitos.length === 9 && /^[6789]/.test(digitos)) return prefijo + digitos;
  return digitos;
}

/** Cómo se ENSEÑA: «+34 600 123 456». Solo para leerlo; lo que se guarda y lo
 *  que viaja a WhatsApp es siempre la versión en dígitos. */
export function telefonoLegible(normalizado: string | null | undefined): string {
  if (!normalizado) return '';
  const n = String(normalizado);
  if (n.startsWith('34') && n.length === 11) {
    return `+34 ${n.slice(2, 5)} ${n.slice(5, 8)} ${n.slice(8)}`;
  }
  return `+${n}`;
}

/**
 * El enlace para escribirle por WhatsApp.
 *
 * `wa.me` Y NO LA API DE WHATSAPP BUSINESS, y conviene que quede escrito por
 * qué: mandar un mensaje SIN que la persona lo confirme exige una cuenta de
 * WhatsApp Business aprobada, plantillas revisadas por Meta y un coste por
 * mensaje. `wa.me` abre la conversación con el texto ya escrito y la persona
 * pulsa enviar — funciona hoy, en el teléfono y en el ordenador, sin cuenta de
 * empresa y sin que la plataforma toque los mensajes de nadie.
 */
export function enlaceWhatsApp(telefono: string | null | undefined, texto?: string): string | null {
  const n = normalizarTelefono(telefono);
  if (!n) return null;
  return `https://wa.me/${n}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
}

/**
 * Los contactos de un fichero .vcf (el que exportan el iPhone y Android).
 *
 * ES EL CAMINO QUE FUNCIONA EN TODOS LADOS. La agenda del teléfono solo se
 * puede leer desde el navegador con la API de Contactos, que existe en Chrome
 * de Android y NO en iOS — así que sin esto, media plataforma se quedaría sin
 * poder importar nada. Un .vcf lo exporta cualquier teléfono.
 *
 * Se lee a mano y no con una librería: un vCard para lo que aquí hace falta son
 * dos campos (`FN` y `TEL`), y traerse un paquete para leer dos líneas es
 * cargarle 40 KB a todo el que abra la página.
 */
export function leerVcf(texto: string): Array<{ nombre: string; telefono: string }> {
  const salida: Array<{ nombre: string; telefono: string }> = [];
  // Las líneas largas de un vCard se parten y continúan con un espacio inicial:
  // se vuelven a juntar antes de mirar nada.
  const lineas = texto.replace(/\r\n[ \t]/g, '').split(/\r?\n/);
  let nombre = '';
  let telefono = '';
  for (const l of lineas) {
    if (/^BEGIN:VCARD/i.test(l)) { nombre = ''; telefono = ''; continue; }
    if (/^END:VCARD/i.test(l)) {
      const n = normalizarTelefono(telefono);
      // SIN NOMBRE O SIN NÚMERO NO ENTRA. Un contacto sin teléfono no sirve
      // para lo que se ha pedido, y uno sin nombre aparecería en tu mundo como
      // una persona anónima que nadie sabe quién es.
      if (nombre && n) salida.push({ nombre, telefono: n });
      continue;
    }
    const dosPuntos = l.indexOf(':');
    if (dosPuntos < 0) continue;
    const clave = l.slice(0, dosPuntos).toUpperCase();
    const valor = l.slice(dosPuntos + 1).trim();
    if (!nombre && /^FN(;|$)/.test(clave)) nombre = valor;
    // `N:Apellido;Nombre;…` solo si no hubo `FN`, que es el nombre ya montado.
    if (!nombre && /^N(;|$)/.test(clave)) {
      const [ape = '', pila = ''] = valor.split(';');
      nombre = `${pila} ${ape}`.trim();
    }
    if (!telefono && /^TEL(;|$)/.test(clave)) telefono = valor;
  }
  return salida;
}
