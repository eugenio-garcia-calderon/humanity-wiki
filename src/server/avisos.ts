// ============================================================================
// LOS AVISOS (2026-08-21, Eugenio: «gestiona también el tema de
// notificaciones, crea una campanita arriba a la derecha en el menú para
// gestionar las notificaciones de cuando alguien te pone un comentario»)
// ============================================================================
// La tabla `notifications` existía y llevaba MESES vacía: cero filas. Solo
// escribía en ella un sitio —avisar a los seguidores de una entidad
// mencionada— y ni comentar, ni responder, ni reaccionar, ni seguir avisaban a
// nadie. Una red social donde nadie se entera de nada no es una red social: es
// un tablón de anuncios.
//
// UN SOLO SITIO QUE ESCRIBE AVISOS. Es la misma lección de `historial.ts`: si
// cada ruta escribe los suyos, cada ruta acaba escribiéndolos distinto y un
// día una se olvida. Aquí está el qué y el a quién; las rutas solo dicen qué
// ha pasado.
//
// NUNCA REVIENTA LO QUE LA LLAMA. Si el aviso falla, el comentario ya se ha
// guardado: decirle a la persona que su comentario ha fallado sería mentirle
// por algo que no le importa. Se anota en el registro y se sigue.
import { sql } from 'drizzle-orm';

/** Los tipos de aviso. Cada uno sabe redactarse solo, en `textoDelAviso`. */
export type TipoAviso =
  | 'comentario'          // alguien comentó algo tuyo
  | 'respuesta'           // alguien respondió a un comentario tuyo
  | 'mencion'             // alguien te nombró con @
  | 'reaccion'            // alguien reaccionó a algo tuyo
  | 'seguidor'            // alguien te siguió
  | 'guardado'            // alguien guardó algo tuyo
  | 'nueva_publicacion'   // alguien a quien sigues publicó
  // Telecomunicaciones (2026-08-22). Los dos avisos son para lo que pasa
  // MIENTRAS NO MIRAS: si tienes la conversación delante, el mensaje aparece
  // solo y la llamada suena — la campana sobra y sería ruido.
  | 'mensaje'             // alguien te ha escrito y no lo has visto
  | 'llamada_perdida'     // te llamó y no lo cogiste (o no estabas)
  // Puntos (prog7, 2026-08-23): los tres avisos de la caducidad. Sin
  // `dePartede` (los escribe el sistema), y con una clave en `entidadId`
  // para no repetir el mismo aviso dos días seguidos.
  | 'puntos_inactividad'  // tu saldo se perderá el día X si no vuelves
  | 'puntos_caducan'      // N puntos caducan el día X (10 años)
  | 'puntos_perdidos'     // ya se ha perdido / ha caducado N
  // Comercio (prog7, 2026-08-23): el vendedor se entera de que ha vendido y
  // el comprador de que su pedido se mueve. Hasta hoy, ninguno de los dos.
  | 'pedido_nuevo'        // te han comprado algo
  | 'pedido_estado'       // tu pedido ha cambiado de estado (enviado, entregado…)
  | 'cesta_olvidada'      // dejaste cosas en una cesta hace 24 h
  | 'precio_bajado'       // un favorito tuyo ha bajado de precio
  // Gasto de IA (prog8, 2026-08-23): solo para quien administra, y solo una
  // vez por mes. Enterarse al llegar al tope es enterarse tarde. Enterarse
  // cada día de que se va acercando es enseñar a ignorar la campana.
  // (El punto de arriba va donde había un punto y coma: esta lista la amplían
  //  otros a máquina buscando el primer «;», y un «;» dentro de un comentario
  //  parte el tipo por la mitad. Le pasó a prog7 el 2026-08-23 con este mismo
  //  comentario. En una lista que amplía todo el mundo, la puntuación de un
  //  comentario deja de ser cosa del que lo escribe.)
  | 'gasto_ia_80'        // la plataforma lleva el 80 % del tope de IA del mes
  // Comercio F5 (prog7, 2026-08-23): algo agotado que pediste que te avisáramos vuelve a estar disponible.
  | 'vuelve_stock';

/**
 * Deja un aviso. `paraQuien` puede ser null o el propio autor: en los dos
 * casos no se escribe nada.
 *
 * NO SE AVISA A UNO MISMO. Comentar tu propia publicación no es una noticia, y
 * una campana que suena por lo que acabas de hacer tú enseña a ignorarla.
 */
