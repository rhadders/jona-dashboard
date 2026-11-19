import { describe, expect, it } from "vitest";
import { toolStatus, type IntegrationState } from "./tool-status";

const off: IntegrationState = { configured: false, ok: null, message: null };
const fine: IntegrationState = { configured: true, ok: true, message: null };
const waiting: IntegrationState = { configured: true, ok: null, message: null };

describe("toolStatus", () => {
  it("zegt dat er nog niets gekoppeld is", () => {
    expect(toolStatus({ stats: off, stripe: off, failedPayments: 0 })).toEqual({ tone: "neutral", label: "Nog niet gekoppeld" });
  });

  it("noemt de koppeling die faalt, met de reden", () => {
    expect(
      toolStatus({ stats: { configured: true, ok: false, message: "Het token wordt geweigerd" }, stripe: fine, failedPayments: 0 })
    ).toEqual({ tone: "attention", label: "Stats-adres: het token wordt geweigerd" });
    expect(toolStatus({ stats: fine, stripe: { configured: true, ok: false, message: null }, failedPayments: 0 })).toEqual({
      tone: "attention",
      label: "Stripe: controle mislukt",
    });
  });

  it("telt mislukte betalingen, enkelvoud en meervoud", () => {
    expect(toolStatus({ stats: fine, stripe: fine, failedPayments: 1 }).label).toBe("1 betaling mislukt");
    expect(toolStatus({ stats: fine, stripe: fine, failedPayments: 2 })).toEqual({ tone: "attention", label: "2 betalingen mislukt" });
  });

  it("noemt wat nog ontbreekt als de helft gekoppeld is", () => {
    expect(toolStatus({ stats: off, stripe: fine, failedPayments: 0 }).label).toBe("Stats-adres nog niet gekoppeld");
    expect(toolStatus({ stats: fine, stripe: off, failedPayments: 0 }).label).toBe("Stripe nog niet gekoppeld");
  });

  it("wacht op de eerste ronde en is daarna in orde", () => {
    expect(toolStatus({ stats: waiting, stripe: fine, failedPayments: 0 }).label).toBe("Wacht op de eerste ophaalronde");
    expect(toolStatus({ stats: fine, stripe: fine, failedPayments: 0 })).toEqual({ tone: "good", label: "Alles in orde" });
  });

  it("mist Stripe niet bij een tool die zijn omzet zelf aanlevert", () => {
    expect(toolStatus({ stats: fine, stripe: off, failedPayments: 0, stripeNeeded: false })).toEqual({ tone: "good", label: "Alles in orde" });
    expect(toolStatus({ stats: waiting, stripe: off, failedPayments: 0, stripeNeeded: false }).label).toBe("Wacht op de eerste ophaalronde");
    expect(toolStatus({ stats: off, stripe: off, failedPayments: 0, stripeNeeded: false }).label).toBe("Nog niet gekoppeld");
    // is Stripe toch gekoppeld, dan telt hij gewoon mee
    expect(toolStatus({ stats: fine, stripe: waiting, failedPayments: 0, stripeNeeded: false }).label).toBe("Wacht op de eerste ophaalronde");
  });
});
