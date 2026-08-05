import type { Express, Request, Response } from 'express';
import Stripe from 'stripe';
import { sql } from 'drizzle-orm';
import { ROLE } from './auth.js';

// ============================================================================
// Economía y Stripe — Fase 6
// ============================================================================
// Implementa 08_ECONOMY.md y 09_STRIPE.md sobre el grafo ya construido en las
// Fases 3-5 (`transactions`, `transaction_links`, `stripe_accounts`,
// `refunds`, `supports`). Todo en modo TEST: las claves activas en `.env`
// (`sk_test_`/`pk_test_`) nunca pueden generar cargos reales.
//
// Se mantiene separado del flujo de socios/membresía ya existente en
// server.ts (que sigue funcionando exactamente igual) — este módulo cubre el
// mercado: Stripe Connect para vendedores, Checkout embebido para comprar
// productos, apoyo a creadores (donación puntual o recurrente) y reembolsos.

const newId = (p: string) => `${p}${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase()}`;

let stripeClient: Stripe | null = null;
export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY no está configurada.');
    stripeClient = new Stripe(key, { apiVersion: '2025-01-27.acacia' as any });
  }
  return stripeClient;
}

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
// Comisión de la plataforma sobre compras del mercado (08_ECONOMY.md: la
// plataforma puede configurar comisión fija/porcentual/por categoría).
// De momento un único porcentaje global, configurable por variable de
// entorno — el panel de configuración por categoría queda para más adelante.
const PLATFORM_FEE_BPS = Number(process.env.PLATFORM_FEE_BPS || 500); // 500 = 5.00%

