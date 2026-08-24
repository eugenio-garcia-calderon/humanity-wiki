// ============================================================================
// LAS ZONAS DE ENVÍO (2026-08-24, prog7) — comercio F8
// ============================================================================
// De un destino a una zona, y de una zona a un precio. Vive aparte porque lo
// usan tres sitios (cotizar, comprar y la ficha) y porque el día que cambie
// —un país que entra en la UE, un CP nuevo de Canarias— se cambia AQUÍ y no en
// tres consultas parecidas que se van separando con los meses.
import { sql } from 'drizzle-orm';

export type Zona = 'peninsula' | 'no_peninsular' | 'europa' | 'resto';

export const ZONAS: { id: Zona; nombre: string; ayuda: string }[] = [
  { id: 'peninsula', nombre: 'España peninsular', ayuda: 'Lo normal.' },
  { id: 'no_peninsular', nombre: 'Baleares, Canarias, Ceuta y Melilla', ayuda: 'Barco o avión: suele costar más.' },
  { id: 'europa', nombre: 'Unión Europea', ayuda: 'Fuera de España, dentro de la UE.' },
  { id: 'resto', nombre: 'Resto del mundo', ayuda: 'Todo lo demás.' },
];

/** Los países de la UE. Aquí, en un solo sitio, para poder corregirlo sin migrar. */
const UE = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','SE']);

/**
 * La zona de un destino. Se deduce, no se elige: elegirla a mano sería invitar
 * a pagar el porte de la península y pedir el envío a Canarias.
 * Los códigos postales que no son peninsulares: 07 (Baleares), 35 y 38
 * (Canarias), 51 (Ceuta) y 52 (Melilla).
 */
export function zonaDe(pais?: string | null, cp?: string | null): Zona {
  const p = String(pais || 'ES').trim().toUpperCase().slice(0, 2);
  if (p !== 'ES') return UE.has(p) ? 'europa' : 'resto';
  const dos = String(cp || '').replace(/\D/g, '').padStart(5, '0').slice(0, 2);
  return ['07', '35', '38', '51', '52'].includes(dos) ? 'no_peninsular' : 'peninsula';
}

export type TarifaZona = { zona: Zona; centimos: number; gratis_desde_centimos: number | null };

/** Las tarifas de varios productos, por producto y zona. */
export async function tarifasDe(db: any, productoIds: string[]): Promise<Map<string, TarifaZona[]>> {
  const m = new Map<string, TarifaZona[]>();
  if (!productoIds.length) return m;
  const r = await db.execute(sql`
    SELECT producto_id, zona, centimos, gratis_desde_centimos FROM producto_envio_zonas
    WHERE producto_id = ANY(string_to_array(${productoIds.join(',')}, ','))
  `);
  for (const f of r.rows as any[]) {
    const lista = m.get(f.producto_id) || [];
    lista.push({ zona: f.zona, centimos: Number(f.centimos), gratis_desde_centimos: f.gratis_desde_centimos === null ? null : Number(f.gratis_desde_centimos) });
    m.set(f.producto_id, lista);
  }
  return m;
}

export type CalculoEnvio = {
  /** Céntimos a cobrar, o `null` si no hay nada físico que enviar. */
  centimos: number | null;
  /** `false` cuando alguna cosa del carrito no llega a esa zona. */
  se_envia: boolean;
  /** Qué producto no llega, para poder decirlo con su nombre. */
  no_llega: string | null;
  zona: Zona;
  gratis_por_umbral: boolean;
};

/**
 * El porte de un carrito a una zona. Mismas reglas que antes de las zonas:
 * se cobra el porte MÁS CARO (va todo en una caja), y si alguna línea tiene
 * umbral de envío gratis y el subtotal lo pasa, sale gratis.
 * La diferencia: si alguna cosa NO tiene tarifa para esa zona, no se envía
 * allí — y se dice antes de cobrar, con el nombre de lo que no llega.
 */
export function calcularEnvio(
  fisicas: { p: any; unidades: number }[],
  subtotal: number,
  zona: Zona,
  tarifas: Map<string, TarifaZona[]>,
): CalculoEnvio {
  if (fisicas.length === 0) return { centimos: null, se_envia: true, no_llega: null, zona, gratis_por_umbral: false };
  const portes: number[] = [];
  let gratis = false;
  for (const l of fisicas) {
    const t = (tarifas.get(l.p.id) || []).find(x => x.zona === zona);
    // Sin tarifa para esa zona: este vendedor no manda ahí.
    if (!t) return { centimos: null, se_envia: false, no_llega: l.p.name || l.p.nombre || null, zona, gratis_por_umbral: false };
    if (t.gratis_desde_centimos !== null && subtotal >= t.gratis_desde_centimos) gratis = true;
    portes.push(t.centimos);
  }
  if (!portes.length) return { centimos: null, se_envia: true, no_llega: null, zona, gratis_por_umbral: false };
  return { centimos: gratis ? 0 : Math.max(...portes), se_envia: true, no_llega: null, zona, gratis_por_umbral: gratis };
}
