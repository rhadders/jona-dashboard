import type { ToolConfig } from "@/config/tools";
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
  mrrSeries: DayPoint[];
  signals: SignalRow[];
};
