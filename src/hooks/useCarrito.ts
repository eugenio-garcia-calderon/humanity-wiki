import { useCallback, useEffect, useState } from 'react';

// ============================================================================
// EL CARRITO — fase 7 del plan de tiendas (2026-08-22)
// ============================================================================
// Vive en el navegador de quien compra, no en el servidor. No es pereza: quien
// entra en la tienda de alguien no tiene cuenta, así que no hay a quién
// atribuirle un carrito guardado. Y guardar carritos de gente sin identificar
// es guardar datos de personas que no han dicho quiénes son.
//
// ── UN CARRITO POR TIENDA ───────────────────────────────────────────────────
// La clave lleva el nombre del espacio. Cada pago va a UNA cuenta de Stripe, y
// mezclar dos vendedores en un cobro obligaría a repartir el dinero entre dos
// destinos. Con un carrito por tienda, el caso no llega a existir: quien
// compra en dos sitios paga dos veces, que es exactamente lo que pasa.
//
// ── SE PIERDE AL VACIAR EL NAVEGADOR, Y ESTÁ BIEN ───────────────────────────
// `localStorage` desaparece si alguien limpia sus datos. Un carrito no es una
// promesa: lo que sí sobrevive es el pedido, en cuanto se paga.

export type LineaCarrito = {
  producto_id: string; cantidad: number; nombre: string; precio_centimos: number;
  // La variante elegida (2026-08-23): talla, color… Dos variantes del mismo
  // producto son dos líneas distintas.
  variante_id?: string; variante_nombre?: string;
};
/** La clave de una línea: producto + variante. */
export const claveLinea = (l: { producto_id: string; variante_id?: string | null }) => `${l.producto_id}|${l.variante_id || ''}`;
/** Las líneas tal como las espera el servidor (comprar, cotizar, cupón). */
export const aLineasServidor = (ls: LineaCarrito[]) =>
  ls.map(l => ({ producto_id: l.producto_id, cantidad: l.cantidad, ...(l.variante_id ? { variante_id: l.variante_id } : {}) }));

const MAX_LINEAS = 20;

function clave(tienda: string) { return `humanity:carrito:${tienda}`; }

function leer(tienda: string): LineaCarrito[] {
  try {
    const crudo = localStorage.getItem(clave(tienda));
    if (!crudo) return [];
    const l = JSON.parse(crudo);
    // Lo que hay en `localStorage` lo puede haber tocado cualquiera: se
    // comprueba en vez de confiar. Una línea rota tira la línea, no el
    // carrito entero.
    return Array.isArray(l)
      ? l.filter(x => x && typeof x.producto_id === 'string' && Number(x.cantidad) > 0)
         .map(x => ({
           producto_id: x.producto_id,
           cantidad: Math.max(1, Math.min(99, Number(x.cantidad) || 1)),
           nombre: typeof x.nombre === 'string' ? x.nombre : 'Producto',
           precio_centimos: Number(x.precio_centimos) || 0,
           ...(typeof x.variante_id === 'string' && x.variante_id ? { variante_id: x.variante_id, variante_nombre: typeof x.variante_nombre === 'string' ? x.variante_nombre : '' } : {}),
         }))
         .slice(0, MAX_LINEAS)
      : [];
  } catch { return []; }
}

/** El aviso de que el carrito ha cambiado. `storage` sólo salta en OTRAS
 *  pestañas, así que en esta hace falta uno propio o la cesta de arriba no se
 *  entera de lo que acaba de pulsar quien está mirando. */
const EVENTO = 'humanity:carrito-cambiado';

