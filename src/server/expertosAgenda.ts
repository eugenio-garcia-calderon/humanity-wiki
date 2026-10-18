// ============================================================================
// LA AGENDA DE UN EXPERTO: QUÉ HUECOS SE PUEDEN RESERVAR (2026-10-18, W6)
// ============================================================================
// Funciones puras, sin base de datos, para poder probarlas solas
// (`scripts/probar-expertos-agenda.ts`).
//
// EL EXPERTO PIENSA EN SU HORA, QUIEN RESERVA EN LA SUYA. «Los martes de 10 a
// 14» es hora de Madrid aunque reserve alguien desde Canarias, y el cambio de
// hora de octubre no puede mover las consultas una hora. Por eso la
// disponibilidad se guarda en la hora local del experto (`zona_horaria`) y
// cada hueco se convierte a UTC aquí, día a día, con el desfase de ESE día.
// La pantalla los enseña en la hora de quien mira.
//
// SIN LIBRERÍA DE FECHAS: `Intl.DateTimeFormat` ya sabe el desfase de
// cualquier zona en cualquier fecha, y es lo único que hace falta.

export type Franja = { dia: number; desde: string; hasta: string };
export type Hueco = { inicio: string; fin: string };

const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Minutos desde medianoche de «HH:MM», o null si no es una hora. */
export function minutosDe(hhmm: unknown): number | null {
  const m = typeof hhmm === 'string' ? hhmm.match(HORA) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** ¿Existe esa zona horaria? Una zona inventada haría fallar cada cálculo. */
export function zonaValida(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}

/**
 * La disponibilidad limpia: franjas con día 1 (lunes) a 7 (domingo) y horas
 * válidas en orden. Lo que no se entiende se descarta y se cuenta, para que la
 * pantalla pueda decir «2 franjas no eran válidas» en vez de tragárselas.
 */
export function limpiarDisponibilidad(crudo: unknown): { franjas: Franja[]; descartadas: number } {
  const lista = Array.isArray(crudo) ? crudo : [];
  const franjas: Franja[] = [];
  let descartadas = 0;
  for (const f of lista.slice(0, 50)) {
    const dia = Number((f as any)?.dia);
    const a = minutosDe((f as any)?.desde);
    const b = minutosDe((f as any)?.hasta);
    if (!Number.isInteger(dia) || dia < 1 || dia > 7 || a === null || b === null || b <= a) { descartadas++; continue; }
    franjas.push({ dia, desde: (f as any).desde, hasta: (f as any).hasta });
  }
  return { franjas, descartadas: descartadas + Math.max(0, lista.length - 50) };
}

/** Cuántos minutos va la zona por delante de UTC en ese instante. */
function desfaseMin(utcMs: number, tz: string): number {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const v = (t: string) => Number(p.find(x => x.type === t)?.value);
  const comoUtc = Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute'), v('second'));
  return Math.round((comoUtc - utcMs) / 60000);
}

/** El instante UTC de una hora local en esa zona. Dos pasadas: la primera
 *  estimación puede caer al otro lado de un cambio de hora. */
export function localAUtc(y: number, mes: number, d: number, minutos: number, tz: string): number {
  const ingenuo = Date.UTC(y, mes - 1, d, 0, minutos);
  const d1 = desfaseMin(ingenuo, tz);
  let t = ingenuo - d1 * 60000;
  const d2 = desfaseMin(t, tz);
  if (d2 !== d1) t = ingenuo - d2 * 60000;
  return t;
}

/** El día de hoy (año, mes, día) en esa zona. */
function hoyEn(ahoraMs: number, tz: string) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date(ahoraMs));
  const v = (t: string) => Number(p.find(x => x.type === t)?.value);
  return { y: v('year'), m: v('month'), d: v('day') };
}

/**
 * Los huecos libres de los próximos `dias` días.
 *  · Un hueco dura `duracionMin` y cabe entero dentro de su franja.
 *  · Ninguno empieza antes de `ahora + antelacionHoras`.
 *  · Los que ya están cogidos (`ocupados`, inicios en ms) no salen.
 */
export function huecosLibres(a: {
  franjas: Franja[]; duracionMin: number; antelacionHoras: number; zona: string;
  ocupados: Set<number>; ahoraMs: number; dias?: number; max?: number;
}): Hueco[] {
  const dias = Math.max(1, Math.min(60, a.dias ?? 21));
  const max = a.max ?? 300;
  const dur = Math.max(15, Math.min(240, Math.round(a.duracionMin)));
  const primero = a.ahoraMs + Math.max(0, a.antelacionHoras) * 3600000;
  const hoy = hoyEn(a.ahoraMs, a.zona);
  const out: Hueco[] = [];
  for (let i = 0; i <= dias && out.length < max; i++) {
    // El calendario se cuenta en UTC a mediodía para que ningún cambio de
    // hora haga saltar o repetir un día.
    const fecha = new Date(Date.UTC(hoy.y, hoy.m - 1, hoy.d + i, 12));
    const y = fecha.getUTCFullYear(), m = fecha.getUTCMonth() + 1, d = fecha.getUTCDate();
    const diaSemana = fecha.getUTCDay() || 7;
    const delDia = a.franjas.filter(f => f.dia === diaSemana)
      .sort((p, q) => (minutosDe(p.desde)! - minutosDe(q.desde)!));
    for (const f of delDia) {
      const desde = minutosDe(f.desde)!, hasta = minutosDe(f.hasta)!;
      for (let t = desde; t + dur <= hasta; t += dur) {
        const ini = localAUtc(y, m, d, t, a.zona);
        if (ini < primero || a.ocupados.has(ini)) continue;
        out.push({ inicio: new Date(ini).toISOString(), fin: new Date(ini + dur * 60000).toISOString() });
        if (out.length >= max) break;
      }
    }
  }
  // Dos franjas que se solapan darían el mismo hueco dos veces.
  const vistos = new Set<string>();
  return out.filter(h => (vistos.has(h.inicio) ? false : (vistos.add(h.inicio), true)))
    .sort((p, q) => p.inicio.localeCompare(q.inicio));
}

/** El reparto de un pago: lo que se queda el sitio y lo que va al experto. */
export function reparto(importeCentimos: number, comisionBps: number) {
  const bps = Math.max(0, Math.min(5000, Math.round(comisionBps || 0)));
  const comision = Math.round((importeCentimos * bps) / 10000);
  return { comision, neto: importeCentimos - comision };
}
