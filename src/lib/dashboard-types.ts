import type { ToolConfig } from "@/config/tools";
import type { RevenueSummary } from "@/lib/metrics/revenue";
import type { DayPoint } from "@/lib/metrics/series";
import type { ToolStats } from "@/lib/stats/contract";
import type { IntegrationState } from "@/lib/status/tool-status";
import type { SignalKind } from "@/lib/stripe/signals";

/* De vormen die de pagina's en hun bouwstenen delen. De queries in `src/server/queries.ts` leveren ze. */

export type SignalRow = { id: string; toolId: string; toolName: string; kind: SignalKind; amountCents: number | null; occurredAt: Date };

export type ToolFigures = {
  tool: ToolConfig;
  mrrCents: number;
  /** Verschil met het begin van de periode, of `null` als er toen nog geen meting was. */
  mrrChangeCents: number | null;
  paying: number;
  /** Betalenden aan het begin van de periode, voor het percentage opzeggingen. */
  payingAtStart: number | null;
  trialing: number;
  canceled: number;
  failedPayments: number;
  stats: ToolStats | null;
  statsFetchedAt: Date | null;
  statsState: IntegrationState & { checkedAt: Date | null };
  stripeState: IntegrationState & { checkedAt: Date | null; webhookConfigured: boolean };
  mrrSeries: DayPoint[];
  /** Hoeveel accounts in de 7 dagen voor elke meting actief waren, per dag; leeg zolang de tool `active` niet levert. */
  activeWeekSeries: DayPoint[];
  /** Hetzelfde over de 30 dagen voor elke meting. */
  activeMonthSeries: DayPoint[];
  /** Abonnementen die in de laatste 30 dagen betalend werden, volgens de signalen van Stripe; `null` zonder Stripe. */
  newPaying30d: number | null;
  /** Omzet die de tool zelf aanlevert (`revenueFrom: "stats"`); `null` voor een tool met abonnementen of zolang het cijfer ontbreekt. */
  revenue: RevenueSummary | null;
};

export type Overview = {
  tools: ToolFigures[];
  mrrCents: number;
  mrrChangeCents: number | null;
  paying: number;
  payingAtStart: number | null;
  trialing: number;
  canceled: number;
  signups30d: number | null;
  /** Eenmalige omzet van de tools die hem zelf aanleveren, over 30 dagen. Staat los van de MRR; `null` als geen tool hem levert. */
  ownRevenue30dCents: number | null;
  mrrSeries: DayPoint[];
  signals: SignalRow[];
};
