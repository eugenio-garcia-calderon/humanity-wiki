import { sql } from 'drizzle-orm';
import { bdInterno } from '../bd';
import { puedeEditarPagina as puedeEditar } from '../permisos.js';

// ============================================================================
// LA IA DENTRO DEL EDITOR DE PÁGINAS (2026-10-02)
// ============================================================================
// Eugenio: «un botón flotante en la herramienta de creación de páginas que
// abra el chat con la IA, y que ahí se le pueda pedir que agregue información
// y contenido a la página en la que esté el usuario [...] por ejemplo, una
// entrada en una base de datos concreta, con un nombre, una imagen, un texto».
//
// Hasta hoy el chat sabía la RUTA (`/paginas/KW…`) y nada más: ni qué bloques
// tiene la página ni qué bases de datos lleva dentro, y no había ninguna
// acción que tocara una página existente ni una tabla.
//
// Aquí van las tres piezas:
//   1. `paginaParaIA`: lo que la IA ve de la página abierta — leído de la base
//      de datos por id, nunca de lo que mande el navegador.
//   2. Las instrucciones de las dos acciones nuevas.
//   3. Cómo se ejecutan. Pasan por los MISMOS permisos que el editor: la
//      página, quien puede editarla; la tabla, `puedeConTabla` de `bd.ts`.


/** ¿Puede esta persona editar esta página? Lo contesta `permisos.ts`, la
 *  misma función que usa `PUT /api/windows/:id`: creadora, administración, o
 *  rol «editar» o más (suyo, de un equipo suyo o heredado de la madre). */
export async function puedeEditarPagina(db: any, userId: string, nivel: number, paginaId: string): Promise<boolean> {
  return puedeEditar(db, { id: userId, nivel }, paginaId);
}

/** Un trozo de texto corto, sin saltos, para el resumen. */
const corto = (t: unknown, n = 140) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

/**
 * Lo que la IA necesita saber de la página que la persona tiene abierta: sus
 * bloques en orden y, de cada base de datos, su nombre, sus columnas y las
 * entradas que ya tiene. `null` si no existe o no puede editarla.
 */
export async function paginaParaIA(db: any, userId: string, nivel: number, paginaId: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(paginaId)) return null;
  if (!(await puedeEditarPagina(db, userId, nivel, paginaId))) return null;
  const w = (await db.execute(sql`SELECT id, title, config FROM knowledge_windows WHERE id = ${paginaId}`)).rows[0] as any;
  if (!w) return null;
  const bloques: any[] = Array.isArray(w.config?.bloques) ? w.config.bloques : [];
  const lineas: string[] = [];
  for (const b of bloques.slice(0, 120)) {
    if (b?.tipo === 'basedatos' && b.tabla_id) {
      const t = (await db.execute(sql`SELECT id, titulo FROM bd_tablas WHERE id = ${b.tabla_id} AND deleted_at IS NULL`)).rows[0] as any;
      if (!t) continue;
      const cols = (await db.execute(sql`
        SELECT nombre, tipo FROM bd_columnas WHERE tabla_id = ${t.id} AND archived_at IS NULL ORDER BY orden LIMIT 20
      `)).rows as any[];
      const filas = (await db.execute(sql`
        SELECT coalesce(w.title, '') AS titulo FROM bd_filas f LEFT JOIN knowledge_windows w ON w.id = f.pagina_id
        WHERE f.tabla_id = ${t.id} AND f.deleted_at IS NULL ORDER BY f.orden LIMIT 40
      `)).rows as any[];
      lineas.push(`- [bloque ${b.id}] BASE DE DATOS «${t.titulo}» (tabla_id: ${t.id}) — columnas: ${cols.map(c => `${c.nombre} (${c.tipo})`).join(', ') || 'ninguna'} — ${filas.length} entradas${filas.length ? `: ${filas.map(f => `«${corto(f.titulo, 60)}»`).join(', ')}` : ''}`);
    } else if (b?.tipo === 'imagen') {
      lineas.push(`- [bloque ${b.id}] imagen${b.url ? ` ${b.url}` : ''}`);
    } else if (b?.tipo === 'subpagina') {
      lineas.push(`- [bloque ${b.id}] enlace a la subpágina «${corto(b.pubTitulo, 60)}»`);
    } else if (b?.tipo) {
      const t = corto(b.texto);
      lineas.push(`- [bloque ${b.id}] ${b.tipo}${t ? `: ${t}` : ' (vacío)'}`);
    }
  }
  return `LA PÁGINA QUE TIENE ABIERTA EN EL EDITOR — «${w.title || 'Sin título'}» (pagina_id: ${w.id}). Puede editarla. Cuando diga «esta página», «aquí» o «la base de datos de X», es esto:
${lineas.join('\n') || '(la página está vacía)'}

${INSTRUCCIONES_PAGINA}`;
}

