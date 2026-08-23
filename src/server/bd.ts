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
import { TIPOS, tipar, type Tipo } from './bd/tipos';
import { celdasDe, type Celda } from './bd/celdas';
import { CLASE_DE_TIPO, enlacesDe, guardarEnlaces, comprobarEnlaces, celdaDeEnlaces, type Apuntado } from './bd/enlaces';
import { CLASE_FICHERO, ficherosDe, guardarFicheros, comprobarFicheros, celdaDeFicheros, type Fichero } from './bd/ficheros';
import { calcularTabla, esCalculada, detectaCiclo, reglasAFormula } from './bd/calculo';
import { compilar } from './bd/formulas';
import { renombrarEnConfig } from './bd/renombrar';
import { OPERACIONES } from './bd/agregados';
import { filtrar, ordenarFilas, agrupar, OPERADORES, type Filtro, type Orden } from './bd/vistas';

const nid = (p: string) => `${p}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

// Se re-exportan: hasta la fase 1 vivían en este fichero.
export { tipar, TIPOS } from './bd/tipos';
export { celdasDe } from './bd/celdas';
export type { Celda } from './bd/celdas';

// ── RUTAS ───────────────────────────────────────────────────────────────────

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

      const columnas = await columnasDe(req.params.id);
      const f = await db.execute(sql`
        SELECT id, valores, pagina_id, orden, created_at, updated_at
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
            orden: fila.orden,
            celdas,
            archivos,
            // Los nombres de lo apuntado, aparte: la celda guarda identificadores
            // y esto es lo que hace falta para poder enseñarlos sin otra vuelta.
            apuntados,
          };
      });

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
      const filtros: Filtro[] = vista?.filtros || (req.query.filtros ? JSON.parse(String(req.query.filtros)) : []);
      const ordenPor: Orden[] = vista?.orden_por || (req.query.orden ? JSON.parse(String(req.query.orden)) : []);
      visibles = ordenarFilas(filtrar(visibles, filtros), ordenPor);

      const agrupadoPor = vista?.agrupar_por || (req.query.agrupar ? String(req.query.agrupar) : null);
      const grupos = agrupadoPor ? agrupar(visibles, agrupadoPor) : null;

      res.json({
        tabla: {
          id: permiso.tabla.id, titulo: permiso.tabla.titulo, icono: permiso.tabla.icono,
          descripcion: permiso.tabla.descripcion, proyecto_id: permiso.tabla.proyecto_id,
        },
        columnas,
        ...(vista ? { vista: { id: vista.id, nombre: vista.nombre, ocultas: vista.ocultas } } : {}),
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
          updated_by = ${req.user.id}, updated_at = now()
        WHERE id = ${String(req.params.id)}
        RETURNING id, titulo, descripcion, icono
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
      res.json({ id });
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
          config   = COALESCE(${d.config ? JSON.stringify(d.config) : null}::jsonb, config),
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
      const c = await db.execute(sql`SELECT tabla_id FROM bd_columnas WHERE id = ${req.params.id}`);
      const col = c.rows[0] as any;
      if (!col) return res.status(404).json({ error: 'Esa columna no existe.' });
      const permiso = await puedeConTabla(req, col.tabla_id, true);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });

      await db.execute(sql`UPDATE bd_columnas SET archived_at = now() WHERE id = ${req.params.id}`);
      res.json({ ok: true });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  // ── LAS VISTAS ────────────────────────────────────────────────────────────

  app.get('/api/bd/tablas/:id/vistas', async (req: Request, res: Response) => {
    try {
      const permiso = await puedeConTabla(req, req.params.id, false);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });
      // Las de la tabla (`usuario_id` nulo) y las MÍAS. Las de otros no: una
      // vista personal es de quien la hizo.
      const r = await db.execute(sql`
        SELECT id, nombre, forma, orden_por, filtros, ocultas, agrupar_por, usuario_id, orden
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
      const permiso = await puedeConTabla(req, req.params.id, false);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });
      const d = req.body || {};
      if (!d.nombre || !String(d.nombre).trim()) return res.status(400).json({ error: 'La vista necesita un nombre.' });

      // Los filtros se validan al guardarlos. Un operador inventado guardado
      // aquí no fallaría al escribir, fallaría al mirar la tabla — y entonces
      // nadie sabría de dónde vino.
      const filtros = Array.isArray(d.filtros) ? d.filtros : [];
      for (const f of filtros) {
        if (!OPERADORES.includes(f?.operador)) {
          return res.status(400).json({ error: `Filtro no válido: «${f?.operador}». Los que hay: ${OPERADORES.join(', ')}.` });
        }
      }

      const id = nid('BDV');
      await db.execute(sql`
        INSERT INTO bd_vistas (id, tabla_id, nombre, usuario_id, forma, orden_por, filtros, ocultas, agrupar_por)
        VALUES (${id}, ${req.params.id}, ${String(d.nombre).trim().slice(0, 120)},
                ${d.compartida ? null : req.user!.id}, ${String(d.forma || 'tabla')},
                ${JSON.stringify(d.orden_por || [])}::jsonb, ${JSON.stringify(filtros)}::jsonb,
                ${JSON.stringify(d.ocultas || [])}::jsonb, ${d.agrupar_por || null})
      `);
      res.json({ id });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  // ── LAS FILAS ─────────────────────────────────────────────────────────────

  app.post('/api/bd/tablas/:id/filas', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const permiso = await puedeConTabla(req, req.params.id, true);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });

      const ultima = await db.execute(sql`SELECT COALESCE(max(orden), -1) AS m FROM bd_filas WHERE tabla_id = ${req.params.id}`);
      const id = nid('BDF');
      await db.execute(sql`
        INSERT INTO bd_filas (id, tabla_id, valores, orden, created_by, updated_by)
        VALUES (${id}, ${req.params.id}, '{}'::jsonb, ${Number((ultima.rows[0] as any).m) + 1}, ${req.user!.id}, ${req.user!.id})
      `);
      res.json({ id });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * Escribir celdas de una fila. El cuerpo es `{ celdas: { "<id_columna>": valor } }`.
   *
   * Se validan TODAS antes de guardar NINGUNA: si una celda no vale, no se
   * escribe media fila. Y se responde qué celda falló y por qué, en vez de un
   * «error al guardar» que obliga a adivinar cuál de las diez era.
   */
  app.put('/api/bd/filas/:id', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const f = await db.execute(sql`SELECT * FROM bd_filas WHERE id = ${req.params.id} AND deleted_at IS NULL`);
      const fila = f.rows[0] as any;
      if (!fila) return res.status(404).json({ error: 'Esa fila no existe.' });
      const permiso = await puedeConTabla(req, fila.tabla_id, true);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });

      const entrantes = (req.body || {}).celdas || {};
      const columnas = await columnasDe(fila.tabla_id);
      const porId = new Map(columnas.map(c => [c.id, c]));

      const valores = { ...(fila.valores || {}) };
      const fallos: Array<{ columna: string; error: string }> = [];

      // Los enlaces se aplican DESPUÉS de validar todo, por lo mismo que las
      // celdas normales: si algo no vale, no se escribe media fila.
      const enlacesPendientes: Array<{ colId: string; clase: any; destinos: string[] }> = [];
      const ficherosPendientes: Array<{ colId: string; ids: string[] }> = [];

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
      if (fallos.length) return res.status(400).json({ error: 'Hay celdas que no se pueden guardar.', fallos });

      for (const p of ficherosPendientes) {
        await guardarFicheros(db, { columnaId: p.colId, filaId: fila.id, archivoIds: p.ids });
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
        WHERE id = ${req.params.id}
      `);
      const trasEscribir = celdasDe(valores, columnas);
      const enlacesAhora = await enlacesDe(db, [fila.id]);
      for (const c of columnas) {
        if (CLASE_DE_TIPO[c.tipo]) trasEscribir[c.id] = celdaDeEnlaces((enlacesAhora[fila.id] || {})[c.id]);
      }
      const fichAhora = await ficherosDe(db, [fila.id]);
      for (const c of columnas) {
        if (CLASE_FICHERO[c.tipo]) trasEscribir[c.id] = celdaDeFicheros((fichAhora[fila.id] || {})[c.id]);
      }
      res.json({ celdas: trasEscribir, apuntados: enlacesAhora[fila.id] || {}, archivos: fichAhora[fila.id] || {} });
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
