// ============================================================================
// BASES DE DATOS DE USUARIO — CAPA 1 (2026-08-21)
// ============================================================================
// Hasta hoy la plataforma no tenía base de datos de usuario: tenía páginas con
// bloques y un tablero con 18 campos escritos en el código. El bloque «tabla»
// del editor es texto plano — nada ahí sabe que 620 es un número, así que no se
// puede sumar, ni ordenar, ni comparar, ni validar.
//
// El criterio de aceptación de todo el mes es montar aquí el «astillero solar»
// que existe hoy en Notion: siete bases enlazadas con agregados y fórmulas de
// veredicto. Esta capa es la primera de tres — tipos, luego relaciones, luego
// fórmulas y agregados — y las decisiones de forma están razonadas en la
// migración `drizzle/0053_bases_de_datos_de_usuario.sql`.
//
// ── LOS TRES ESTADOS DE UNA CELDA, Y POR QUÉ DESDE HOY ──────────────────────
// Hacia fuera una celda NUNCA es un `null` pelado. Es siempre un objeto con su
// estado: `vacia`, `ok`, `sin_calcular` o `error`. Hoy solo pueden darse los
// dos primeros —no hay columnas calculadas hasta la capa 3—, y aun así el
// contrato nace con los cuatro.
//
// El motivo es que si la capa 1 devuelve `null` para «vacía», el día que
// aparezcan «sin calcular» y «con error» hay que cambiar TODOS los clientes ya
// escritos contra ella. Cuesta cero ahora y es imposible después. Y es además
// la regla de la casa aplicada al modelo de datos: una celda tiene que poder
// decir «no lo sé» de forma distinguible de un resultado válido — un cero que
// en realidad significa «no se pudo calcular» es exactamente el tipo de dato
// incorrecto presentado como correcto que este proyecto ya ha pagado caro.
//
// ── PERMISOS ────────────────────────────────────────────────────────────────
// Se preguntan SIEMPRE al proyecto que contiene la tabla, nunca a la tabla y
// nunca a la fila. Es la forma de `archivo.ts`: así no pueden existir dos
// verdades sobre quién ve qué, y un proyecto que pasa de privado a público
// arrastra sus tablas sin migrar nada.
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { registrarHistorial } from './historial';
import { bloquesDe } from './bloquesSql';
import { REGLAS, guardian, ritmo, ipDe } from './limites/index';
import { limpiarConfigFormulario, validarRespuesta, TIPOS_DE_FORMULARIO, type CampoForm } from './bd/formularios';
import { tablaVisible } from './sitios';
import { TIPOS, tipar, type Tipo } from './bd/tipos';
import { celdasDe, type Celda } from './bd/celdas';
import { CLASE_DE_TIPO, enlacesDe, guardarEnlaces, comprobarEnlaces, celdaDeEnlaces, enlacesInversos, guardarInversos, type Apuntado } from './bd/enlaces';
import { CLASE_FICHERO, ficherosDe, guardarFicheros, comprobarFicheros, celdaDeFicheros, type Fichero } from './bd/ficheros';
import { calcularTabla, esCalculada, detectaCiclo, reglasAFormula } from './bd/calculo';
import { compilar } from './bd/formulas';
import { renombrarEnConfig } from './bd/renombrar';
import { OPERACIONES } from './bd/agregados';
import { filtrar, ordenarFilas, agrupar, OPERADORES, reglasDe, filtroValido, type Filtros, type Orden } from './bd/vistas';
import { sumarPeriodo, validarRecurrencia, diceHecho, hoyIso, type Recurrencia } from './bd/recurrencia';

/** Las formas que puede tener una vista. Una vista es una manera de MIRAR la
 *  misma tabla: cambiar de forma no toca ni una fila. */
const FORMAS = ['tabla', 'galeria', 'tablero', 'lista', 'calendario', 'linea', 'grafico', 'formulario'] as const;

