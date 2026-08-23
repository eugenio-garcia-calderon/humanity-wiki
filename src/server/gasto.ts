import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { providerOfModel } from './ai/provider.js';

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

interface FilaMes {
  mes: string;
  anthropic_eur: number;
  google_eur: number;
  /** Los modelos abiertos (Together). Son gratis PARA EL USUARIO, no para la
   *  casa: su coste lo absorbe la plataforma y hasta hoy no salía en ningún
   *  sitio. Ver `gastoInterno`. */
  abiertos_eur: number;
  total_eur: number;
}

// ══ EL ESTADO DE LAS COPIAS DE SEGURIDAD ════════════════════════════════════
// Eugenio, 2026-08-22: «mete esta info de las copias de seguridad en la parte
// de información».
//
// VA AQUÍ Y NO EN UN MÓDULO NUEVO por una razón práctica: registrar un módulo
// es una línea en `modulos.ts`, que ahora mismo lo tiene otro con siete commits
// detrás. Esta ruta ya es la de «cómo va el servidor» y ya la lee la página de
// Servidores, así que añadirlo aquí es una llamada menos desde el navegador y
// cero ficheros compartidos de por medio.
//
// SE LEE EN CADA PETICIÓN, sin caché, a diferencia del gasto. Son dos ficheros
// diminutos, y el sentido de esto es decir si las copias están saliendo AHORA:
// un estado de hace seis horas contestaría a otra pregunta.
//
// LO QUE SE ENSEÑA Y LO QUE NO: si hay copia, de cuándo es, cuántas se guardan
// y si salen del servidor. Ni el nombre del cubo, ni el proveedor exacto, ni
// rutas, ni tamaños de fichero. Cuánto se protege es transparencia; dónde está
// guardado es reconocimiento.
interface EstadoCopias {
  hay: boolean;
  ultima?: string;
  objetos?: number;
  fuera: 'ok' | 'sin_configurar' | 'error' | 'desconocido';
  fuera_ultima?: string;
  copias_fuera?: number;
}

function leerJson(ruta: string): any | null {
  try { return JSON.parse(readFileSync(ruta, 'utf8')); } catch { return null; }
}

function estadoCopias(): EstadoCopias {
  const local = leerJson('/copias/estado.json');
  const remoto = leerJson('/copias/estado-remoto.json');
  return {
    hay: local?.resultado === 'ok',
    ultima: local?.momento,
    objetos: local?.objetos,
    // `desconocido` no es lo mismo que `error`: significa que no hemos podido
    // ni preguntar —el fichero no está—, y decirlo así evita que la pantalla
    // afirme que algo falla cuando lo que pasa es que no lo sabe.
    fuera: remoto?.resultado ?? 'desconocido',
    fuera_ultima: remoto?.momento,
    copias_fuera: remoto?.ficheros_en_destino,
  };
}

interface Gasto {
  actualizado: string;
  cache_horas: number;
  servidores: GastoServidores;
  copias: EstadoCopias;
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
  // SE AGRUPA POR MODELO Y SE CLASIFICA AQUÍ, no con un `LIKE` en la SQL
  // (2026-08-22). El `LIKE 'gemini%'` de antes partía el mundo en dos —Google
  // y «todo lo demás»— y por eso los modelos abiertos, que los sirve Together,
  // aparecían como gasto de Anthropic. Medido en producción: 1,69 céntimos
  // atribuidos al proveedor equivocado sobre 74,38 en total.
  //
  // Quién sirve cada modelo ya lo sabe `providerOfModel`, que es la misma
  // función que usa el enrutador para decidir a quién llamar. Preguntárselo a
  // ella en vez de reescribir la regla con otro `LIKE` es lo que evita que las
  // dos versiones de la misma verdad se separen otra vez.
  const filas = await db.execute(sql`
    SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS mes,
           model, SUM(cost_cents) AS cents
    FROM ai_usage_charges
    GROUP BY 1, 2 ORDER BY 1 DESC
  `);
  const porMes = new Map<string, FilaMes>();
  for (const f of filas.rows as any[]) {
    const mes = f.mes as string;
    const fila = porMes.get(mes)
      || { mes, anthropic_eur: 0, google_eur: 0, abiertos_eur: 0, total_eur: 0 };
    const eur = Number(f.cents || 0) / 100;
    const quien = providerOfModel(f.model || undefined);
    if (quien === 'gemini') fila.google_eur += eur;
    else if (quien === 'claude') fila.anthropic_eur += eur;
    else fila.abiertos_eur += eur;   // together, y cualquiera que venga después
    fila.total_eur += eur;
    porMes.set(mes, fila);
  }
  const historial: FilaMes[] = [...porMes.values()]
    .sort((a, b) => b.mes.localeCompare(a.mes)).slice(0, 12);
  const mesActual = new Date().toISOString().slice(0, 7);
  const mes_actual = historial.find(h => h.mes === mesActual)
    || { mes: mesActual, anthropic_eur: 0, google_eur: 0, abiertos_eur: 0, total_eur: 0 };
  return { mes_actual, historial };
}

