import type Stripe from "stripe";
import { toSubscriptionRow, type StripeSubscriptionLike } from "@/lib/stripe/mrr";
import { isSubscriptionEvent, signalFromEvent } from "@/lib/stripe/signals";
import { query } from "../db";
import { snapshotMrr, upsertSubscription } from "./sync";

/**
 * Verwerkt één geverifieerd webhookbericht. Stripe kan hetzelfde bericht
 * vaker sturen: het id wordt eerst vastgelegd, en een bericht dat er al staat
 * doet niets meer. Zo leidt dezelfde gebeurtenis nooit tot twee signalen.
 */
export async function handleStripeEvent(toolId: string, event: Stripe.Event): Promise<"processed" | "duplicate"> {
  const occurredAt = new Date(event.created * 1000);
  const inserted = await query(
    "insert into stripe_events (tool_id, id, type, occurred_at) values ($1, $2, $3, $4) on conflict (tool_id, id) do nothing returning id",
    [toolId, event.id, event.type, occurredAt]
  );
  if (inserted.length === 0) return "duplicate";

  if (isSubscriptionEvent(event.type)) {
    await upsertSubscription(toolId, toSubscriptionRow(event.data.object as unknown as StripeSubscriptionLike));
    await snapshotMrr(toolId);
  }

  const signal = signalFromEvent({
    type: event.type,
    data: { object: event.data.object, previous_attributes: (event.data as { previous_attributes?: Record<string, unknown> }).previous_attributes },
  });
  if (signal) {
    await query(
      `insert into signals (tool_id, kind, amount_cents, occurred_at, source_ref) values ($1, $2, $3, $4, $5)
       on conflict (tool_id, source_ref, kind) do nothing`,
      [toolId, signal.kind, signal.amountCents, occurredAt, event.id]
    );
  }
  return "processed";
}
