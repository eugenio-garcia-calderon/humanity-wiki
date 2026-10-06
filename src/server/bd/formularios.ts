// ============================================================================
// TABLAS · FORMULARIOS PÚBLICOS (2026-10-06, carril «bd»)
// ============================================================================
// Una vista de forma «formulario» deja que CUALQUIERA —sin cuenta— añada filas
// a una base de datos por un enlace. Es la única puerta de escritura pública
// de las tablas, así que cada decisión de aquí es de seguridad:
//
//   · Solo se rellenan los campos QUE EL AUTOR ELIGIÓ. Lo demás que llegue en
//     la petición se ignora: sin esto, un formulario de «nombre y correo»
//     serviría para escribir en cualquier columna de la tabla.
//   · Solo tipos que una persona escribe a mano. Nada de fórmulas, ficheros,
//     ni enlaces a otras filas (apuntarían a datos de la plataforma que quien
//     rellena no tiene por qué ver).
//   · Lo obligatorio y el formato se comprueban AQUÍ, no en el navegador: un
//     navegador es lo primero que se salta quien quiere hacer daño.
//   · El enlace es un token aleatorio de 128 bits dentro de la vista: no se
//     deduce del id de la tabla ni de la vista, y se puede cambiar.
import { randomBytes } from 'node:crypto';
import { tipar, type Tipo } from './tipos';

/** Los tipos que se pueden pedir en un formulario público. */
export const TIPOS_DE_FORMULARIO = new Set<string>([
  'texto', 'texto_largo', 'numero', 'fecha', 'seleccion', 'seleccion_multiple', 'casilla',
  'url', 'email', 'telefono', 'moneda', 'porcentaje', 'duracion', 'valoracion',
]);

export const nuevoToken = () => randomBytes(16).toString('hex');

export type CampoForm = { columna_id: string; obligatorio?: boolean; ayuda?: string; etiqueta?: string };

/** La configuración que llega del cliente, limpia. El token NO se acepta de
 *  fuera: lo pone el servidor (o se conserva el que ya había). */
export function limpiarConfigFormulario(entrante: any, anterior: any): any {
  const f = entrante && typeof entrante === 'object' ? entrante : {};
  const campos: CampoForm[] = (Array.isArray(f.campos) ? f.campos : []).slice(0, 100)
    .filter((c: any) => c && typeof c.columna_id === 'string')
    .map((c: any) => ({
      columna_id: c.columna_id,
      obligatorio: !!c.obligatorio,
      ayuda: String(c.ayuda || '').slice(0, 300),
      etiqueta: String(c.etiqueta || '').slice(0, 120),
    }));
  const publico = !!f.publico;
  let token: string | null = anterior?.token || null;
  if (f.regenerar_token) token = publico ? nuevoToken() : null;
  else if (publico && !token) token = nuevoToken();
  return {
    titulo: String(f.titulo || '').slice(0, 200),
    descripcion: String(f.descripcion || '').slice(0, 2000),
    gracias: String(f.gracias || '').slice(0, 2000),
    boton: String(f.boton || '').slice(0, 60),
    campos, publico,
    ...(token ? { token } : {}),
  };
}

/** Valida lo enviado contra los campos del formulario. Devuelve los valores ya
 *  tipados por columna, o los fallos por columna. */
export function validarRespuesta(
  entrante: Record<string, unknown>,
  campos: CampoForm[],
  columnas: Array<{ id: string; nombre: string; tipo: string; opciones?: any[]; config?: any }>,
): { valores: Record<string, any> } | { fallos: Array<{ columna: string; error: string }> } {
  const valores: Record<string, any> = {};
  const fallos: Array<{ columna: string; error: string }> = [];
  for (const campo of campos) {
    const col = columnas.find(c => c.id === campo.columna_id);
    if (!col || !TIPOS_DE_FORMULARIO.has(col.tipo)) continue;   // una columna quitada no bloquea el formulario
    const bruto = (entrante || {})[col.id];
    const r = tipar(col.tipo as Tipo, bruto, col.opciones || [], col.config || {});
    if ('error' in r) { fallos.push({ columna: col.id, error: r.error }); continue; }
    // Una casilla sin marcar se guarda «false», que es un valor: no cuenta como
    // vacía, así que una casilla obligatoria («Acepto…») exige estar MARCADA.
    const vacio = r.valor === undefined || (col.tipo === 'casilla' && r.valor === false);
    if (vacio && campo.obligatorio) { fallos.push({ columna: col.id, error: col.tipo === 'casilla' ? 'Tienes que marcar esta casilla.' : 'Este campo es obligatorio.' }); continue; }
    if (r.valor !== undefined) valores[col.id] = r.valor;
  }
  return fallos.length ? { fallos } : { valores };
}
