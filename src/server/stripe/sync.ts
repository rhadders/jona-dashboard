import type { ToolConfig } from "@/config/tools";
import { amsterdamDay } from "@/lib/format";
import { isForProduct, toSubscriptionRow, type StripeSubscriptionLike, type SubscriptionRow, type VatOptions } from "@/lib/stripe/mrr";
import { query } from "../db";
import { recordStatus } from "../status";
import { stripeFor } from "./client";

/** Hoe de btw voor deze tool uit de maandomzet gaat; zie `inclusiveVatPercent` in de config. */
export function vatOptions(tool: ToolConfig | undefined): VatOptions {
  return { fallbackInclusiveVatPercent: tool?.inclusiveVatPercent };
}

export async function upsertSubscription(toolId: string, row: SubscriptionRow): Promise<void> {
  await query(
    `insert into stripe_subscriptions (tool_id, id, customer_ref, status, currency, mrr_cents, created_at, trial_end, canceled_at, ended_at, synced_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
     on conflict (tool_id, id) do update set
       customer_ref = excluded.customer_ref, status = excluded.status, currency = excluded.currency,
       mrr_cents = excluded.mrr_cents, trial_end = excluded.trial_end, canceled_at = excluded.canceled_at,
       ended_at = excluded.ended_at, synced_at = excluded.synced_at`,
    [toolId, row.id, row.customerRef, row.status, row.currency, row.mrrCents, row.createdAt, row.trialEnd, row.canceledAt, row.endedAt]
  );
}

/**
 * Legt de stand van vandaag vast: MRR, betalend en in proef. Alleen euro telt
 * mee in de MRR; een abonnement in een andere valuta staat wel in de tabel.
 */
export async function snapshotMrr(toolId: string, now: Date = new Date()): Promise<void> {
  await query(
    `insert into mrr_daily (tool_id, day, mrr_cents, paying, trialing)
     select $1, $2,
       coalesce(sum(mrr_cents) filter (where status in ('active', 'past_due') and currency = 'eur'), 0),
       count(*) filter (where status in ('active', 'past_due')),
       count(*) filter (where status = 'trialing')
     from stripe_subscriptions where tool_id = $1
     on conflict (tool_id, day) do update set mrr_cents = excluded.mrr_cents, paying = excluded.paying, trialing = excluded.trialing`,
    [toolId, amsterdamDay(now)]
  );
}

export type ReconcileResult = { tool: string; outcome: "ok" | "skipped" | "failed"; subscriptions?: number; reason?: string };

/**
 * Loopt alle abonnementen van het account opnieuw na. Dit is de bron van
 * waarheid; de webhook houdt de stand tussendoor actueel. Een gemist
 * webhookbericht corrigeert zichzelf zo binnen een dag.
 *
 * Heeft de tool een `stripeProductId`, dan tellen alleen de abonnementen op
 * dat product, en verdwijnt na een geslaagde ronde wat er niet (meer) bij
 * hoort: een abonnement van de andere tool in hetzelfde account, of een rij
 * uit een account waar de tool niet meer aan hangt.
 */
export async function reconcileStripe(tool: ToolConfig, now: Date = new Date()): Promise<ReconcileResult> {
  const stripe = stripeFor(tool);
  if (!stripe) return { tool: tool.id, outcome: "skipped", reason: "niet ingesteld" };
  let count = 0;
  const seen: string[] = [];
  try {
    for await (const subscription of stripe.subscriptions.list({ status: "all", limit: 100 })) {
      const like = subscription as unknown as StripeSubscriptionLike;
      if (!isForProduct(like, tool.stripeProductId)) continue;
      await upsertSubscription(tool.id, toSubscriptionRow(like, vatOptions(tool)));
      seen.push(like.id);
      count += 1;
    }
  } catch (error) {
    const code = (error as { type?: string; statusCode?: number }).statusCode;
    const reason = code === 401 || code === 403 ? "De sleutel wordt geweigerd of mist leesrechten" : "Stripe is niet bereikbaar";
    await recordStatus(tool.id, "stripe", false, reason);
    return { tool: tool.id, outcome: "failed", reason };
  }
  if (tool.stripeProductId) {
    await query("delete from stripe_subscriptions where tool_id = $1 and not (id = any($2::text[]))", [tool.id, seen]);
  }
  await snapshotMrr(tool.id, now);
  await recordStatus(tool.id, "stripe", true, null);
  return { tool: tool.id, outcome: "ok", subscriptions: count };
}
