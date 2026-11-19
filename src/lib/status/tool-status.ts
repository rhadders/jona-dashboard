/*
 * De status van een tool op het overzicht: één regel met een toon. Puur, zodat
 * de componenten niet zelf aan statussen rekenen.
 */

export type Tone = "good" | "attention" | "neutral";

export type IntegrationState = {
  configured: boolean;
  /** `null` zolang er nog geen poging is geweest. */
  ok: boolean | null;
  message: string | null;
};

export type ToolStatusInput = {
  stats: IntegrationState;
  stripe: IntegrationState;
  /** Mislukte betalingen in de afgelopen zeven dagen. */
  failedPayments: number;
  /** `false` voor een tool die zijn omzet zelf aanlevert: Stripe ontbreekt daar niet. Standaard `true`. */
  stripeNeeded?: boolean;
};

export type ToolStatus = { tone: Tone; label: string };

export function toolStatus(input: ToolStatusInput): ToolStatus {
  const { stats, stripe, failedPayments } = input;
  const stripeNeeded = input.stripeNeeded ?? true;
  if (!stats.configured && !stripe.configured) return { tone: "neutral", label: "Nog niet gekoppeld" };
  if (stats.configured && stats.ok === false) return { tone: "attention", label: `Stats-adres: ${lower(stats.message) ?? "ophalen mislukt"}` };
  if (stripe.configured && stripe.ok === false) return { tone: "attention", label: `Stripe: ${lower(stripe.message) ?? "controle mislukt"}` };
  if (failedPayments > 0) {
    return { tone: "attention", label: failedPayments === 1 ? "1 betaling mislukt" : `${failedPayments} betalingen mislukt` };
  }
  if (!stats.configured) return { tone: "neutral", label: "Stats-adres nog niet gekoppeld" };
  if (!stripe.configured && stripeNeeded) return { tone: "neutral", label: "Stripe nog niet gekoppeld" };
  if (stats.ok === null || (stripe.configured && stripe.ok === null)) return { tone: "neutral", label: "Wacht op de eerste ophaalronde" };
  return { tone: "good", label: "Alles in orde" };
}

function lower(message: string | null): string | null {
  if (!message) return null;
  return message.charAt(0).toLowerCase() + message.slice(1);
}