// SINCRONIZAR CON EL SERVIDOR (2026-08-23, carrito abandonado): si hay sesión,
// cada cambio se guarda también en el servidor (con un pequeño retraso para
// no mandar uno por pulsación) — así la cesta se recupera en otro dispositivo
// y el servidor puede avisar a las 24 h. Sin sesión el servidor contesta 401
// y se deja de intentar en esta página: a nadie anónimo se le persigue.
let sinSesion = false;
const temporizadores = new Map<string, number>();
function sincronizar(tienda: string, lineas: LineaCarrito[]) {
  if (sinSesion || typeof fetch === 'undefined') return;
  window.clearTimeout(temporizadores.get(tienda));
  temporizadores.set(tienda, window.setTimeout(() => {
    fetch('/api/publicar/cesta', {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tienda, lineas }),
    }).then(r => { if (r.status === 401) sinSesion = true; }).catch(() => {});
  }, 800));
}

export function useCarrito(tienda: string) {
  const [lineas, setLineas] = useState<LineaCarrito[]>(() => leer(tienda));

  useEffect(() => {
    const refrescar = () => setLineas(leer(tienda));
    refrescar();
    window.addEventListener(EVENTO, refrescar);
    window.addEventListener('storage', refrescar);
    return () => {
      window.removeEventListener(EVENTO, refrescar);
      window.removeEventListener('storage', refrescar);
    };
  }, [tienda]);

  const guardar = useCallback((nuevas: LineaCarrito[]) => {
    try { localStorage.setItem(clave(tienda), JSON.stringify(nuevas)); } catch { /* modo privado */ }
    window.dispatchEvent(new Event(EVENTO));
    sincronizar(tienda, nuevas);
  }, [tienda]);

  // Recuperar la cesta guardada si la local está vacía (otro dispositivo, o
  // un navegador limpio). Una vez por tienda y carga de página.
  useEffect(() => {
    if (sinSesion || leer(tienda).length > 0) return;
    fetch(`/api/publicar/cesta?tienda=${encodeURIComponent(tienda)}`, { credentials: 'include' })
      .then(async r => {
        if (r.status === 401) { sinSesion = true; return; }
        const j = await r.json().catch(() => null);
        if (Array.isArray(j?.lineas) && j.lineas.length && leer(tienda).length === 0) {
          try { localStorage.setItem(clave(tienda), JSON.stringify(j.lineas)); } catch { /* modo privado */ }
          window.dispatchEvent(new Event(EVENTO));
        }
      }).catch(() => {});
  }, [tienda]);

  const anadir = useCallback((linea: LineaCarrito) => {
    const actuales = leer(tienda);
    const ya = actuales.find(l => claveLinea(l) === claveLinea(linea));
    if (ya) {
      // Pulsar «añadir» dos veces suma, no duplica la línea: si no, el
      // servidor recibiría el mismo producto dos veces y reservaría de más.
      ya.cantidad = Math.min(99, ya.cantidad + linea.cantidad);
      guardar([...actuales]);
    } else {
      if (actuales.length >= MAX_LINEAS) return false;
      guardar([...actuales, linea]);
    }
    return true;
  }, [tienda, guardar]);

  const cambiar = useCallback((productoId: string, cantidad: number, varianteId?: string | null) => {
    const n = Math.max(0, Math.min(99, Math.floor(cantidad)));
    const k = claveLinea({ producto_id: productoId, variante_id: varianteId });
    // Bajar a cero es quitarlo. Es lo que espera quien pulsa «menos» en el
    // último, y evita una línea de cero unidades que no significa nada.
    guardar(n === 0
      ? leer(tienda).filter(l => claveLinea(l) !== k)
      : leer(tienda).map(l => claveLinea(l) === k ? { ...l, cantidad: n } : l));
  }, [tienda, guardar]);

  const quitar = useCallback((productoId: string, varianteId?: string | null) => {
    const k = claveLinea({ producto_id: productoId, variante_id: varianteId });
    guardar(leer(tienda).filter(l => claveLinea(l) !== k));
  }, [tienda, guardar]);

  const vaciar = useCallback(() => guardar([]), [guardar]);

  const unidades = lineas.reduce((n, l) => n + l.cantidad, 0);
  const subtotal = lineas.reduce((n, l) => n + l.precio_centimos * l.cantidad, 0);

  return { lineas, unidades, subtotal, anadir, cambiar, quitar, vaciar };
}