export const INSTRUCCIONES_PAGINA = `AÑADIR COSAS A ESTA PÁGINA. Se hace mandando la acción en el bloque \`\`\`redhumana, igual que las demás. No digas que no puedes.

· ANADIR_A_PAGINA — añade bloques a la página. Parámetros: pagina_id (el de arriba), bloques (lista; cada uno {"tipo": "parrafo" | "titulo1" | "titulo2" | "titulo3" | "lista" | "numerada" | "cita", "texto": "..."} o {"tipo": "imagen", "url": "...", "pie": "..."}), despues_de (id de un bloque; si no, al final). En «lista» y «numerada» cada elemento va en una línea del texto.
· CREATE_FILA — añade una ENTRADA a una base de datos de la página. Cada entrada es a su vez una página, con su tarjeta en la galería. Parámetros: tabla_id (el de la base de datos, de la lista de arriba — si hay varias y no está claro cuál, PREGUNTA), titulo (obligatorio: el nombre de la entrada), texto (el contenido de su página), descripcion (una frase bajo el título, opcional), imagen (una dirección /uploads/… o https://…, o la palabra "adjunto" si la persona ha adjuntado una imagen en este mensaje), generar_imagen (si pide que la imagen la hagas tú: la descripción de la imagen, en una frase, y deja «imagen» vacío).

Ejemplo, para «añade a Áreas una entrada que se llame Agua con esta foto y un texto sobre el agua»:

\`\`\`redhumana
{"actions": [{"type": "CREATE_FILA", "params": {"tabla_id": "BDT…", "titulo": "Agua", "texto": "El agua es…", "imagen": "adjunto"}, "rationale": "lo ha pedido"}]}
\`\`\``;

const TIPOS_TEXTO = new Set(['parrafo', 'titulo1', 'titulo2', 'titulo3', 'lista', 'numerada', 'cita']);
const nuevoId = () => `B${Date.now().toString(36)}${Math.floor(Math.random() * 46656).toString(36)}`;
const urlValida = (u: unknown) => typeof u === 'string' && /^(\/uploads\/|https:\/\/)[^\s"'<>]{1,500}$/.test(u);

/** Los bloques que manda la IA, limpios: sólo tipos conocidos y con algo dentro. */
function bloquesLimpios(lista: unknown): any[] {
  if (!Array.isArray(lista)) return [];
  const out: any[] = [];
  for (const b of lista.slice(0, 40)) {
    const tipo = String((b as any)?.tipo || 'parrafo');
    if (tipo === 'imagen') {
      if (urlValida((b as any).url)) out.push({ id: nuevoId(), tipo: 'imagen', url: (b as any).url, pie: (b as any).pie ? corto((b as any).pie, 300) : undefined });
    } else if (TIPOS_TEXTO.has(tipo)) {
      const texto = String((b as any)?.texto ?? '').slice(0, 20000);
      if (texto.trim()) out.push({ id: nuevoId(), tipo, texto });
    }
  }
  return out;
}

/**
 * Las dos acciones nuevas. `null` si el tipo no es de aquí.
 * `imagenGenerada` la pone quien llama: generar una imagen cuesta dinero y
 * pasa por el tope de gasto, que vive en el asistente.
 */
export async function ejecutarAccionPagina(db: any, type: string, params: any, actorId: string, nivel: number,
  generarImagen: (descripcion: string) => Promise<string>): Promise<any | null> {
  if (type === 'ANADIR_A_PAGINA') {
    const paginaId = String(params.pagina_id || '');
    if (!(await puedeEditarPagina(db, actorId, nivel, paginaId))) return { ok: false, error: 'No puedes editar esa página.' };
    const nuevos = bloquesLimpios(params.bloques);
    if (!nuevos.length) return { ok: false, error: 'No venía ningún bloque que añadir.' };
    const w = (await db.execute(sql`SELECT config FROM knowledge_windows WHERE id = ${paginaId}`)).rows[0] as any;
    const bloques: any[] = Array.isArray(w?.config?.bloques) ? [...w.config.bloques] : [];
    const i = params.despues_de ? bloques.findIndex(b => b?.id === params.despues_de) : -1;
    if (i >= 0) bloques.splice(i + 1, 0, ...nuevos); else bloques.push(...nuevos);
    await db.execute(sql`
      UPDATE knowledge_windows SET config = jsonb_set(coalesce(config, '{}'::jsonb), '{bloques}', ${JSON.stringify(bloques)}::jsonb),
             updated_at = now(), updated_by = ${actorId}
      WHERE id = ${paginaId}
    `);
    return { ok: true, entityId: paginaId, entityType: 'knowledge_windows' };
  }

  if (type === 'CREATE_FILA') {
    const tablaId = String(params.tabla_id || '');
    const titulo = corto(params.titulo || params.nombre, 300);
    if (!tablaId) return { ok: false, error: 'Falta decir en qué base de datos.' };
    if (!titulo) return { ok: false, error: 'La entrada necesita un nombre.' };
    if (!bdInterno.crearFila) return { ok: false, error: 'Las bases de datos no están disponibles.' };
    // La imagen se resuelve ANTES de crear nada: si falla, no queda una
    // entrada a medias que la persona tenga que borrar.
    let imagen: string | null = urlValida(params.imagen) ? params.imagen : null;
    if (!imagen && params.generar_imagen) {
      try { imagen = await generarImagen(corto(params.generar_imagen, 600)); }
      catch (e: any) { return { ok: false, error: `No he podido hacer la imagen: ${e.message}` }; }
    }
    const fila = await bdInterno.crearFila({ user: { id: actorId, roleLevel: nivel } as any }, tablaId, titulo);
    if ('error' in fila) return { ok: false, error: fila.error };
    const texto = String(params.texto || '').slice(0, 20000);
    const config: any = { bloques: texto.trim() ? [{ id: nuevoId(), tipo: 'parrafo', texto }] : [] };
    if (imagen) config.portada = imagen;
    if (params.descripcion) config.subtitulo = corto(params.descripcion, 300);
    await db.execute(sql`
      UPDATE knowledge_windows SET config = coalesce(config, '{}'::jsonb) || ${JSON.stringify(config)}::jsonb,
             is_ai_generated = true, updated_at = now()
      WHERE id = ${fila.pagina_id}
    `);
    return { ok: true, entityId: fila.pagina_id, entityType: 'knowledge_windows', tabla_id: tablaId };
  }
  return null;
}
