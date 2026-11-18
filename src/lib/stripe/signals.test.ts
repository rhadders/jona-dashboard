import { describe, expect, it } from "vitest";
import { signalFromEvent, signalTone } from "./signals";

const subscription = (status: string) => ({
  id: "sub_1",
  customer: "cus_1",
  status,
  currency: "eur",
  created: 1_800_000_000,
  items: { data: [{ quantity: 1, price: { unit_amount: 2900, recurring: { interval: "month", interval_count: 1 } } }] },
});

describe("signalFromEvent", () => {
  it("meldt een nieuw abonnement dat direct betaalt", () => {
    expect(signalFromEvent({ type: "customer.subscription.created", data: { object: subscription("active") } })).toEqual({
      kind: "new_paying",
      amountCents: 2900,
    });
  });

  it("meldt een gestarte proef zonder bedrag", () => {
    expect(signalFromEvent({ type: "customer.subscription.created", data: { object: subscription("trialing") } })).toEqual({
      kind: "trial_started",
      amountCents: null,
    });
  });

  it("meldt de overgang van proef naar betalend", () => {
    expect(
      signalFromEvent({
        type: "customer.subscription.updated",
        data: { object: subscription("active"), previous_attributes: { status: "trialing" } },
      })
    ).toEqual({ kind: "new_paying", amountCents: 2900 });
  });

  it("zwijgt bij een wijziging die geen nieuws is", () => {
    expect(
      signalFromEvent({
        type: "customer.subscription.updated",
        data: { object: subscription("active"), previous_attributes: { quantity: 1 } },
      })
    ).toBeNull();
    expect(signalFromEvent({ type: "customer.subscription.created", data: { object: subscription("incomplete") } })).toBeNull();
  });

  it("meldt een opzegging met het bedrag dat wegvalt", () => {
    expect(signalFromEvent({ type: "customer.subscription.deleted", data: { object: subscription("canceled") } })).toEqual({
      kind: "canceled",
      amountCents: 2900,
    });
  });

  it("meldt een mislukte betaling met het openstaande bedrag", () => {
    expect(signalFromEvent({ type: "invoice.payment_failed", data: { object: { id: "in_1", amount_due: 3000 } } })).toEqual({
      kind: "payment_failed",
      amountCents: 3000,
    });
  });

  it("negeert andere gebeurtenissen", () => {
    expect(signalFromEvent({ type: "invoice.paid", data: { object: { id: "in_1" } } })).toBeNull();
    expect(signalFromEvent({ type: "customer.created", data: { object: {} } })).toBeNull();
  });
});

describe("signalTone", () => {
  it("scheidt goed nieuws van wat aandacht vraagt", () => {
    expect(signalTone("new_paying")).toBe("good");
    expect(signalTone("payment_failed")).toBe("attention");
    expect(signalTone("canceled")).toBe("attention");
    expect(signalTone("trial_started")).toBe("neutral");
  });
});
