// ============================================================================
// LAS CIFRAS DEL DINERO, EN UN SOLO SITIO (2026-08-24, prog7)
// ============================================================================
// Eugenio: «que me permita saber todas las variables económicas de la
// plataforma y ajustarlas desde ese dashboard, y que cuando la modifique de
// ahí se cambie en todos los lugares».
//
// Antes, cada cifra vivía en una variable de entorno: cambiar la comisión
// exigía desplegar, y no había forma de verlas todas juntas ni de saber qué
// comisión regía en marzo. Ahora hay UNA fuente:
//
//     valor por defecto (aquí, en el código)
//        ← variable de entorno, si existe (compatibilidad con lo desplegado)
//        ← base de datos, si hay fila (lo que Eugenio ajusta en Administración)
//
// El último gana. Y el valor por defecto se queda en el código a propósito:
// una base de datos vacía tiene que arrancar con cifras sensatas, no con
// ceros.
//
// CACHÉ: se leen todas de golpe y se guardan 30 segundos. Sin caché, cada
// compra haría cuatro consultas más; con más caché, un cambio tardaría en
// notarse. Al guardar desde el panel se vacía, así que el cambio se ve al
// instante.
import { sql } from 'drizzle-orm';

export type TipoAjuste = 'bps' | 'entero' | 'decimal' | 'dias' | 'meses' | 'anios' | 'texto';

/**
 * Todas las cifras económicas, con su valor por defecto y su explicación en
 * castellano. Esta lista ES la página de Administración: lo que se añada aquí
 * aparece allí sin tocar la pantalla.
 */
