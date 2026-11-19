import { describe, expect, it } from "vitest";
import { accountRefSchema, actionLog, adminActionSchema, toolRequest, trialDayRange, trialUntil } from "./actions";
import { amsterdamDay } from "@/lib/format";

describe("de handelingen van de platformbeheerder", () => {
  it("kent drie handelingen en weigert de rest", () => {
    expect(adminActionSchema.safeParse({ action: "exemption", exempt: true }).success).toBe(true);
    expect(adminActionSchema.safeParse({ action: "trial", until: "2026-12-24" }).success).toBe(true);
    expect(adminActionSchema.safeParse({ action: "stripe_link" }).success).toBe(true);
    expect(adminActionSchema.safeParse({ action: "delete" }).success).toBe(false);
    expect(adminActionSchema.safeParse({ action: "trial", until: "24-12-2026" }).success).toBe(false);
    expect(adminActionSchema.safeParse({ action: "exemption", exempt: "ja" }).success).toBe(false);
  });

  it("laat in een verwijzing geen pad of vreemde tekens toe", () => {
    expect(accountRefSchema.safeParse("org_8f2k-AB").success).toBe(true);
    expect(accountRefSchema.safeParse("../stats").success).toBe(false);
    expect(accountRefSchema.safeParse("org/1").success).toBe(false);
    expect(accountRefSchema.safeParse("").success).toBe(false);
  });

  it("vertaalt een handeling naar het verzoek aan de tool", () => {
    expect(toolRequest({ action: "exemption", exempt: false })).toEqual({ path: "vrijstelling", body: { vrijgesteld: false } });
    expect(toolRequest({ action: "trial", until: "2026-12-24" })).toEqual({ path: "proef", body: { tot: "2026-12-24T21:59:59.000Z" } });
    expect(toolRequest({ action: "stripe_link" })).toEqual({ path: "stripe-koppeling", body: null });
  });

  it("laat een proef tot en met de gekozen dag lopen, in zomer- en wintertijd", () => {
    expect(amsterdamDay(new Date(trialUntil("2026-12-24")))).toBe("2026-12-24");
    expect(amsterdamDay(new Date(trialUntil("2027-07-01")))).toBe("2027-07-01");
  });

  it("biedt dagen van morgen tot binnen de grens van de tool", () => {
    const now = new Date("2026-11-20T10:00:00Z");
    const range = trialDayRange(now);
    expect(range).toEqual({ min: "2026-11-21", max: "2027-02-17" });
    expect(new Date(trialUntil(range.max)).getTime()).toBeLessThan(now.getTime() + 90 * 24 * 3600_000);
  });

  it("schrijft in het logboek de soort en geen naam", () => {
    expect(actionLog({ action: "exemption", exempt: true })).toEqual({ kind: "exempted", detail: {} });
    expect(actionLog({ action: "exemption", exempt: false })).toEqual({ kind: "exemption_removed", detail: {} });
    expect(actionLog({ action: "trial", until: "2026-12-24" })).toEqual({ kind: "trial_extended", detail: { until: "2026-12-24" } });
    expect(actionLog({ action: "stripe_link" })).toEqual({ kind: "stripe_link_cleared", detail: {} });
  });
});
