import { z } from "zod";
import { amsterdamDay, shiftDay } from "@/lib/format";

/*
 * De handelingen van de platformbeheerder op één account van een tool. Dit
 * zijn de enige plekken waar het dashboard iets wijzigt, en dat doet het bij
 * de tool zelf, nooit in Stripe. De tool legt de handeling vast in zijn eigen
 * auditlog; het dashboard houdt bij wat er vanaf hier is gedaan.
 */

/** De proef kan hooguit zoveel dagen vooruit; de tool bewaakt dezelfde grens. */
export const TRIAL_MAX_DAYS = 90;

const day = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);

export const adminActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("exemption"), exempt: z.boolean() }),
  z.object({ action: z.literal("trial"), until: day }),
  z.object({ action: z.literal("stripe_link") }),
]);

export type AdminAction = z.infer<typeof adminActionSchema>;

/** Een verwijzing naar een account, zoals de tool haar zelf geeft. */
export const accountRefSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

/**
 * Het moment waarop een proef "tot en met" een dag afloopt: laat op de avond
 * van die dag in Nederland, in zomer- en wintertijd dezelfde kalenderdag.
 */
export function trialUntil(dayText: string): string {
  return `${dayText}T21:59:59.000Z`;
}

/** De eerste en de laatste dag die bij het verlengen te kiezen zijn. */
export function trialDayRange(now: Date = new Date()): { min: string; max: string } {
  const today = amsterdamDay(now);
  return { min: shiftDay(today, 1), max: shiftDay(today, TRIAL_MAX_DAYS - 1) };
}

/** Het pad en de inhoud van het verzoek aan de tool. */
export function toolRequest(action: AdminAction): { path: string; body: Record<string, unknown> | null } {
  switch (action.action) {
    case "exemption":
      return { path: "vrijstelling", body: { vrijgesteld: action.exempt } };
    case "trial":
      return { path: "proef", body: { tot: trialUntil(action.until) } };
    case "stripe_link":
      return { path: "stripe-koppeling", body: null };
  }
}

/** Hoe de handeling in het logboek heet, en wat erbij hoort. Geen naam van het account. */
export function actionLog(action: AdminAction): { kind: string; detail: Record<string, unknown> } {
  switch (action.action) {
    case "exemption":
      return { kind: action.exempt ? "exempted" : "exemption_removed", detail: {} };
    case "trial":
      return { kind: "trial_extended", detail: { until: action.until } };
    case "stripe_link":
      return { kind: "stripe_link_cleared", detail: {} };
  }
}

export const ACTION_LABELS: Record<string, string> = {
  exempted: "Vrijgesteld",
  exemption_removed: "Vrijstelling opgeheven",
  trial_extended: "Proef verlengd",
  stripe_link_cleared: "Stripe-koppeling gewist",
};