export const AJUSTES: {
  clave: string; nombre: string; ayuda: string; tipo: TipoAjuste; porDefecto: string; grupo: string;
  min?: number; max?: number;
}[] = [
  // ── Lo que gana la plataforma ────────────────────────────────────────────
  { grupo: 'Comisión', clave: 'COMISION_BPS', nombre: 'Comisión en euros', tipo: 'bps', porDefecto: '1200', min: 0, max: 10000,
    ayuda: 'Lo que se queda la plataforma de cada venta cobrada en euros, sobre el precio de los productos (el envío no cuenta).' },
  { grupo: 'Comisión', clave: 'PUNTOS_COMISION_BPS', nombre: 'Comisión pagando con puntos', tipo: 'bps', porDefecto: '1000', min: 0, max: 10000,
    ayuda: 'Lo que se queda la plataforma cuando la compra se paga con puntos. Va a la cuenta de la plataforma en el libro de puntos.' },

  // ── Los puntos que se emiten ─────────────────────────────────────────────
  { grupo: 'Puntos que se emiten', clave: 'PUNTOS_BIENVENIDA', nombre: 'Regalo de bienvenida', tipo: 'decimal', porDefecto: '5000', min: 0,
    ayuda: 'Puntos que recibe cada cuenta nueva. Ojo: con puntos transferibles, subirlo mucho hace que crear cuentas sea fabricar valor.' },
  { grupo: 'Puntos que se emiten', clave: 'PUNTOS_FIJO_MENSUAL', nombre: 'Fijo mensual por persona activa', tipo: 'decimal', porDefecto: '1000', min: 0,
    ayuda: 'Puntos que recibe cada mes toda persona verificada y activa. Se emiten: no salen de nadie.' },
  { grupo: 'Puntos que se emiten', clave: 'PUNTOS_BOTE_VARIABLE', nombre: 'Bote variable mensual', tipo: 'decimal', porDefecto: '1000', min: 0,
    ayuda: 'Bote que se reparte entre las personas activas según su reputación social del mes. Si nadie tiene reputación medible, no se emite.' },
  { grupo: 'Puntos que se emiten', clave: 'PUNTOS_ACTIVIDAD_MIN_DIAS', nombre: 'Días de uso para cobrar el fijo', tipo: 'dias', porDefecto: '3', min: 1, max: 31,
    ayuda: 'Días distintos con sesión en el mes que hacen falta para considerar a alguien activo.' },
  { grupo: 'Puntos que se emiten', clave: 'PUNTOS_POR_EURO', nombre: 'Puntos por euro', tipo: 'decimal', porDefecto: '1', min: 0,
    ayuda: 'Cuántos puntos equivalen a un euro al usarlos como descuento. Cambiarlo cambia el poder de compra de todo el saldo existente.' },

  // ── El reparto: qué pesa ─────────────────────────────────────────────────
  { grupo: 'Reparto mensual', clave: 'PUNTOS_PESO_VISTA', nombre: 'Peso de una vista válida', tipo: 'decimal', porDefecto: '1', min: 0,
    ayuda: 'Cuánto pesa en el reparto variable una vista válida (una por persona, ventana y día).' },
  { grupo: 'Reparto mensual', clave: 'PUNTOS_PESO_INTERACCION', nombre: 'Peso de una interacción', tipo: 'decimal', porDefecto: '1', min: 0,
    ayuda: 'Reacciones y comentarios en lo que publicas.' },
  { grupo: 'Reparto mensual', clave: 'PUNTOS_PESO_RESENA', nombre: 'Peso de una reseña positiva', tipo: 'decimal', porDefecto: '3', min: 0,
    ayuda: 'Reseñas de 7/10 o más. Las de productos, solo con compra verificada.' },

  // ── Topes que frenan el abuso ────────────────────────────────────────────
  { grupo: 'Topes', clave: 'PUNTOS_VISTA_TOPE_DIA', nombre: 'Tope de puntos por vistas al día', tipo: 'decimal', porDefecto: '50', min: 0,
    ayuda: 'Lo máximo que puede acuñar una persona al día por vistas de sus publicaciones.' },
  { grupo: 'Topes', clave: 'PUNTOS_TRANSFERENCIA_TOPE_DIA', nombre: 'Tope de envío de puntos al día', tipo: 'decimal', porDefecto: '100', min: 0,
    ayuda: 'Lo máximo que una persona puede enviar a otras en un día.' },

  // ── Cuánto duran los puntos ──────────────────────────────────────────────
  { grupo: 'Caducidad', clave: 'PUNTOS_CADUCIDAD_ANIOS', nombre: 'Los puntos caducan a los', tipo: 'anios', porDefecto: '10', min: 1, max: 50,
    ayuda: 'Se gastan por orden de llegada: caduca solo la parte del saldo más antigua que esto.' },
  { grupo: 'Caducidad', clave: 'PUNTOS_INACTIVIDAD_MESES', nombre: 'Se pierde el saldo tras', tipo: 'meses', porDefecto: '24', min: 1, max: 240,
    ayuda: 'Meses sin ninguna señal de vida antes de perder el saldo. Con avisos antes.' },

  // ── Comercio ─────────────────────────────────────────────────────────────
  { grupo: 'Comercio', clave: 'DIAS_PARA_DEVOLVER', nombre: 'Plazo para pedir una devolución', tipo: 'dias', porDefecto: '30', min: 1, max: 365,
    ayuda: 'Días desde la compra en que quien compró puede pedir la devolución desde su pedido.' },
  { grupo: 'Comercio', clave: 'LIQUIDACION_DIAS', nombre: 'Se liquida a la tienda a los', tipo: 'dias', porDefecto: '14', min: 0, max: 180,
    ayuda: 'Días desde que el pedido consta entregado hasta que se le paga a la tienda. Está en el contrato de servicio de cobro: cambiarlo obliga a publicar una versión nueva.' },
  { grupo: 'Comercio', clave: 'LIQUIDACION_DIAS_SIN_ENTREGA', nombre: 'Y si nunca consta entregado, a los', tipo: 'dias', porDefecto: '30', min: 0, max: 365,
    ayuda: 'Días desde la compra, cuando el pedido nunca llega a marcarse como entregado.' },
];

const PORDEFECTO = new Map(AJUSTES.map(a => [a.clave, a.porDefecto]));

let cache: Map<string, string> | null = null;
let cacheHasta = 0;
const MS_CACHE = 30 * 1000;

/** Vacía la caché: se llama al guardar, para que el cambio se vea al instante. */
export function olvidarAjustes() { cache = null; cacheHasta = 0; }

