import { TOOLS, type ToolConfig } from "@/config/tools";
import type { Overview, SignalRow, ToolFigures } from "@/lib/dashboard-types";
import { amsterdamDay, shiftDay } from "@/lib/format";
import type { Period } from "@/lib/metrics/period";
import { revenueSummary } from "@/lib/metrics/revenue";
import { sumSeries, valueAtOrBefore, type DayPoint } from "@/lib/metrics/series";
import { statsSchema } from "@/lib/stats/contract";
import type { SignalKind } from "@/lib/stripe/signals";
import { query, queryOne } from "./db";
import { toolEnv } from "./env";

/* Wat de pagina's uit de database lezen. Alleen lezen; schrijven doen de taken en de webhook. */

type CurrentRow = { tool_id: string; mrr_cents: string; paying: string; trialing: string; canceled: string };
type DailyRow = { tool_id: string; day: string; mrr_cents: number; paying: number };
type SnapshotRow = { tool_id: string; fetched_at: Date; payload: unknown };
type UsageRow = { tool_id: string; day: string; week: string | null; month: string | null };
type StatusRow = { tool_id: string; kind: "stats" | "stripe"; ok: boolean; checked_at: Date; message: string | null };

async function loadFigures(tools: readonly ToolConfig[], period: Period, now: Date): Promise<ToolFigures[]> {
  const ids = tools.map((tool) => tool.id);
  const today = amsterdamDay(now);
  const startDay = shiftDay(today, -period);
  const since = new Date(now.getTime() - period * 24 * 60 * 60 * 1000);

  const [current, daily, snapshots, statuses, failed, usage, newPaying] = await Promise.all([
    query<CurrentRow>(
      `select tool_id,
         coalesce(sum(mrr_cents) filter (where status in ('active', 'past_due') and currency = 'eur'), 0) as mrr_cents,
         count(*) filter (where status in ('active', 'past_due')) as paying,
         count(*) filter (where status = 'trialing') as trialing,
         count(*) filter (where status = 'canceled' and coalesce(ended_at, canceled_at) >= $2) as canceled
       from stripe_subscriptions where tool_id = any($1) group by tool_id`,
      [ids, since]
    ),
    query<DailyRow>(
      `select tool_id, day::text as day, mrr_cents, paying from mrr_daily
       where tool_id = any($1) and day >= ($2::date - 400) order by day`,
      [ids, today]
    ),
    query<SnapshotRow>(
      "select distinct on (tool_id) tool_id, fetched_at, payload from stats_snapshots where tool_id = any($1) order by tool_id, day desc",
      [ids]
    ),
    query<StatusRow>("select tool_id, kind, ok, checked_at, message from integration_status where tool_id = any($1)", [ids]),
    query<{ tool_id: string; count: string }>(
      "select tool_id, count(*) as count from signals where tool_id = any($1) and kind = 'payment_failed' and occurred_at >= now() - interval '7 days' group by tool_id",
      [ids]
    ),
    query<UsageRow>(
      `select tool_id, day::text as day, payload->'active'->>'last_7d' as week, payload->'active'->>'last_30d' as month
       from stats_snapshots where tool_id = any($1) and day >= ($2::date - 400) order by day`,
      [ids, today]
    ),
    query<{ tool_id: string; count: string }>(
      "select tool_id, count(*) as count from signals where tool_id = any($1) and kind = 'new_paying' and occurred_at >= $2 group by tool_id",
      [ids, new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)]
    ),
  ]);

  return tools.map((tool) => {
    const env = toolEnv(tool);
    const now_ = current.find((row) => row.tool_id === tool.id);
    const days = daily.filter((row) => row.tool_id === tool.id);
    const mrrSeries: DayPoint[] = days.map((row) => ({ day: row.day, value: row.mrr_cents }));
    const payingSeries: DayPoint[] = days.map((row) => ({ day: row.day, value: row.paying }));
    const mrrCents = Number(now_?.mrr_cents ?? 0);
    const mrrAtStart = valueAtOrBefore(mrrSeries, startDay);
    const snapshot = snapshots.find((row) => row.tool_id === tool.id);
    const parsed = snapshot ? statsSchema.safeParse(snapshot.payload) : null;
    const status = (kind: "stats" | "stripe") => statuses.find((row) => row.tool_id === tool.id && row.kind === kind);
    const usageDays = usage.filter((row) => row.tool_id === tool.id);
    const usageSeries = (pick: (row: UsageRow) => string | null): DayPoint[] =>
      usageDays.flatMap((row) => {
        const value = Number(pick(row) ?? Number.NaN);
        return Number.isFinite(value) ? [{ day: row.day, value }] : [];
      });
    const statsStatus = status("stats");
    const stripeStatus = status("stripe");
    return {
      tool,
      mrrCents,
      mrrChangeCents: mrrAtStart === null ? null : mrrCents - mrrAtStart,
      paying: Number(now_?.paying ?? 0),
      payingAtStart: valueAtOrBefore(payingSeries, startDay),
      trialing: Number(now_?.trialing ?? 0),
      canceled: Number(now_?.canceled ?? 0),
      failedPayments: Number(failed.find((row) => row.tool_id === tool.id)?.count ?? 0),
      stats: parsed?.success ? parsed.data : null,
      statsFetchedAt: snapshot?.fetched_at ?? null,
      statsState: {
        configured: Boolean(env.statsUrl && env.statsToken),
        ok: statsStatus?.ok ?? null,
        message: statsStatus?.message ?? null,
        checkedAt: statsStatus?.checked_at ?? null,
      },
      stripeState: {
        configured: Boolean(env.stripeApiKey),
        webhookConfigured: Boolean(env.stripeWebhookSecret),
        ok: stripeStatus?.ok ?? null,
        message: stripeStatus?.message ?? null,
        checkedAt: stripeStatus?.checked_at ?? null,
      },
      mrrSeries,
      activeWeekSeries: usageSeries((row) => row.week),
      activeMonthSeries: usageSeries((row) => row.month),
      newPaying30d: env.stripeApiKey ? Number(newPaying.find((row) => row.tool_id === tool.id)?.count ?? 0) : null,
      revenue: tool.revenueFrom === "stats" ? revenueSummary(parsed?.success ? parsed.data : null, today) : null,
    };
  });
}