export function registerStripeRoutes(app: Express, db: any) {

  const requireAuth = (req: Request, res: Response): boolean => {
    if (!req.user) { res.status(401).json({ error: 'Debes iniciar sesión.' }); return false; }
    return true;
  };

  // ==========================================================================
  // STRIPE CONNECT — onboarding de vendedores
  // ==========================================================================
  /**
   * Crea (o reutiliza) una cuenta Connect Express para el usuario, y devuelve
   * la URL de onboarding alojada por Stripe. 09_STRIPE.md pide poder crear,
   * vincular, consultar y desconectar la cuenta.
   */
  app.post('/api/stripe/connect/onboard', async (req: Request, res: Response) => {
    try {
      if (!requireAuth(req, res)) return;
      const stripe = getStripe();

      let row = (await db.execute(sql`SELECT * FROM stripe_accounts WHERE user_id = ${req.user!.id}`)).rows[0];

      if (!row) {
        const account = await stripe.accounts.create({
          type: 'express',
          email: req.user!.email,
          capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        });
        const id = newId('SACC');
        await db.execute(sql`
          INSERT INTO stripe_accounts (id, user_id, stripe_account_id) VALUES (${id}, ${req.user!.id}, ${account.id})
        `);
        row = { id, user_id: req.user!.id, stripe_account_id: account.id };
      }

      const link = await stripe.accountLinks.create({
        account: row.stripe_account_id,
        refresh_url: `${APP_URL}/panel-financiero?connect=refresh`,
        return_url: `${APP_URL}/panel-financiero?connect=done`,
        type: 'account_onboarding',
      });

      res.json({ url: link.url });
    } catch (e: any) {
      console.error('connect onboard error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/stripe/connect/status', async (req: Request, res: Response) => {
    try {
      if (!requireAuth(req, res)) return;
      const row = (await db.execute(sql`SELECT * FROM stripe_accounts WHERE user_id = ${req.user!.id}`)).rows[0];
      if (!row) return res.json({ connected: false });
      res.json({
        connected: true,
        chargesEnabled: row.charges_enabled,
        payoutsEnabled: row.payouts_enabled,
        detailsSubmitted: row.details_submitted,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /** Enlace de acceso al panel de Stripe Express (ver ingresos, pagos, facturación). */
  app.post('/api/stripe/connect/dashboard-link', async (req: Request, res: Response) => {
    try {
      if (!requireAuth(req, res)) return;
      const row = (await db.execute(sql`SELECT * FROM stripe_accounts WHERE user_id = ${req.user!.id}`)).rows[0];
      if (!row) return res.status(404).json({ error: 'No tienes cuenta Stripe Connect todavía.' });
      const stripe = getStripe();
      const link = await stripe.accounts.createLoginLink(row.stripe_account_id);
      res.json({ url: link.url });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /** Desconectar la cuenta (09_STRIPE.md: "desconectar la cuenta"). */
  app.post('/api/stripe/connect/disconnect', async (req: Request, res: Response) => {
    try {
      if (!requireAuth(req, res)) return;
      const row = (await db.execute(sql`SELECT * FROM stripe_accounts WHERE user_id = ${req.user!.id}`)).rows[0];
      if (!row) return res.status(404).json({ error: 'No tienes cuenta Stripe Connect.' });
      await db.execute(sql`DELETE FROM stripe_accounts WHERE user_id = ${req.user!.id}`);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================================================
  // CHECKOUT EMBEBIDO — compra de un producto del mercado
  // ==========================================================================
  /**
   * 09_STRIPE.md: "Todo el proceso utilizará Stripe Embedded Checkout. El
   * usuario nunca abandonará la aplicación." Si el vendedor tiene cuenta
   * Connect activa, el pago se divide automáticamente (destination charge +
   * comisión de plataforma); si no, el cobro queda en la cuenta de la
   * plataforma sin dividir (el vendedor recibirá el pago por otro medio,
   * hasta que complete el onboarding).
   */
  app.post('/api/stripe/checkout/product', async (req: Request, res: Response) => {
    try {
      if (!requireAuth(req, res)) return;
      const { product_id, quantity = 1 } = req.body || {};
      const product = (await db.execute(sql`
        SELECT * FROM products WHERE id = ${product_id} AND archived_at IS NULL
      `)).rows[0];
      if (!product) return res.status(404).json({ error: 'Producto no encontrado.' });
      if (!product.price_cents) return res.status(400).json({ error: 'Este producto no tiene precio de venta directa.' });

      const stripe = getStripe();
      const isSubscription = product.modality === 'suscripcion';

      // Cuenta Connect del vendedor (si el producto pertenece a una
      // organización, se busca la cuenta del usuario que la creó; si no, la
      // del propio creador del producto).
      const sellerUserId = product.created_by;
      const sellerAccount = sellerUserId
        ? (await db.execute(sql`SELECT stripe_account_id, charges_enabled FROM stripe_accounts WHERE user_id = ${sellerUserId}`)).rows[0]
        : null;
      const canSplit = sellerAccount?.charges_enabled;
      const feeCents = Math.round((product.price_cents * quantity * PLATFORM_FEE_BPS) / 10000);

      const session = await stripe.checkout.sessions.create({
        mode: isSubscription ? 'subscription' : 'payment',
        ui_mode: 'embedded',
        line_items: [{
          price_data: {
            currency: (product.currency || 'EUR').toLowerCase(),
            product_data: { name: product.name, description: product.description || undefined },
            unit_amount: product.price_cents,
            ...(isSubscription ? { recurring: { interval: product.billing_period === 'anual' ? 'year' : product.billing_period === 'trimestral' ? 'month' : 'month', interval_count: product.billing_period === 'trimestral' ? 3 : 1 } } : {}),
          },
          quantity,
        }],
        ...(canSplit && !isSubscription ? {
          payment_intent_data: {
            application_fee_amount: feeCents,
            transfer_data: { destination: sellerAccount.stripe_account_id },
          },
        } : {}),
        metadata: {
          kind: 'product_purchase',
          product_id: product.id,
          buyer_id: req.user!.id,
          quantity: String(quantity),
        },
        return_url: `${APP_URL}/mercado?compra=completada&session_id={CHECKOUT_SESSION_ID}`,
      });

      res.json({ clientSecret: session.client_secret, sessionId: session.id, feeCents, split: !!canSplit });
    } catch (e: any) {
      console.error('checkout product error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================================================
  // APOYO A CREADORES — donación puntual o recurrente (estilo Patreon)
  // ==========================================================================
  app.post('/api/stripe/checkout/support', async (req: Request, res: Response) => {
    try {
      if (!requireAuth(req, res)) return;
      const { beneficiary_user_id, beneficiary_organization_id, initiative_id, amount_cents, recurring, period } = req.body || {};
      if (!amount_cents || amount_cents < 100) {
        return res.status(400).json({ error: 'El importe mínimo es 1,00 €.' });
      }
      if (!beneficiary_user_id && !beneficiary_organization_id) {
        return res.status(400).json({ error: 'Falta el destinatario del apoyo.' });
      }

      const stripe = getStripe();
      const beneficiaryAccount = beneficiary_user_id
        ? (await db.execute(sql`SELECT stripe_account_id, charges_enabled FROM stripe_accounts WHERE user_id = ${beneficiary_user_id}`)).rows[0]
        : null;
      const canSplit = beneficiaryAccount?.charges_enabled;
      const feeCents = Math.round((amount_cents * PLATFORM_FEE_BPS) / 10000);

      const session = await stripe.checkout.sessions.create({
        mode: recurring ? 'subscription' : 'payment',
        ui_mode: 'embedded',
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: { name: 'Apoyo a un creador de Humanity.wiki' },
            unit_amount: amount_cents,
            ...(recurring ? { recurring: { interval: period === 'anual' ? 'year' : 'month', interval_count: period === 'trimestral' ? 3 : 1 } } : {}),
          },
          quantity: 1,
        }],
        ...(canSplit && !recurring ? {
          payment_intent_data: {
            application_fee_amount: feeCents,
            transfer_data: { destination: beneficiaryAccount.stripe_account_id },
          },
        } : {}),
        metadata: {
          kind: 'support',
          supporter_id: req.user!.id,
          beneficiary_user_id: beneficiary_user_id || '',
          beneficiary_organization_id: beneficiary_organization_id || '',
          initiative_id: initiative_id || '',
          recurring: recurring ? '1' : '0',
          period: period || '',
        },
        return_url: `${APP_URL}/personas/${beneficiary_user_id || ''}?apoyo=completado&session_id={CHECKOUT_SESSION_ID}`,
      });

      res.json({ clientSecret: session.client_secret, sessionId: session.id });
    } catch (e: any) {
      console.error('checkout support error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================================================
  // REEMBOLSOS
  // ==========================================================================
  app.post('/api/stripe/refunds', async (req: Request, res: Response) => {
    try {
      if (!requireAuth(req, res)) return;
      const { transaction_id, amount_cents, reason } = req.body || {};
      const tx = (await db.execute(sql`SELECT * FROM transactions WHERE id = ${transaction_id}`)).rows[0];
      if (!tx) return res.status(404).json({ error: 'Transacción no encontrada.' });

      // Solo quien recibió el pago (o un administrador) puede reembolsarlo.
      const isPayee = tx.payee_user_id === req.user!.id;
      if (!isPayee && req.user!.roleLevel < ROLE.ADMIN) {
        return res.status(403).json({ error: 'Solo el vendedor o un administrador puede reembolsar esta transacción.' });
      }
      if (tx.status !== 'pagado') {
        return res.status(409).json({ error: `Esta transacción está en estado "${tx.status}", no se puede reembolsar.` });
      }
      if (!tx.stripe_payment_intent_id) {
        return res.status(400).json({ error: 'Esta transacción no tiene un pago de Stripe asociado.' });
      }

      const stripe = getStripe();
      const refund = await stripe.refunds.create({
        payment_intent: tx.stripe_payment_intent_id,
        amount: amount_cents || undefined, // sin importe = reembolso total
        reason: 'requested_by_customer',
      });

      const refundId = newId('REF');
      await db.execute(sql`
        INSERT INTO refunds (id, transaction_id, amount_cents, reason, stripe_refund_id, created_by)
        VALUES (${refundId}, ${transaction_id}, ${amount_cents || tx.amount_cents}, ${reason || null}, ${refund.id}, ${req.user!.id})
      `);
      const full = !amount_cents || amount_cents >= tx.amount_cents;
      await db.execute(sql`
        UPDATE transactions SET status = ${full ? 'reembolsado' : 'pagado'}, updated_at = now() WHERE id = ${transaction_id}
      `);

      res.json({ success: true, refundId, full });
    } catch (e: any) {
      console.error('refund error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================================================
  // PANEL FINANCIERO
  // ==========================================================================
  /** 08_ECONOMY.md: balance, ventas, compras, donaciones, suscripciones, reembolsos. */
  app.get('/api/stripe/dashboard', async (req: Request, res: Response) => {
    try {
      if (!requireAuth(req, res)) return;
      const uid = req.user!.id;

      const [sales, purchases, donationsReceived, donationsGiven, activeSupports, refundsIssued, connectStatus] = await Promise.all([
        db.execute(sql`SELECT COALESCE(sum(amount_cents),0)::int AS total, count(*)::int AS n FROM transactions WHERE payee_user_id = ${uid} AND status = 'pagado' AND kind = 'compra'`),
        db.execute(sql`SELECT COALESCE(sum(amount_cents),0)::int AS total, count(*)::int AS n FROM transactions WHERE payer_user_id = ${uid} AND kind = 'compra'`),
        db.execute(sql`SELECT COALESCE(sum(amount_cents),0)::int AS total, count(*)::int AS n FROM supports WHERE beneficiary_user_id = ${uid} AND status = 'activo'`),
        db.execute(sql`SELECT COALESCE(sum(amount_cents),0)::int AS total, count(*)::int AS n FROM supports WHERE supporter_user_id = ${uid}`),
        db.execute(sql`SELECT count(*)::int AS n FROM supports WHERE (supporter_user_id = ${uid} OR beneficiary_user_id = ${uid}) AND status = 'activo' AND recurring = true`),
        db.execute(sql`SELECT COALESCE(sum(r.amount_cents),0)::int AS total, count(*)::int AS n FROM refunds r JOIN transactions t ON t.id = r.transaction_id WHERE t.payee_user_id = ${uid}`),
        db.execute(sql`SELECT charges_enabled, payouts_enabled, details_submitted FROM stripe_accounts WHERE user_id = ${uid}`),
      ]);

      const recent = await db.execute(sql`
        SELECT id, kind, status, amount_cents, currency, concept, created_at
        FROM transactions WHERE payer_user_id = ${uid} OR payee_user_id = ${uid}
        ORDER BY created_at DESC LIMIT 20
      `);

      res.json({
        balance: {
          ventas_cents: sales.rows[0].total,
          compras_cents: purchases.rows[0].total,
          donaciones_recibidas_cents: donationsReceived.rows[0].total,
          donaciones_realizadas_cents: donationsGiven.rows[0].total,
        },
        counts: {
          ventas: sales.rows[0].n,
          compras: purchases.rows[0].n,
          donaciones_recibidas: donationsReceived.rows[0].n,
          donaciones_realizadas: donationsGiven.rows[0].n,
          suscripciones_activas: activeSupports.rows[0].n,
          reembolsos: refundsIssued.rows[0].n,
        },
        reembolsos_emitidos_cents: refundsIssued.rows[0].total,
        connect: connectStatus.rows[0] || null,
        recentTransactions: recent.rows,
      });
    } catch (e: any) {
      console.error('dashboard error:', e);
      res.status(500).json({ error: e.message });
    }
  });
}

// ============================================================================
// Manejo de eventos de webhook específicos del mercado
// ============================================================================
// Se invoca desde el webhook único de server.ts (que debe montarse antes de
// express.json() para validar la firma sobre el cuerpo crudo) — el flujo de
// membresía/socios ya existente en server.ts NO se toca; esto se añade a
// continuación de él, distinguido por `metadata.kind`.
export async function handleMarketplaceWebhookEvent(event: Stripe.Event, db: any) {
  const newId2 = (p: string) => `${p}${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase()}`;

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const kind = session.metadata?.kind;
      if (kind === 'product_purchase') {
        const productId = session.metadata!.product_id;
        const buyerId = session.metadata!.buyer_id;
        const product = (await db.execute(sql`SELECT * FROM products WHERE id = ${productId}`)).rows[0];
        if (!product) break;
        const txId = newId2('TRX');
        await db.execute(sql`
          INSERT INTO transactions (id, kind, status, amount_cents, currency, platform_fee_cents,
                                    payer_user_id, payee_user_id, stripe_payment_intent_id,
                                    stripe_checkout_session_id, concept)
          VALUES (${txId}, 'compra', 'pagado', ${session.amount_total || product.price_cents},
                  ${(session.currency || 'eur').toUpperCase()}, 0,
                  ${buyerId}, ${product.created_by || null},
                  ${(session.payment_intent as string) || null}, ${session.id},
                  ${'Compra de ' + product.name})
          ON CONFLICT (id) DO NOTHING
        `);
        for (const [t, i] of [['products', productId], ['users', buyerId]] as const) {
          if (!i) continue;
          await db.execute(sql`
            INSERT INTO transaction_links (transaction_id, entity_type, entity_id) VALUES (${txId}, ${t}, ${i})
            ON CONFLICT DO NOTHING
          `);
        }
      } else if (kind === 'support') {
        const supportId = newId2('SUP');
        const recurring = session.metadata?.recurring === '1';
        await db.execute(sql`
          INSERT INTO supports (id, supporter_user_id, beneficiary_user_id, beneficiary_organization_id,
                                initiative_id, amount_cents, currency, recurring, period, status,
                                stripe_subscription_id)
          VALUES (${supportId}, ${session.metadata!.supporter_id},
                  ${session.metadata!.beneficiary_user_id || null}, ${session.metadata!.beneficiary_organization_id || null},
                  ${session.metadata!.initiative_id || null}, ${session.amount_total || 0},
                  ${(session.currency || 'eur').toUpperCase()}, ${recurring}, ${session.metadata!.period || null},
                  'activo', ${(session.subscription as string) || null})
        `);
      }
      break;
    }

    case 'account.updated': {
      const account = event.data.object as Stripe.Account;
      await db.execute(sql`
        UPDATE stripe_accounts SET
          charges_enabled = ${!!account.charges_enabled},
          payouts_enabled = ${!!account.payouts_enabled},
          details_submitted = ${!!account.details_submitted},
          country = ${account.country || null},
          updated_at = now()
        WHERE stripe_account_id = ${account.id}
      `);
      break;
    }

    case 'charge.refunded': {
      // Cubre reembolsos emitidos directamente desde el panel de Stripe (no
      // solo los que pasan por nuestro propio endpoint /api/stripe/refunds).
      const charge = event.data.object as Stripe.Charge;
      const piId = charge.payment_intent as string | null;
      if (piId) {
        await db.execute(sql`
          UPDATE transactions SET status = 'reembolsado', updated_at = now()
          WHERE stripe_payment_intent_id = ${piId} AND status <> 'reembolsado'
        `);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      // Si la suscripción cancelada pertenece a un "apoyo" recurrente (no a
      // una membresía de socio, que ya gestiona el flujo existente), se
      // marca como cancelado.
      const sub = event.data.object as Stripe.Subscription;
      await db.execute(sql`
        UPDATE supports SET status = 'cancelado', cancelled_at = now()
        WHERE stripe_subscription_id = ${sub.id} AND status <> 'cancelado'
      `);
      break;
    }

    default:
      break;
  }
}
