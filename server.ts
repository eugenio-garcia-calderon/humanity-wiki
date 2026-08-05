import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import geoip from "geoip-lite";
import { db } from "./src/db/index.js";
import { territories, projects, challenges, organizations } from "./src/db/schema.js";
import { territories as seedTerritories, objectives as seedObjectives } from "./src/data/seed.js";
import { OBJECTIVE_ID_BY_KEY } from "./src/utils/objectiveIds.js";
import { sql } from "drizzle-orm";
import { registerAuthRoutes, ROLE } from "./src/server/auth.js";
import { registerGraphRoutes } from "./src/server/graph.js";
import { registerSocialRoutes } from "./src/server/social.js";
import { registerAIRoutes } from "./src/server/ai/assistant.js";
import { registerKnowledgeRoutes } from "./src/server/knowledge.js";
import { getStripe, registerStripeRoutes, handleMarketplaceWebhookEvent } from "./src/server/stripe.js";

// Reverse lookup (O001 -> 'agua') used to read mock objective scores by id.
const OBJECTIVE_KEY_BY_ID: Record<string, string> = Object.fromEntries(
  Object.entries(OBJECTIVE_ID_BY_KEY).map(([key, id]) => [id, key])
);

// Best-effort IP -> territory name resolution, used only to pick a sensible
// default territory on first load. No adjacency/neighbor table exists yet,
// so this is intentionally coarse (country-level, region-level for Spain).
const COUNTRY_NAME_BY_ISO2: Record<string, string> = {
  ES: "España",
  AR: "Argentina",
  IT: "Italia",
  ET: "Etiopía",
  GQ: "Guinea Ecuatorial",
};