/** Carga todos los ajustes de la base (con caché corta). */
async function cargar(db: any): Promise<Map<string, string>> {
  if (cache && Date.now() < cacheHasta) return cache;
  const m = new Map<string, string>();
  try {
    const r = await db.execute(sql`SELECT clave, valor FROM ajustes_economicos`);
    for (const f of r.rows as any[]) m.set(f.clave, String(f.valor));
  } catch {
    // Si la tabla aún no existe (migración sin aplicar), se sigue con los
    // valores por defecto: la plataforma no se para por un panel.
  }
  cache = m; cacheHasta = Date.now() + MS_CACHE;
  return m;
}

/**
 * El valor vigente de una cifra: base de datos → variable de entorno → valor
 * por defecto del código. Es `async` porque lee de la base; para los sitios
 * donde eso no cabe existe `valorSincrono`, que usa lo último cargado.
 */
export async function ajuste(db: any, clave: string): Promise<string> {
  const m = await cargar(db);
  return m.get(clave) ?? process.env[clave] ?? PORDEFECTO.get(clave) ?? '';
}
export async function ajusteNumero(db: any, clave: string): Promise<number> {
  const n = Number(String(await ajuste(db, clave)).replace(',', '.'));
  return Number.isFinite(n) ? n : Number(PORDEFECTO.get(clave) ?? 0);
}

/**
 * La versión que no espera: sirve lo último que se leyó de la base. Para
 * funciones que ya existían como síncronas y que se llaman mucho. La caché se
 * refresca sola cada 30 s y al guardar; en el peor caso, un cambio tarda esos
 * segundos en notarse en estos sitios.
 */
export function valorSincrono(clave: string): string {
  return cache?.get(clave) ?? process.env[clave] ?? PORDEFECTO.get(clave) ?? '';
}
export function numeroSincrono(clave: string): number {
  const n = Number(String(valorSincrono(clave)).replace(',', '.'));
  return Number.isFinite(n) ? n : Number(PORDEFECTO.get(clave) ?? 0);
}

/** Arranca la caché al iniciar el servidor y la mantiene fresca. */
export function iniciarAjustes(db: any) {
  const refrescar = () => cargar(db).catch(() => {});
  refrescar();
  setInterval(() => { olvidarAjustes(); refrescar(); }, MS_CACHE).unref?.();
}

/** Guarda un valor nuevo y deja constancia de quién y por qué. */
export async function guardarAjuste(db: any, clave: string, valor: string, actor: string, motivo?: string) {
  const def = AJUSTES.find(a => a.clave === clave);
  if (!def) throw Object.assign(new Error('Esa cifra no existe.'), { publico: true });
  if (def.tipo !== 'texto') {
    const n = Number(String(valor).replace(',', '.'));
    if (!Number.isFinite(n)) throw Object.assign(new Error('Tiene que ser un número.'), { publico: true });
    if (def.min !== undefined && n < def.min) throw Object.assign(new Error(`No puede ser menor que ${def.min}.`), { publico: true });
    if (def.max !== undefined && n > def.max) throw Object.assign(new Error(`No puede ser mayor que ${def.max}.`), { publico: true });
    valor = String(n);
  }
  const antes = (await db.execute(sql`SELECT valor FROM ajustes_economicos WHERE clave = ${clave}`)).rows[0] as any;
  await db.execute(sql`
    INSERT INTO ajustes_economicos (clave, valor, actualizado_por, updated_at)
    VALUES (${clave}, ${valor}, ${actor}, now())
    ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, actualizado_por = EXCLUDED.actualizado_por, updated_at = now()
  `);
  await db.execute(sql`
    INSERT INTO ajustes_economicos_historial (id, clave, valor_antes, valor_nuevo, motivo, actor)
    VALUES (${'AJH' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 46656).toString(36).toUpperCase()},
            ${clave}, ${antes?.valor ?? process.env[clave] ?? PORDEFECTO.get(clave) ?? null}, ${valor}, ${motivo || null}, ${actor})
  `);
  olvidarAjustes();
  console.log(`[ajustes] ${actor} cambia ${clave}: ${antes?.valor ?? '(por defecto)'} → ${valor}${motivo ? ` · ${motivo}` : ''}`);
}
