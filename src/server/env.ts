import type { ToolConfig } from "@/config/tools";
import { parsePartnerSharePercent } from "@/lib/stripe/mrr";

/*
 * De omgeving van de container. Sleutels komen alleen hier langs; geen andere
 * module leest `process.env` voor een geheim. Niets hiervan gaat naar de
 * browser of in een log.
 */

const read = (name: string): string | null => {
  const value = process.env[name]?.trim();
  return value ? value : null;
};

export type ToolEnv = {
  statsUrl: string | null;
  statsToken: string | null;
  stripeApiKey: string | null;
  stripeWebhookSecret: string | null;
};

export function toolEnv(tool: ToolConfig): ToolEnv {
  return {
    statsUrl: read(`STATS_URL_${tool.envKey}`),
    statsToken: read(`STATS_TOKEN_${tool.envKey}`),
    stripeApiKey: read(`STRIPE_API_KEY_${tool.envKey}`),
    stripeWebhookSecret: read(`STRIPE_WEBHOOK_SECRET_${tool.envKey}`),
  };
}

/**
 * Het partneraandeel van een tool als percentage, of `null` als de tool er geen
 * heeft. PARTNER_SHARE_PERCENT_<KEY> gaat voor de standaard uit de config; een
 * waarde die geen heel getal van 0 tot 100 is, wordt genegeerd.
 */
export function partnerSharePercent(tool: ToolConfig): number | null {
  if (!tool.partnerShare) return null;
  return parsePartnerSharePercent(read(`PARTNER_SHARE_PERCENT_${tool.envKey}`)) ?? tool.partnerShare.percent;
}

export const databaseUrl = () => read("DATABASE_URL");
export const cronSecret = () => read("CRON_SECRET");
export const setupToken = () => read("SETUP_TOKEN");

/** De publieke URL van het dashboard, zonder slash aan het einde. */
export function appUrl(): string {
  return (read("APP_URL") ?? "http://localhost:3000").replace(/\/+$/, "");
}
