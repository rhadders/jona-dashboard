import { describe, expect, it } from "vitest";
import {
  inclusiveVatPercent,
  isForProduct,
  isInvoiceForProduct,
  isPayingStatus,
  isTrialStatus,
  monthlyCents,
  parsePartnerSharePercent,
  partnerShareCents,
  subscriptionMrrCents,
  toSubscriptionRow,
  withoutInclusiveVat,
} from "./mrr";

describe("monthlyCents", () => {
  it("laat een maandprijs staan", () => {
    expect(monthlyCents({ unitAmount: 2900, quantity: 1, interval: "month", intervalCount: 1 })).toBe(2900);
  });

  it("telt een jaarabonnement voor een twaalfde", () => {
    expect(monthlyCents({ unitAmount: 34800, quantity: 1, interval: "year", intervalCount: 1 })).toBe(2900);
  });

  it("rekent met het aantal en met een periode van meer maanden", () => {
    expect(monthlyCents({ unitAmount: 600, quantity: 3, interval: "month", intervalCount: 1 })).toBe(1800);
    expect(monthlyCents({ unitAmount: 9000, quantity: 1, interval: "month", intervalCount: 3 })).toBe(3000);
  });

  it("rekent weken om via 52 weken per jaar", () => {
    expect(monthlyCents({ unitAmount: 1200, quantity: 1, interval: "week", intervalCount: 1 })).toBeCloseTo(5200, 5);
  });

  it("telt een prijs zonder vast bedrag niet mee", () => {
    expect(monthlyCents({ unitAmount: null, quantity: 1, interval: "month", intervalCount: 1 })).toBe(0);
  });
});

describe("subscriptionMrrCents", () => {
  it("telt de regels op en rondt af op hele centen", () => {
    expect(
      subscriptionMrrCents([
        { unitAmount: 2900, quantity: 1, interval: "month", intervalCount: 1 },
        { unitAmount: 10000, quantity: 1, interval: "year", intervalCount: 1 },
      ])
    ).toBe(3733);
  });

  it("is nul zonder regels", () => {
    expect(subscriptionMrrCents([])).toBe(0);
  });
});

describe("status", () => {
  it("telt actief en achterstallig als betalend", () => {
    expect(isPayingStatus("active")).toBe(true);
    expect(isPayingStatus("past_due")).toBe(true);
    expect(isPayingStatus("trialing")).toBe(false);
    expect(isPayingStatus("canceled")).toBe(false);
  });

  it("herkent een proefperiode", () => {
    expect(isTrialStatus("trialing")).toBe(true);
    expect(isTrialStatus("active")).toBe(false);
  });
});

describe("toSubscriptionRow", () => {
  it("bewaart alleen verwijzingen, status, bedrag en datums", () => {
    const row = toSubscriptionRow({
      id: "sub_1",
      customer: { id: "cus_1" },
      status: "active",
      currency: "eur",
      created: 1_800_000_000,
      trial_end: null,
      canceled_at: 1_800_086_400,
      items: {
        data: [
          { quantity: 2, price: { unit_amount: 1500, recurring: { interval: "month", interval_count: 1 } } },
          { quantity: 1, price: { unit_amount: 5000, recurring: null } },
        ],
      },
    });
    expect(row).toEqual({
      id: "sub_1",
      customerRef: "cus_1",
      status: "active",
      currency: "eur",
      mrrCents: 3000,
      createdAt: new Date(1_800_000_000_000),
      trialEnd: null,
      canceledAt: new Date(1_800_086_400_000),
      endedAt: null,
    });
  });

  it("neemt een klant als tekst over en gaat uit van aantal 1", () => {
    const row = toSubscriptionRow({
      id: "sub_2",
      customer: "cus_2",
      status: "trialing",
      currency: "eur",
      created: 1_800_000_000,
      trial_end: 1_801_209_600,
      items: { data: [{ price: { unit_amount: 2900, recurring: { interval: "month", interval_count: 1 } } }] },
    });
    expect(row.customerRef).toBe("cus_2");
    expect(row.mrrCents).toBe(2900);
    expect(row.trialEnd).toEqual(new Date(1_801_209_600_000));
  });
});