async function loadSignals(toolIds: readonly string[], limit: number): Promise<SignalRow[]> {
  const rows = await query<{ id: string; tool_id: string; kind: SignalKind; amount_cents: number | null; occurred_at: Date }>(
    "select id, tool_id, kind, amount_cents, occurred_at from signals where tool_id = any($1) order by occurred_at desc, id desc limit $2",
    [toolIds, limit]
  );
  return rows.map((row) => ({
    id: String(row.id),
    toolId: row.tool_id,
    toolName: TOOLS.find((tool) => tool.id === row.tool_id)?.name ?? row.tool_id,
    kind: row.kind,
    amountCents: row.amount_cents,
    occurredAt: row.occurred_at,
  }));
}

const sumOrNull = (values: readonly (number | null)[]): number | null =>
  values.every((value) => value === null) ? null : values.reduce<number>((sum, value) => sum + (value ?? 0), 0);

export async function getOverview(period: Period, now: Date = new Date()): Promise<Overview> {
  const [tools, signals] = await Promise.all([loadFigures(TOOLS, period, now), loadSignals(TOOLS.map((tool) => tool.id), 5)]);
  return {
    tools,
    mrrCents: tools.reduce((sum, tool) => sum + tool.mrrCents, 0),
    mrrChangeCents: sumOrNull(tools.map((tool) => tool.mrrChangeCents)),
    paying: tools.reduce((sum, tool) => sum + tool.paying, 0),
    payingAtStart: sumOrNull(tools.map((tool) => tool.payingAtStart)),
    trialing: tools.reduce((sum, tool) => sum + tool.trialing, 0),
    canceled: tools.reduce((sum, tool) => sum + tool.canceled, 0),
    signups30d: sumOrNull(tools.map((tool) => tool.stats?.signups.last_30d ?? null)),
    ownRevenue30dCents: sumOrNull(tools.map((tool) => tool.revenue?.last30dCents ?? null)),
    mrrSeries: sumSeries(tools.map((tool) => tool.mrrSeries)),
    signals,
  };
}

export type ToolDetail = { figures: ToolFigures; signals: SignalRow[] };

export async function getToolDetail(tool: ToolConfig, period: Period, now: Date = new Date()): Promise<ToolDetail> {
  const [figures, signals] = await Promise.all([loadFigures([tool], period, now), loadSignals([tool.id], 8)]);
  return { figures: figures[0]!, signals };
}

export type LastTick = { startedAt: Date; ok: boolean } | null;

export async function getLastTick(): Promise<LastTick> {
  const row = await queryOne<{ started_at: Date; ok: boolean }>("select started_at, ok from job_runs where job = 'tick' order by started_at desc limit 1");
  return row ? { startedAt: row.started_at, ok: row.ok } : null;
}
