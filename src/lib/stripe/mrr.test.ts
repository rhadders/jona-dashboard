import { describe, expect, it } from "vitest";
import { isPayingStatus, isTrialStatus, monthlyCents, subscriptionMrrCents, toSubscriptionRow } from "./mrr";

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
