import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';

// ============================================================================
// Cuadro de mando de GASTO (2026-08-08, petición del usuario)
// ============================================================================
// «Añade en tiempo real, que se actualice cada X horas, lo gastado en
// Servidores y en modelos IA conectándote a la data real de gasto de cada
// servicio externo.»
//
// Tres fuentes, de más oficial a más interna:
//  1. Hetzner Cloud API (servidores): precio mensual real de cada servidor
//     de la cuenta. Necesita HETZNER_API_TOKEN (solo lectura basta).
//  2. API de administración de Anthropic (coste oficial facturado): necesita
//     una clave de ADMINISTRACIÓN (sk-ant-admin…), distinta de la clave
//     normal del chat. Sin ella, este bloque queda «sin conectar».
//  3. El libro de consumo propio (`ai_usage_charges`): cada llamada real a la
//     IA que ha hecho la plataforma, con su coste estimado por la tabla de
//     precios. Siempre disponible, aunque no incluya extras (búsquedas web).
//
// Google no ofrece una API sencilla de gasto (exige exportar la facturación
// de Google Cloud a BigQuery), así que Gemini se estima SIEMPRE desde el
// libro de consumo interno.
//
// La caché vive en memoria y caduca a las GASTO_CACHE_HORAS horas (6 por
// defecto): «en tiempo real» aquí significa «tan fresco como esa ventana»,
// sin llamar a las APIs externas en cada visita a la página.

const CACHE_HORAS = () => Number(process.env.GASTO_CACHE_HORAS || 6);

interface GastoServidores {
  estado: 'ok' | 'sin_conectar' | 'error';
  mensaje?: string;
  total_mes_eur?: number;
  /** Lo consumido en el mes en curso (horas encendido × precio/hora), la
   *  misma cifra «Usage» que enseña la consola de Hetzner. Solo con token. */
  consumo_mes_eur?: number;
  servidores?: { nombre: string; tipo: string; eur_mes: number; consumo_eur?: number }[];
}

interface GastoOficialAnthropic {
  estado: 'ok' | 'sin_conectar' | 'error';
  mensaje?: string;
  mes_actual_eur?: number;
}

interface FilaMes { mes: string; anthropic_eur: number; google_eur: number; total_eur: number }

interface Gasto {
  actualizado: string;
  cache_horas: number;
  servidores: GastoServidores;
  ia: {
    oficial_anthropic: GastoOficialAnthropic;
    interno: { mes_actual: FilaMes; historial: FilaMes[] };
  };
}

let cache: { datos: Gasto; expira: number } | null = null;

async function gastoHetzner(): Promise<GastoServidores> {
  const token = process.env.HETZNER_API_TOKEN;
  if (!token) {
    // Sin API también se sabe: el precio de un servidor fijo es fijo. Si
    // SERVIDOR_COSTE_EUR_MES está configurado (lo que se paga al mes, IVA e
    // IPv4 incluidos), se enseña ese importe tal cual. El token queda como
    // mejora opcional: precios exactos en vivo y al día si el servidor cambia.
    const fijo = Number(process.env.SERVIDOR_COSTE_EUR_MES);
    if (Number.isFinite(fijo) && fijo > 0) {
      return {
        estado: 'ok',
        servidores: [{ nombre: 'humanity-wiki-prod · importe fijo configurado a mano', tipo: 'CPX42', eur_mes: fijo }],
        total_mes_eur: fijo,
      };
    }
    return {
      estado: 'sin_conectar',
      mensaje: 'Falta HETZNER_API_TOKEN en .env (token de solo lectura del proyecto de Hetzner Cloud) — o, más sencillo, SERVIDOR_COSTE_EUR_MES con lo que pagas al mes.',
    };
  }
  try {
    const res = await fetch('https://api.hetzner.cloud/v1/servers', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const detalle = await res.text().catch(() => '');
      return { estado: 'error', mensaje: `Hetzner ha respondido ${res.status}: ${detalle.slice(0, 200)}` };
    }
    const json: any = await res.json();
    // El consumo del mes es la misma cuenta que hace la consola de Hetzner en
    // «Usage»: horas encendido este mes × precio por hora, con el precio
    // mensual como techo. Un servidor creado a mitad de mes cuenta desde su
    // creación, no desde el día 1.
    const ahora = Date.now();
    const inicioMes = new Date();
    inicioMes.setUTCDate(1); inicioMes.setUTCHours(0, 0, 0, 0);
    const servidores = (json.servers || []).map((s: any) => {
      const ubicacion = s.datacenter?.location?.name;
      const precio = (s.server_type?.prices || []).find((p: any) => p.location === ubicacion) || s.server_type?.prices?.[0];
      const eurMes = Number(precio?.price_monthly?.gross ?? 0);
      const eurHora = Number(precio?.price_hourly?.gross ?? 0);
      const desde = Math.max(new Date(s.created || inicioMes).getTime(), inicioMes.getTime());
      const horas = Math.max(0, (ahora - desde) / 3_600_000);
      return {
        nombre: s.name || s.id,
        tipo: s.server_type?.name || '—',
        eur_mes: eurMes,
        consumo_eur: Math.min(Math.round(horas * eurHora * 100) / 100, eurMes),
      };
    });
    return {
      estado: 'ok',
      servidores,
      total_mes_eur: servidores.reduce((a: number, s: any) => a + s.eur_mes, 0),
      consumo_mes_eur: Math.round(servidores.reduce((a: number, s: any) => a + (s.consumo_eur || 0), 0) * 100) / 100,
    };
  } catch (e: any) {
    return { estado: 'error', mensaje: e.message };
  }
}

