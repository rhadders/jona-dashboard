/*
 * MRR uit Stripe-abonnementen, als pure rekenregels. Bedragen zijn centen.
 *
 * Definitie (bouwplan, "Cijfers en definities"): de som van alle lopende
 * abonnementen, omgerekend naar een maand. Een jaarabonnement telt voor een
 * twaalfde. Het bedrag is de prijs maal het aantal, zonder btw: uit een prijs
 * inclusief btw gaat de btw eraf (zie `inclusiveVatPercent`). Kortingen worden
 * in deze versie niet gecorrigeerd.
 */

export type BillingInterval = "day" | "week" | "month" | "year";

export type PriceLine = {
  /** Prijs per eenheid in centen; `null` bij gestaffelde of verbruiksprijzen. */
  unitAmount: number | null;
  quantity: number;
  interval: BillingInterval;
  intervalCount: number;
  /** Het btw-percentage dat al in de prijs zit; 0 of weggelaten als de prijs exclusief btw is. */
  inclusiveVatPercent?: number;
};

const MONTHS_PER: Record<BillingInterval, number> = {
  day: 12 / 365,
  week: 12 / 52,
  month: 1,
  year: 12,
};

/**
 * Haalt de btw uit een bedrag dat de btw al bevat. Bij 21% is € 12,10 opgebouwd
 * uit € 10,00 plus € 2,10: delen door 1,21, niet 21% eraf.
 */
export function withoutInclusiveVat(amount: number, vatPercent: number | undefined): number {
  return vatPercent && vatPercent > 0 ? amount / (1 + vatPercent / 100) : amount;
}

/** Het maandbedrag van één regel zonder btw, niet afgerond. */
export function monthlyCents(line: PriceLine): number {
  if (line.unitAmount === null || line.quantity <= 0 || line.intervalCount <= 0) return 0;
  const months = MONTHS_PER[line.interval] * line.intervalCount;
  return withoutInclusiveVat((line.unitAmount * line.quantity) / months, line.inclusiveVatPercent);
}

/** De MRR van één abonnement in hele centen. */
export function subscriptionMrrCents(lines: readonly PriceLine[]): number {
  return Math.round(lines.reduce((sum, line) => sum + monthlyCents(line), 0));
}

/**
 * Het deel van de maandomzet dat naar een partner gaat (bij Selaread: de
 * uitgevers), in hele centen. Een percentage buiten 0 tot 100 telt als nul.
 */
export function partnerShareCents(mrrCents: number, percent: number): number {
  if (!(percent > 0) || percent > 100) return 0;
  return Math.round((mrrCents * percent) / 100);
}

/** Leest een percentage uit de omgeving: een heel getal van 0 tot 100, anders `null`. */
export function parsePartnerSharePercent(raw: string | null | undefined): number | null {
  if (!raw || !/^\d{1,3}$/.test(raw.trim())) return null;
  const value = Number(raw.trim());
  return value <= 100 ? value : null;
}

/** Betalend: actief of achterstallig. Een achterstallig abonnement loopt nog. */
export function isPayingStatus(status: string): boolean {
  return status === "active" || status === "past_due";
}

export function isTrialStatus(status: string): boolean {
  return status === "trialing";
}

/** Een btw-tarief zoals Stripe het aan een abonnement of een regel hangt. */
export type TaxRateLike = { percentage: number; inclusive: boolean };

export type VatOptions = {
  /**
   * Het btw-percentage voor een prijs die Stripe als inclusief btw kent
   * (`tax_behavior: "inclusive"`) terwijl er geen tarief aan het abonnement
   * hangt, bijvoorbeeld als Stripe Tax de btw per factuur berekent.
   */
  fallbackInclusiveVatPercent?: number;
};

type ItemLike = StripeSubscriptionLike["items"]["data"][number];

/**
 * Hoeveel btw er al in de prijs van een regel zit. De tarieven op de regel gaan
 * voor die van het abonnement, zoals bij Stripe zelf. Alleen inclusieve
 * tarieven tellen: bij een exclusief tarief is de prijs al zonder btw.
 */
export function inclusiveVatPercent(
  item: ItemLike,
  defaultTaxRates: readonly TaxRateLike[] | null | undefined,
  options: VatOptions = {}
): number {
  const rates = item.tax_rates?.length ? item.tax_rates : (defaultTaxRates ?? []);
  if (rates.length > 0) {
    return rates.filter((rate) => rate.inclusive).reduce((sum, rate) => sum + rate.percentage, 0);
  }
  return item.price.tax_behavior === "inclusive" ? (options.fallbackInclusiveVatPercent ?? 0) : 0;
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
  default_tax_rates?: readonly TaxRateLike[] | null;
  items: {
    data: readonly {
      quantity?: number | null;
      tax_rates?: readonly TaxRateLike[] | null;
      price: {
        unit_amount: number | null;
        tax_behavior?: "inclusive" | "exclusive" | "unspecified" | null;
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
export function toSubscriptionRow(subscription: StripeSubscriptionLike, vat: VatOptions = {}): SubscriptionRow {
  const lines: PriceLine[] = subscription.items.data
    .filter((item) => item.price.recurring !== null)
    .map((item) => ({
      unitAmount: item.price.unit_amount,
      quantity: item.quantity ?? 1,
      interval: item.price.recurring!.interval,
      intervalCount: item.price.recurring!.interval_count,
      inclusiveVatPercent: inclusiveVatPercent(item, subscription.default_tax_rates, vat),
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
