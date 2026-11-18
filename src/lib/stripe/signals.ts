import { toSubscriptionRow, type StripeSubscriptionLike } from "./mrr";

/*
 * Welke Stripe-gebeurtenis een signaal op het dashboard wordt. Puur, zodat de
 * regels te testen zijn zonder Stripe. Een signaal bevat alleen een soort, een
 * bedrag en een verwijzing: geen naam of e-mailadres van de klant.
 */

export type SignalKind = "new_paying" | "trial_started" | "canceled" | "payment_failed";

export type Signal = { kind: SignalKind; amountCents: number | null };

export type StripeEventLike = {
  type: string;
  data: { object: unknown; previous_attributes?: Record<string, unknown> | null };
};

export const SUBSCRIPTION_EVENTS = ["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"] as const;

export function isSubscriptionEvent(type: string): boolean {
  return (SUBSCRIPTION_EVENTS as readonly string[]).includes(type);
}

export function signalFromEvent(event: StripeEventLike): Signal | null {
  if (isSubscriptionEvent(event.type)) {
    const row = toSubscriptionRow(event.data.object as StripeSubscriptionLike);
    if (event.type === "customer.subscription.deleted") return { kind: "canceled", amountCents: row.mrrCents };
    if (event.type === "customer.subscription.created") {
      if (row.status === "active") return { kind: "new_paying", amountCents: row.mrrCents };
      if (row.status === "trialing") return { kind: "trial_started", amountCents: null };
      return null;
    }
    // Bijgewerkt: alleen de overgang naar actief is nieuws (einde proef, of de eerste betaling is gelukt).
    const before = event.data.previous_attributes?.status;
    if (row.status === "active" && (before === "trialing" || before === "incomplete")) {
      return { kind: "new_paying", amountCents: row.mrrCents };
    }
    return null;
  }
  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as { amount_due?: number | null };
    return { kind: "payment_failed", amountCents: typeof invoice.amount_due === "number" ? invoice.amount_due : null };
  }
  return null;
}

export const SIGNAL_LABELS: Record<SignalKind, string> = {
  new_paying: "Nieuwe betalende klant",
  trial_started: "Nieuwe proef gestart",
  canceled: "Abonnement opgezegd",
  payment_failed: "Betaling mislukt",
};

/** Of een signaal aandacht vraagt (oranje) of goed nieuws is (teal). */
export function signalTone(kind: SignalKind): "good" | "attention" | "neutral" {
  if (kind === "new_paying") return "good";
  if (kind === "payment_failed" || kind === "canceled") return "attention";
  return "neutral";
}
