// ============================================================================
// RENOMBRAR UNA COLUMNA SIN ROMPER LAS FÓRMULAS (2026-08-22)
// ============================================================================
// Encontrado revisando las tablas, que es lo que pidió Eugenio en el hormiguero
// («revisar creación de tablas y sus funcionalidades, y buscar bugs y
// resolverlos»):
//
//   1. Columna «Precio» con 100 dentro.
//   2. Columna calculada «ConIVA» = `{Precio} * 1.21` → 121. Correcto.
//   3. Se renombra «Precio» a «Coste» — un gesto cosmético.
//   4. ConIVA pasa a «No hay ninguna columna que se llame Precio».
//
// El mensaje era honesto, y por eso el fallo se ve en vez de esconderse; pero
// el resultado está mal igual: cambiarle el nombre a una columna no puede
// apagar los cálculos que dependen de ella. En una tabla con quince fórmulas,
// renombrar una columna las rompe todas de golpe y hay que ir a mano una por
// una.
//
// ── POR QUÉ PASA, Y POR QUÉ NO SE ARREGLA CAMBIANDO EL MODELO ───────────────
// Las fórmulas se escriben con NOMBRES —`{Precio}`— porque es lo que una
// persona puede leer y escribir. Por dentro se resuelven contra un mapa
// nombre→id al calcular, así que el texto guardado es la única referencia que
// hay, y al renombrar deja de apuntar a nada.
//
// La alternativa era guardar las fórmulas con ids («{BDCMT3…}») y traducirlas a
// nombres al enseñarlas. Es lo que hace Notion, y es más robusto —pero obliga a
// traducir en las dos direcciones en cada sitio donde una fórmula se escribe,
// se lee, se copia o se enseña en un error, y cada traducción es un sitio donde
// pueden divergir. Con quince fórmulas por tabla eso es mucho aparato para un
// gesto que se hace de vez en cuando.
//
// Lo que se hace: al renombrar, se REESCRIBEN las fórmulas de esa tabla. Una
// sola operación, en el sitio donde ocurre el cambio, y el texto que la persona
// ve sigue diciendo lo que ella escribió — solo que con el nombre nuevo.

/** Las llaves de una fórmula: `{Precio}` → `Precio`. Es el mismo trozo que
 *  reconoce el analizador de `formulas.ts`; si aquélla cambia, ésta también. */
const LLAVES = /\{([^}]*)\}/g;

/**
 * Cambia `{viejo}` por `{nuevo}` en un texto de fórmula.
 *
 * COMPARA IGNORANDO MAYÚSCULAS Y ESPACIOS DE LOS BORDES, exactamente igual que
 * hace el evaluador al resolver el nombre (`porNombre[nombre.toLowerCase()]`).
 * Si aquí se comparara distinto, habría fórmulas que el evaluador SÍ resuelve y
 * esto no renombraría — y volverían a romperse, que es el fallo que venimos a
 * quitar.
 *
 * NO TOCA NADA MÁS: ni el texto entre comillas, ni los nombres de función, ni
 * los números. Solo lo que va entre llaves, que es lo único que nombra una
 * columna.
 */
export function renombrarEnFormula(texto: string, viejo: string, nuevo: string): string {
  if (!texto || !viejo || viejo === nuevo) return texto;
  const buscado = viejo.trim().toLowerCase();
  return texto.replace(LLAVES, (entero, dentro) =>
    String(dentro).trim().toLowerCase() === buscado ? `{${nuevo}}` : entero);
}

/**
 * Lo mismo, sobre la configuración entera de una columna calculada.
 *
 * Hay tres formas de guardar una fórmula y las tres nombran columnas:
 *   · `formula`      — la de una columna de tipo fórmula.
 *   · `reglas[].si` y `reglas[].entonces` — las de una condicional.
 *   · `si_no`        — el valor por defecto de una condicional.
 *
 * Se recorren las tres. Si mañana aparece una cuarta, este es el sitio donde
 * hay que acordarse — por eso están juntas y no repartidas por la ruta.
 *
 * Devuelve `null` cuando no ha cambiado nada: quien llama usa eso para no
 * escribir en la base de datos filas que quedarían idénticas.
 */
export function renombrarEnConfig(config: any, viejo: string, nuevo: string): any | null {
  if (!config || typeof config !== 'object') return null;
  const copia = JSON.parse(JSON.stringify(config));
  let tocado = false;

  const cambia = (t: any) => {
    if (typeof t !== 'string') return t;
    const n = renombrarEnFormula(t, viejo, nuevo);
    if (n !== t) tocado = true;
    return n;
  };

  if (typeof copia.formula === 'string') copia.formula = cambia(copia.formula);
  if (typeof copia.si_no === 'string') copia.si_no = cambia(copia.si_no);
  if (Array.isArray(copia.reglas)) {
    copia.reglas = copia.reglas.map((r: any) => (r && typeof r === 'object'
      ? { ...r, si: cambia(r.si), entonces: cambia(r.entonces) }
      : r));
  }
  return tocado ? copia : null;
}