export async function avisar(db: any, a: {
  paraQuien: string | null | undefined;
  dePartede: string | null;
  tipo: TipoAviso;
  entidadTipo: string;
  entidadId: string;
  /** Lo que hace falta para redactar el aviso y para saber adónde lleva. */
  datos?: Record<string, any>;
}): Promise<boolean> {
  const { paraQuien, dePartede, tipo, entidadTipo, entidadId, datos } = a;
  if (!paraQuien || paraQuien === dePartede) return false;
  try {
    // El nombre se guarda AQUÍ, en el aviso, y no se resuelve al leerlo. Si
    // esa persona cambia de nombre mañana, el aviso de hoy sigue contando lo
    // que pasó hoy — y si borra su cuenta, el aviso no se queda mudo.
    const quien = dePartede
      ? (await db.execute(sql`SELECT display_name, avatar_url FROM users WHERE id = ${dePartede}`)).rows[0]
      : null;
    await db.execute(sql`
      INSERT INTO notifications (user_id, type, payload, entity_type, entity_id)
      VALUES (${paraQuien}, ${tipo},
              ${JSON.stringify({
                de: dePartede || null,
                nombre: (quien as any)?.display_name || null,
                foto: (quien as any)?.avatar_url || null,
                ...(datos || {}),
              })}::jsonb,
              ${entidadTipo}, ${entidadId})
    `);
    return true;
  } catch (e: any) {
    console.error('aviso:', e?.cause?.message || e?.message || e);
    return false;
  }
}

/**
 * A quién le pertenece una cosa. Es lo que hace falta para saber a quién
 * avisar cuando alguien comenta o reacciona.
 *
 * DEVUELVE null CUANDO NO LO SABE, y quien llama no avisa a nadie. Antes de
 * inventar un destinatario, ninguno: un aviso que le llega a quien no era es
 * peor que uno que no llega.
 */
export async function duenoDe(db: any, entidadTipo: string, entidadId: string): Promise<string | null> {
  const TABLAS: Record<string, { tabla: string; columna: string }> = {
    publications:      { tabla: 'publications',      columna: 'author_user_id' },
    knowledge_windows: { tabla: 'knowledge_windows', columna: 'creator_user_id' },
    knowledge_graphs:  { tabla: 'knowledge_graphs',  columna: 'creator_user_id' },
    user_maps:         { tabla: 'user_maps',         columna: 'creator_user_id' },
    proyectos:         { tabla: 'proyectos',         columna: 'creador_user_id' },
    comments:          { tabla: 'comments',          columna: 'author_user_id' },
    products:          { tabla: 'products',          columna: 'seller_user_id' },
  };
  const t = TABLAS[entidadTipo];
  if (!t) return null;
  try {
    const r = await db.execute(sql`
      SELECT ${sql.raw(t.columna)} AS dueno FROM ${sql.raw(t.tabla)} WHERE id = ${entidadId}
    `);
    return (r.rows[0] as any)?.dueno || null;
  } catch {
    return null;
  }
}

/** Las @menciones de un texto, en minúsculas y sin repetir. */
export const mencionesDe = (texto: string): string[] =>
  [...new Set((texto.match(/@([A-Za-zÁÉÍÓÚÑáéíóúñ0-9_.-]{2,40})/g) || []).map(m => m.slice(1).toLowerCase()))];

/**
 * Avisa a las personas nombradas con @ en un texto.
 *
 * SE BUSCA POR NOMBRE VISIBLE, sin espacios, porque es lo que la gente
 * escribe. Si no encuentra a nadie con ese nombre no pasa nada y NO se avisa a
 * un parecido: escribir «@ana» y que le llegue a «Ana María» sería mandar el
 * mensaje de alguien a quien no iba dirigido.
 */
export async function avisarMenciones(db: any, a: {
  texto: string; dePartede: string; entidadTipo: string; entidadId: string; datos?: Record<string, any>;
}): Promise<number> {
  const nombres = mencionesDe(a.texto);
  if (!nombres.length) return 0;
  try {
    // SE PASA COMO TEXTO SEPARADO POR COMAS, no como array. `${lista}::text[]`
    // parecía lo natural y el conector lo manda como una cadena entre
    // comillas, así que Postgres intenta leer «{"a","b"}» donde hay «a,b» y
    // revienta con `array_in`. Encontrado con la prueba 09 de la batería
    // social: sin ella, las menciones habrían salido a producción sin avisar
    // a nadie y sin que nada lo dijera — la ruta devolvía 200 igual.
    const r = await db.execute(sql`
      SELECT id, display_name FROM users
      WHERE lower(replace(display_name, ' ', '')) = ANY(string_to_array(${nombres.join(',')}, ','))
    `);
    let n = 0;
    for (const u of r.rows as any[]) {
      if (await avisar(db, {
        paraQuien: u.id, dePartede: a.dePartede, tipo: 'mencion',
        entidadTipo: a.entidadTipo, entidadId: a.entidadId, datos: a.datos,
      })) n++;
    }
    return n;
  } catch (e: any) {
    console.error('menciones:', e?.message || e);
    return 0;
  }
}