const nid = (p: string) => `${p}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

// Se re-exportan: hasta la fase 1 vivían en este fichero.
export { tipar, TIPOS } from './bd/tipos';
export { celdasDe } from './bd/celdas';
export type { Celda } from './bd/celdas';

// ── RUTAS ───────────────────────────────────────────────────────────────────

/**
 * Lo que otros módulos del servidor pueden hacer con las tablas sin pasar por
 * HTTP (2026-10-02: la IA del editor de páginas). Lo rellena
 * `registerBdRoutes`, que es donde viven los permisos.
 */
export const bdInterno: {
  crearFila?: (req: Pick<Request, 'user'>, tablaId: string, titulo: unknown)
    => Promise<{ id: string; pagina_id: string } | { error: string; codigo: number }>;
  escribirCeldas?: (req: Pick<Request, 'user'>, filaId: string, celdas: Record<string, unknown>)
    => Promise<{ codigo: number; cuerpo: any }>;
} = {};

export function registerBdRoutes(app: Express, db: any) {
  /** Toda ruta de escritura comprueba el rol. Saltarse esto ya dejó un agujero
   *  abierto en producción una vez (`CLAUDE.md`, prohibición 3). */
  const exigeSesion = (req: Request, res: Response): boolean => {
    if (!req.user) { res.status(401).json({ error: 'Debes iniciar sesión.' }); return false; }
    return true;
  };

  /**
   * ¿Puede esta persona ver o escribir en esta tabla?
   *
   * Se pregunta por el PROYECTO que la contiene, nunca por la tabla. Devuelve
   * la tabla si puede, o el mensaje de por qué no.
   */
  async function puedeConTabla(req: Request, tablaId: string, escribir: boolean): Promise<{ tabla: any } | { error: string; codigo: number }> {
    // Se busca SIN filtrar las retiradas, y se decide después. «No existe» y
    // «su dueño la retiró» son dos respuestas distintas, y aquí importa: una
    // tabla puede estar metida en la página de otra persona, y ahí «esa tabla
    // no existe» se lee como un fallo del programa en vez de como una decisión
    // de alguien.
    const r = await db.execute(sql`
      SELECT t.*, p.creador_user_id AS proyecto_creador, p.publico AS proyecto_publico
      FROM bd_tablas t
      LEFT JOIN proyectos p ON p.id = t.proyecto_id
      WHERE t.id = ${tablaId} AND t.deleted_at IS NULL
    `);
    const t = r.rows[0] as any;
    if (!t) return { error: 'Esa tabla no existe.', codigo: 404 };
    if (t.archived_at) {
      return { error: 'Esta tabla se retiró. Quien la creó puede recuperarla.', codigo: 404 };
    }

    const yo = req.user?.id || null;
    const admin = (req.user?.roleLevel ?? 0) >= 4;
    if (admin) return { tabla: t };

    // Sin proyecto, la tabla es de quien la creó.
    const dueno = t.proyecto_id ? t.proyecto_creador : t.creador_user_id;
    if (dueno && dueno === yo) return { tabla: t };

    if (escribir) return { error: 'Solo quien creó el proyecto puede escribir en sus tablas.', codigo: 403 };
    if (t.proyecto_id ? t.proyecto_publico : false) return { tabla: t };
    // UNA TABLA METIDA EN UNA PÁGINA PUBLICADA SE VE (2026-09-30). La tabla
    // no tiene visibilidad propia fuera de su proyecto: la hereda de la página
    // donde se enseña. Ver `sitios.ts`.
    if (await tablaVisible(db, t.id)) return { tabla: t };
    return { error: 'No tienes acceso a esa tabla.', codigo: 403 };
  }

  /**
   * ¿Vale esta columna calculada? Devuelve el motivo por el que no, o `null`.
   *
   * Comprueba tres cosas, y las tres tienen que decirse en el momento de
   * definir: que la fórmula se entienda, que el agregado sepa por dónde mirar,
   * y que no se cree un cálculo circular. Un ciclo descubierto al evaluar sería
   * un bucle infinito en producción.
   */
  const validarCalculada = async (tablaId: string, nueva: { id: string; nombre: string; tipo: string; config: any }): Promise<string | null> => {
    const otras = await columnasDe(tablaId);

    if (nueva.tipo === 'formula' || nueva.tipo === 'condicional') {
      const texto = nueva.tipo === 'formula' ? String(nueva.config?.formula || '') : reglasAFormula(nueva.config);
      const c = compilar(texto);
      if ('error' in c) return `La fórmula no se entiende: ${c.error}`;
      // Que las columnas que nombra existan. Sin esto, una fórmula con un
      // nombre mal escrito se guardaría y fallaría en cada celda al leer.
      const nombres = new Set(otras.map((o: any) => String(o.nombre).toLowerCase()));
      nombres.add(nueva.nombre.toLowerCase());
      for (const n of c.columnas) {
        if (!nombres.has(n.toLowerCase())) return `La fórmula nombra una columna que no existe: «${n}».`;
      }
    }

    if (nueva.tipo === 'agregado') {
      const cfg = nueva.config || {};
      if (!cfg.columna_relacion) return 'Un agregado necesita saber por qué relación mirar.';
      if (!OPERACIONES.includes(cfg.operacion)) return `Operación no válida. Las que hay: ${OPERACIONES.join(', ')}.`;
      // LA COLUMNA DE RELACIÓN PUEDE VIVIR EN LA OTRA TABLA, y esto costó un
      // fallo real: con `direccion: 'destino'` («quién me apunta a mí») la
      // relación está en la tabla HIJA, no en ésta. Buscarla solo aquí hacía
      // imposible el caso más útil de todos — el proveedor que suma lo de sus
      // componentes.
      const rr = await db.execute(sql`
        SELECT id, tipo, tabla_id, config FROM bd_columnas
        WHERE id = ${cfg.columna_relacion} AND archived_at IS NULL
      `);
      const rel = rr.rows[0] as any;
      if (!rel) return 'Esa columna de relación no existe.';
      if (rel.tipo !== 'relacion') return 'El agregado tiene que apoyarse en una columna de relación.';
      const haciaDestino = cfg.direccion === 'destino';
      if (haciaDestino) {
        // Si miro quién me apunta, esa relación tiene que apuntar A ESTA tabla.
        const destino = (rel.config || {}).tabla_destino;
        if (destino && destino !== tablaId) {
          return 'Esa relación no apunta a esta tabla, así que nadie llegaría por ella.';
        }
      } else if (rel.tabla_id !== tablaId) {
        return 'Para seguir tus propios enlaces, la relación tiene que ser de esta tabla.';
      }
      if (cfg.operacion !== 'contar' && !cfg.columna_destino) {
        return 'Di qué campo de la otra tabla hay que resumir.';
      }
    }

    const porNombre: Record<string, string> = {};
    for (const o of otras as any[]) porNombre[String(o.nombre).toLowerCase()] = o.id;
    porNombre[nueva.nombre.toLowerCase()] = nueva.id;
    return detectaCiclo(otras as any[], nueva as any, porNombre);
  };

  /** ══ NO PUEDE HABER DOS COLUMNAS CON EL MISMO NOMBRE ═══════════════════
   *  (2026-08-22, encontrado revisando las tablas.)
   *
   *  El nombre de una columna no es una etiqueta: es la DIRECCIÓN con la que la
   *  nombran las fórmulas (`{Importe} * 1.21`). Con dos «Importe» en la misma
   *  tabla, una fórmula calcula con una de las dos —la que gane el orden— y
   *  devuelve un número perfectamente creíble que puede ser el equivocado.
   *
   *  Se comprueba al crear y al renombrar, que son los dos únicos sitios donde
   *  puede aparecer un repetido. Comparando en minúsculas, porque así es como
   *  las resuelve el evaluador: «importe» e «Importe» son la misma dirección.
   *
   *  Devuelve el mensaje del fallo, o `null` si el nombre está libre. */
  const nombreRepetido = async (tablaId: string, nombre: string, exceptoId?: string) => {
    const limpio = String(nombre || '').trim().toLowerCase();
    if (!limpio) return null;
    const r = await db.execute(sql`
      SELECT id FROM bd_columnas
      WHERE tabla_id = ${tablaId} AND archived_at IS NULL AND lower(nombre) = ${limpio}
    `);
    const choca = (r.rows as any[]).some(c => c.id !== exceptoId);
    return choca
      ? `Ya hay una columna que se llama «${String(nombre).trim()}». Las fórmulas las nombran por el nombre, así que dos iguales harían que un cálculo no supiera a cuál se refiere.`
      : null;
  };

  /** ══ CADA FILA ES UNA PÁGINA (2026-09-30) ══════════════════════════════
   *  Eugenio: «todas las bases de datos, cuando crean un nuevo elemento, son
   *  en realidad nuevas páginas; todo son páginas dentro de páginas, como
   *  hace Notion».
   *
   *  La columna `pagina_id` existía desde la capa 1 (decisión 3 de la
   *  migración 0053) pero nada la rellenaba. Ahora la fila nace con su página
   *  y, para las que ya existían, se crea al abrirla por primera vez.
   *
   *  EL NOMBRE DE LA FILA Y EL TÍTULO DE SU PÁGINA SON LA MISMA COSA. La
   *  primera columna de texto hace de nombre (la que nace con toda tabla,
   *  «Nombre»); escribirla retitula la página, y retitular la página la
   *  reescribe (ver `PUT /api/windows/:id`). Dos nombres para una misma cosa
   *  acabarían diciendo cosas distintas. */
  const columnaTitulo = async (tablaId: string): Promise<string | null> => {
    const r = await db.execute(sql`
      SELECT id FROM bd_columnas
      WHERE tabla_id = ${tablaId} AND archived_at IS NULL AND tipo = 'texto'
      ORDER BY orden, created_at LIMIT 1
    `);
    return (r.rows[0] as any)?.id ?? null;
  };

  /** Crea la página de una fila que no la tiene. La visibilidad sale del
   *  proyecto de la tabla, que es quien decide quién ve la tabla: una página
   *  más abierta que su tabla enseñaría lo que la tabla esconde. */
  const crearPaginaDeFila = async (filaId: string, tabla: any, titulo: string, actor: string): Promise<string> => {
    const id = nid('KW');
    await db.execute(sql`
      INSERT INTO knowledge_windows (id, title, kind, config, publico, creator_user_id, is_ai_generated, created_by, updated_by, proyecto_id)
      VALUES (${id}, ${titulo || 'Sin título'}, 'pagina', '{"bloques":[]}'::jsonb,
              ${tabla.proyecto_id ? !!tabla.proyecto_publico : false}, ${actor}, false, ${actor}, ${actor}, ${tabla.proyecto_id || null})
    `);
    await db.execute(sql`UPDATE bd_filas SET pagina_id = ${id} WHERE id = ${filaId} AND pagina_id IS NULL`);
    // Si otra petición ganó la carrera, vale la suya y ésta se retira.
    const r = await db.execute(sql`SELECT pagina_id FROM bd_filas WHERE id = ${filaId}`);
    const ganadora = (r.rows[0] as any)?.pagina_id;
    if (ganadora !== id) await db.execute(sql`UPDATE knowledge_windows SET deleted_at = now() WHERE id = ${id}`);
    return ganadora;
  };

  /** Lo que la galería necesita de la página de cada fila: su portada o la
   *  primera imagen, su icono y un trozo del primer texto. En un viaje. */
  const tarjetasDe = async (paginaIds: string[]) => {
    const out: Record<string, { titulo: string; imagen: string | null; icono: string | null; resumen: string; descripcion: string | null; encuadre: { x: number; y: number } | null }> = {};
    if (!paginaIds.length) return out;
    const r = await db.execute(sql`
      SELECT id, title, config FROM knowledge_windows
      WHERE id IN (${sql.join(paginaIds.map(i => sql`${i}`), sql`, `)}) AND deleted_at IS NULL
    `);
    for (const w of r.rows as any[]) {
      const cfg = w.config || {};
      const bloques: any[] = Array.isArray(cfg.bloques) ? cfg.bloques : [];
      const img = bloques.find(b => b?.tipo === 'imagen' && b.url)?.url || null;
      const texto = bloques.find(b => typeof b?.texto === 'string' && b.texto.trim())?.texto || '';
      out[w.id] = {
        titulo: w.title || '',
        imagen: cfg.portada || img,
        icono: cfg.icono || null,
        resumen: String(texto).replace(/[*`#>\[\]]/g, '').slice(0, 160),
        // La descripción que su autor escribió bajo el título (2026-10-01):
        // la tarjeta la enseña bajo el nombre, como la página.
        descripcion: typeof cfg.subtitulo === 'string' && cfg.subtitulo.trim() ? cfg.subtitulo.trim().slice(0, 300) : null,
        // Qué parte de la imagen se ve en la tarjeta (ver `/encuadre`).
        encuadre: cfg.encuadre && Number.isFinite(cfg.encuadre.x) && Number.isFinite(cfg.encuadre.y) ? cfg.encuadre : null,
      };
    }
    return out;
  };

  const columnasDe = async (tablaId: string) => {
    const r = await db.execute(sql`
      SELECT id, nombre, tipo, opciones, config, orden
      FROM bd_columnas WHERE tabla_id = ${tablaId} AND archived_at IS NULL
      ORDER BY orden, created_at
    `);
    return r.rows as any[];
  };

  // ── LAS TABLAS ────────────────────────────────────────────────────────────

  /** Mis tablas, o las de un proyecto. */
  app.get('/api/bd/tablas', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const proyecto = req.query.proyecto_id ? String(req.query.proyecto_id) : null;
      const r = await db.execute(sql`
        SELECT t.id, t.titulo, t.icono, t.descripcion, t.proyecto_id, t.creador_user_id, t.created_at,
               (SELECT count(*) FROM bd_filas f WHERE f.tabla_id = t.id AND f.archived_at IS NULL AND f.deleted_at IS NULL) AS filas
        FROM bd_tablas t
        LEFT JOIN proyectos p ON p.id = t.proyecto_id
        WHERE t.archived_at IS NULL AND t.deleted_at IS NULL
          AND (${proyecto}::text IS NULL OR t.proyecto_id = ${proyecto})
          AND (t.creador_user_id = ${req.user!.id} OR p.creador_user_id = ${req.user!.id} OR p.publico = true)
        ORDER BY t.orden, t.created_at DESC
      `);
      res.json(r.rows);
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Una tabla entera: definición, columnas y filas ya en forma de celdas. */
  app.get('/api/bd/tablas/:id', async (req: Request, res: Response) => {
    try {
      const permiso = await puedeConTabla(req, req.params.id, false);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });

      // Las filas que se repiten «en calendario» y ya tocaban, antes de leer:
      // quien abre la tabla el lunes tiene que ver la tarea del lunes.
      try { await ponerAlDia(req.params.id); } catch (e: any) { console.error('[bd] recurrencias:', e?.message || e); }

      const columnas = await columnasDe(req.params.id);
      const f = await db.execute(sql`
        SELECT id, valores, pagina_id, orden, recurrencia, created_at, updated_at
        FROM bd_filas
        WHERE tabla_id = ${req.params.id} AND archived_at IS NULL AND deleted_at IS NULL
        ORDER BY orden, created_at
      `);

      // Los enlaces de TODAS las filas en un viaje, no uno por fila: con 500
      // filas y tres columnas de relación, ir de una en una serían 1.500
      // consultas por cada pintada de la tabla.
      const filas = f.rows as any[];
      const enlaces = await enlacesDe(db, filas.map(x => x.id));
      const ficheros = await ficherosDe(db, filas.map(x => x.id));
      const columnasQueApuntan = columnas.filter(c => CLASE_DE_TIPO[c.tipo]);
      const columnasConFicheros = columnas.filter(c => CLASE_FICHERO[c.tipo]);

      const tarjetas = await tarjetasDe(filas.map(x => x.pagina_id).filter(Boolean));
      const colTitulo = await columnaTitulo(req.params.id);
      // Las caras de vuelta (2026-10-05): leen los enlaces de su gemela al revés.
      for (const c of columnasQueApuntan as any[]) {
        if (!c.config?.inversa_de) continue;
        const inv = await enlacesInversos(db, c.config.inversa_de, filas.map(x => x.id));
        for (const [filaId, lista] of Object.entries(inv)) ((enlaces[filaId] ||= {})[c.id] = lista);
      }

      const preparadas = filas.map(fila => {
          const celdas = celdasDe(fila.valores || {}, columnas);
          // Las columnas que apuntan no guardan nada en el jsonb: su valor sale
          // de `bd_enlaces`. Se sobrescriben aquí para que quien lee no tenga
          // que saber de dónde viene cada una.
          const suyos = enlaces[fila.id] || {};
          const apuntados: Record<string, Apuntado[]> = {};
          for (const c of columnasQueApuntan) {
            celdas[c.id] = celdaDeEnlaces(suyos[c.id]);
            if (suyos[c.id]) apuntados[c.id] = suyos[c.id];
          }
          // Lo mismo con los ficheros: la celda guarda identificadores y los
          // datos para poder enseñarlos van aparte.
          const susFich = ficheros[fila.id] || {};
          const archivos: Record<string, Fichero[]> = {};
          for (const c of columnasConFicheros) {
            celdas[c.id] = celdaDeFicheros(susFich[c.id]);
            if (susFich[c.id]) archivos[c.id] = susFich[c.id];
          }
          return {
            id: fila.id,
            pagina_id: fila.pagina_id,
            pagina: fila.pagina_id ? tarjetas[fila.pagina_id] || null : null,
            orden: fila.orden,
            recurrencia: fila.recurrencia || null,
            celdas,
            archivos,
            // Los nombres de lo apuntado, aparte: la celda guarda identificadores
            // y esto es lo que hace falta para poder enseñarlos sin otra vuelta.
            apuntados,
          };
      });

      // LO QUE SE VE DEL ELEMENTO ENLAZADO (2026-10-02, Eugenio: «que te
      // permita seleccionar las variables que quieres mostrar como enlazadas,
      // por ejemplo una imagen o un texto, de esa otra base de datos»). Una
      // relación con `config.mostrar` lleva, en cada apuntado, `muestra`: la
      // imagen y el texto de su página y los campos elegidos. Sólo si quien
      // mira puede leer la otra tabla: enlazar no abre lo que esa tabla
      // esconde.
      for (const c of columnas as any[]) {
        const mostrar: string[] = Array.isArray(c.config?.mostrar) ? c.config.mostrar : [];
        const destino = c.config?.tabla_destino;
        if (c.tipo !== 'relacion' || !mostrar.length || !destino) continue;
        const ids = [...new Set(preparadas.flatMap(f => (f.apuntados[c.id] || []).filter(a => a.clase === 'fila').map(a => a.id)))];
        if (!ids.length) continue;
        if ('error' in (await puedeConTabla(req, destino, false))) continue;
        const otras = await db.execute(sql`
          SELECT id, valores, pagina_id FROM bd_filas
          WHERE id IN (${sql.join(ids.map(i => sql`${i}`), sql`, `)}) AND deleted_at IS NULL
        `);
        const colsDestino = (await columnasDe(destino)).filter((x: any) => mostrar.includes(x.id));
        const tarjetasOtras = await tarjetasDe((otras.rows as any[]).map(o => o.pagina_id).filter(Boolean));
        const porId = new Map<string, any>();
        for (const o of otras.rows as any[]) {
          const t = o.pagina_id ? tarjetasOtras[o.pagina_id] : null;
          const celdas = celdasDe(o.valores || {}, colsDestino);
          porId.set(o.id, {
            imagen: mostrar.includes('imagen') ? t?.imagen || null : undefined,
            texto: mostrar.includes('texto') ? (t?.descripcion || t?.resumen || null) : undefined,
            campos: colsDestino.map((x: any) => ({ id: x.id, nombre: x.nombre, tipo: x.tipo, opciones: x.opciones, config: x.config, celda: celdas[x.id] })),
          });
        }
        for (const f of preparadas) for (const a of f.apuntados[c.id] || []) {
          const m = porId.get(a.id);
          if (m) (a as any).muestra = m;
        }
      }

      // LAS COLUMNAS CALCULADAS, EN ORDEN. Se hace aquí, con la tabla entera
      // delante, y no celda a celda: un agregado necesita mirar la otra tabla
      // completa, así que fila a fila serían tantas consultas como filas. Y el
      // orden importa porque un cálculo puede leer otro cálculo — ver
      // `bd/calculo.ts`.
      const { porFila, ciclo } = await calcularTabla(db, {
        columnas: columnas as any[],
        filas: preparadas.map(f => ({ id: f.id, celdas: f.celdas })),
      });
      for (const f of preparadas) Object.assign(f.celdas, porFila[f.id] || {});

      // ORDENAR Y FILTRAR VA DESPUÉS DE CALCULAR. Tiene que ser así: la mitad
      // de las columnas —fórmulas y agregados— no existen en la base de datos,
      // así que «ordena por dinero comprometido» es imposible en SQL. Ver la
      // nota de coste en `bd/vistas.ts`.
      let visibles = preparadas;
      let vista: any = null;
      if (req.query.vista) {
        const v = await db.execute(sql`
          SELECT * FROM bd_vistas WHERE id = ${String(req.query.vista)} AND tabla_id = ${req.params.id} AND archived_at IS NULL
        `);
        vista = v.rows[0] || null;
      }
      // Un filtro llegado por la URL que no se entiende NO tumba la lectura:
      // se ignora. Quien pide la tabla tiene que poder verla aunque el enlace
      // que siguió llevara un filtro mal escrito.
      const deUrl = (q: unknown) => { try { return q ? JSON.parse(String(q)) : null; } catch { return null; } };
      let filtros: Filtros = vista?.filtros || deUrl(req.query.filtros) || [];
      if (!filtroValido(filtros)) filtros = [];
      const ordenPor: Orden[] = vista?.orden_por || deUrl(req.query.orden) || [];
      visibles = ordenarFilas(filtrar(visibles, filtros), ordenPor);

      const agrupadoPor = vista?.agrupar_por || (req.query.agrupar ? String(req.query.agrupar) : null);
      const grupos = agrupadoPor ? agrupar(visibles, agrupadoPor) : null;

      // ── CON QUÉ BASES DE DATOS ESTÁ CONECTADA (2026-10-05) ───────────────
      // Para la cabecera: las relaciones que salen de aquí y las que llegan de
      // otras tablas, ya juntas por tabla. `columna_id` es la columna de ESTA
      // tabla (null si la relación llega pero aquí no se ve todavía).
      const conexiones: Array<{ tabla_id: string; titulo: string; icono: string | null; columna_id: string | null; columna_remota: string | null; ambas: boolean }> = [];
      {
        const salen = (columnas as any[]).filter(c => c.tipo === 'relacion' && c.config?.tabla_destino && c.config.tabla_destino !== req.params.id);
        const llegan = (await db.execute(sql`
          SELECT c.id, c.tabla_id, c.config FROM bd_columnas c JOIN bd_tablas t ON t.id = c.tabla_id
          WHERE c.tipo = 'relacion' AND c.archived_at IS NULL AND t.archived_at IS NULL AND t.deleted_at IS NULL
            AND c.config->>'tabla_destino' = ${req.params.id} AND c.tabla_id <> ${req.params.id}
            AND c.config->>'inversa_de' IS NULL
        `)).rows as any[];
        const ids = [...new Set([...salen.map(c => c.config.tabla_destino), ...llegan.map(c => c.tabla_id)])];
        const info = ids.length ? new Map(((await db.execute(sql`
          SELECT id, titulo, icono FROM bd_tablas WHERE id IN (${sql.join(ids.map(i => sql`${i}`), sql`, `)}) AND deleted_at IS NULL
        `)).rows as any[]).map(t => [t.id, t])) : new Map();
        // Sólo las que quien mira puede leer: el título de una base de datos
        // privada de otro no se enseña por estar enlazada con ésta.
        for (const id of [...info.keys()]) if ('error' in (await puedeConTabla(req, id, false))) info.delete(id);
        for (const c of salen) {
          const t = info.get(c.config.tabla_destino);
          if (!t) continue;
          const remota = c.config.inversa_de || c.config.reciproca_id || null;
          conexiones.push({ tabla_id: t.id, titulo: t.titulo, icono: t.icono, columna_id: c.id, columna_remota: remota, ambas: !!remota });
        }
        for (const c of llegan) {
          // Ya contada si su gemela es una columna de aquí.
          if (c.config?.reciproca_id && salen.some(x => x.id === c.config.reciproca_id)) continue;
          const t = info.get(c.tabla_id);
          if (!t) continue;
          conexiones.push({ tabla_id: t.id, titulo: t.titulo, icono: t.icono, columna_id: null, columna_remota: c.id, ambas: false });
        }
      }

      res.json({
        conexiones,
        tabla: {
          id: permiso.tabla.id, titulo: permiso.tabla.titulo, icono: permiso.tabla.icono,
          descripcion: permiso.tabla.descripcion, proyecto_id: permiso.tabla.proyecto_id,
          // Cómo se ve la página de cada fila (2026-10-06, «Personalizar diseño»).
          config: permiso.tabla.config || {},
        },
        columnas,
        columna_titulo: colTitulo,
        ...(vista ? { vista: {
          id: vista.id, nombre: vista.nombre, forma: vista.forma, ocultas: vista.ocultas,
          filtros: vista.filtros, orden_por: vista.orden_por, agrupar_por: vista.agrupar_por,
          config: vista.config || {}, usuario_id: vista.usuario_id,
        } } : {}),
        // Se dice CUÁNTAS había antes de filtrar. Sin ese número, una vista con
        // un filtro puesto y otra sin él se ven igual de completas y nadie sabe
        // que está mirando un trozo.
        total: preparadas.length,
        mostradas: visibles.length,
        ...(grupos ? { grupos } : {}),
        // Si hay un cálculo circular se dice en la respuesta, además de en cada
        // celda afectada: la pantalla tiene que poder avisar arriba, no solo
        // enseñar celdas rojas sin explicación.
        ...(ciclo ? { ciclo } : {}),
        filas: visibles,
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Crear una tabla. Nace con una columna de texto: una tabla sin ninguna
   *  columna no se puede ni mirar, y obligar a crear la primera a mano es una
   *  pantalla vacía como primera impresión. */
  app.post('/api/bd/tablas', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const d = req.body || {};
      if (!d.titulo || !String(d.titulo).trim()) return res.status(400).json({ error: 'La tabla necesita un título.' });

      if (d.proyecto_id) {
        const p = await db.execute(sql`SELECT creador_user_id FROM proyectos WHERE id = ${d.proyecto_id} AND archived_at IS NULL`);
        const fila = p.rows[0] as any;
        if (!fila) return res.status(404).json({ error: 'Ese proyecto no existe.' });
        if (fila.creador_user_id !== req.user!.id && (req.user!.roleLevel ?? 0) < 4) {
          return res.status(403).json({ error: 'Solo quien creó el proyecto puede añadirle tablas.' });
        }
      }

      const id = nid('BDT');
      await db.execute(sql`
        INSERT INTO bd_tablas (id, titulo, icono, descripcion, proyecto_id, creador_user_id, created_by, updated_by)
        VALUES (${id}, ${String(d.titulo).trim().slice(0, 200)}, ${d.icono || null}, ${d.descripcion || null},
                ${d.proyecto_id || null}, ${req.user!.id}, ${req.user!.id}, ${req.user!.id})
      `);
      await db.execute(sql`
        INSERT INTO bd_columnas (id, tabla_id, nombre, tipo, orden)
        VALUES (${nid('BDC')}, ${id}, 'Nombre', 'texto', 0)
      `);
      await registrarHistorial(db, { entidad: 'bd_tabla', tabla: 'bd_tablas', id, operacion: 'create', previo: null, actor: req.user!.id });
      res.json({ id });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  // ── LAS COLUMNAS ──────────────────────────────────────────────────────────

  /** Añadir una columna. */
  /**
   * RENOMBRAR UNA TABLA — `PUT /api/bd/tablas/:id`
   *
   * No existía. Una tabla nacía con el nombre que se le pusiera y ese nombre
   * era para siempre: la única salida era crear otra y copiar los datos a
   * mano. Un nombre es lo que más se equivoca uno al empezar algo.
   */
  app.put('/api/bd/tablas/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const permiso = await puedeConTabla(req, req.params.id, true);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });

      const titulo = typeof req.body?.titulo === 'string' ? req.body.titulo.trim() : null;
      if (titulo !== null && !titulo) {
        return res.status(400).json({ error: 'La tabla necesita un título.' });
      }
      const r = await db.execute(sql`
        UPDATE bd_tablas SET
          titulo = COALESCE(${titulo}, titulo),
          descripcion = COALESCE(${req.body?.descripcion ?? null}, descripcion),
          icono = COALESCE(${req.body?.icono ?? null}, icono),
          config = COALESCE(${req.body?.config && typeof req.body.config === 'object' && !Array.isArray(req.body.config) && JSON.stringify(req.body.config).length < 20000 ? JSON.stringify(req.body.config) : null}::jsonb, config),
          updated_by = ${req.user.id}, updated_at = now()
        WHERE id = ${String(req.params.id)}
        RETURNING id, titulo, descripcion, icono, config
      `);
      res.json(r.rows[0]);
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * RETIRAR UNA TABLA — `DELETE /api/bd/tablas/:id`
   *
   * Tampoco existía, y era el hueco más incómodo de la herramienta: se podían
   * crear tablas y no quitarlas, así que probar algo dejaba basura para
   * siempre.
   *
   * ── SE ARCHIVA, NO SE BORRA ────────────────────────────────────────────────
   * Regla 2 de la casa. Y aquí importa más que en otros sitios: **una tabla
   * puede estar embebida en páginas de otras personas**. Borrarla de verdad
   * dejaría un agujero en el documento de alguien sin avisarle y sin vuelta
   * atrás. Archivada, la página dice que ya no está y quien la puso puede
   * recuperarla.
   *
   * Se avisa de en cuántas páginas está antes de nada: quien retira una tabla
   * tiene derecho a saber a quién le va a cambiar la pantalla.
   */
  app.delete('/api/bd/tablas/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const permiso = await puedeConTabla(req, req.params.id, true);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });

      const id = String(req.params.id);
      // En cuántas páginas está metida. Se busca dentro de los bloques, que es
      // donde vive la referencia.
      const usos = await db.execute(sql`
        SELECT COUNT(*) AS n FROM knowledge_windows
        WHERE archived_at IS NULL AND deleted_at IS NULL
          AND config::text LIKE ${'%' + id + '%'}
      `);
      const enPaginas = Number((usos.rows[0] as any)?.n || 0);

      // `confirmado` es obligatorio cuando está en uso. Sin esto, un clic
      // distraído cambia la página de otra persona; con esto, hay que haber
      // leído cuántas.
      if (enPaginas > 0 && req.body?.confirmado !== true) {
        return res.status(409).json({
          error: `Esta tabla está metida en ${enPaginas} ${enPaginas === 1 ? 'página' : 'páginas'}. Si la retiras, ahí dejará de verse.`,
          en_paginas: enPaginas,
          necesita_confirmacion: true,
        });
      }

      await db.execute(sql`
        UPDATE bd_tablas SET archived_at = now(), updated_by = ${req.user.id}, updated_at = now()
        WHERE id = ${id}
      `);
      res.json({ retirada: true, en_paginas: enPaginas });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** La columna gemela de `colOrigen` (de `tablaOrigen`) en `tablaDestino`. */
  const crearGemela = async (tablaOrigen: string, colOrigen: string, tablaDestino: string): Promise<string> => {
    const t = await db.execute(sql`SELECT titulo FROM bd_tablas WHERE id = ${tablaOrigen}`);
    const base = String((t.rows[0] as any)?.titulo || 'Enlazado').slice(0, 110);
    let nombre = base;
    for (let n = 2; await nombreRepetido(tablaDestino, nombre); n++) nombre = `${base} (${n})`;
    const gid = nid('BDC');
    const ultima = await db.execute(sql`SELECT COALESCE(max(orden), -1) AS m FROM bd_columnas WHERE tabla_id = ${tablaDestino}`);
    await db.execute(sql`
      INSERT INTO bd_columnas (id, tabla_id, nombre, tipo, opciones, config, orden)
      VALUES (${gid}, ${tablaDestino}, ${nombre}, 'relacion', '[]'::jsonb,
              ${JSON.stringify({ tabla_destino: tablaOrigen, inversa_de: colOrigen, varios: true, mostrar: ['imagen'] })}::jsonb,
              ${Number((ultima.rows[0] as any).m) + 1})
    `);
    await db.execute(sql`UPDATE bd_columnas SET config = config || ${JSON.stringify({ reciproca_id: gid })}::jsonb WHERE id = ${colOrigen}`);
    return gid;
  };

  /** Mostrar una relación que ya existía también en la otra base de datos. */
  app.post('/api/bd/columnas/:id/reciproca', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const c = await db.execute(sql`SELECT * FROM bd_columnas WHERE id = ${req.params.id} AND archived_at IS NULL`);
      const col = c.rows[0] as any;
      if (!col || col.tipo !== 'relacion' || !col.config?.tabla_destino) return res.status(404).json({ error: 'Esa relación no existe.' });
      if (col.config.inversa_de) return res.status(400).json({ error: 'Ésta ya es la cara de vuelta.' });
      if (col.config.reciproca_id) {
        const ya = await db.execute(sql`SELECT id FROM bd_columnas WHERE id = ${col.config.reciproca_id} AND archived_at IS NULL`);
        if (ya.rows.length) return res.json({ reciproca_id: col.config.reciproca_id });
      }
      const permiso = await puedeConTabla(req, col.config.tabla_destino, true);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });
      res.json({ reciproca_id: await crearGemela(col.tabla_id, col.id, col.config.tabla_destino) });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  app.post('/api/bd/tablas/:id/columnas', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const permiso = await puedeConTabla(req, req.params.id, true);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });

      const d = req.body || {};
      const tipo = String(d.tipo || 'texto') as Tipo;
      if (!TIPOS.includes(tipo)) return res.status(400).json({ error: `Tipo no válido. Los de esta capa son: ${TIPOS.join(', ')}.` });
      if (!d.nombre || !String(d.nombre).trim()) return res.status(400).json({ error: 'La columna necesita un nombre.' });
      const repetido = await nombreRepetido(req.params.id, d.nombre);
      if (repetido) return res.status(400).json({ error: repetido });

      // CADA OPCIÓN LLEVA SU PROPIO `id`, generado aquí y no derivado del
      // texto: si el id saliera del nombre, renombrar la opción cambiaría su
      // identidad y con ella el significado de las filas que la usan.
      const opciones = Array.isArray(d.opciones)
        ? d.opciones.slice(0, 100).map((o: any) => ({
            id: String(o?.id || nid('OPT')),
            label: String(o?.label ?? o ?? '').slice(0, 100),
            color: o?.color || null,
          })).filter((o: any) => o.label)
        : [];

      // UNA COLUMNA CALCULADA SE VALIDA AL CREARLA, no al leerla. Si la
      // fórmula no se entiende o el cálculo es circular, se dice ahora — que es
      // cuando hay alguien delante a quien decírselo y todavía no hay datos que
      // dependan de ello.
      const id = nid('BDC');
      if (esCalculada(tipo)) {
        const malo = await validarCalculada(req.params.id, { id, nombre: String(d.nombre).trim(), tipo, config: d.config || {} });
        if (malo) return res.status(400).json({ error: malo });
      }

      const ultima = await db.execute(sql`SELECT COALESCE(max(orden), -1) AS m FROM bd_columnas WHERE tabla_id = ${req.params.id}`);
      await db.execute(sql`
        INSERT INTO bd_columnas (id, tabla_id, nombre, tipo, opciones, config, orden)
        VALUES (${id}, ${req.params.id}, ${String(d.nombre).trim().slice(0, 120)}, ${tipo},
                ${JSON.stringify(opciones)}::jsonb, ${JSON.stringify(d.config || {})}::jsonb,
                ${Number((ultima.rows[0] as any).m) + 1})
      `);

      // ── EN LAS DOS BASES DE DATOS (2026-10-05) ──────────────────────────
      // Una relación con `reciproca` nace con su gemela en la otra tabla, que
      // enseña lo mismo visto desde allí. Sólo si quien la crea puede editar
      // también la otra; si no, se queda de un lado y se dice.
      let reciproca_id: string | null = null;
      let aviso: string | null = null;
      const destino = d.config?.tabla_destino;
      if (tipo === 'relacion' && d.config?.reciproca && destino && destino !== req.params.id) {
        const otra = await puedeConTabla(req, destino, true);
        if ('error' in otra) aviso = 'El enlace se ve sólo en esta base de datos: no puedes editar la otra.';
        else reciproca_id = await crearGemela(req.params.id, id, destino);
      }
      res.json({ id, reciproca_id, aviso });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Renombrar una columna, cambiar sus opciones o su orden.
   *
   *  RENOMBRAR NO TOCA NI UN DATO, y ése es justamente el objetivo del diseño:
   *  las filas guardan el `id` de la columna, así que el nombre es solo lo que
   *  se ve. Cambiar el TIPO no se admite todavía: convertir una columna de
   *  texto a número obliga a decidir qué pasa con las celdas que no se pueden
   *  convertir, y esa decisión merece su propio trabajo en vez de colarse aquí
   *  y perder datos en silencio. */
  app.put('/api/bd/columnas/:id', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const c = await db.execute(sql`SELECT * FROM bd_columnas WHERE id = ${req.params.id} AND archived_at IS NULL`);
      const col = c.rows[0] as any;
      if (!col) return res.status(404).json({ error: 'Esa columna no existe.' });
      const permiso = await puedeConTabla(req, col.tabla_id, true);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });

      const d = req.body || {};
      if (d.tipo && d.tipo !== col.tipo) {
        return res.status(400).json({ error: 'Cambiar el tipo de una columna todavía no se puede: habría que decidir qué pasa con las celdas que no se puedan convertir.' });
      }

      // Al tocar las opciones se CONSERVAN los `id` que ya existían. Una opción
      // que llega sin `id` es nueva; una que llega con el suyo se renombra sin
      // que las filas que la usan se enteren, que es lo que se busca.
      const opciones = Array.isArray(d.opciones)
        ? d.opciones.slice(0, 100).map((o: any) => ({
            id: String(o?.id || nid('OPT')),
            label: String(o?.label ?? '').slice(0, 100),
            color: o?.color || null,
          })).filter((o: any) => o.label)
        : null;

      // LA CONFIGURACIÓN TAMBIÉN SE PUEDE CAMBIAR, y faltaba: sin esto, elegir
      // «enséñalo como moneda» en una fórmula ya creada no hacía nada, y no
      // había forma de corregir una fórmula mal escrita salvo borrar la columna
      // y perder sus datos.
      // Se valida igual que al crear: cambiar una fórmula puede introducir un
      // cálculo circular exactamente igual que crearla.
      if (d.config && esCalculada(col.tipo)) {
        const malo = await validarCalculada(col.tabla_id, {
          id: col.id, nombre: d.nombre ? String(d.nombre).trim() : col.nombre,
          tipo: col.tipo, config: d.config,
        });
        if (malo) return res.status(400).json({ error: malo });
      }

      const nombreNuevo = d.nombre ? String(d.nombre).trim().slice(0, 120) : null;
      // SE MIRA ANTES DE ESCRIBIR. Consultado después, el nombre viejo ya no
      // existe en la tabla y la cuenta sale 1: la comprobación se creía buena y
      // reescribía igual (visto en pruebas, 2026-08-22).
      const eraAmbiguo = nombreNuevo
        ? ((await db.execute(sql`
            SELECT count(*)::int AS n FROM bd_columnas
            WHERE tabla_id = ${col.tabla_id} AND archived_at IS NULL
              AND lower(nombre) = ${String(col.nombre).toLowerCase()}
          `)).rows[0] as any)?.n > 1
        : false;
      if (nombreNuevo && nombreNuevo.toLowerCase() !== String(col.nombre).toLowerCase()) {
        const choca = await nombreRepetido(col.tabla_id, nombreNuevo, col.id);
        if (choca) return res.status(400).json({ error: choca });
      }

      await db.execute(sql`
        UPDATE bd_columnas SET
          nombre   = COALESCE(${nombreNuevo}, nombre),
          opciones = COALESCE(${opciones ? JSON.stringify(opciones) : null}::jsonb, opciones),
          -- Las marcas de las dos caras no se pierden al editar el resto.
          config   = COALESCE(${d.config ? JSON.stringify({ ...d.config,
                       ...(col.config?.inversa_de ? { inversa_de: col.config.inversa_de, tabla_destino: col.config.tabla_destino } : {}),
                       ...(col.config?.reciproca_id ? { reciproca_id: col.config.reciproca_id, tabla_destino: col.config.tabla_destino } : {}),
                       // El papel de madre/hijos y de dependencia tampoco: sin él la
                       // tabla dejaría de anidar en cuanto se editara la columna.
                       ...(col.config?.rol ? { rol: col.config.rol, tabla_destino: col.config.tabla_destino } : {}),
                       // La visibilidad en la página de la fila la pone su menú, no
                       // el editor de la columna: si éste no la manda, se conserva.
                       ...(col.config?.visibilidad && !('visibilidad' in d.config) ? { visibilidad: col.config.visibilidad } : {}) }) : null}::jsonb, config),
          orden    = COALESCE(${typeof d.orden === 'number' ? d.orden : null}, orden),
          updated_at = now()
        WHERE id = ${req.params.id}
      `);

      // ══ RENOMBRAR NO PUEDE APAGAR LOS CÁLCULOS (2026-08-22) ═══════════════
      // Una fórmula nombra sus columnas por el nombre —`{Precio} * 1.21`—, así
      // que al renombrar «Precio» todas las que la usaban se quedaban en
      // «No hay ninguna columna que se llame Precio». El aviso era honesto,
      // pero el gesto es cosmético y no puede tener ese precio: en una tabla
      // con quince fórmulas las rompía las quince de golpe.
      //
      // Se reescriben aquí, en el único sitio donde una columna cambia de
      // nombre. El porqué largo y la alternativa descartada (guardar ids en vez
      // de nombres) están en `bd/renombrar.ts`.
      let formulasArregladas = 0;
      // SI EL NOMBRE VIEJO ESTABA REPETIDO, NO SE REESCRIBE NADA.
      //
      // Encontrado probando el arreglo (2026-08-22): en una tabla con dos
      // columnas «Importe» —posible en las tablas creadas antes de que se
      // impidieran los repetidos—, renombrar una de las dos reescribía TODAS
      // las fórmulas que decían `{Importe}`, incluidas las que se referían a la
      // otra. Se arreglaba una y se rompían las demás.
      //
      // Con el nombre repetido no se puede saber a cuál apuntaba cada fórmula,
      // así que no se toca ninguna: dejarlas como están es además lo correcto,
      // porque al quedar solo una columna con ese nombre vuelven a resolverse
      // solas y sin ambigüedad.
      if (nombreNuevo && nombreNuevo !== col.nombre && !eraAmbiguo) {
        const calc = await db.execute(sql`
          SELECT id, config FROM bd_columnas
          WHERE tabla_id = ${col.tabla_id} AND archived_at IS NULL
            AND tipo IN ('formula', 'condicional')
        `);
        for (const otra of calc.rows as any[]) {
          const nueva = renombrarEnConfig(otra.config, col.nombre, nombreNuevo);
          if (!nueva) continue;   // esa fórmula no la nombraba
          await db.execute(sql`
            UPDATE bd_columnas SET config = ${JSON.stringify(nueva)}::jsonb, updated_at = now()
            WHERE id = ${otra.id}
          `);
          formulasArregladas++;
        }
      }
      // Se dice CUÁNTAS se han tocado. Que la aplicación reescriba fórmulas por
      // su cuenta sin decirlo sería un cambio invisible en algo que la persona
      // escribió a mano.
      res.json({ ok: true, formulasArregladas });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Quitar una columna. Se archiva, no se borra: sus valores siguen en el
   *  jsonb de cada fila, así que restaurarla los devuelve intactos. Borrarlos
   *  de verdad sería destruir conocimiento sin que nadie lo haya pedido
   *  (constitución, regla 6). */
  app.delete('/api/bd/columnas/:id', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const c = await db.execute(sql`SELECT tabla_id, config FROM bd_columnas WHERE id = ${req.params.id}`);
      const col = c.rows[0] as any;
      if (!col) return res.status(404).json({ error: 'Esa columna no existe.' });
      const permiso = await puedeConTabla(req, col.tabla_id, true);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });

      await db.execute(sql`UPDATE bd_columnas SET archived_at = now() WHERE id = ${req.params.id}`);
      // Las dos caras van juntas: quitar la relación quita su cara de vuelta;
      // quitar sólo la cara de vuelta deja la relación de un lado.
      if (col.config?.reciproca_id) await db.execute(sql`UPDATE bd_columnas SET archived_at = now() WHERE id = ${col.config.reciproca_id}`);
      if (col.config?.inversa_de) await db.execute(sql`UPDATE bd_columnas SET config = config - 'reciproca_id' WHERE id = ${col.config.inversa_de}`);
      res.json({ ok: true });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  // ── FORMULARIOS PÚBLICOS (2026-10-06, carril «bd») ────────────────────────
  // Ver `bd/formularios.ts` para el porqué de cada precaución. Las dos rutas
  // son PÚBLICAS a propósito —el que rellena no tiene cuenta— y por eso no
  // piden sesión ni miran `puedeConTabla`: lo único que abre la puerta es el
  // token de un formulario que su autor ha publicado.
  const TOKEN = /^[a-f0-9]{32}$/;
  const formularioPorToken = async (token: string) => {
    if (!TOKEN.test(token)) return null;
    const r = await db.execute(sql`
      SELECT v.id AS vista_id, v.tabla_id, v.config, t.titulo AS tabla_titulo,
             CASE WHEN t.proyecto_id IS NOT NULL THEN p.creador_user_id ELSE t.creador_user_id END AS dueno
      FROM bd_vistas v
      JOIN bd_tablas t ON t.id = v.tabla_id AND t.deleted_at IS NULL AND t.archived_at IS NULL
      LEFT JOIN proyectos p ON p.id = t.proyecto_id
      WHERE v.config -> 'formulario' ->> 'token' = ${token} AND v.archived_at IS NULL AND v.forma = 'formulario'
        AND v.config -> 'formulario' ->> 'publico' = 'true'
    `);
    const f = r.rows[0] as any;
    if (!f || !f.dueno) return null;
    const cols = (await columnasDe(f.tabla_id)).filter((c: any) => TIPOS_DE_FORMULARIO.has(c.tipo));
    const cfg = f.config?.formulario || {};
    const campos: CampoForm[] = (cfg.campos || []).filter((c: CampoForm) => cols.some((x: any) => x.id === c.columna_id));
    return { ...f, cfg, cols, campos };
  };

  app.get('/api/bd/formularios/:token', async (req: Request, res: Response) => {
    try {
      const f = await formularioPorToken(String(req.params.token));
      if (!f) return res.status(404).json({ error: 'Este formulario no existe o ya no está abierto.' });
      res.set('Cache-Control', 'no-store');
      res.json({
        titulo: f.cfg.titulo || f.tabla_titulo, descripcion: f.cfg.descripcion || '', boton: f.cfg.boton || 'Enviar',
        campos: f.campos.map((c: CampoForm) => {
          const col = f.cols.find((x: any) => x.id === c.columna_id);
          return {
            columna_id: col.id, nombre: c.etiqueta || col.nombre, tipo: col.tipo, opciones: col.opciones || [],
            config: { decimales: col.config?.decimales, maximo: col.config?.maximo, moneda: col.config?.moneda },
            obligatorio: !!c.obligatorio, ayuda: c.ayuda || '',
          };
        }),
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: 'No se pudo abrir el formulario.' }); }
  });

  app.post('/api/bd/formularios/:token', guardian(db, REGLAS.formulario, () => null), async (req: Request, res: Response) => {
    try {
      const f = await formularioPorToken(String(req.params.token));
      if (!f) return res.status(404).json({ error: 'Este formulario no existe o ya no está abierto.' });
      const ip = ipDe(req);
      // EL CAMPO TRAMPA: un campo que las personas no ven (`sitio_web`). Un
      // robot rellena todo lo que encuentra. Se le contesta que ha ido bien —
      // sin pistas de que ha sido descubierto— y no se guarda nada, pero SÍ
      // cuenta para el límite de su IP.
      if (typeof req.body?.sitio_web === 'string' && req.body.sitio_web.trim()) {
        void ritmo(db, REGLAS.formulario, ip);
        return res.json({ ok: true, gracias: f.cfg.gracias || '¡Gracias! Hemos recibido tu respuesta.' });
      }
      if (!f.campos.length) return res.status(400).json({ error: 'Este formulario todavía no tiene campos.' });
      const v = validarRespuesta(req.body?.valores || {}, f.campos, f.cols);
      if ('fallos' in v) return res.status(400).json({ error: 'Revisa los campos marcados.', fallos: v.fallos });
      if (!Object.keys(v.valores).length) return res.status(400).json({ error: 'Rellena al menos un campo.' });

      // Quien recibe la fila es el dueño de la tabla: es el que tendría
      // permiso de escribirla, y así pasa por la MISMA función que cualquier
      // fila (con su página). Después se marca de dónde vino.
      const colTitulo = await columnaTitulo(f.tabla_id);
      const pseudo = { user: { id: f.dueno, roleLevel: 0 } } as Pick<Request, 'user'>;
      const nueva = await crearFila(pseudo, f.tabla_id, colTitulo ? v.valores[colTitulo] ?? '' : '');
      if ('error' in nueva) return res.status(nueva.codigo).json({ error: 'No se pudo guardar tu respuesta.' });
      await db.execute(sql`
        UPDATE bd_filas SET valores = valores || ${JSON.stringify(v.valores)}::jsonb, created_by = ${'formulario:' + f.vista_id}, updated_by = ${'formulario:' + f.vista_id}
        WHERE id = ${nueva.id}
      `);
      void ritmo(db, REGLAS.formulario, ip);
      res.json({ ok: true, gracias: f.cfg.gracias || '¡Gracias! Hemos recibido tu respuesta.' });
    } catch (e: any) { console.error(e); res.status(500).json({ error: 'No se pudo guardar tu respuesta.' }); }
  });

  // ── LA PÁGINA DE UNA FILA (2026-10-06, carril «bd») ───────────────────────
  // Lo que pide el menú de cada propiedad en la página de una fila, como en
  // Notion: ordenar arrastrando, duplicar, ir a la base de datos enlazada, y
  // en la página publicada, ver con qué está conectada.

  /** Ordenar las columnas: la lista entera de ids, en el orden nuevo. Es el
   *  orden de la TABLA: lo ven todas las filas y la rejilla. */
  app.put('/api/bd/tablas/:id/orden-columnas', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const permiso = await puedeConTabla(req, req.params.id, true);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });
      const ids: string[] | null = Array.isArray(req.body?.ids) ? req.body.ids.map(String).slice(0, 500) : null;
      if (!ids?.length) return res.status(400).json({ error: 'Falta el orden.' });
      // Las que no vengan en la lista van detrás, en su orden de antes: un
      // cliente con la lista vieja no puede mandar una columna al limbo.
      const todas = (await columnasDe(req.params.id)).map((c: any) => c.id as string);
      const orden = [...ids.filter(id => todas.includes(id)), ...todas.filter(id => !ids.includes(id))];
      await db.execute(sql`
        UPDATE bd_columnas c SET orden = x.o::int - 1, updated_at = now()
        FROM jsonb_array_elements_text(${JSON.stringify(orden)}::jsonb) WITH ORDINALITY AS x(id, o)
        WHERE c.id = x.id AND c.tabla_id = ${req.params.id}
      `);
      res.json({ ok: true });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Duplicar una propiedad CON SUS VALORES (los del jsonb y los enlaces). Una
   *  relación duplicada nace sin cara de vuelta: dos columnas gemelas de la
   *  misma de la otra tabla dirían dos cosas a la vez. Los archivos no se
   *  duplican: cada archivo pertenece a una celda. */
  app.post('/api/bd/columnas/:id/duplicar', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const c = await db.execute(sql`SELECT * FROM bd_columnas WHERE id = ${req.params.id} AND archived_at IS NULL`);
      const col = c.rows[0] as any;
      if (!col) return res.status(404).json({ error: 'Esa columna no existe.' });
      const permiso = await puedeConTabla(req, col.tabla_id, true);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });
      if (col.config?.inversa_de || col.config?.rol) return res.status(400).json({ error: 'Esta propiedad es una cara de una relación doble: no se puede duplicar.' });
      let nombre = `${col.nombre} (copia)`.slice(0, 120);
      for (let n = 2; await nombreRepetido(col.tabla_id, nombre); n++) nombre = `${col.nombre} (copia ${n})`.slice(0, 120);
      const id = nid('BDC');
      const config = { ...(col.config || {}) };
      delete config.reciproca_id; delete config.reciproca;
      await db.execute(sql`UPDATE bd_columnas SET orden = orden + 1 WHERE tabla_id = ${col.tabla_id} AND orden > ${col.orden}`);
      await db.execute(sql`
        INSERT INTO bd_columnas (id, tabla_id, nombre, tipo, opciones, config, orden)
        VALUES (${id}, ${col.tabla_id}, ${nombre}, ${col.tipo}, ${JSON.stringify(col.opciones || [])}::jsonb, ${JSON.stringify(config)}::jsonb, ${col.orden + 1})
      `);
      await db.execute(sql`
        UPDATE bd_filas SET valores = valores || jsonb_build_object(${id}::text, valores -> ${col.id}::text)
        WHERE tabla_id = ${col.tabla_id} AND valores ? ${col.id}
      `);
      await db.execute(sql`
        INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
        SELECT 'BDE' || upper(substr(md5(random()::text || e.id), 1, 14)), ${id}, e.fila_origen, e.clase, e.destino_id, e.orden, ${req.user!.id}
        FROM bd_enlaces e WHERE e.columna_id = ${col.id}
        ON CONFLICT DO NOTHING
      `);
      res.json({ id, nombre });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Dónde vive una base de datos: la primera página (que no sea la de una
   *  fila) que la enseña. Es el ↗ del nombre de una relación. */
  app.get('/api/bd/tablas/:id/hogar', async (req: Request, res: Response) => {
    try {
      const permiso = await puedeConTabla(req, req.params.id, false);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });
      const r = await db.execute(sql`
        SELECT p.id FROM knowledge_windows p
        WHERE p.kind = 'pagina' AND p.deleted_at IS NULL AND p.archived_at IS NULL
          AND ${bloquesDe('p')} @> jsonb_build_array(jsonb_build_object('tabla_id', ${req.params.id}::text))
          AND NOT EXISTS (SELECT 1 FROM bd_filas f WHERE f.pagina_id = p.id)
        ORDER BY p.created_at LIMIT 1
      `);
      res.json({ pagina_id: (r.rows[0] as any)?.id || null, titulo: permiso.tabla.titulo });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * LAS RELACIONES DE UNA FILA, PARA SU PÁGINA PUBLICADA. Solo las que tienen
   * algo conectado en esta fila: en una web, «Equipo: —» no informa de nada.
   * Se respeta «ocultar siempre» y lo que esconde la otra tabla: si quien
   * mira no puede leerla, no se enseña.
   */
  app.get('/api/bd/paginas/:paginaId/relaciones', async (req: Request, res: Response) => {
    try {
      const f = await db.execute(sql`SELECT id, tabla_id FROM bd_filas WHERE pagina_id = ${req.params.paginaId} AND deleted_at IS NULL LIMIT 1`);
      const fila = f.rows[0] as any;
      if (!fila) return res.json({ relaciones: [] });
      const permiso = await puedeConTabla(req, fila.tabla_id, false);
      if ('error' in permiso) return res.json({ relaciones: [] });
      const cols = (await columnasDe(fila.tabla_id)).filter((c: any) => c.tipo === 'relacion' && c.config?.visibilidad !== 'nunca');
      if (!cols.length) return res.json({ relaciones: [] });
      const enl: Record<string, any[]> = (await enlacesDe(db, [fila.id]))[fila.id] || {};
      for (const c of cols) {
        if (!c.config?.inversa_de) continue;
        const inv = await enlacesInversos(db, c.config.inversa_de, [fila.id]);
        if (inv[fila.id]) enl[c.id] = inv[fila.id];
      }
      const relaciones: any[] = [];
      for (const c of cols) {
        const lista = (enl[c.id] || []).filter((a: any) => a.existe !== false);
        if (!lista.length) continue;
        const destino = c.config?.tabla_destino;
        if (destino && 'error' in (await puedeConTabla(req, destino, false))) continue;
        relaciones.push({ columna_id: c.id, nombre: c.nombre, apuntados: lista });
      }
      res.json({ relaciones });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  // ── SUBELEMENTOS Y DEPENDENCIAS (2026-10-05, carril «bd») ─────────────────
  // Las dos son RELACIONES DE LA TABLA CONSIGO MISMA, con su cara de vuelta:
  //
  //   subelementos   «Elemento madre» (una sola) ↔ «Subelementos» (varios)
  //   dependencias   «Bloqueada por» (varias)    ↔ «Bloquea» (varias)
  //
  // No hay una tabla de jerarquía aparte: así un subelemento es una fila como
  // las demás —se filtra, se ordena, se agrupa, tiene su página— y la jerarquía
  // no puede contradecir a lo que enseña la columna. `config.rol` es lo que le
  // dice al cliente que anide o que dibuje flechas.
  const FUNCIONES: Record<string, { ida: string; vuelta: string; rolIda: string; rolVuelta: string; variosIda: boolean }> = {
    subelementos: { ida: 'Elemento madre', vuelta: 'Subelementos', rolIda: 'madre', rolVuelta: 'hijos', variosIda: false },
    dependencias: { ida: 'Bloqueada por', vuelta: 'Bloquea', rolIda: 'bloqueada_por', rolVuelta: 'bloquea', variosIda: true },
  };
  app.post('/api/bd/tablas/:id/funciones', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const permiso = await puedeConTabla(req, req.params.id, true);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });
      const f = FUNCIONES[String(req.body?.funcion)];
      if (!f) return res.status(400).json({ error: 'Las funciones que hay: subelementos, dependencias.' });
      const cols = await columnasDe(req.params.id);
      const ya = cols.find((c: any) => c.config?.rol === f.rolIda);
      if (ya) return res.json({ ida: ya.id, vuelta: ya.config?.reciproca_id || null, ya: true });
      const libre = (base: string) => { let n = base; for (let i = 2; cols.some((c: any) => String(c.nombre).toLowerCase() === n.toLowerCase()); i++) n = `${base} ${i}`; return n; };
      const ida = nid('BDC'), vuelta = nid('BDC');
      const ultima = Number(((await db.execute(sql`SELECT COALESCE(max(orden), -1) AS m FROM bd_columnas WHERE tabla_id = ${req.params.id}`)).rows[0] as any).m);
      await db.execute(sql`
        INSERT INTO bd_columnas (id, tabla_id, nombre, tipo, opciones, config, orden) VALUES
          (${ida}, ${req.params.id}, ${libre(f.ida)}, 'relacion', '[]'::jsonb,
           ${JSON.stringify({ tabla_destino: req.params.id, varios: f.variosIda, rol: f.rolIda, reciproca_id: vuelta })}::jsonb, ${ultima + 1}),
          (${vuelta}, ${req.params.id}, ${libre(f.vuelta)}, 'relacion', '[]'::jsonb,
           ${JSON.stringify({ tabla_destino: req.params.id, varios: true, rol: f.rolVuelta, inversa_de: ida })}::jsonb, ${ultima + 2})
      `);
      res.json({ ida, vuelta });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Los antepasados de una fila por la columna «Elemento madre», del más
   *  cercano al más lejano. Con tope: un círculo que se hubiera colado no
   *  puede dejar esto dando vueltas. */
  const antepasados = async (colMadre: string, filaId: string): Promise<string[]> => {
    const r = await db.execute(sql`
      WITH RECURSIVE sube(id, nivel) AS (
        SELECT destino_id, 1 FROM bd_enlaces WHERE columna_id = ${colMadre} AND fila_origen = ${filaId} AND clase = 'fila'
        UNION
        SELECT e.destino_id, s.nivel + 1 FROM bd_enlaces e JOIN sube s ON e.fila_origen = s.id
        WHERE e.columna_id = ${colMadre} AND e.clase = 'fila' AND s.nivel < 60
      ) SELECT id FROM sube ORDER BY nivel
    `);
    return (r.rows as any[]).map(x => x.id);
  };

  // ── FILAS QUE SE REPITEN ──────────────────────────────────────────────────
  // Ver `bd/recurrencia.ts` para el porqué de los dos modos.

  /**
   * Crea la copia de una fila: sus valores (con los cambios de `cambios`), sus
   * enlaces y el contenido de su página. Es lo que hace nacer «la siguiente»
   * de una tarea que se repite. Devuelve el id de la nueva.
   */
  const copiarFila = async (origen: any, cambios: Record<string, any>, recurrencia: Recurrencia | null, actor: string): Promise<string> => {
    const id = nid('BDF');
    const valores = { ...(origen.valores || {}) };
    for (const [k, v] of Object.entries(cambios)) { if (v === undefined || v === null) delete valores[k]; else valores[k] = v; }
    await db.execute(sql`UPDATE bd_filas SET orden = orden + 1 WHERE tabla_id = ${origen.tabla_id} AND orden > ${origen.orden}`);
    await db.execute(sql`
      INSERT INTO bd_filas (id, tabla_id, valores, orden, recurrencia, created_by, updated_by)
      VALUES (${id}, ${origen.tabla_id}, ${JSON.stringify(valores)}::jsonb, ${Number(origen.orden) + 1},
              ${recurrencia ? JSON.stringify(recurrencia) : null}::jsonb, ${actor}, ${actor})
    `);
    // Los enlaces de las columnas de IDA (las de vuelta se leen solas). La
    // madre se conserva: la siguiente de una subtarea sigue bajo la misma tarea.
    await db.execute(sql`
      INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
      SELECT 'BDE' || upper(substr(md5(random()::text || e.id), 1, 14)), e.columna_id, ${id}, e.clase, e.destino_id, e.orden, ${actor}
      FROM bd_enlaces e WHERE e.fila_origen = ${origen.id}
      ON CONFLICT DO NOTHING
    `);
    // La página, con su contenido: la lista de comprobación de «Revisar la
    // caldera» tiene que venir con la tarea, no empezar en blanco cada mes.
    const t = await db.execute(sql`SELECT t.*, p.publico AS proyecto_publico FROM bd_tablas t LEFT JOIN proyectos p ON p.id = t.proyecto_id WHERE t.id = ${origen.tabla_id}`);
    const colTitulo = await columnaTitulo(origen.tabla_id);
    const pagina = await crearPaginaDeFila(id, t.rows[0], colTitulo ? String(valores[colTitulo] ?? '') : '', actor);
    if (origen.pagina_id) {
      await db.execute(sql`
        UPDATE knowledge_windows SET config = (SELECT config FROM knowledge_windows WHERE id = ${origen.pagina_id})
        WHERE id = ${pagina} AND EXISTS (SELECT 1 FROM knowledge_windows WHERE id = ${origen.pagina_id} AND deleted_at IS NULL)
      `);
    }
    return id;
  };

  /**
   * Pone al día las plantillas «en calendario» de una tabla (o de todas): por
   * cada una cuya `proxima` ya ha llegado, crea la copia y avanza la fecha.
   *
   * LA FECHA SE RECLAMA ANTES DE COPIAR, con un UPDATE condicionado al valor
   * viejo. Dos lecturas a la vez de la misma tabla (dos pestañas, el reloj y
   * una persona) intentan avanzarla; solo una lo consigue y solo esa copia.
   * Sin esto, cada carrera dejaba una tarea repetida.
   */
  const ponerAlDia = async (tablaId?: string) => {
    const hoy = hoyIso();
    const r = await db.execute(sql`
      SELECT f.*, t.creador_user_id AS tabla_creador FROM bd_filas f JOIN bd_tablas t ON t.id = f.tabla_id
      WHERE f.recurrencia IS NOT NULL AND f.deleted_at IS NULL AND f.archived_at IS NULL
        AND t.deleted_at IS NULL AND t.archived_at IS NULL
        AND f.recurrencia->>'modo' = 'calendario' AND f.recurrencia->>'proxima' <= ${hoy}
        AND (${tablaId || null}::text IS NULL OR f.tabla_id = ${tablaId || null})
      LIMIT 200
    `);
    for (const plantilla of r.rows as any[]) {
      let rec: Recurrencia = plantilla.recurrencia;
      // Como mucho 12 de golpe: una plantilla olvidada un año no puede llenar
      // la tabla de 365 copias el día que alguien la abre.
      for (let n = 0; n < 12 && rec.proxima && rec.proxima <= hoy; n++) {
        const toca = rec.proxima;
        const siguiente = sumarPeriodo(toca, rec.cada, rec.unidad, rec.ancla);
        const gana = await db.execute(sql`
          UPDATE bd_filas SET recurrencia = jsonb_set(recurrencia, '{proxima}', to_jsonb(${siguiente}::text))
          WHERE id = ${plantilla.id} AND recurrencia->>'proxima' = ${toca} RETURNING id
        `);
        if (!gana.rows.length) break;
        const cambios: Record<string, any> = {};
        if (rec.columna_fecha) cambios[rec.columna_fecha] = toca;
        if (rec.columna_hecho) cambios[rec.columna_hecho] = undefined;
        await copiarFila(plantilla, cambios, null, plantilla.created_by || plantilla.tabla_creador || 'sistema');
        rec = { ...rec, proxima: siguiente };
      }
    }
  };
  // Cada hora, por si nadie abre la tabla: la tarea del lunes tiene que estar
  // ahí el lunes aunque se mire desde el tablero de otra página.
  const reloj = setInterval(() => { ponerAlDia().catch((e: any) => console.error('[bd] recurrencias:', e?.message || e)); }, 60 * 60 * 1000);
  (reloj as any).unref?.();

  /** Poner, cambiar o quitar (`null`) la repetición de una fila. */
  app.put('/api/bd/filas/:id/recurrencia', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const f = await db.execute(sql`SELECT * FROM bd_filas WHERE id = ${req.params.id} AND deleted_at IS NULL`);
      const fila = f.rows[0] as any;
      if (!fila) return res.status(404).json({ error: 'Esa fila no existe.' });
      const permiso = await puedeConTabla(req, fila.tabla_id, true);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });
      if (req.body?.recurrencia === null) {
        await db.execute(sql`UPDATE bd_filas SET recurrencia = NULL, updated_at = now() WHERE id = ${fila.id}`);
        return res.json({ recurrencia: null });
      }
      const r = validarRecurrencia(req.body?.recurrencia);
      if ('error' in r) return res.status(400).json({ error: r.error });
      const cols = await columnasDe(fila.tabla_id);
      for (const k of ['columna_fecha', 'columna_hecho'] as const) {
        if (r[k] && !cols.some((c: any) => c.id === r[k])) return res.status(400).json({ error: 'Esa propiedad no está en la tabla.' });
      }
      if (r.columna_fecha && cols.find((c: any) => c.id === r.columna_fecha)?.tipo !== 'fecha') return res.status(400).json({ error: 'La fecha que avanza tiene que ser una propiedad de fecha.' });
      if (r.columna_hecho && !['casilla', 'seleccion'].includes(cols.find((c: any) => c.id === r.columna_hecho)?.tipo)) return res.status(400).json({ error: '«Hecho» tiene que ser una casilla o una selección.' });
      if (r.modo === 'calendario') {
        // La primera copia: el siguiente periodo desde la fecha de la fila, o
        // desde hoy si no tiene. Nunca en el pasado: si no, al guardar
        // saldrían de golpe las copias de todos los periodos ya pasados.
        const base = r.columna_fecha && /^\d{4}-\d{2}-\d{2}$/.test(String(fila.valores?.[r.columna_fecha] || '')) ? fila.valores[r.columna_fecha] : hoyIso();
        r.ancla = Number(String(base).slice(8, 10)) || null;
        let p = r.proxima && r.proxima >= hoyIso() ? r.proxima : sumarPeriodo(base, r.cada, r.unidad, r.ancla);
        while (p < hoyIso()) p = sumarPeriodo(p, r.cada, r.unidad, r.ancla);
        r.proxima = p;
      } else {
        r.proxima = null;
        const f0 = r.columna_fecha ? String(fila.valores?.[r.columna_fecha] || '') : '';
        r.ancla = /^\d{4}-\d{2}-\d{2}$/.test(f0) ? Number(f0.slice(8, 10)) : null;
      }
      await db.execute(sql`UPDATE bd_filas SET recurrencia = ${JSON.stringify(r)}::jsonb, updated_at = now() WHERE id = ${fila.id}`);
      res.json({ recurrencia: r });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  // ── LAS VISTAS ────────────────────────────────────────────────────────────
  // (2026-10-05, carril «bd») Hasta hoy existían en la base de datos y nadie
  // las usaba: el servidor sabía filtrar y ordenar, pero ningún botón se lo
  // pedía. Ahora la barra de la vista las crea, las cambia y las quita.
  //
  // UNA VISTA COMPARTIDA (`usuario_id` nulo) ES DE LA TABLA: la ve todo el
  // mundo, también quien lee la página publicada, así que solo la toca quien
  // puede escribir en la tabla. Una vista personal la toca solo su dueño.

  /** Limpia y valida lo que llega para una vista. Devuelve el motivo del fallo
   *  o los campos ya limpios (solo los que han llegado). */
  const limpiarVista = (d: any): { error: string } | Record<string, any> => {
    const out: Record<string, any> = {};
    if (d.nombre !== undefined) {
      const n = String(d.nombre || '').trim().slice(0, 120);
      if (!n) return { error: 'La vista necesita un nombre.' };
      out.nombre = n;
    }
    if (d.forma !== undefined) {
      if (!FORMAS.includes(d.forma)) return { error: `Forma no válida. Las que hay: ${FORMAS.join(', ')}.` };
      out.forma = d.forma;
    }
    if (d.filtros !== undefined) {
      // Los filtros se validan al guardarlos. Un operador inventado guardado
      // aquí no fallaría al escribir, fallaría al mirar la tabla — y entonces
      // nadie sabría de dónde vino.
      const f = d.filtros ?? [];
      if (!filtroValido(f)) return { error: 'El filtro no tiene una forma válida.' };
      for (const r of reglasDe(f)) {
        if (!OPERADORES.includes(r?.operador as any)) {
          return { error: `Filtro no válido: «${r?.operador}». Los que hay: ${OPERADORES.join(', ')}.` };
        }
      }
      out.filtros = f;
    }
    if (d.orden_por !== undefined) {
      const o = Array.isArray(d.orden_por) ? d.orden_por.slice(0, 10) : [];
      out.orden_por = o.filter((x: any) => x && typeof x.columna_id === 'string')
        .map((x: any) => ({ columna_id: x.columna_id, direccion: x.direccion === 'desc' ? 'desc' : 'asc' }));
    }
    if (d.ocultas !== undefined) out.ocultas = Array.isArray(d.ocultas) ? d.ocultas.map(String).slice(0, 500) : [];
    if (d.agrupar_por !== undefined) out.agrupar_por = d.agrupar_por ? String(d.agrupar_por) : null;
    if (d.config !== undefined) {
      const c = d.config && typeof d.config === 'object' && !Array.isArray(d.config) ? d.config : {};
      // Un tope de tamaño: la configuración de una vista son unas decenas de
      // ajustes, no un sitio donde guardar cualquier cosa.
      if (JSON.stringify(c).length > 50000) return { error: 'La configuración de la vista es demasiado grande.' };
      out.config = c;
    }
    if (d.orden !== undefined && Number.isFinite(Number(d.orden))) out.orden = Math.round(Number(d.orden));
    return out;
  };

  /** La vista, si quien pide puede tocarla. */
  const puedeConVista = async (req: Request, vistaId: string): Promise<{ vista: any } | { error: string; codigo: number }> => {
    const r = await db.execute(sql`SELECT * FROM bd_vistas WHERE id = ${vistaId} AND archived_at IS NULL`);
    const v = r.rows[0] as any;
    if (!v) return { error: 'Esa vista no existe.', codigo: 404 };
    if (v.usuario_id) {
      if (v.usuario_id !== req.user?.id) return { error: 'Esa vista es personal de otra persona.', codigo: 403 };
      const lee = await puedeConTabla(req, v.tabla_id, false);
      if ('error' in lee) return lee;
      return { vista: v };
    }
    const p = await puedeConTabla(req, v.tabla_id, true);
    if ('error' in p) return { error: 'Solo quien puede escribir en la tabla cambia sus vistas compartidas.', codigo: p.codigo === 404 ? 404 : 403 };
    return { vista: v };
  };

  app.get('/api/bd/tablas/:id/vistas', async (req: Request, res: Response) => {
    try {
      const permiso = await puedeConTabla(req, req.params.id, false);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });
      // Las de la tabla (`usuario_id` nulo) y las MÍAS. Las de otros no: una
      // vista personal es de quien la hizo.
      const r = await db.execute(sql`
        SELECT id, nombre, forma, orden_por, filtros, ocultas, agrupar_por, config, usuario_id, orden
        FROM bd_vistas
        WHERE tabla_id = ${req.params.id} AND archived_at IS NULL
          AND (usuario_id IS NULL OR usuario_id = ${req.user?.id || null})
        ORDER BY orden, created_at
      `);
      res.json(r.rows);
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  app.post('/api/bd/tablas/:id/vistas', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const d = req.body || {};
      // Compartida (la de la tabla) por defecto si quien la crea puede escribir
      // en la tabla; si solo puede leerla, la vista es suya y de nadie más.
      const escribe = await puedeConTabla(req, req.params.id, true);
      const compartida = d.compartida === false ? false : !('error' in escribe);
      const permiso = compartida ? escribe : await puedeConTabla(req, req.params.id, false);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });
      if (d.nombre === undefined) d.nombre = '';
      const limpio = limpiarVista(d);
      if ('error' in limpio) return res.status(400).json({ error: limpio.error });

      // El enlace de un formulario lo pone el servidor, nunca el cliente; y solo
      // una vista de forma «formulario» puede llevar la sección `formulario`.
      if (limpio.config) {
        if (limpio.forma === 'formulario' && limpio.config.formulario) limpio.config = { ...limpio.config, formulario: limpiarConfigFormulario(limpio.config.formulario, null) };
        else { const { formulario, ...resto } = limpio.config; void formulario; limpio.config = resto; }
      }
      const id = nid('BDV');
      const ultima = await db.execute(sql`SELECT COALESCE(max(orden), -1) AS m FROM bd_vistas WHERE tabla_id = ${req.params.id} AND archived_at IS NULL`);
      await db.execute(sql`
        INSERT INTO bd_vistas (id, tabla_id, nombre, usuario_id, forma, orden_por, filtros, ocultas, agrupar_por, config, orden)
        VALUES (${id}, ${req.params.id}, ${limpio.nombre},
                ${compartida ? null : req.user!.id}, ${limpio.forma || 'tabla'},
                ${JSON.stringify(limpio.orden_por || [])}::jsonb, ${JSON.stringify(limpio.filtros || [])}::jsonb,
                ${JSON.stringify(limpio.ocultas || [])}::jsonb, ${limpio.agrupar_por || null},
                ${JSON.stringify(limpio.config || {})}::jsonb, ${Number((ultima.rows[0] as any).m) + 1})
      `);
      res.json({ id, compartida });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Cambiar una vista: solo los campos que lleguen. Es lo que guarda cada
   *  clic en «Filtrar», «Ordenar» o «Agrupar». */
  app.put('/api/bd/vistas/:id', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const p = await puedeConVista(req, req.params.id);
      if ('error' in p) return res.status(p.codigo).json({ error: p.error });
      const c = limpiarVista(req.body || {});
      if ('error' in c) return res.status(400).json({ error: c.error });
      // Ver el POST: el token del formulario es del servidor. Se conserva el
      // que había (o se crea al publicar, o se cambia si piden regenerarlo).
      if (c.config) {
        const forma = c.forma || p.vista.forma;
        if (forma === 'formulario') {
          const previo = p.vista.config?.formulario || null;
          c.config = { ...c.config, formulario: limpiarConfigFormulario(c.config.formulario ?? previo, previo) };
        } else { const { formulario, ...resto } = c.config; void formulario; c.config = resto; }
      }
      const j = (v: any) => v === undefined ? null : JSON.stringify(v);
      await db.execute(sql`
        UPDATE bd_vistas SET
          nombre      = COALESCE(${c.nombre ?? null}, nombre),
          forma       = COALESCE(${c.forma ?? null}, forma),
          filtros     = COALESCE(${j(c.filtros)}::jsonb, filtros),
          orden_por   = COALESCE(${j(c.orden_por)}::jsonb, orden_por),
          ocultas     = COALESCE(${j(c.ocultas)}::jsonb, ocultas),
          config      = COALESCE(${j(c.config)}::jsonb, config),
          -- «Sin agrupar» es un valor (null), distinto de «no lo toques».
          agrupar_por = CASE WHEN ${'agrupar_por' in c} THEN ${c.agrupar_por ?? null} ELSE agrupar_por END,
          orden       = COALESCE(${c.orden ?? null}, orden),
          updated_at  = now()
        WHERE id = ${req.params.id}
      `);
      res.json({ ok: true });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Duplicar una vista: el atajo de Notion para «la misma, con otro filtro». */
  app.post('/api/bd/vistas/:id/duplicar', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const p = await puedeConVista(req, req.params.id);
      if ('error' in p) return res.status(p.codigo).json({ error: p.error });
      const v = p.vista;
      const id = nid('BDV');
      await db.execute(sql`
        INSERT INTO bd_vistas (id, tabla_id, nombre, usuario_id, forma, orden_por, filtros, ocultas, agrupar_por, config, orden)
        SELECT ${id}, tabla_id, left(nombre || ' (copia)', 120), usuario_id, forma, orden_por, filtros, ocultas, agrupar_por,
               -- Un formulario duplicado nace CERRADO: abrir un segundo enlace
               -- público sin que nadie lo haya decidido sería publicar por descuido.
               CASE WHEN forma = 'formulario' THEN jsonb_set(config #- '{formulario,token}', '{formulario,publico}', 'false'::jsonb, true) ELSE config END,
               orden + 1
        FROM bd_vistas WHERE id = ${v.id}
      `);
      res.json({ id });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Quitar una vista. Se archiva: una página que la enseñaba dice que ya no
   *  está, en vez de romperse. La última vista de una tabla no se quita —
   *  una tabla sin ninguna forma de mirarla no se puede ni abrir. */
  app.delete('/api/bd/vistas/:id', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const p = await puedeConVista(req, req.params.id);
      if ('error' in p) return res.status(p.codigo).json({ error: p.error });
      const n = await db.execute(sql`SELECT count(*)::int AS n FROM bd_vistas WHERE tabla_id = ${p.vista.tabla_id} AND archived_at IS NULL AND usuario_id IS NULL`);
      if (!p.vista.usuario_id && Number((n.rows[0] as any).n) <= 1) {
        return res.status(400).json({ error: 'Es la única vista de la tabla: crea otra antes de quitar ésta.' });
      }
      await db.execute(sql`UPDATE bd_vistas SET archived_at = now() WHERE id = ${req.params.id}`);
      res.json({ ok: true });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  // ── LAS FILAS ─────────────────────────────────────────────────────────────

  /** Una fila nueva, con su página. La usan esta ruta y la IA (`bdInterno`),
   *  para que las dos pasen por el mismo permiso. */
  const crearFila = async (req: Pick<Request, 'user'>, tablaId: string, tituloCrudo: unknown)
    : Promise<{ id: string; pagina_id: string } | { error: string; codigo: number }> => {
    const permiso = await puedeConTabla(req as Request, tablaId, true);
    if ('error' in permiso) return permiso;
    const ultima = await db.execute(sql`SELECT COALESCE(max(orden), -1) AS m FROM bd_filas WHERE tabla_id = ${tablaId}`);
    const id = nid('BDF');
    // Se puede nacer ya con nombre (el «+ Nuevo» de la galería lo pide).
    const titulo = String(tituloCrudo || '').replace(/\s+/g, ' ').trim().slice(0, 2000);
    const colTitulo = titulo ? await columnaTitulo(tablaId) : null;
    const valores = colTitulo ? { [colTitulo]: titulo } : {};
    await db.execute(sql`
      INSERT INTO bd_filas (id, tabla_id, valores, orden, created_by, updated_by)
      VALUES (${id}, ${tablaId}, ${JSON.stringify(valores)}::jsonb, ${Number((ultima.rows[0] as any).m) + 1}, ${req.user!.id}, ${req.user!.id})
    `);
    const pagina_id = await crearPaginaDeFila(id, permiso.tabla, titulo, req.user!.id);
    return { id, pagina_id };
  };
  bdInterno.crearFila = crearFila;

  app.post('/api/bd/tablas/:id/filas', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const r = await crearFila(req, req.params.id, (req.body || {}).titulo);
      if ('error' in r) return res.status(r.codigo).json({ error: r.error });
      // NACER YA CON VALORES (2026-10-05): el «+» de una columna del tablero
      // crea la tarjeta en ESA columna, y el del calendario en ESE día. Se
      // escriben con la misma función que la rejilla: mismos permisos y misma
      // validación. Si algún valor no vale, la fila queda creada y se dice.
      const celdas = (req.body || {}).celdas;
      if (celdas && typeof celdas === 'object' && Object.keys(celdas).length) {
        const w = await escribirCeldas(req, r.id, celdas);
        if (w.codigo !== 200) return res.json({ ...r, aviso: w.cuerpo?.error, fallos: w.cuerpo?.fallos });
      }
      res.json(r);
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** La página de una fila, creándola si aún no tiene (las filas de antes
   *  del 2026-09-30 nacieron sin ella). Abrirla es de lectura: sólo se CREA
   *  si quien la abre puede escribir en la tabla; si no, se dice que no hay. */
  app.post('/api/bd/filas/:id/pagina', async (req: Request, res: Response) => {
    try {
      const f = await db.execute(sql`SELECT * FROM bd_filas WHERE id = ${req.params.id} AND deleted_at IS NULL`);
      const fila = f.rows[0] as any;
      if (!fila) return res.status(404).json({ error: 'Esa fila no existe.' });
      if (fila.pagina_id) {
        const lee = await puedeConTabla(req, fila.tabla_id, false);
        if ('error' in lee) return res.status(lee.codigo).json({ error: lee.error });
        return res.json({ pagina_id: fila.pagina_id });
      }
      if (!exigeSesion(req, res)) return;
      const permiso = await puedeConTabla(req, fila.tabla_id, true);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: 'Esta fila todavía no tiene página y solo quien puede escribir en la tabla puede crearla.' });
      const colTitulo = await columnaTitulo(fila.tabla_id);
      const titulo = colTitulo ? String((fila.valores || {})[colTitulo] ?? '') : '';
      res.json({ pagina_id: await crearPaginaDeFila(fila.id, permiso.tabla, titulo, req.user!.id) });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** ══ RECOLOCAR LA IMAGEN EN LA TARJETA (2026-10-01) ═══════════════════
   *  Eugenio: «como en Notion, que la imagen se reposicione dentro del marco
   *  de la galería». Se guarda en la página de la fila (`config.encuadre`,
   *  en %) y no en la tabla: es cómo se ve SU imagen. Escribe quien puede
   *  escribir en la tabla, que es quien ve el botón. Sólo toca esa clave:
   *  el resto de la página no viaja ni se pisa. */
  app.put('/api/bd/filas/:id/encuadre', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const f = await db.execute(sql`SELECT tabla_id, pagina_id FROM bd_filas WHERE id = ${req.params.id} AND deleted_at IS NULL`);
      const fila = f.rows[0] as any;
      if (!fila?.pagina_id) return res.status(404).json({ error: 'Esa fila no tiene página.' });
      const permiso = await puedeConTabla(req, fila.tabla_id, true);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });
      const acotar = (n: any) => Math.min(100, Math.max(0, Math.round(Number(n) * 10) / 10));
      const x = acotar(req.body?.x), y = acotar(req.body?.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return res.status(400).json({ error: 'Posición no válida.' });
      await db.execute(sql`
        UPDATE knowledge_windows
        SET config = jsonb_set(COALESCE(config, '{}'::jsonb), '{encuadre}', ${JSON.stringify({ x, y })}::jsonb),
            updated_at = now(), updated_by = ${req.user!.id}
        WHERE id = ${fila.pagina_id}
      `);
      res.json({ x, y });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * Escribir celdas de una fila. El cuerpo es `{ celdas: { "<id_columna>": valor } }`.
   *
   * Se validan TODAS antes de guardar NINGUNA: si una celda no vale, no se
   * escribe media fila. Y se responde qué celda falló y por qué, en vez de un
   * «error al guardar» que obliga a adivinar cuál de las diez era.
   */
  /**
   * Write cells of a row — the body of `PUT /api/bd/filas/:id`, as a function
   * (2026-10-02) so the chat (`rellenarPorChat.ts`) writes with exactly the
   * same permissions and validation as the grid. Returns status + body.
   */
  const escribirCeldas = async (req: Pick<Request, 'user'>, filaId: string, entrantesCrudos: Record<string, unknown>)
    : Promise<{ codigo: number; cuerpo: any }> => {
    const f = await db.execute(sql`SELECT * FROM bd_filas WHERE id = ${filaId} AND deleted_at IS NULL`);
    const fila = f.rows[0] as any;
    if (!fila) return { codigo: 404, cuerpo: { error: 'Esa fila no existe.' } };
    const permiso = await puedeConTabla(req as Request, fila.tabla_id, true);
    if ('error' in permiso) return { codigo: permiso.codigo, cuerpo: { error: permiso.error } };

    const entrantes = entrantesCrudos || {};
    const columnas = await columnasDe(fila.tabla_id);
    const porId = new Map(columnas.map(c => [c.id, c]));

    const valores = { ...(fila.valores || {}) };
    const fallos: Array<{ columna: string; error: string }> = [];

    // Los enlaces se aplican DESPUÉS de validar todo, por lo mismo que las
    // celdas normales: si algo no vale, no se escribe media fila.
    const enlacesPendientes: Array<{ colId: string; clase: any; destinos: string[] }> = [];
    const ficherosPendientes: Array<{ colId: string; ids: string[] }> = [];
    const inversosPendientes: Array<{ columnaOrigen: string; origenes: string[] }> = [];

    for (const [colId, bruto] of Object.entries(entrantes)) {
      const col = porId.get(colId);
      if (!col) { fallos.push({ columna: colId, error: 'Esa columna no existe en la tabla.' }); continue; }

      // ¿Es una columna que APUNTA? Entonces no va al jsonb: va a `bd_enlaces`.
      const clase = CLASE_DE_TIPO[col.tipo];
      if (clase) {
        const lista = bruto === null || bruto === undefined || bruto === ''
          ? []
          : (Array.isArray(bruto) ? bruto : [bruto]).map(String);
        const varios = !!(col.config || {}).varios;
        if (!varios && lista.length > 1) {
          fallos.push({ columna: colId, error: 'Esta columna admite un solo elemento.' });
          continue;
        }
        // Se COMPRUEBA aquí y se ESCRIBE después de que todo haya validado.
        const comp = await comprobarEnlaces(db, clase, lista);
        if ('error' in comp) { fallos.push({ columna: colId, error: comp.error }); continue; }
        // UNA FILA NO PUEDE SER SU PROPIA MADRE, NI BLOQUEARSE A SÍ MISMA, NI
        // QUEDAR DEBAJO DE UNA DE SUS HIJAS: el árbol daría vueltas y la tabla
        // anidada no tendría por dónde empezar a pintarse.
        if (col.config?.rol && col.config?.tabla_destino === fila.tabla_id && lista.includes(fila.id)) {
          fallos.push({ columna: colId, error: 'Una fila no puede enlazarse consigo misma aquí.' });
          continue;
        }
        if (col.config?.rol === 'madre' && lista[0]) {
          if ((await antepasados(col.id, lista[0])).includes(fila.id)) {
            fallos.push({ columna: colId, error: 'Esa fila está debajo de ésta: ponerla de madre crearía un círculo.' });
            continue;
          }
        }
        if (col.config?.rol === 'hijos' && col.config?.inversa_de && lista.length) {
          const mios = await antepasados(col.config.inversa_de, fila.id);
          if (lista.some(x => mios.includes(x))) {
            fallos.push({ columna: colId, error: 'Una de esas filas está por encima de ésta: no puede ser también su subelemento.' });
            continue;
          }
        }
        // La cara de vuelta escribe en los enlaces de su gemela.
        if (col.config?.inversa_de) { inversosPendientes.push({ columnaOrigen: col.config.inversa_de, origenes: lista }); continue; }
        enlacesPendientes.push({ colId, clase, destinos: lista });
        continue;
      }

      // ¿Es una columna de FICHEROS? Entonces tampoco va al jsonb.
      const claseFich = CLASE_FICHERO[col.tipo];
      if (claseFich) {
        const lista = bruto === null || bruto === undefined || bruto === ''
          ? []
          : (Array.isArray(bruto) ? bruto : [bruto]).map(String);
        if (!(col.config || {}).varios && lista.length > 1) {
          fallos.push({ columna: colId, error: 'Esta columna admite un solo archivo.' });
          continue;
        }
        const comp = await comprobarFicheros(db, claseFich, lista, req.user!.id, (req.user!.roleLevel ?? 0) >= 4);
        if ('error' in comp) { fallos.push({ columna: colId, error: comp.error }); continue; }
        ficherosPendientes.push({ colId, ids: lista });
        continue;
      }

      const r = tipar(col.tipo as Tipo, bruto, col.opciones || [], col.config || {});
      // `'error' in r` en vez de `!r.ok`: este proyecto no compila con
      // `strict`, y sin él TypeScript no estrecha la unión por el campo
      // discriminante. Con la comprobación de presencia funciona igual en
      // los dos modos.
      if ('error' in r) { fallos.push({ columna: colId, error: r.error }); continue; }
      if (r.valor === undefined) delete valores[colId];   // vaciar ≠ guardar cero
      else valores[colId] = r.valor;
    }

    // NADA se escribe si algo falla: ni celdas ni enlaces. Media fila guardada
    // es peor que una escritura rechazada, porque nadie sabe qué mitad entró.
    if (fallos.length) return { codigo: 400, cuerpo: { error: 'Hay celdas que no se pueden guardar.', fallos } };

    for (const p of ficherosPendientes) {
      await guardarFicheros(db, { columnaId: p.colId, filaId: fila.id, archivoIds: p.ids });
    }
    for (const p of inversosPendientes) {
      // SI LA IDA ADMITE UN SOLO ELEMENTO, poner a X como subelemento de ésta
      // le QUITA la madre que tuviera. Sin esto, escribir desde la cara de
      // vuelta dejaba a X con dos madres en una columna de una sola.
      const ida = await db.execute(sql`SELECT config FROM bd_columnas WHERE id = ${p.columnaOrigen}`);
      if (!(ida.rows[0] as any)?.config?.varios && p.origenes.length) {
        await db.execute(sql`
          DELETE FROM bd_enlaces WHERE columna_id = ${p.columnaOrigen} AND destino_id <> ${fila.id}
            AND fila_origen = ANY(string_to_array(${p.origenes.join(',')}, ','))
        `);
      }
      await guardarInversos(db, { columnaOrigen: p.columnaOrigen, filaId: fila.id, origenes: p.origenes, actor: req.user!.id });
    }
    for (const p of enlacesPendientes) {
      await guardarEnlaces(db, {
        columnaId: p.colId, filaId: fila.id, clase: p.clase, destinos: p.destinos, actor: req.user!.id,
      });
    }

    // El historial se engancha al módulo que ya existe (`historial.ts`) en vez
    // de escribir una segunda forma de guardarlo. Se agrupa porque la rejilla
    // guarda al salir de cada celda y una instantánea por tecleo no sirve de
    // nada. Y nunca revienta el guardado: si falla el historial, el usuario
    // ya ha escrito su dato.
    await registrarHistorial(db, {
      entidad: 'bd_fila', tabla: 'bd_filas', id: fila.id, operacion: 'update',
      previo: fila, actor: req.user!.id, agrupar: true,
    });

    await db.execute(sql`
      UPDATE bd_filas SET valores = ${JSON.stringify(valores)}::jsonb, updated_by = ${req.user!.id}, updated_at = now()
      WHERE id = ${filaId}
    `);
    // ── ¿SE ACABA DE COMPLETAR UNA FILA QUE SE REPITE? ──────────────────────
    // Entonces nace la siguiente, con la fecha avanzada y sin marcar, y la
    // repetición pasa a ella: la completada queda como historia.
    const rec: Recurrencia | null = fila.recurrencia;
    if (rec?.modo === 'al_completar' && rec.columna_hecho && rec.columna_hecho in entrantes) {
      const colHecho = porId.get(rec.columna_hecho);
      const antes = diceHecho((fila.valores || {})[rec.columna_hecho], colHecho || { tipo: '' }, rec);
      const ahora = diceHecho(valores[rec.columna_hecho], colHecho || { tipo: '' }, rec);
      if (colHecho && !antes && ahora) {
        // Se reclama quitándole la repetición: dos clics seguidos no crean dos.
        const gana = await db.execute(sql`UPDATE bd_filas SET recurrencia = NULL WHERE id = ${fila.id} AND recurrencia IS NOT NULL RETURNING id`);
        if (gana.rows.length) {
          const cambios: Record<string, any> = { [rec.columna_hecho]: undefined };
          if (rec.columna_fecha) {
            const actual = String(valores[rec.columna_fecha] ?? '');
            cambios[rec.columna_fecha] = sumarPeriodo(/^\d{4}-\d{2}-\d{2}$/.test(actual) ? actual : hoyIso(), rec.cada, rec.unidad, rec.ancla);
          }
          await copiarFila({ ...fila, valores }, cambios, rec, req.user!.id);
        }
      }
    }

    // El nombre de la fila es el título de su página: se escriben juntos.
    if (fila.pagina_id) {
      const colTitulo = await columnaTitulo(fila.tabla_id);
      if (colTitulo && colTitulo in entrantes) {
        await db.execute(sql`
          UPDATE knowledge_windows SET title = ${String(valores[colTitulo] ?? '') || 'Sin título'}, updated_at = now()
          WHERE id = ${fila.pagina_id}
        `);
      }
    }
    const trasEscribir = celdasDe(valores, columnas);
    const enlacesAhora = await enlacesDe(db, [fila.id]);
    for (const c of columnas) {
      if (CLASE_DE_TIPO[c.tipo]) trasEscribir[c.id] = celdaDeEnlaces((enlacesAhora[fila.id] || {})[c.id]);
    }
    const fichAhora = await ficherosDe(db, [fila.id]);
    for (const c of columnas) {
      if (CLASE_FICHERO[c.tipo]) trasEscribir[c.id] = celdaDeFicheros((fichAhora[fila.id] || {})[c.id]);
    }
    return { codigo: 200, cuerpo: { celdas: trasEscribir, apuntados: enlacesAhora[fila.id] || {}, archivos: fichAhora[fila.id] || {} } };
  };
  bdInterno.escribirCeldas = escribirCeldas;

  app.put('/api/bd/filas/:id', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const r = await escribirCeldas(req, req.params.id, (req.body || {}).celdas || {});
      res.status(r.codigo).json(r.cuerpo);
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** ══ MOVER UNA FILA (2026-10-05) ════════════════════════════════════════
   *  Para el tablero y la tabla: arrastrar una tarjeta entre otras dos. El
   *  cuerpo es `{ antes_de: <id> | null }` — null la manda al final.
   *
   *  SE RENUMERA LA TABLA ENTERA EN UNA SOLA CONSULTA, y no solo las filas
   *  visibles: con un filtro puesto el cliente no ve todas, y numerar solo las
   *  que ve chocaría con las escondidas. 5.000 filas son un único UPDATE. */
  app.put('/api/bd/filas/:id/mover', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const f = await db.execute(sql`SELECT tabla_id FROM bd_filas WHERE id = ${req.params.id} AND deleted_at IS NULL`);
      const fila = f.rows[0] as any;
      if (!fila) return res.status(404).json({ error: 'Esa fila no existe.' });
      const permiso = await puedeConTabla(req, fila.tabla_id, true);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });
      const antes = req.body?.antes_de ? String(req.body.antes_de) : null;
      const todas = (await db.execute(sql`
        SELECT id FROM bd_filas WHERE tabla_id = ${fila.tabla_id} AND deleted_at IS NULL AND archived_at IS NULL
        ORDER BY orden, created_at
      `)).rows.map((x: any) => x.id as string).filter(id => id !== req.params.id);
      const pos = antes ? todas.indexOf(antes) : -1;
      if (antes && pos < 0) return res.status(400).json({ error: 'La fila de referencia no está en esta tabla.' });
      todas.splice(pos < 0 ? todas.length : pos, 0, req.params.id);
      await db.execute(sql`
        UPDATE bd_filas f SET orden = x.o::int - 1
        FROM jsonb_array_elements_text(${JSON.stringify(todas)}::jsonb) WITH ORDINALITY AS x(id, o)
        WHERE f.id = x.id AND f.tabla_id = ${fila.tabla_id}
      `);
      res.json({ ok: true });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** A la papelera, no al vacío. Quince días para arrepentirse. */
  app.delete('/api/bd/filas/:id', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const f = await db.execute(sql`SELECT tabla_id FROM bd_filas WHERE id = ${req.params.id} AND deleted_at IS NULL`);
      const fila = f.rows[0] as any;
      if (!fila) return res.status(404).json({ error: 'Esa fila no existe.' });
      const permiso = await puedeConTabla(req, fila.tabla_id, true);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });

      await db.execute(sql`UPDATE bd_filas SET deleted_at = now(), updated_by = ${req.user!.id} WHERE id = ${req.params.id}`);
      res.json({ ok: true, diasParaBorradoDefinitivo: 15 });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });
}