describe("btw", () => {
  const month = { interval: "month" as const, interval_count: 1 };
  const btw21 = { percentage: 21, inclusive: true };

  it("haalt de btw uit een bedrag dat de btw al bevat", () => {
    expect(withoutInclusiveVat(1210, 21)).toBeCloseTo(1000, 5);
    expect(withoutInclusiveVat(1210, 0)).toBe(1210);
    expect(withoutInclusiveVat(1210, undefined)).toBe(1210);
  });

  it("rekent een maandprijs inclusief btw terug naar het bedrag zonder btw", () => {
    expect(monthlyCents({ unitAmount: 1295, quantity: 1, interval: "month", intervalCount: 1, inclusiveVatPercent: 21 })).toBeCloseTo(1070.25, 2);
  });

  it("neemt het inclusieve tarief van de regel, en anders dat van het abonnement", () => {
    expect(inclusiveVatPercent({ tax_rates: [btw21], price: { unit_amount: 1295, recurring: month } }, null)).toBe(21);
    expect(inclusiveVatPercent({ price: { unit_amount: 1295, recurring: month } }, [btw21])).toBe(21);
    expect(inclusiveVatPercent({ tax_rates: [{ percentage: 9, inclusive: true }], price: { unit_amount: 1295, recurring: month } }, [btw21])).toBe(9);
  });

  it("laat een prijs met een exclusief tarief staan", () => {
    const item = { tax_rates: [{ percentage: 21, inclusive: false }], price: { unit_amount: 1000, tax_behavior: "inclusive" as const, recurring: month } };
    expect(inclusiveVatPercent(item, null, { fallbackInclusiveVatPercent: 21 })).toBe(0);
  });

  it("valt zonder tarief terug op het percentage van de tool, alleen bij een prijs inclusief btw", () => {
    const inclusive = { price: { unit_amount: 1295, tax_behavior: "inclusive" as const, recurring: month } };
    const unspecified = { price: { unit_amount: 1295, tax_behavior: "unspecified" as const, recurring: month } };
    expect(inclusiveVatPercent(inclusive, [], { fallbackInclusiveVatPercent: 21 })).toBe(21);
    expect(inclusiveVatPercent(inclusive, [])).toBe(0);
    expect(inclusiveVatPercent(unspecified, [], { fallbackInclusiveVatPercent: 21 })).toBe(0);
    expect(inclusiveVatPercent({ price: { unit_amount: 1295, recurring: month } }, undefined, { fallbackInclusiveVatPercent: 21 })).toBe(0);
  });

  it("telt een jaarabonnement van Jona Giften (€ 119,40 inclusief 21% btw) als € 8,22 per maand", () => {
    const row = toSubscriptionRow({
      id: "sub_3",
      customer: "cus_3",
      status: "active",
      currency: "eur",
      created: 1_800_000_000,
      items: {
        data: [{ quantity: 1, tax_rates: [btw21], price: { unit_amount: 11940, tax_behavior: "inclusive", recurring: { interval: "year", interval_count: 1 } } }],
      },
    });
    expect(row.mrrCents).toBe(822);
  });

  it("gebruikt het percentage van de tool als Stripe Tax de btw berekent", () => {
    const subscription = {
      id: "sub_4",
      customer: "cus_4",
      status: "active",
      currency: "eur",
      created: 1_800_000_000,
      items: { data: [{ price: { unit_amount: 1295, tax_behavior: "inclusive" as const, recurring: month } }] },
    };
    expect(toSubscriptionRow(subscription, { fallbackInclusiveVatPercent: 21 }).mrrCents).toBe(1070);
    expect(toSubscriptionRow(subscription).mrrCents).toBe(1295);
  });
});

describe("partneraandeel", () => {
  it("neemt het percentage van de maandomzet, in hele centen", () => {
    expect(partnerShareCents(126000, 70)).toBe(88200);
    expect(partnerShareCents(999, 70)).toBe(699);
    expect(partnerShareCents(0, 70)).toBe(0);
  });

  it("telt een percentage buiten 0 tot 100 als nul", () => {
    expect(partnerShareCents(126000, 0)).toBe(0);
    expect(partnerShareCents(126000, -5)).toBe(0);
    expect(partnerShareCents(126000, 140)).toBe(0);
    expect(partnerShareCents(126000, Number.NaN)).toBe(0);
  });

  it("leest alleen een heel getal van 0 tot 100 uit de omgeving", () => {
    expect(parsePartnerSharePercent("70")).toBe(70);
    expect(parsePartnerSharePercent(" 65 ")).toBe(65);
    expect(parsePartnerSharePercent("0")).toBe(0);
    expect(parsePartnerSharePercent("100")).toBe(100);
    expect(parsePartnerSharePercent("101")).toBeNull();
    expect(parsePartnerSharePercent("72,5")).toBeNull();
    expect(parsePartnerSharePercent("70%")).toBeNull();
    expect(parsePartnerSharePercent("")).toBeNull();
    expect(parsePartnerSharePercent(null)).toBeNull();
  });
});

describe("een gedeeld Stripe-account", () => {
  const subscription = (product: string | { id: string } | undefined) => ({
    items: { data: [{ price: { product, unit_amount: 11940, recurring: { interval: "year" as const, interval_count: 1 } } }] },
  });

  it("telt elk abonnement als de tool geen product heeft", () => {
    expect(isForProduct(subscription("jona_giften_abonnement"), undefined)).toBe(true);
    expect(isForProduct(subscription(undefined), undefined)).toBe(true);
  });

  it("telt alleen een abonnement op het eigen product", () => {
    expect(isForProduct(subscription("jona_giften_abonnement"), "jona_giften_abonnement")).toBe(true);
    expect(isForProduct(subscription({ id: "jona_giften_abonnement" }), "jona_giften_abonnement")).toBe(true);
    expect(isForProduct(subscription("jona_bestuur_abonnement"), "jona_giften_abonnement")).toBe(false);
    expect(isForProduct(subscription(undefined), "jona_giften_abonnement")).toBe(false);
  });

  it("herkent het product van een factuur in de nieuwe en de oude vorm", () => {
    const nieuw = { lines: { data: [{ pricing: { price_details: { product: "jona_bestuur_abonnement" } } }] } };
    const oud = { lines: { data: [{ price: { product: "jona_bestuur_abonnement" } }] } };
    for (const invoice of [nieuw, oud]) {
      expect(isInvoiceForProduct(invoice, "jona_bestuur_abonnement")).toBe(true);
      expect(isInvoiceForProduct(invoice, "jona_giften_abonnement")).toBe(false);
      expect(isInvoiceForProduct(invoice, undefined)).toBe(true);
    }
  });

  it("telt een factuur zonder product bij de regels mee", () => {
    expect(isInvoiceForProduct({ lines: { data: [{}] } }, "jona_giften_abonnement")).toBe(true);
    expect(isInvoiceForProduct({}, "jona_giften_abonnement")).toBe(true);
    expect(isInvoiceForProduct(null, "jona_giften_abonnement")).toBe(true);
  });
});