async function gastoOficialAnthropic(): Promise<GastoOficialAnthropic> {
  const clave = process.env.ANTHROPIC_ADMIN_KEY;
  if (!clave) {
    return {
      estado: 'sin_conectar',
      mensaje: 'Falta ANTHROPIC_ADMIN_KEY en .env — es una clave de administración (sk-ant-admin…), distinta de la del chat, que se crea en console.anthropic.com → Settings → Admin keys.',
    };
  }
  try {
    const inicioMes = new Date();
    inicioMes.setUTCDate(1); inicioMes.setUTCHours(0, 0, 0, 0);
    const res = await fetch(
      `https://api.anthropic.com/v1/organizations/cost_report?starting_at=${inicioMes.toISOString()}&limit=31`,
      { headers: { 'x-api-key': clave, 'anthropic-version': '2023-06-01' } },
    );
    if (!res.ok) {
      const detalle = await res.text().catch(() => '');
      return { estado: 'error', mensaje: `Anthropic ha respondido ${res.status}: ${detalle.slice(0, 200)}` };
    }
    const json: any = await res.json();
    // Se suma toda cantidad numérica que venga en los resultados: el informe
    // agrupa por día y el importe llega como texto decimal en USD (≈€, la
    // misma aproximación 1$≈1€ del resto del panel de costes).
    let total = 0;
    for (const dia of json.data || []) {
      for (const r of dia.results || []) {
        const n = Number(r.amount);
        if (Number.isFinite(n)) total += n;
      }
    }
    return { estado: 'ok', mes_actual_eur: total };
  } catch (e: any) {
    return { estado: 'error', mensaje: e.message };
  }
}

async function gastoInterno(db: any): Promise<{ mes_actual: FilaMes; historial: FilaMes[] }> {
  const filas = await db.execute(sql`
    SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS mes,
           SUM(CASE WHEN model LIKE 'gemini%' THEN cost_cents ELSE 0 END) AS google_cents,
           SUM(CASE WHEN model LIKE 'gemini%' THEN 0 ELSE cost_cents END) AS anthropic_cents
    FROM ai_usage_charges
    GROUP BY 1 ORDER BY 1 DESC LIMIT 12
  `);
  const historial: FilaMes[] = (filas.rows as any[]).map(f => {
    const anthropic = Number(f.anthropic_cents || 0) / 100;
    const google = Number(f.google_cents || 0) / 100;
    return { mes: f.mes, anthropic_eur: anthropic, google_eur: google, total_eur: anthropic + google };
  });
  const mesActual = new Date().toISOString().slice(0, 7);
  const mes_actual = historial.find(h => h.mes === mesActual)
    || { mes: mesActual, anthropic_eur: 0, google_eur: 0, total_eur: 0 };
  return { mes_actual, historial };
}

export function registerGastoRoutes(app: Express, db: any) {
  app.get('/api/gasto', async (req: Request, res: Response) => {
    try {
      const esAdmin = (req.user?.roleLevel ?? 0) >= 4;
      const forzar = esAdmin && req.query.refrescar === '1';
      if (cache && cache.expira > Date.now() && !forzar) {
        return res.json(cache.datos);
      }
      const [servidores, oficial, interno] = await Promise.all([
        gastoHetzner(),
        gastoOficialAnthropic(),
        gastoInterno(db),
      ]);
      const datos: Gasto = {
        actualizado: new Date().toISOString(),
        cache_horas: CACHE_HORAS(),
        servidores,
        ia: { oficial_anthropic: oficial, interno },
      };
      cache = { datos, expira: Date.now() + CACHE_HORAS() * 3600_000 };
      res.json(datos);
    } catch (e: any) {
      console.error('gasto error:', e);
      res.status(500).json({ error: e.message });
    }
  });
}
