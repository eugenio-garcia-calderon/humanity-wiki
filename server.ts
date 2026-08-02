import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import { db } from "./src/db/index.js";
import { territories, projects, challenges, organizations } from "./src/db/schema.js";
import { territories as seedTerritories, objectives as seedObjectives } from "./src/data/seed.js";
import { sql } from "drizzle-orm";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Lazy Stripe Initialization
  let stripeClient: Stripe | null = null;
  function getStripe(): Stripe {
    if (!stripeClient) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        throw new Error("STRIPE_SECRET_KEY environment variable is not set");
      }
      stripeClient = new Stripe(key, {
        apiVersion: "2025-01-27.acacia" as any,
      });
    }
    return stripeClient;
  }

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

    res.json({ received: true });
  });

  app.use(express.json());

  // 2. STRIPE CHECKOUT ENDPOINTS
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

  const getTable = async (tableName: string, res: Response) => {
    try {
      const result = await db.execute(sql.raw(`SELECT * FROM ${tableName}`));
      res.json(result.rows);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  };

  app.get("/api/data/territories", (req, res) => getTable("territories", res));
  
  app.get("/api/data/objectives", async (req, res) => {
    try {
      const result = await db.execute(sql`SELECT * FROM objectives`);
      // Attach mock progress for now to not break the UI
      const mapped = result.rows.map((r: any) => ({
        ...r,
        progress_by_territory: { "T001": 75, "T004": 90 }
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
            WHERE indicator_id = ${indicatorId}
            ORDER BY weight DESC
          `)
        : await db.execute(sql`
            SELECT id, indicator_id, name, includes, description, unit, weight, source, last_updated
            FROM markers
            ORDER BY indicator_id, weight DESC
          `);
      res.json(result.rows);
    } catch(e:any) { res.status(500).json({error: e.message}); }
  });

  // REST WRITE ENDPOINTS (INSERT / UPDATE / DELETE with Drizzle / PostgreSQL)
  const handleUpsertEntity = async (entity: string, req: Request, res: Response) => {
    try {
      const data = req.body;
      const id = req.params.id || data.id || `${entity.slice(0, 3).toUpperCase()}_${Date.now()}`;

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
            await db.execute(sql`INSERT INTO challenge_causes (challenge_id, cause_id) VALUES (${cid}, ${id}) ON CONFLICT DO NOTHING`);
          }
        }
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

      res.json({ success: true, id, entity });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  };

  const handleDeleteEntity = async (entity: string, req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (entity === "territories") {
        await db.execute(sql`DELETE FROM challenge_territories WHERE territory_id = ${id}`);
        await db.execute(sql`DELETE FROM territories WHERE id = ${id}`);
      } else if (entity === "objectives") {
        await db.execute(sql`DELETE FROM challenge_objectives WHERE objective_id = ${id}`);
        await db.execute(sql`DELETE FROM project_objectives WHERE objective_id = ${id}`);
        await db.execute(sql`DELETE FROM organization_objectives WHERE objective_id = ${id}`);
        await db.execute(sql`DELETE FROM objectives WHERE id = ${id}`);
      } else if (entity === "challenges") {
        await db.execute(sql`DELETE FROM challenge_territories WHERE challenge_id = ${id}`);
        await db.execute(sql`DELETE FROM challenge_objectives WHERE challenge_id = ${id}`);
        await db.execute(sql`DELETE FROM challenge_causes WHERE challenge_id = ${id}`);
        await db.execute(sql`DELETE FROM challenge_solutions WHERE challenge_id = ${id}`);
        await db.execute(sql`DELETE FROM project_challenges WHERE challenge_id = ${id}`);
        await db.execute(sql`DELETE FROM challenges WHERE id = ${id}`);
      } else if (entity === "causes") {
        await db.execute(sql`DELETE FROM challenge_causes WHERE cause_id = ${id}`);
        await db.execute(sql`DELETE FROM solution_causes WHERE cause_id = ${id}`);
        await db.execute(sql`DELETE FROM causes WHERE id = ${id}`);
      } else if (entity === "solutions") {
        await db.execute(sql`DELETE FROM challenge_solutions WHERE solution_id = ${id}`);
        await db.execute(sql`DELETE FROM solution_causes WHERE solution_id = ${id}`);
        await db.execute(sql`DELETE FROM project_solutions WHERE solution_id = ${id}`);
        await db.execute(sql`DELETE FROM organization_solutions WHERE solution_id = ${id}`);
        await db.execute(sql`DELETE FROM solutions WHERE id = ${id}`);
      } else if (entity === "projects") {
        await db.execute(sql`DELETE FROM project_challenges WHERE project_id = ${id}`);
        await db.execute(sql`DELETE FROM project_solutions WHERE project_id = ${id}`);
        await db.execute(sql`DELETE FROM project_objectives WHERE project_id = ${id}`);
        await db.execute(sql`DELETE FROM project_organizations WHERE project_id = ${id}`);
        await db.execute(sql`DELETE FROM projects WHERE id = ${id}`);
      } else if (entity === "organizations") {
        await db.execute(sql`DELETE FROM project_organizations WHERE organization_id = ${id}`);
        await db.execute(sql`DELETE FROM organization_objectives WHERE organization_id = ${id}`);
        await db.execute(sql`DELETE FROM organization_solutions WHERE organization_id = ${id}`);
        await db.execute(sql`DELETE FROM organizations WHERE id = ${id}`);
      }
      res.json({ success: true, id, entity });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  };

  app.post("/api/data/:entity", (req, res) => handleUpsertEntity(req.params.entity, req, res));
  app.put("/api/data/:entity/:id", (req, res) => handleUpsertEntity(req.params.entity, req, res));
  app.delete("/api/data/:entity/:id", (req, res) => handleDeleteEntity(req.params.entity, req, res));


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

  // Helper to retrieve objective scores for any territory ID
  const getObjectivesForTerritory = (tid: string) => {
    const aguaVal = seedObjectives.find(o => o.title === "AGUA")?.progress_by_territory[tid] ?? 50;
    const alimVal = seedObjectives.find(o => o.title === "ALIMENTACIÓN")?.progress_by_territory[tid] ?? 50;
    const vivVal = seedObjectives.find(o => o.title === "VIVIENDA")?.progress_by_territory[tid] ?? 50;
    const saludVal = seedObjectives.find(o => o.title === "SALUD")?.progress_by_territory[tid] ?? 50;
    const convVal = seedObjectives.find(o => o.title === "CONVIVENCIA")?.progress_by_territory[tid] ?? 50;
    const ecoVal = seedObjectives.find(o => o.title === "ECOSISTEMAS")?.progress_by_territory[tid] ?? 50;
    const overall = Math.round((aguaVal + alimVal + vivVal + saludVal + convVal + ecoVal) / 6);

    return { agua: aguaVal, alimentacion: alimVal, vivienda: vivVal, salud: saludVal, convivencia: convVal, ecosistemas: ecoVal, overall };
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

  // 1. POLYGONS ENDPOINT serving GeoJSON features mapped to territory IDs
  app.get("/api/geo/territories/polygons", async (req, res) => {
    try {
      const zoom = parseFloat(req.query.zoom as string) || 2;
      const typeStr = (req.query.type as string) || null;
      const parentIdStr = (req.query.parentId as string) || null;

      let targetType = typeStr;
      if (!targetType && !parentIdStr) {
        if (zoom < 2.5) targetType = 'planet';
        else if (zoom < 3.5) targetType = 'continent';
        else if (zoom < 5.0) targetType = 'country';
        else targetType = 'region';
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
      } else {
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
      }

      if (parentIdStr) {
        rawFeatures = rawFeatures.filter((f: any) => f.properties.parent_id === parentIdStr);
      }

      // Populate objective scores directly onto polygon properties
      const indicatorScoresByTerritory = await getIndicatorScoresByTerritory();
      rawFeatures = rawFeatures.map((f: any) => {
        const tid = f.properties.territoryId || f.properties.id;
        const objs = getObjectivesForTerritory(tid);
        return {
          ...f,
          properties: {
            ...f.properties,
            objectives: objs,
            indicatorScores: indicatorScoresByTerritory[tid] || {}
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
        if (zoom < 2.5) targetType = 'planet';
        else if (zoom < 3.5) targetType = 'continent';
        else if (zoom < 5.0) targetType = 'country';
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

      const features = filtered.map(t => {
        const aguaVal = seedObjectives.find(o => o.title === "AGUA")?.progress_by_territory[t.id] ?? 50;
        const alimVal = seedObjectives.find(o => o.title === "ALIMENTACIÓN")?.progress_by_territory[t.id] ?? 50;
        const vivVal = seedObjectives.find(o => o.title === "VIVIENDA")?.progress_by_territory[t.id] ?? 50;
        const saludVal = seedObjectives.find(o => o.title === "SALUD")?.progress_by_territory[t.id] ?? 50;
        const convVal = seedObjectives.find(o => o.title === "CONVIVENCIA")?.progress_by_territory[t.id] ?? 50;
        const ecoVal = seedObjectives.find(o => o.title === "ECOSISTEMAS")?.progress_by_territory[t.id] ?? 50;

        const obj = {
          agua: aguaVal,
          alimentacion: alimVal,
          vivienda: vivVal,
          salud: saludVal,
          convivencia: convVal,
          ecosistemas: ecoVal,
        };
        const overall = Math.round((aguaVal + alimVal + vivVal + saludVal + convVal + ecoVal) / 6);

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
            objectives: { ...obj, overall },
            indicatorScores: indicatorScoresByTerritory[t.id] || {},
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
        SELECT id, name, type, description
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