/**
 * Lo que ve quien NO es del equipo (2026-08-22, prog6).
 *
 * ══ POR QUÉ APARECE ESTO AHORA ═══════════════════════════════════════════════
 * Esta ruta lleva abierta desde el 8 de agosto y nunca fue un problema porque
 * solo la miraba la pestaña de Visión, que es del panel. Desde hoy hay una
 * página pública de Servidores que la enseña (Eugenio: «de forma transparente a
 * nivel de coste»), y una cosa que estaba bien solo porque nadie la miraba deja
 * de estar bien en cuanto alguien la mira. El aviso es de prog2, que se comió
 * exactamente este patrón con la caché.
 *
 * LO QUE SE QUEDA PÚBLICO: los euros. Es lo que Eugenio quiere transparente y
 * no le sirve a nadie para atacar nada.
 *
 * LO QUE NO:
 *  · `nombre` — el nombre de la máquina (`humanity-wiki-prod`).
 *  · `tipo` — el modelo exacto de Hetzner. `CPX42` dice 8 núcleos y 16 GB, o
 *    sea, cuánto hace falta para tumbarla. Es reconocimiento gratis.
 *  · `mensaje` — los avisos de «falta tal variable en el .env» llevan dentro
 *    los nombres de las claves y cómo se sacan. Son instrucciones de montaje
 *    de la casa, y no tienen por qué estar en la calle.
 *
 * Se filtra AL SALIR y no al guardar: la caché guarda la respuesta entera una
 * sola vez y cada quien recibe la suya. Guardar dos versiones sería tener dos
 * verdades que se pueden desincronizar.
 */
function soloLoPublico(g: Gasto): Gasto {
  return {
    ...g,
    // `copias` se queda entero: no lleva nada que sirva para atacar nada, y es
    // justo lo que Eugenio quiere enseñar.
    servidores: {
      estado: g.servidores.estado,
      total_mes_eur: g.servidores.total_mes_eur,
      consumo_mes_eur: g.servidores.consumo_mes_eur,
      servidores: (g.servidores.servidores || []).map(m => ({
        // Un nombre genérico y numerado: sigue siendo una lista de máquinas
        // con su precio —que es lo que se enseña— sin decir cómo se llama
        // ninguna.
        nombre: 'Servidor',
        tipo: '',
        eur_mes: m.eur_mes,
        consumo_eur: m.consumo_eur,
      })),
    },
    ia: {
      ...g.ia,
      oficial_anthropic: { estado: g.ia.oficial_anthropic.estado, mes_actual_eur: g.ia.oficial_anthropic.mes_actual_eur },
    },
  };
}

export function registerGastoRoutes(app: Express, db: any) {
  app.get('/api/gasto', async (req: Request, res: Response) => {
    try {
      const esAdmin = (req.user?.roleLevel ?? 0) >= 4;
      const forzar = esAdmin && req.query.refrescar === '1';
      if (cache && cache.expira > Date.now() && !forzar) {
        // Las copias se releen aunque el gasto venga de la caché: es el dato
        // que tiene que estar al día.
        const conCopias = { ...cache.datos, copias: estadoCopias() };
        return res.json(esAdmin ? conCopias : soloLoPublico(conCopias));
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
        copias: estadoCopias(),
        ia: { oficial_anthropic: oficial, interno },
      };
      cache = { datos, expira: Date.now() + CACHE_HORAS() * 3600_000 };
      res.json(esAdmin ? datos : soloLoPublico(datos));
    } catch (e: any) {
      console.error('gasto error:', e);
      res.status(500).json({ error: e.message });
    }
  });
}