// ISO 3166-2:ES subdivision codes -> comunidad autónoma name in our DB.
const ES_REGION_NAME_BY_ISO_CODE: Record<string, string> = {
  AN: "Andalucía",
  AR: "Aragón",
  CN: "Canarias",
  CB: "Cantabria",
  CL: "Castilla y León",
  CM: "Castilla-La Mancha",
  CT: "Cataluña",
  CE: "Ceuta",
  MD: "Comunidad de Madrid",
  NC: "Comunidad Foral de Navarra",
  VC: "Comunidad Valenciana",
  EX: "Extremadura",
  GA: "Galicia",
  IB: "Illes Balears",
  RI: "La Rioja",
  ML: "Melilla",
  PV: "País Vasco",
  AS: "Principado de Asturias",
  MC: "Región de Murcia",
};

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.set("trust proxy", true);

  // getStripe() vive ahora en src/server/stripe.ts (Fase 6), compartido por
  // el flujo de socios de aquí abajo y por el nuevo mercado.

  // In-memory fallback for memberships & stripe events
  const inMemoryMemberships = new Map<string, any>();
  const inMemoryStripeEvents = new Set<string>();

  // 1. STRIPE WEBHOOK (Must be mounted BEFORE express.json() to parse raw body for signature validation)
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event: Stripe.Event;

    try {
      const stripe = getStripe();
      if (webhookSecret && sig) {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        const rawBody = req.body instanceof Buffer ? req.body.toString("utf8") : req.body;
        event = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
      }
    } catch (err: any) {
      console.error(`Webhook Signature Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (inMemoryStripeEvents.has(event.id)) {
      return res.json({ received: true, note: "Already processed" });
    }
    inMemoryStripeEvents.add(event.id);

    try {
      await db.execute(sql`
        INSERT INTO stripe_events (id, stripe_event_id, type)
        VALUES (${event.id}, ${event.id}, ${event.type})
        ON CONFLICT (stripe_event_id) DO NOTHING
      `).catch(() => {});
    } catch (e) {}

    console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id || session.client_reference_id || "anonymous";
        const customerId = (session.customer as string) || null;
        const subscriptionId = (session.subscription as string) || null;
        const membershipType = session.metadata?.membership_type || "socio_regular";

        const memRecord = {
          id: `mem_${Date.now()}`,
          userId,
          stripeCustomerId: customerId,
          stripeCheckoutSessionId: session.id,
          stripeSubscriptionId: subscriptionId,
          status: "active",
          membershipType,
          startedAt: new Date().toISOString(),
          endedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        inMemoryMemberships.set(userId, memRecord);
        if (customerId) inMemoryMemberships.set(customerId, memRecord);

        try {
          await db.execute(sql`
            INSERT INTO memberships (id, user_id, stripe_customer_id, stripe_checkout_session_id, stripe_subscription_id, status, membership_type, started_at)
            VALUES (${memRecord.id}, ${userId}, ${customerId}, ${session.id}, ${subscriptionId}, 'active', ${membershipType}, NOW())
            ON CONFLICT DO NOTHING
          `).catch(() => {});
        } catch (e) {
          console.error("Cloud SQL membership insert error:", e);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const status = sub.status === "active" || sub.status === "trialing" ? "active" : sub.status;

        for (const [key, mem] of inMemoryMemberships.entries()) {
          if (mem.stripeCustomerId === customerId) {
            mem.status = status;
            mem.stripeSubscriptionId = sub.id;
            mem.updatedAt = new Date().toISOString();
          }
        }

        try {
          await db.execute(sql`
            UPDATE memberships
            SET status = ${status}, stripe_subscription_id = ${sub.id}, updated_at = NOW()
            WHERE stripe_customer_id = ${customerId}
          `).catch(() => {});
        } catch (e) {}
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        for (const [key, mem] of inMemoryMemberships.entries()) {
          if (mem.stripeCustomerId === customerId) {
            mem.status = "canceled";
            mem.endedAt = new Date().toISOString();
            mem.updatedAt = new Date().toISOString();
          }
        }

        try {
          await db.execute(sql`
            UPDATE memberships
            SET status = 'canceled', ended_at = NOW(), updated_at = NOW()
            WHERE stripe_customer_id = ${customerId}
          `).catch(() => {});
        } catch (e) {}
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        for (const [key, mem] of inMemoryMemberships.entries()) {
          if (mem.stripeCustomerId === customerId) {
            mem.status = "active";
            mem.updatedAt = new Date().toISOString();
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        for (const [key, mem] of inMemoryMemberships.entries()) {
          if (mem.stripeCustomerId === customerId) {
            mem.status = "past_due";
            mem.updatedAt = new Date().toISOString();
          }
        }
        break;
      }
    }

    // Fase 6 (mercado): eventos nuevos (compra de producto, apoyo a
    // creadores, cuentas Connect, reembolsos) distinguidos por
    // `metadata.kind`, sin tocar el switch de socios/membresía de arriba.
    try {
      await handleMarketplaceWebhookEvent(event, db);
    } catch (e) {
      console.error('Error procesando evento de mercado:', e);
    }

    res.json({ received: true });
  });

  // El chat del asistente admite adjuntar una imagen o PDF (Fase 9,
  // multimodal): en base64 dentro del JSON pesa bastante más que el límite
  // por defecto de 100kb, así que esta única ruta necesita un límite propio,
  // más alto. Se registra ANTES del express.json() global para tener
  // prioridad solo en esta ruta — el resto de la API sigue con el límite
  // pequeño de siempre.
  app.use('/api/ai/chat', express.json({ limit: '20mb' }));
  app.use(express.json());

  // 1.5 AUTENTICACIÓN (Fase 2). Se monta justo después de express.json() y
  // antes que el resto de la API, porque instala el middleware que resuelve
  // `req.user` a partir de la cookie de sesión — todos los endpoints
  // posteriores dependen de él para conocer el usuario y su nivel de rol.
  registerAuthRoutes(app, db);

  // 1.6 GRAFO DE CONOCIMIENTO, RED SOCIAL Y MERCADO (Fases 3-5).
  // Van después de la autenticación porque dependen de `req.user`
  // para aplicar los niveles de rol.
  registerGraphRoutes(app, db);
  registerSocialRoutes(app, db);

  // 1.65 GRAFOS DE CONOCIMIENTO (Fase 11): lienzos curados de ventanas de
  // conocimiento con creador, valoración 0-10 y resolución por palabras clave.
  registerKnowledgeRoutes(app, db);

  // 1.7 ASISTENTE IA (Fase 9). Construido y enrutado siempre; responde
  // 503 con un mensaje claro mientras falte ANTHROPIC_API_KEY, en vez de
  // fallar de forma opaca.
  registerAIRoutes(app, db);

  // 1.8 ECONOMÍA Y MERCADO (Fase 6): Connect, checkout embebido de
  // productos, apoyo a creadores y reembolsos. Coexiste con el flujo de
  // socios/membresía de abajo, que no se modifica.
  registerStripeRoutes(app, db);

  // 2. STRIPE CHECKOUT ENDPOINTS (flujo de socios/membresía, sin cambios)
  app.post("/api/stripe/create-checkout-session", async (req: Request, res: Response) => {
    try {
      const { userId, email, membershipType = "socio_regular" } = req.body;
      const stripe = getStripe();

      let customerId: string | undefined;
      if (email) {
        const existingCustomers = await stripe.customers.list({ email, limit: 1 });
        if (existingCustomers.data.length > 0) {
          customerId = existingCustomers.data[0].id;
        } else {
          const customer = await stripe.customers.create({
            email,
            metadata: { userId: userId || "anonymous" },
          });
          customerId = customer.id;
        }
      }

      const protocol = req.headers["x-forwarded-proto"] || "http";
      const host = req.headers.host;
      const returnUrl = `${protocol}://${host}/socio-confirmacion?session_id={CHECKOUT_SESSION_ID}`;

      let lineItems: any[] = [];
      const priceId = process.env.STRIPE_PRICE_ID;

      if (priceId) {
        lineItems = [{ price: priceId, quantity: 1 }];
      } else {
        lineItems = [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: "Membresía Red Humana",
                description: "Suscripción activa para el sostenimiento de la Red Humana de Bienestar Colectivo",
              },
              unit_amount: 1000, // 10 EUR / mes
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ];
      }

      const session = await stripe.checkout.sessions.create({
        ui_mode: "embedded",
        customer: customerId,
        customer_email: customerId ? undefined : email,
        line_items: lineItems,
        mode: "subscription",
        return_url: returnUrl,
        metadata: {
          user_id: userId || "anonymous",
          membership_type: membershipType,
          source: "red_humana",
        },
      });

      res.json({ clientSecret: session.client_secret, sessionId: session.id });
    } catch (e: any) {
      console.error("Error creating checkout session:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/stripe/checkout-session/:sessionId", async (req: Request, res: Response) => {
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
      res.json({
        id: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
        customerEmail: session.customer_details?.email,
        metadata: session.metadata,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/stripe/membership-status", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;

      if (userId && inMemoryMemberships.has(userId)) {
        return res.json({ active: true, membership: inMemoryMemberships.get(userId) });
      }

      if (userId) {
        const result = await db.execute(sql`
          SELECT * FROM memberships WHERE user_id = ${userId} OR stripe_customer_id = ${userId} ORDER BY created_at DESC LIMIT 1
        `).catch(() => ({ rows: [] }));

        if (result.rows && result.rows.length > 0) {
          const row = result.rows[0];
          return res.json({
            active: row.status === "active",
            membership: row,
          });
        }
      }

      res.json({ active: false, membership: null });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Best-effort default territory based on the client's IP. Falls back to the
  // planet-level territory ("Mundo") whenever geolocation isn't possible —
  // e.g. local/private IPs during development always hit this fallback.
  app.get("/api/geo/locate", async (req, res) => {
    try {
      const forwardedFor = (req.headers["x-forwarded-for"] as string) || "";
      const ip = forwardedFor.split(",")[0].trim() || req.socket.remoteAddress || req.ip || "";
      const geo = ip ? geoip.lookup(ip) : null;

      let territoryName: string | null = null;
      if (geo?.country === "ES" && geo.region && ES_REGION_NAME_BY_ISO_CODE[geo.region]) {
        territoryName = ES_REGION_NAME_BY_ISO_CODE[geo.region];
      } else if (geo?.country && COUNTRY_NAME_BY_ISO2[geo.country]) {
        territoryName = COUNTRY_NAME_BY_ISO2[geo.country];
      }

      let territoryId: string | null = null;
      if (territoryName) {
        const result = await db.execute(sql`SELECT id FROM territories WHERE name = ${territoryName} LIMIT 1`);
        territoryId = (result.rows[0]?.id as string) || null;
      }

      if (!territoryId) {
        const planet = await db.execute(sql`SELECT id FROM territories WHERE type = 'planet' LIMIT 1`);
        territoryId = (planet.rows[0]?.id as string) || "T001";
      }

      res.json({ territoryId, source: territoryName ? "ip" : "default" });
    } catch (e: any) {
      console.error("Error locating territory by IP:", e);
      res.json({ territoryId: "T001", source: "default" });
    }
  });

  const getTable = async (tableName: string, res: Response) => {
    try {
      // Filtra lo archivado: principio 6 de la Constitución (nunca se elimina
      // conocimiento) implica que lo archivado sigue en la tabla pero no debe
      // aparecer en la aplicación.
      const result = await db.execute(sql.raw(`SELECT * FROM ${tableName} WHERE archived_at IS NULL`));
      res.json(result.rows);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  };

  app.get("/api/data/territories", (req, res) => getTable("territories", res));
  
  app.get("/api/data/objectives", async (req, res) => {
    try {
      const result = await db.execute(sql`SELECT * FROM objectives WHERE archived_at IS NULL`);
      const territoryIdsResult = await db.execute(sql`SELECT id FROM territories WHERE archived_at IS NULL`);
      const indicatorScoresByTerritory = await getIndicatorScoresByTerritory();
      const indicatorsMeta = await getIndicatorsMeta();

      // Build progress_by_territory per objective from the same
      // getObjectivesForTerritory helper the map/explorer already use (legacy
      // mock first, falling back to a real weighted indicator average) —
      // replaces a hardcoded 2-territory stub that left every other
      // territory (including e.g. España, and the Madrid municipios) showing
      // 0% in the objectives grid regardless of their real data.
      const progressByObjective: Record<string, Record<string, number | null>> = {};
      for (const { id } of result.rows as any[]) progressByObjective[id] = {};
      for (const { id: tid } of territoryIdsResult.rows as any[]) {
        const scores = getObjectivesForTerritory(tid, indicatorScoresByTerritory[tid] || {}, indicatorsMeta);
        for (const [key, objId] of Object.entries(OBJECTIVE_ID_BY_KEY)) {
          if (progressByObjective[objId]) progressByObjective[objId][tid] = (scores as any)[key];
        }
      }

      const mapped = result.rows.map((r: any) => ({
        ...r,
        progress_by_territory: progressByObjective[r.id] || {}
      }));
      res.json(mapped);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  
  app.get("/api/data/challenges", async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT c.*, 
          COALESCE(json_agg(DISTINCT ct.territory_id) FILTER (WHERE ct.territory_id IS NOT NULL), '[]') as territory_ids,
          COALESCE(json_agg(DISTINCT co.objective_id) FILTER (WHERE co.objective_id IS NOT NULL), '[]') as objectives
        FROM challenges c
        LEFT JOIN challenge_territories ct ON c.id = ct.challenge_id
        LEFT JOIN challenge_objectives co ON c.id = co.challenge_id
        WHERE c.archived_at IS NULL
        GROUP BY c.id
      `);
      res.json(result.rows);
    } catch(e:any) { res.status(500).json({error: e.message}); }
  });
  
  app.get("/api/data/solutions", async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT s.*,
          COALESCE(json_agg(DISTINCT sc.cause_id) FILTER (WHERE sc.cause_id IS NOT NULL), '[]') as cause_ids,
          COALESCE(json_agg(DISTINCT cs.challenge_id) FILTER (WHERE cs.challenge_id IS NOT NULL), '[]') as challenge_ids
        FROM solutions s
        LEFT JOIN solution_causes sc ON s.id = sc.solution_id
        LEFT JOIN challenge_solutions cs ON s.id = cs.solution_id
        WHERE s.archived_at IS NULL
        GROUP BY s.id
      `);
      res.json(result.rows);
    } catch(e:any) { res.status(500).json({error: e.message}); }
  });
  
  app.get("/api/data/causes", async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT c.*,
          COALESCE(json_agg(DISTINCT cc.challenge_id) FILTER (WHERE cc.challenge_id IS NOT NULL), '[]') as challenge_ids
        FROM causes c
        LEFT JOIN challenge_causes cc ON c.id = cc.cause_id
        WHERE c.archived_at IS NULL
        GROUP BY c.id
      `);
      res.json(result.rows);
    } catch(e:any) { res.status(500).json({error: e.message}); }
  });
  
  app.get("/api/data/projects", async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT p.*,
          COALESCE(json_agg(DISTINCT pc.challenge_id) FILTER (WHERE pc.challenge_id IS NOT NULL), '[]') as challenge_ids,
          COALESCE(json_agg(DISTINCT ps.solution_id) FILTER (WHERE ps.solution_id IS NOT NULL), '[]') as solution_ids,
          COALESCE(json_agg(DISTINCT po.objective_id) FILTER (WHERE po.objective_id IS NOT NULL), '[]') as objective_ids,
          COALESCE(json_agg(DISTINCT porg.organization_id) FILTER (WHERE porg.organization_id IS NOT NULL), '[]') as organization_ids
        FROM projects p
        LEFT JOIN project_challenges pc ON p.id = pc.project_id
        LEFT JOIN project_solutions ps ON p.id = ps.project_id
        LEFT JOIN project_objectives po ON p.id = po.project_id
        LEFT JOIN project_organizations porg ON p.id = porg.project_id
        WHERE p.archived_at IS NULL
        GROUP BY p.id
      `);
      res.json(result.rows);
    } catch(e:any) { res.status(500).json({error: e.message}); }
  });
  
  app.get("/api/data/organizations", async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT o.*,
          COALESCE(json_agg(DISTINCT oo.objective_id) FILTER (WHERE oo.objective_id IS NOT NULL), '[]') as objective_ids,
          COALESCE(json_agg(DISTINCT os.solution_id) FILTER (WHERE os.solution_id IS NOT NULL), '[]') as solution_ids
        FROM organizations o
        LEFT JOIN organization_objectives oo ON o.id = oo.organization_id
        LEFT JOIN organization_solutions os ON o.id = os.organization_id
        WHERE o.archived_at IS NULL
        GROUP BY o.id
      `);
      res.json(result.rows);
    } catch(e:any) { res.status(500).json({error: e.message}); }
  });

  app.get("/api/data/indicators", async (req, res) => {
    try {
      // National (España) observation only — per-territory breakdowns for the map
      // come from /api/geo/territories/{polygons,centroids} via indicatorScores.
      const territoryId = (req.query.territoryId as string) || 'T003';
      const result = await db.execute(sql`
        SELECT i.id, i.name, i.unit, i.category, i.direction, i.weight, i.methodology, i.objective_id,
          io.territory_id, io.value, io.raw_value, io.score, io.weighted_score, io.date, io.source, io.source_url
        FROM indicators i
        LEFT JOIN indicator_observations io ON io.indicator_id = i.id AND io.territory_id = ${territoryId}
        WHERE i.archived_at IS NULL
        ORDER BY i.id
      `);
      res.json(result.rows);
    } catch(e:any) { res.status(500).json({error: e.message}); }
  });

  app.get("/api/data/markers", async (req, res) => {
    try {
      const indicatorId = req.query.indicatorId as string | undefined;
      const result = indicatorId
        ? await db.execute(sql`
            SELECT id, indicator_id, name, includes, description, unit, weight, source, last_updated
            FROM markers
            WHERE indicator_id = ${indicatorId} AND archived_at IS NULL
            ORDER BY weight DESC
          `)
        : await db.execute(sql`
            SELECT id, indicator_id, name, includes, description, unit, weight, source, last_updated
            FROM markers
            WHERE archived_at IS NULL
            ORDER BY indicator_id, weight DESC
          `);
      res.json(result.rows);
    } catch(e:any) { res.status(500).json({error: e.message}); }
  });

  app.get("/api/data/metrics", async (req, res) => {
    try {
      const markerId = req.query.markerId as string | undefined;
      const result = markerId
        ? await db.execute(sql`
            SELECT id, marker_id, name, unit, description
            FROM metrics
            WHERE marker_id = ${markerId} AND archived_at IS NULL
            ORDER BY name
          `)
        : await db.execute(sql`
            SELECT id, marker_id, name, unit, description
            FROM metrics
            WHERE archived_at IS NULL
            ORDER BY marker_id, name
          `);
      res.json(result.rows);
    } catch(e:any) { res.status(500).json({error: e.message}); }
  });

  // Estaciones de medida para una métrica concreta, como puntos GeoJSON
  // (nivel/valor por estación). Se usa para pintar los marcadores en el mapa.
  app.get("/api/geo/metrics/:metricId/stations", async (req, res) => {
    try {
      const { metricId } = req.params;
      const result = await db.execute(sql`
        SELECT
          ms.id, ms.name, ms.territory_id, ms.lat, ms.lng,
          mo.value, mo.unit, mo.level, mo.date, mo.source
        FROM measurement_stations ms
        JOIN metric_observations mo ON mo.station_id = ms.id
        WHERE mo.metric_id = ${metricId}
      `);
      const features = result.rows.map((r: any) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [r.lng, r.lat] },
        properties: {
          stationId: r.id,
          name: r.name,
          territoryId: r.territory_id,
          value: r.value,
          unit: r.unit,
          level: r.level,
          date: r.date,
          source: r.source,
        }
      }));
      res.json({ type: "FeatureCollection", features });
    } catch(e:any) { res.status(500).json({error: e.message}); }
  });

  // ==========================================
  // AUDITORÍA, HISTORIAL Y ARCHIVADO (Fase 1 — cimientos)
  // ==========================================
  // Implementa los principios 2, 4, 5 y 6 de 99_CONSTITUTION.md sobre las
  // entidades que ya existían: toda entidad tiene autor y UUID, toda
  // modificación genera historial, y nunca se elimina conocimiento (se
  // archiva). Ver también 04_DATABASE.md.

  // Nombre de entidad de la API -> tabla física. Hoy coinciden en todos los
  // casos, pero el mapa explícito evita interpolar en SQL nada que venga de
  // la URL (`/api/data/:entity`), que sería inyectable.
  const ENTITY_TABLES: Record<string, string> = {
    territories: 'territories',
    objectives: 'objectives',
    challenges: 'challenges',
    causes: 'causes',
    solutions: 'solutions',
    indicators: 'indicators',
    markers: 'markers',
    metrics: 'metrics',
    organizations: 'organizations',
    projects: 'projects',
    content: 'content',
    knowledge_graphs: 'knowledge_graphs',
    knowledge_windows: 'knowledge_windows',
  };

  // Archivar un padre que todavía tiene hijos visibles dejaría el árbol
  // incoherente (hijos huérfanos visibles colgando de algo oculto). Se
  // rechaza explícitamente, conservando el mismo criterio "seguro por
  // defecto" que antes garantizaban las claves foráneas al borrar.
  const ARCHIVE_BLOCKERS: Record<string, { table: string; fk: string; label: string }[]> = {
    objectives: [{ table: 'indicators', fk: 'objective_id', label: 'indicadores' }],
    indicators: [{ table: 'markers', fk: 'indicator_id', label: 'marcadores' }],
    markers: [{ table: 'metrics', fk: 'marker_id', label: 'métricas' }],
    territories: [{ table: 'territories', fk: 'parent_id', label: 'territorios hijos' }],
  };

  // Autor de la operación: el usuario autenticado de la sesión (Fase 2).
  // La cabecera x-user-id se conserva como respaldo para scripts internos
  // y siembras, que no tienen cookie de sesión.
  const actorFromRequest = (req: Request): string | null =>
    (req.user?.id || req.header('x-user-id') || null);

  const fetchEntityRow = async (table: string, id: string) => {
    const result = await db.execute(sql`SELECT * FROM ${sql.raw(table)} WHERE id = ${id}`);
    return (result.rows[0] as any) || null;
  };

  const recordHistory = async (
    entity: string,
    id: string,
    operation: 'create' | 'update' | 'archive' | 'restore',
    previous: any | null,
    changedBy: string | null,
  ) => {
    const table = ENTITY_TABLES[entity];
    if (!table) return;
    const snapshot = await fetchEntityRow(table, id);
    if (!snapshot) return;
    await db.execute(sql`
      INSERT INTO entity_history (entity_type, entity_id, entity_uuid, version, operation, snapshot, previous, changed_by)
      VALUES (
        ${entity}, ${id}, ${snapshot.uuid ?? null}, ${snapshot.version ?? 1}, ${operation},
        ${JSON.stringify(snapshot)}::jsonb,
        ${previous ? JSON.stringify(previous) : null}::jsonb,
        ${changedBy}
      )
    `);
  };

  // Se aplica DESPUÉS del upsert, en vez de añadir version/updated_by a las
  // ~11 ramas ON CONFLICT DO UPDATE existentes: mismo resultado, sin tocar
  // ninguna de las ramas ya probadas.
  const bumpAudit = async (entity: string, id: string, isUpdate: boolean, actor: string | null) => {
    const table = ENTITY_TABLES[entity];
    if (!table) return;
    if (isUpdate) {
      await db.execute(sql`
        UPDATE ${sql.raw(table)} SET version = version + 1, updated_at = now(), updated_by = ${actor}
        WHERE id = ${id}
      `);
    } else {
      await db.execute(sql`
        UPDATE ${sql.raw(table)} SET created_by = ${actor}, updated_by = ${actor}
        WHERE id = ${id}
      `);
    }
  };

  // REST WRITE ENDPOINTS (INSERT / UPDATE / ARCHIVE with Drizzle / PostgreSQL)
  const handleUpsertEntity = async (entity: string, req: Request, res: Response) => {
    try {
      const data = req.body;
      const id = req.params.id || data.id || `${entity.slice(0, 3).toUpperCase()}_${Date.now()}`;
      const actor = actorFromRequest(req);
      const entityTable = ENTITY_TABLES[entity];
      const previous = entityTable ? await fetchEntityRow(entityTable, id) : null;

      if (entity === "territories") {
        await db.execute(sql`
          INSERT INTO territories (id, name, type, parent_id, description, population, area_km2)
          VALUES (${id}, ${data.name || 'Nuevo Territorio'}, ${data.type || 'region'}, ${data.parent_id || null}, ${data.description || null}, ${data.population || null}, ${data.area_km2 || null})
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            type = EXCLUDED.type,
            parent_id = EXCLUDED.parent_id,
            description = EXCLUDED.description,
            population = EXCLUDED.population,
            area_km2 = EXCLUDED.area_km2
        `);
      } else if (entity === "objectives") {
        await db.execute(sql`
          INSERT INTO objectives (id, title, description)
          VALUES (${id}, ${data.title || 'Nuevo Objetivo'}, ${data.description || null})
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description
        `);
      } else if (entity === "challenges") {
        await db.execute(sql`
          INSERT INTO challenges (id, title, scope, description, priority)
          VALUES (${id}, ${data.title || 'Nuevo Reto'}, ${data.scope || 'global'}, ${data.description || null}, ${data.priority || 'medium'})
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            scope = EXCLUDED.scope,
            description = EXCLUDED.description,
            priority = EXCLUDED.priority
        `);
        if (Array.isArray(data.territory_ids)) {
          await db.execute(sql`DELETE FROM challenge_territories WHERE challenge_id = ${id}`);
          for (const tid of data.territory_ids) {
            await db.execute(sql`INSERT INTO challenge_territories (challenge_id, territory_id) VALUES (${id}, ${tid}) ON CONFLICT DO NOTHING`);
          }
        }
        if (Array.isArray(data.objective_ids || data.objectives)) {
          const objs = data.objective_ids || data.objectives;
          await db.execute(sql`DELETE FROM challenge_objectives WHERE challenge_id = ${id}`);
          for (const oid of objs) {
            await db.execute(sql`INSERT INTO challenge_objectives (challenge_id, objective_id) VALUES (${id}, ${oid}) ON CONFLICT DO NOTHING`);
          }
        }
        if (Array.isArray(data.indicator_ids)) {
          await db.execute(sql`DELETE FROM challenge_indicators WHERE challenge_id = ${id}`);
          for (const iid of data.indicator_ids) {
            await db.execute(sql`INSERT INTO challenge_indicators (challenge_id, indicator_id) VALUES (${id}, ${iid}) ON CONFLICT DO NOTHING`);
          }
        }
        if (Array.isArray(data.marker_ids)) {
          await db.execute(sql`DELETE FROM challenge_markers WHERE challenge_id = ${id}`);
          for (const mid of data.marker_ids) {
            await db.execute(sql`INSERT INTO challenge_markers (challenge_id, marker_id) VALUES (${id}, ${mid}) ON CONFLICT DO NOTHING`);
          }
        }
        if (Array.isArray(data.metric_ids)) {
          await db.execute(sql`DELETE FROM challenge_metrics WHERE challenge_id = ${id}`);
          for (const meid of data.metric_ids) {
            await db.execute(sql`INSERT INTO challenge_metrics (challenge_id, metric_id) VALUES (${id}, ${meid}) ON CONFLICT DO NOTHING`);
          }
        }
      } else if (entity === "causes") {
        await db.execute(sql`
          INSERT INTO causes (id, title, type, description)
          VALUES (${id}, ${data.title || 'Nueva Causa'}, ${data.type || null}, ${data.description || null})
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            type = EXCLUDED.type,
            description = EXCLUDED.description
        `);
        if (Array.isArray(data.challenge_ids)) {
          await db.execute(sql`DELETE FROM challenge_causes WHERE cause_id = ${id}`);
          for (const cid of data.challenge_ids) {
            // percentage is this cause's weight within THIS specific challenge —
            // stored on the join row, not on the cause itself (see schema.ts).
            await db.execute(sql`
              INSERT INTO challenge_causes (challenge_id, cause_id, percentage)
              VALUES (${cid}, ${id}, ${data.percentage ?? null})
              ON CONFLICT (challenge_id, cause_id) DO UPDATE SET percentage = EXCLUDED.percentage
            `);
          }
        }
      } else if (entity === "indicators") {
        await db.execute(sql`
          INSERT INTO indicators (id, name, unit, category, direction, weight, methodology, objective_id)
          VALUES (${id}, ${data.name || 'Nuevo Indicador'}, ${data.unit || null}, ${data.category || null}, ${data.direction || null}, ${data.weight ?? null}, ${data.methodology || null}, ${data.objective_id || null})
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            unit = EXCLUDED.unit,
            category = EXCLUDED.category,
            direction = EXCLUDED.direction,
            weight = EXCLUDED.weight,
            methodology = EXCLUDED.methodology,
            objective_id = EXCLUDED.objective_id
        `);
      } else if (entity === "markers") {
        await db.execute(sql`
          INSERT INTO markers (id, indicator_id, name, includes, description, unit, weight, source, last_updated)
          VALUES (${id}, ${data.indicator_id}, ${data.name || 'Nuevo Marcador'}, ${data.includes || null}, ${data.description || null}, ${data.unit || null}, ${data.weight ?? null}, ${data.source || null}, ${data.last_updated || null})
          ON CONFLICT (id) DO UPDATE SET
            indicator_id = EXCLUDED.indicator_id,
            name = EXCLUDED.name,
            includes = EXCLUDED.includes,
            description = EXCLUDED.description,
            unit = EXCLUDED.unit,
            weight = EXCLUDED.weight,
            source = EXCLUDED.source,
            last_updated = EXCLUDED.last_updated
        `);
      } else if (entity === "metrics") {
        await db.execute(sql`
          INSERT INTO metrics (id, marker_id, name, unit, description)
          VALUES (${id}, ${data.marker_id}, ${data.name || 'Nueva Métrica'}, ${data.unit || null}, ${data.description || null})
          ON CONFLICT (id) DO UPDATE SET
            marker_id = EXCLUDED.marker_id,
            name = EXCLUDED.name,
            unit = EXCLUDED.unit,
            description = EXCLUDED.description
        `);
      } else if (entity === "solutions") {
        await db.execute(sql`
          INSERT INTO solutions (id, title, type, description, impact, cost, readiness)
          VALUES (${id}, ${data.title || 'Nueva Solución'}, ${data.type || null}, ${data.description || null}, ${data.impact || null}, ${data.cost || null}, ${data.readiness || null})
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            type = EXCLUDED.type,
            description = EXCLUDED.description,
            impact = EXCLUDED.impact,
            cost = EXCLUDED.cost,
            readiness = EXCLUDED.readiness
        `);
        if (Array.isArray(data.cause_ids)) {
          await db.execute(sql`DELETE FROM solution_causes WHERE solution_id = ${id}`);
          for (const cid of data.cause_ids) {
            await db.execute(sql`INSERT INTO solution_causes (solution_id, cause_id) VALUES (${id}, ${cid}) ON CONFLICT DO NOTHING`);
          }
        }
        if (Array.isArray(data.challenge_ids)) {
          await db.execute(sql`DELETE FROM challenge_solutions WHERE solution_id = ${id}`);
          for (const cid of data.challenge_ids) {
            await db.execute(sql`INSERT INTO challenge_solutions (challenge_id, solution_id) VALUES (${cid}, ${id}) ON CONFLICT DO NOTHING`);
          }
        }
      } else if (entity === "projects") {
        await db.execute(sql`
          INSERT INTO projects (id, name, type, territory_id, status, description, image)
          VALUES (${id}, ${data.name || 'Nuevo Proyecto'}, ${data.type || null}, ${data.territory_id || null}, ${data.status || null}, ${data.description || null}, ${data.image || null})
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            type = EXCLUDED.type,
            territory_id = EXCLUDED.territory_id,
            status = EXCLUDED.status,
            description = EXCLUDED.description,
            image = EXCLUDED.image
        `);
        if (Array.isArray(data.challenge_ids)) {
          await db.execute(sql`DELETE FROM project_challenges WHERE project_id = ${id}`);
          for (const cid of data.challenge_ids) {
            await db.execute(sql`INSERT INTO project_challenges (project_id, challenge_id) VALUES (${id}, ${cid}) ON CONFLICT DO NOTHING`);
          }
        }
        if (Array.isArray(data.solution_ids)) {
          await db.execute(sql`DELETE FROM project_solutions WHERE project_id = ${id}`);
          for (const sid of data.solution_ids) {
            await db.execute(sql`INSERT INTO project_solutions (project_id, solution_id) VALUES (${id}, ${sid}) ON CONFLICT DO NOTHING`);
          }
        }
        if (Array.isArray(data.objective_ids)) {
          await db.execute(sql`DELETE FROM project_objectives WHERE project_id = ${id}`);
          for (const oid of data.objective_ids) {
            await db.execute(sql`INSERT INTO project_objectives (project_id, objective_id) VALUES (${id}, ${oid}) ON CONFLICT DO NOTHING`);
          }
        }
        if (Array.isArray(data.organization_ids)) {
          await db.execute(sql`DELETE FROM project_organizations WHERE project_id = ${id}`);
          for (const orgid of data.organization_ids) {
            await db.execute(sql`INSERT INTO project_organizations (project_id, organization_id) VALUES (${id}, ${orgid}) ON CONFLICT DO NOTHING`);
          }
        }
      } else if (entity === "organizations") {
        await db.execute(sql`
          INSERT INTO organizations (id, name, type, scale, territory_id, description, image)
          VALUES (${id}, ${data.name || 'Nueva Organización'}, ${data.type || null}, ${data.scale || null}, ${data.territory_id || null}, ${data.description || null}, ${data.image || null})
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            type = EXCLUDED.type,
            scale = EXCLUDED.scale,
            territory_id = EXCLUDED.territory_id,
            description = EXCLUDED.description,
            image = EXCLUDED.image
        `);
        if (Array.isArray(data.objective_ids)) {
          await db.execute(sql`DELETE FROM organization_objectives WHERE organization_id = ${id}`);
          for (const oid of data.objective_ids) {
            await db.execute(sql`INSERT INTO organization_objectives (organization_id, objective_id) VALUES (${id}, ${oid}) ON CONFLICT DO NOTHING`);
          }
        }
        if (Array.isArray(data.solution_ids)) {
          await db.execute(sql`DELETE FROM organization_solutions WHERE organization_id = ${id}`);
          for (const sid of data.solution_ids) {
            await db.execute(sql`INSERT INTO organization_solutions (organization_id, solution_id) VALUES (${id}, ${sid}) ON CONFLICT DO NOTHING`);
          }
        }
      }

      if (entityTable) {
        await bumpAudit(entity, id, !!previous, actor);
        await recordHistory(entity, id, previous ? 'update' : 'create', previous, actor);
      }

      res.json({ success: true, id, entity });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  };

  // ARCHIVAR (no borrar). Principio 6 de la Constitución: "nunca se elimina
  // conocimiento". La entidad deja de mostrarse en toda la aplicación (todas
  // las lecturas filtran `archived_at IS NULL`) pero la fila y todas sus
  // relaciones permanecen intactas, de modo que restaurarla la devuelve
  // completa. La ruta sigue siendo DELETE por compatibilidad con el cliente
  // existente; lo que cambia es la semántica.
  const handleArchiveEntity = async (entity: string, req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const actor = actorFromRequest(req);
      const table = ENTITY_TABLES[entity];
      if (!table) return res.status(400).json({ error: `Entidad no soportada: ${entity}` });

      const previous = await fetchEntityRow(table, id);
      if (!previous) return res.status(404).json({ error: 'No encontrado' });

      // Un padre con hijos vivos no puede archivarse: dejaría hijos visibles
      // colgando de algo oculto.
      for (const blocker of ARCHIVE_BLOCKERS[entity] || []) {
        const check = await db.execute(sql`
          SELECT count(*)::int AS n FROM ${sql.raw(blocker.table)}
          WHERE ${sql.raw(blocker.fk)} = ${id} AND archived_at IS NULL AND id <> ${id}
        `);
        const n = (check.rows[0] as any)?.n ?? 0;
        if (n > 0) {
          return res.status(409).json({
            error: `No se puede archivar: todavía tiene ${n} ${blocker.label} activos. Archívalos primero.`,
          });
        }
      }

      await db.execute(sql`
        UPDATE ${sql.raw(table)}
        SET archived_at = now(), version = version + 1, updated_at = now(), updated_by = ${actor}
        WHERE id = ${id}
      `);
      await recordHistory(entity, id, 'archive', previous, actor);

      res.json({ success: true, id, entity, archived: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  };

  const handleRestoreEntity = async (entity: string, req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const actor = actorFromRequest(req);
      const table = ENTITY_TABLES[entity];
      if (!table) return res.status(400).json({ error: `Entidad no soportada: ${entity}` });

      const previous = await fetchEntityRow(table, id);
      if (!previous) return res.status(404).json({ error: 'No encontrado' });

      await db.execute(sql`
        UPDATE ${sql.raw(table)}
        SET archived_at = NULL, version = version + 1, updated_at = now(), updated_by = ${actor}
        WHERE id = ${id}
      `);
      await recordHistory(entity, id, 'restore', previous, actor);

      res.json({ success: true, id, entity, archived: false });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  };

  app.post("/api/data/:entity", (req, res) => handleUpsertEntity(req.params.entity, req, res));
  app.put("/api/data/:entity/:id", (req, res) => handleUpsertEntity(req.params.entity, req, res));
  app.delete("/api/data/:entity/:id", (req, res) => handleArchiveEntity(req.params.entity, req, res));
  app.post("/api/data/:entity/:id/restore", (req, res) => handleRestoreEntity(req.params.entity, req, res));

  // Historial completo de una entidad, más reciente primero.
  app.get("/api/data/:entity/:id/history", async (req, res) => {
    try {
      const { entity, id } = req.params;
      const result = await db.execute(sql`
        SELECT id, entity_type, entity_id, entity_uuid, version, operation, snapshot, previous, changed_by, changed_at
        FROM entity_history
        WHERE entity_type = ${entity} AND entity_id = ${id}
        ORDER BY changed_at DESC, id DESC
      `);
      res.json(result.rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Papelera: entidades archivadas de un tipo, para poder restaurarlas.
  app.get("/api/data/:entity/archived", async (req, res) => {
    try {
      const table = ENTITY_TABLES[req.params.entity];
      if (!table) return res.status(400).json({ error: `Entidad no soportada: ${req.params.entity}` });
      const result = await db.execute(sql`
        SELECT * FROM ${sql.raw(table)} WHERE archived_at IS NOT NULL ORDER BY archived_at DESC
      `);
      res.json(result.rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  // ==========================================
  // POSTGIS GEOGRAPHIC API ENDPOINTS
  // ==========================================

  const parseBBox = (bboxStr?: string) => {
    if (!bboxStr) return null;
    const parts = bboxStr.split(',').map(Number);
    if (parts.length === 4 && parts.every(p => !isNaN(p))) {
      return parts as [number, number, number, number];
    }
    return null;
  };

  const geoFilesCache: Record<string, any> = {};
  const getGeoJsonFile = (filename: string) => {
    if (!geoFilesCache[filename]) {
      const filePath = path.join(process.cwd(), 'public', 'geo', filename);
      if (fs.existsSync(filePath)) {
        geoFilesCache[filename] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } else {
        geoFilesCache[filename] = { type: 'FeatureCollection', features: [] };
      }
    }
    return geoFilesCache[filename];
  };

  // Keys that have historical mock progress data in src/data/seed.ts and keep
  // defaulting to a neutral 50 when a territory isn't listed there (legacy
  // behavior, preserved as-is). Newer objectives have no mock data at all, so
  // they correctly report "Sin datos" (null) until real data is added — see
  // the 2026-08-03 decision in memory/03_DECISIONS.md about never fabricating
  // scores for objectives that don't have any.
  const LEGACY_MOCK_OBJECTIVE_KEYS = new Set(['agua', 'alimentacion', 'vivienda', 'salud', 'convivencia', 'ecosistemas']);

  // Static metadata (id/objective_id/weight) for every indicator, cached for
  // the life of the process — used to weight-average indicator scores up
  // into an objective score for territories with no legacy mock entry (see
  // getObjectivesForTerritory below).
  let indicatorsMetaCache: { id: string; objectiveId: string; weight: number | null }[] | null = null;
  const getIndicatorsMeta = async () => {
    if (!indicatorsMetaCache) {
      const result = await db.execute(sql`SELECT id, objective_id, weight FROM indicators WHERE archived_at IS NULL`);
      indicatorsMetaCache = (result.rows as any[]).map(r => ({
        id: r.id, objectiveId: r.objective_id, weight: r.weight != null ? Number(r.weight) : null
      }));
    }
    return indicatorsMetaCache;
  };

  // Helper to retrieve objective scores for any territory ID. Loops over every
  // objective in OBJECTIVE_ID_BY_KEY instead of hardcoding one lookup per
  // objective, so adding a new objective there is enough on its own — no
  // changes needed here.
  //
  // Score priority per objective: (1) the legacy mock progress_by_territory
  // entry in src/data/seed.ts, if present — preserved as-is for territories
  // that already rely on it; (2) otherwise a weighted average of that
  // objective's own indicators' real indicator_observations for this
  // territory (using each indicator's `weight`, defaulting to an equal split
  // if unset) — this is what makes territories seeded ONLY with real
  // indicator data (e.g. the Madrid municipios) show a correct roll-up
  // instead of "Sin datos"; (3) a neutral 50 for the 6 original objectives
  // with neither (legacy behavior), or null ("Sin datos") for newer ones.
  const getObjectivesForTerritory = (
    tid: string,
    indicatorScoresForTid: Record<string, number> = {},
    indicatorsMeta: { id: string; objectiveId: string; weight: number | null }[] = []
  ): Record<string, number | null> => {
    const result: Record<string, number | null> = {};
    let sum = 0;
    let count = 0;
    for (const [key, id] of Object.entries(OBJECTIVE_ID_BY_KEY)) {
      const seedEntry = seedObjectives.find(o => o.id === id);
      const raw = seedEntry?.progress_by_territory?.[tid];
      let value: number | null;
      if (raw != null) {
        value = raw;
      } else {
        const objIndicators = indicatorsMeta.filter(i => i.objectiveId === id);
        let weightedSum = 0;
        let weightTotal = 0;
        for (const ind of objIndicators) {
          const score = indicatorScoresForTid[ind.id];
          if (score != null) {
            const w = ind.weight != null ? ind.weight : (1 / objIndicators.length);
            weightedSum += score * w;
            weightTotal += w;
          }
        }
        value = weightTotal > 0
          ? Math.round(weightedSum / weightTotal)
          : (LEGACY_MOCK_OBJECTIVE_KEYS.has(key) ? 50 : null);
      }
      result[key] = value;
      if (value != null) { sum += value; count++; }
    }
    result.overall = count > 0 ? Math.round(sum / count) : null;
    return result;
  };

  // Helper to retrieve real indicator scores (from indicator_observations) grouped by territory
  const getIndicatorScoresByTerritory = async (): Promise<Record<string, Record<string, number>>> => {
    const result = await db.execute(sql`
      SELECT territory_id, indicator_id, score
      FROM indicator_observations
      WHERE score IS NOT NULL
    `);
    const map: Record<string, Record<string, number>> = {};
    for (const row of result.rows as any[]) {
      if (!map[row.territory_id]) map[row.territory_id] = {};
      map[row.territory_id][row.indicator_id] = row.score;
    }
    return map;
  };

  // Helper to retrieve real marker scores (from marker_observations) grouped by territory
  const getMarkerScoresByTerritory = async (): Promise<Record<string, Record<string, number>>> => {
    const result = await db.execute(sql`
      SELECT territory_id, marker_id, score
      FROM marker_observations
      WHERE score IS NOT NULL
    `);
    const map: Record<string, Record<string, number>> = {};
    for (const row of result.rows as any[]) {
      if (!map[row.territory_id]) map[row.territory_id] = {};
      map[row.territory_id][row.marker_id] = row.score;
    }
    return map;
  };

  // 1. POLYGONS ENDPOINT serving GeoJSON features mapped to territory IDs
  app.get("/api/geo/territories/polygons", async (req, res) => {
    try {
      const zoom = parseFloat(req.query.zoom as string) || 2;
      const typeStr = (req.query.type as string) || null;
      const parentIdStr = (req.query.parentId as string) || null;

      let targetType = typeStr;
      if (!targetType && !parentIdStr) {
        // These breakpoints must match the Mapbox layer minzoom/maxzoom values
        // in HumanityMap.tsx (continents-fill, countries-fill/line,
        // regions-fill/line) — otherwise there's a zoom range where the layer
        // wants to show one polygon type but this endpoint is still serving
        // the previous one, leaving the map blank until the next fetch fires.
        if (zoom < 2.0) targetType = 'planet';
        else if (zoom < 3.5) targetType = 'continent';
        else if (zoom < 4.5) targetType = 'country';
        else if (zoom < 7.0) targetType = 'region';
        else targetType = 'municipality';
      }

      let rawFeatures: any[] = [];

      if (targetType === 'planet') {
        const data = getGeoJsonFile('planet.json');
        rawFeatures = (data.features || [data]).map((f: any) => ({
          ...f,
          properties: {
            ...f.properties,
            id: f.properties.territoryId || f.properties.id || 'T001',
            territoryId: f.properties.territoryId || f.properties.id || 'T001',
            type: 'planet'
          }
        }));
      } else if (targetType === 'continent') {
        const data = getGeoJsonFile('continents.json');
        rawFeatures = (data.features || []).map((f: any) => ({
          ...f,
          properties: {
            ...f.properties,
            id: f.properties.territoryId || f.properties.id,
            territoryId: f.properties.territoryId || f.properties.id,
            type: 'continent'
          }
        }));
      } else if (targetType === 'country') {
        const data = getGeoJsonFile('countries.json');
        rawFeatures = (data.features || []).map((f: any) => ({
          ...f,
          properties: {
            ...f.properties,
            id: f.properties.territoryId || f.properties.id,
            territoryId: f.properties.territoryId || f.properties.id,
            type: 'country'
          }
        }));
      } else if (targetType === 'region') {
        const data = getGeoJsonFile('regions.json');
        rawFeatures = (data.features || []).map((f: any) => ({
          ...f,
          properties: {
            ...f.properties,
            id: f.properties.territoryId || f.properties.id,
            territoryId: f.properties.territoryId || f.properties.id,
            type: 'region'
          }
        }));
      } else {
        const data = getGeoJsonFile('madrid_municipios.json');
        rawFeatures = (data.features || []).map((f: any) => ({
          ...f,
          properties: {
            ...f.properties,
            id: f.properties.territoryId || f.properties.id,
            territoryId: f.properties.territoryId || f.properties.id,
            type: 'municipality'
          }
        }));
      }

      if (parentIdStr) {
        rawFeatures = rawFeatures.filter((f: any) => f.properties.parent_id === parentIdStr);
      }

      // Populate objective scores directly onto polygon properties
      const indicatorScoresByTerritory = await getIndicatorScoresByTerritory();
      const markerScoresByTerritory = await getMarkerScoresByTerritory();
      const indicatorsMeta = await getIndicatorsMeta();
      rawFeatures = rawFeatures.map((f: any) => {
        const tid = f.properties.territoryId || f.properties.id;
        const objs = getObjectivesForTerritory(tid, indicatorScoresByTerritory[tid] || {}, indicatorsMeta);
        return {
          ...f,
          properties: {
            ...f.properties,
            objectives: objs,
            indicatorScores: indicatorScoresByTerritory[tid] || {},
            markerScores: markerScoresByTerritory[tid] || {}
          }
        };
      });

      res.json({
        type: "FeatureCollection",
        features: rawFeatures
      });
    } catch (e: any) {
      console.error("Error fetching territory polygons:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // 2. CENTROIDS ENDPOINT returning territory centroids with objective progress
  app.get("/api/geo/territories/centroids", async (req, res) => {
    try {
      const zoom = parseFloat(req.query.zoom as string) || 2;
      const typeStr = (req.query.type as string) || null;
      const parentIdStr = (req.query.parentId as string) || null;
      const bboxArr = parseBBox(req.query.bbox as string);

      let targetType = typeStr;
      if (!targetType && !parentIdStr) {
        // Must match the polygons endpoint's breakpoints (and the Mapbox layer
        // minzoom/maxzoom in HumanityMap.tsx) at the continent/country/region
        // boundaries, or centroid labels and filled polygons briefly disagree
        // on which territory type to show for the same zoom level.
        if (zoom < 2.0) targetType = 'planet';
        else if (zoom < 3.5) targetType = 'continent';
        else if (zoom < 4.5) targetType = 'country';
        else if (zoom < 7.0) targetType = 'region';
        else if (zoom < 9.0) targetType = 'municipality';
      }

      let filtered = seedTerritories.filter(t => {
        if (targetType && t.type !== targetType) return false;
        if (parentIdStr && t.parent_id !== parentIdStr) return false;
        if (bboxArr && t.coordinates) {
          const [lng, lat] = t.coordinates;
          const [minLng, minLat, maxLng, maxLat] = bboxArr;
          if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) return false;
        }
        return true;
      });

      const indicatorScoresByTerritory = await getIndicatorScoresByTerritory();
      const markerScoresByTerritory = await getMarkerScoresByTerritory();
      const indicatorsMeta = await getIndicatorsMeta();

      const features = filtered.map(t => {
        // Was a second, hand-duplicated copy of getObjectivesForTerritory's
        // averaging logic — now calls the same helper the polygons endpoint
        // uses, so both endpoints automatically agree for every objective.
        const objectivesForTerritory = getObjectivesForTerritory(t.id, indicatorScoresByTerritory[t.id] || {}, indicatorsMeta);

        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: t.coordinates || [0, 0]
          },
          properties: {
            id: t.id,
            territoryId: t.id,
            name: t.name,
            type: t.type,
            parent_id: t.parent_id,
            description: t.description,
            objectives: objectivesForTerritory,
            indicatorScores: indicatorScoresByTerritory[t.id] || {},
            markerScores: markerScoresByTerritory[t.id] || {},
            challenges: t.active_challenges || []
          }
        };
      });

      res.json({
        type: "FeatureCollection",
        features
      });
    } catch (e: any) {
      console.error("Error fetching centroids:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Alias /api/map/territories -> /api/geo/territories/centroids
  app.get("/api/map/territories", async (req, res) => {
    try {
      const zoom = req.query.zoom || 2;
      const response = await fetch(`http://127.0.0.1:3000/api/geo/territories/centroids?zoom=${zoom}`);
      const data = await response.json();
      res.json(data);
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 3. NEARBY ENTITIES ENDPOINT
  app.get("/api/geo/near", async (req, res) => {
    try {
      const lng = parseFloat(req.query.lng as string);
      const lat = parseFloat(req.query.lat as string);
      const radiusKm = parseFloat(req.query.radiusKm as string) || 50;

      if (isNaN(lng) || isNaN(lat)) {
        return res.status(400).json({ error: "Invalid lng/lat parameters" });
      }

      const result = await db.execute(sql`
        SELECT 
          t.id, t.name, t.type, t.description,
          ST_X(t.centroid::geometry) AS lng,
          ST_Y(t.centroid::geometry) AS lat,
          ROUND((ST_Distance(t.centroid::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) / 1000.0)::numeric, 2) AS distance_km
        FROM territories t
        WHERE t.centroid IS NOT NULL
          AND ST_DWithin(t.centroid::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusKm * 1000})
        ORDER BY distance_km ASC
        LIMIT 50
      `);

      res.json({
        center: [lng, lat],
        radiusKm,
        territories: result.rows
      });
    } catch (e: any) {
      console.error("Error querying nearby entities:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Measurement stations relevant to a territory + metric: the ones that
  // belong to the territory itself, plus any within `radiusKm` of its
  // centroid ("alrededores" — there is no territory-adjacency table, so
  // distance from the centroid is used as the proxy for "nearby").
  // Centroid coordinates come from the seed data (`seedTerritories`), not the
  // `territories.centroid` PostGIS column — that column exists in the schema
  // but is never populated; every territory's real lng/lat lives in seed.ts.
  const getStationsNearTerritory = async (territoryId: string, metricId: string, radiusKm: number) => {
    const seedTerritory = seedTerritories.find(t => t.id === territoryId);
    const centroid = seedTerritory?.coordinates
      ? { lng: seedTerritory.coordinates[0], lat: seedTerritory.coordinates[1] }
      : undefined;

    if (!centroid) {
      const result = await db.execute(sql`
        SELECT ms.id, ms.name, ms.territory_id, ms.lat, ms.lng,
          mo.value, mo.unit, mo.level, mo.date, mo.source, NULL::numeric AS distance_km
        FROM measurement_stations ms
        LEFT JOIN metric_observations mo ON mo.station_id = ms.id AND mo.metric_id = ${metricId}
        WHERE ms.territory_id = ${territoryId}
      `);
      return result.rows;
    }

    const result = await db.execute(sql`
      SELECT ms.id, ms.name, ms.territory_id, ms.lat, ms.lng,
        mo.value, mo.unit, mo.level, mo.date, mo.source,
        ROUND((ST_Distance(
          ST_SetSRID(ST_MakePoint(ms.lng, ms.lat), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${centroid.lng}, ${centroid.lat}), 4326)::geography
        ) / 1000.0)::numeric, 1) AS distance_km
      FROM measurement_stations ms
      LEFT JOIN metric_observations mo ON mo.station_id = ms.id AND mo.metric_id = ${metricId}
      WHERE ms.territory_id = ${territoryId}
         OR ST_DWithin(
           ST_SetSRID(ST_MakePoint(ms.lng, ms.lat), 4326)::geography,
           ST_SetSRID(ST_MakePoint(${centroid.lng}, ${centroid.lat}), 4326)::geography,
           ${radiusKm * 1000}
         )
      ORDER BY distance_km ASC NULLS LAST
    `);
    return result.rows;
  };

  // Solutions ("Soluciones") linked to a set of challenges, via challenge_solutions —
  // used to populate the explorer's Soluciones card from whichever challenges are
  // shown in its Retos card at the same level+territory.
  const getSolutionsForChallenges = async (challengeIds: string[]) => {
    if (challengeIds.length === 0) return [];
    const result = await db.execute(sql`
      SELECT DISTINCT s.id, s.title, s.type, s.description, s.impact, s.cost, s.readiness
      FROM solutions s
      JOIN challenge_solutions cs ON cs.solution_id = s.id
      WHERE cs.challenge_id IN ${challengeIds} AND s.archived_at IS NULL
      ORDER BY s.title
    `);
    return result.rows;
  };

  // Causas de un reto concreto, con su peso (%) para el gráfico de anillo
  // interactivo del explorador del mapa. El peso es propio de la relación
  // reto+causa (challenge_causes.percentage), no de la causa en sí.
  app.get("/api/challenges/:id/causes", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await db.execute(sql`
        SELECT c.id, c.title, c.type, c.description, cc.percentage
        FROM causes c
        JOIN challenge_causes cc ON cc.cause_id = c.id
        WHERE cc.challenge_id = ${id} AND c.archived_at IS NULL
        ORDER BY cc.percentage DESC NULLS LAST
      `);
      res.json(result.rows);
    } catch (e: any) {
      console.error("Error fetching challenge causes:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Unified drill-down endpoint for the map's filter menu: given a level of the
  // Objetivo→Indicador→Marcador→Métrica hierarchy and an entity id, returns its
  // general metadata, the observation for the given territory, and its children
  // (so both the left-hand menu and the center panel can keep drilling down).
  // Adding a future 5th level only means adding one more `if (level === ...)`
  // branch here — the route, the territory resolution and the response
  // envelope stay the same.
  app.get("/api/explorer/:level/:id", async (req, res) => {
    try {
      const { level, id } = req.params;
      const territoryId = (req.query.territoryId as string) || "T001";
      const radiusKm = parseFloat(req.query.radiusKm as string) || 150;

      const territoryResult = await db.execute(sql`SELECT id, name, type FROM territories WHERE id = ${territoryId}`);
      const territory = territoryResult.rows[0] || { id: territoryId, name: territoryId, type: null };

      if (level === "objetivo") {
        const objResult = await db.execute(sql`SELECT id, title, description FROM objectives WHERE id = ${id}`);
        const objective = objResult.rows[0] as any;
        if (!objective) return res.status(404).json({ error: "Objetivo no encontrado" });

        const objKey = OBJECTIVE_KEY_BY_ID[id];
        const territoryIndicatorScoresResult = await db.execute(sql`
          SELECT indicator_id, score FROM indicator_observations WHERE territory_id = ${territoryId} AND score IS NOT NULL
        `);
        const territoryIndicatorScores: Record<string, number> = {};
        for (const r of territoryIndicatorScoresResult.rows as any[]) territoryIndicatorScores[r.indicator_id] = r.score;
        const scores = getObjectivesForTerritory(territoryId, territoryIndicatorScores, await getIndicatorsMeta());
        const score = objKey ? (scores as any)[objKey] : null;

        const indicatorsResult = await db.execute(sql`
          SELECT i.id, i.name, io.score
          FROM indicators i
          LEFT JOIN indicator_observations io ON io.indicator_id = i.id AND io.territory_id = ${territoryId}
          WHERE i.objective_id = ${id} AND i.archived_at IS NULL
          ORDER BY i.id
        `);

        const challengesResult = await db.execute(sql`
          SELECT c.id, c.title, c.priority, c.scope, c.description
          FROM challenges c
          JOIN challenge_objectives co ON co.challenge_id = c.id
          JOIN challenge_territories ct ON ct.challenge_id = c.id
          WHERE co.objective_id = ${id} AND ct.territory_id = ${territoryId} AND c.archived_at IS NULL
          ORDER BY c.title
        `);
        const solutionsRows = await getSolutionsForChallenges(challengesResult.rows.map((r: any) => r.id));

        return res.json({
          level: "objetivo",
          entity: { id: objective.id, name: objective.title, description: objective.description },
          territory,
          score: score ?? null,
          hasData: score != null,
          children: indicatorsResult.rows.map((r: any) => ({
            level: "indicador", id: r.id, name: r.name, score: r.score ?? null, hasData: r.score != null, riskLevel: null
          })),
          challenges: challengesResult.rows,
          solutions: solutionsRows
        });
      }

      if (level === "indicador") {
        const indResult = await db.execute(sql`
          SELECT id, name, unit, category, direction, weight, methodology, objective_id
          FROM indicators WHERE id = ${id}
        `);
        const indicator = indResult.rows[0] as any;
        if (!indicator) return res.status(404).json({ error: "Indicador no encontrado" });

        const obsResult = await db.execute(sql`
          SELECT value, raw_value, score, weighted_score, date, source, source_url
          FROM indicator_observations WHERE indicator_id = ${id} AND territory_id = ${territoryId}
        `);
        const observation = obsResult.rows[0] || null;

        const markersResult = await db.execute(sql`
          SELECT m.id, m.name, mo.score
          FROM markers m
          LEFT JOIN marker_observations mo ON mo.marker_id = m.id AND mo.territory_id = ${territoryId}
          WHERE m.indicator_id = ${id} AND m.archived_at IS NULL
          ORDER BY m.weight DESC NULLS LAST, m.id
        `);

        const challengesResult = await db.execute(sql`
          SELECT c.id, c.title, c.priority, c.scope, c.description
          FROM challenges c
          JOIN challenge_indicators ci ON ci.challenge_id = c.id
          JOIN challenge_territories ct ON ct.challenge_id = c.id
          WHERE ci.indicator_id = ${id} AND ct.territory_id = ${territoryId} AND c.archived_at IS NULL
          ORDER BY c.title
        `);
        const solutionsRows = await getSolutionsForChallenges(challengesResult.rows.map((r: any) => r.id));

        return res.json({
          level: "indicador",
          entity: {
            id: indicator.id, name: indicator.name, unit: indicator.unit, category: indicator.category,
            direction: indicator.direction, weight: indicator.weight, methodology: indicator.methodology,
            objectiveId: indicator.objective_id
          },
          territory,
          observation,
          hasData: !!observation,
          children: markersResult.rows.map((r: any) => ({
            level: "marcador", id: r.id, name: r.name, score: r.score ?? null, hasData: r.score != null, riskLevel: null
          })),
          challenges: challengesResult.rows,
          solutions: solutionsRows
        });
      }

      if (level === "marcador") {
        const markResult = await db.execute(sql`
          SELECT id, name, includes, description, unit, weight, source, last_updated, indicator_id
          FROM markers WHERE id = ${id}
        `);
        const marker = markResult.rows[0] as any;
        if (!marker) return res.status(404).json({ error: "Marcador no encontrado" });

        const obsResult = await db.execute(sql`
          SELECT value, raw_value, score, date, source
          FROM marker_observations WHERE marker_id = ${id} AND territory_id = ${territoryId}
        `);
        const observation = obsResult.rows[0] || null;

        // Metrics don't have a 0-100 score of their own — summarize each one by
        // the worst (most severe) risk level found among this territory's stations.
        const metricsResult = await db.execute(sql`
          SELECT me.id, me.name,
            (
              SELECT mo.level FROM metric_observations mo
              JOIN measurement_stations ms ON ms.id = mo.station_id
              WHERE mo.metric_id = me.id AND ms.territory_id = ${territoryId}
              ORDER BY CASE mo.level
                WHEN 'peligroso' THEN 4 WHEN 'alto' THEN 3 WHEN 'moderado' THEN 2 WHEN 'bajo' THEN 1 ELSE 0
              END DESC
              LIMIT 1
            ) AS worst_level
          FROM metrics me
          WHERE me.marker_id = ${id} AND me.archived_at IS NULL
          ORDER BY me.name
        `);

        const challengesResult = await db.execute(sql`
          SELECT c.id, c.title, c.priority, c.scope, c.description
          FROM challenges c
          JOIN challenge_markers cm ON cm.challenge_id = c.id
          JOIN challenge_territories ct ON ct.challenge_id = c.id
          WHERE cm.marker_id = ${id} AND ct.territory_id = ${territoryId} AND c.archived_at IS NULL
          ORDER BY c.title
        `);
        const solutionsRows = await getSolutionsForChallenges(challengesResult.rows.map((r: any) => r.id));

        return res.json({
          level: "marcador",
          entity: {
            id: marker.id, name: marker.name, includes: marker.includes, description: marker.description,
            unit: marker.unit, weight: marker.weight, source: marker.source, lastUpdated: marker.last_updated,
            indicatorId: marker.indicator_id
          },
          territory,
          observation,
          hasData: !!observation,
          children: metricsResult.rows.map((r: any) => ({
            level: "metrica", id: r.id, name: r.name, score: null, hasData: r.worst_level != null, riskLevel: r.worst_level ?? null
          })),
          challenges: challengesResult.rows,
          solutions: solutionsRows
        });
      }

      if (level === "metrica") {
        const metResult = await db.execute(sql`
          SELECT id, name, unit, description, marker_id FROM metrics WHERE id = ${id}
        `);
        const metric = metResult.rows[0] as any;
        if (!metric) return res.status(404).json({ error: "Métrica no encontrada" });

        const stationRows = await getStationsNearTerritory(territoryId, id, radiusKm);

        const challengesResult = await db.execute(sql`
          SELECT c.id, c.title, c.priority, c.scope, c.description
          FROM challenges c
          JOIN challenge_metrics cme ON cme.challenge_id = c.id
          JOIN challenge_territories ct ON ct.challenge_id = c.id
          WHERE cme.metric_id = ${id} AND ct.territory_id = ${territoryId} AND c.archived_at IS NULL
          ORDER BY c.title
        `);
        const solutionsRows = await getSolutionsForChallenges(challengesResult.rows.map((r: any) => r.id));

        return res.json({
          level: "metrica",
          entity: { id: metric.id, name: metric.name, unit: metric.unit, description: metric.description, markerId: metric.marker_id },
          territory,
          radiusKm,
          stations: stationRows.map((r: any) => ({
            id: r.id, name: r.name,
            lat: r.lat, lng: r.lng,
            distanceKm: r.distance_km != null ? Number(r.distance_km) : null,
            withinTerritory: r.territory_id === territoryId,
            value: r.value, unit: r.unit, level: r.level, date: r.date, source: r.source
          })),
          children: [],
          challenges: challengesResult.rows,
          solutions: solutionsRows
        });
      }

      return res.status(400).json({ error: `Nivel desconocido: ${level}` });
    } catch (e: any) {
      console.error("Explorer endpoint error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // 4. VECTOR TILES ENDPOINT (PostGIS ST_AsMVT for Vector Tile Mapbox Serving)
  app.get("/api/geo/tiles/:z/:x/:y.pbf", async (req, res) => {
    try {
      const z = parseInt(req.params.z, 10);
      const x = parseInt(req.params.x, 10);
      const y = parseInt(req.params.y, 10);

      const tile2envelope = (z: number, x: number, y: number) => {
        const worldMercMax = 20037508.3427892;
        const worldMercMin = -20037508.3427892;
        const tileSize = (worldMercMax - worldMercMin) / Math.pow(2, z);
        const minx = worldMercMin + x * tileSize;
        const maxy = worldMercMax - y * tileSize;
        const maxx = minx + tileSize;
        const miny = maxy - tileSize;
        return { minx, miny, maxx, maxy };
      };

      const env = tile2envelope(z, x, y);

      const query = sql`
        WITH mvtgeom AS (
          SELECT 
            t.id, t.name, t.type, t.parent_id,
            ST_AsMVTGeom(
              ST_Transform(t.geometry, 3857),
              ST_MakeEnvelope(${env.minx}, ${env.miny}, ${env.maxx}, ${env.maxy}, 3857),
              4096, 256, true
            ) AS geom
          FROM territories t
          WHERE t.geometry IS NOT NULL
            AND ST_Transform(t.geometry, 3857) && ST_MakeEnvelope(${env.minx}, ${env.miny}, ${env.maxx}, ${env.maxy}, 3857)
        )
        SELECT ST_AsMVT(mvtgeom, 'territories', 4096, 'geom') AS mvt FROM mvtgeom;
      `;

      const result = await db.execute(query);
      const mvtBuffer = result.rows[0]?.mvt;

      if (!mvtBuffer) {
        res.status(204).end();
      } else {
        res.setHeader('Content-Type', 'application/x-protobuf');
        res.send(Buffer.from(mvtBuffer as any));
      }
    } catch (e: any) {
      console.error("Vector Tile generation error:", e);
      res.status(500).json({ error: e.message });
    }
  });



  app.get("/api/territories", async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT * FROM territories
        ORDER BY name ASC
      `);
      res.json(result.rows);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/objectives", async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT * FROM objectives
        ORDER BY id ASC
      `);
      // We also need progress_by_territory mapping. 
      // This could be fetched from indicators, or we can mock it here for now if the DB doesn't have it explicitly populated.
      // In seed.ts it was stored in objective.progress_by_territory JSON? We didn't create a progress_by_territory column in PostgreSQL.
      // Wait, in schema.ts, objectives has no progress_by_territory.
      // So we might need to recreate that or return a mock for now until we migrate indicator_observations.
      
      const mapped = result.rows.map((r: any) => ({
        ...r,
        progress_by_territory: { "T001": 75, "T004": 90 } // Mock for now
      }));
      res.json(mapped);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/territories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const territoryResult = await db.execute(sql`
        SELECT id, name, type, description, is_ai_generated
        FROM territories
        WHERE id = ${id}
      `);
      
      if (territoryResult.rows.length === 0) {
        return res.status(404).json({ error: "Territory not found" });
      }
      
      const territory = territoryResult.rows[0];

      const challengesResult = await db.execute(sql`
        SELECT c.*
        FROM challenges c
        JOIN challenge_territories ct ON c.id = ct.challenge_id
        WHERE ct.territory_id = ${id}
      `);
      
      const populatedChallenges = await Promise.all(challengesResult.rows.map(async (c: any) => {
        const solutionsResult = await db.execute(sql`
          SELECT s.*
          FROM solutions s
          JOIN challenge_solutions cs ON s.id = cs.solution_id
          WHERE cs.challenge_id = ${c.id}
        `);
        
        const objectivesResult = await db.execute(sql`
          SELECT o.*
          FROM objectives o
          JOIN challenge_objectives co ON o.id = co.objective_id
          WHERE co.challenge_id = ${c.id}
        `);
        
        return {
          ...c,
          solutions: solutionsResult.rows,
          objectives: objectivesResult.rows
        };
      }));
      
      res.json({
        ...territory,
        challenges: populatedChallenges
      });
      
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/map/territories", async (req, res) => {
    try {
      const { name, type, description, coordinates } = req.body;
      const [lng, lat] = coordinates;
      
      const id = `T_${name.toUpperCase().replace(/\s+/g, '_')}_${Date.now()}`;
      
      await db.execute(sql`
        INSERT INTO territories (id, name, type, centroid, description)
        VALUES (${id}, ${name}, ${type}, ST_GeomFromText(${'POINT(' + lng + ' ' + lat + ')'}, 4326), ${description || null})
      `);
      
      res.json({ id, name, type, coordinates });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
