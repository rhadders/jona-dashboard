/*
 * MRR uit Stripe-abonnementen, als pure rekenregels. Bedragen zijn centen.
 *
 * Definitie (bouwplan, "Cijfers en definities"): de som van alle lopende
 * abonnementen, omgerekend naar een maand. Een jaarabonnement telt voor een
 * twaalfde. Kortingen en btw-inclusieve prijzen worden in deze versie niet
 * gecorrigeerd: het bedrag is de prijs maal het aantal.
 */

export type BillingInterval = "day" | "week" | "month" | "year";

export type PriceLine = {
  /** Prijs per eenheid in centen; `null` bij gestaffelde of verbruiksprijzen. */
  unitAmount: number | null;
  quantity: number;
  interval: BillingInterval;
  intervalCount: number;
};

const MONTHS_PER: Record<BillingInterval, number> = {
  day: 12 / 365,
  week: 12 / 52,
  month: 1,
  year: 12,
};

/** Het maandbedrag van één regel, niet afgerond. */
export function monthlyCents(line: PriceLine): number {
  if (line.unitAmount === null || line.quantity <= 0 || line.intervalCount <= 0) return 0;
  const months = MONTHS_PER[line.interval] * line.intervalCount;
  return (line.unitAmount * line.quantity) / months;
}

/** De MRR van één abonnement in hele centen. */
export function subscriptionMrrCents(lines: readonly PriceLine[]): number {
  return Math.round(lines.reduce((sum, line) => sum + monthlyCents(line), 0));
}

/** Betalend: actief of achterstallig. Een achterstallig abonnement loopt nog. */
export function isPayingStatus(status: string): boolean {
  return status === "active" || status === "past_due";
}

export function isTrialStatus(status: string): boolean {
  return status === "trialing";
}

/** De vorm van een Stripe-abonnement waar het dashboard uit leest. */
export type StripeSubscriptionLike = {
  id: string;
  customer: string | { id: string };
  status: string;
  currency: string;
  created: number;
  trial_end?: number | null;
  canceled_at?: number | null;
  ended_at?: number | null;
  items: {
    data: readonly {
      quantity?: number | null;
      price: {
        unit_amount: number | null;
        recurring: { interval: BillingInterval; interval_count: number } | null;
      };
    }[];
  };
};

export type SubscriptionRow = {
  id: string;
  customerRef: string;
  status: string;
  currency: string;
  mrrCents: number;
  createdAt: Date;
  trialEnd: Date | null;
  canceledAt: Date | null;
  endedAt: Date | null;
};

const toDate = (seconds: number | null | undefined): Date | null =>
  typeof seconds === "number" ? new Date(seconds * 1000) : null;

/** Zet een Stripe-abonnement om naar de rij die het dashboard bewaart: geen naam, geen e-mail. */
export function toSubscriptionRow(subscription: StripeSubscriptionLike): SubscriptionRow {
  const lines: PriceLine[] = subscription.items.data
    .filter((item) => item.price.recurring !== null)
    .map((item) => ({
      unitAmount: item.price.unit_amount,
      quantity: item.quantity ?? 1,
      interval: item.price.recurring!.interval,
      intervalCount: item.price.recurring!.interval_count,
    }));
  return {
    id: subscription.id,
    customerRef: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
    status: subscription.status,
    currency: subscription.currency,
    mrrCents: subscriptionMrrCents(lines),
    createdAt: new Date(subscription.created * 1000),
    trialEnd: toDate(subscription.trial_end),
    canceledAt: toDate(subscription.canceled_at),
    endedAt: toDate(subscription.ended_at),
  };
}
