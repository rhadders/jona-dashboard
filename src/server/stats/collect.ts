import type { ToolConfig } from "@/config/tools";
import { amsterdamDay } from "@/lib/format";
import { parseStats } from "@/lib/stats/contract";
import { statsFailureReason } from "@/lib/stats/failure";
import { query } from "../db";
import { toolEnv } from "../env";
import { recordStatus } from "../status";

export type CollectResult = { tool: string; outcome: "ok" | "skipped" | "failed"; reason?: string };

/**
 * Haalt het stats-adres van één tool op en bewaart de stand van vandaag. Een
 * latere ophaalronde op dezelfde dag overschrijft de eerdere: per dag blijft
 * de laatste stand staan.
 */
export async function collectStats(tool: ToolConfig, now: Date = new Date()): Promise<CollectResult> {
  const env = toolEnv(tool);
  if (!env.statsUrl || !env.statsToken) return { tool: tool.id, outcome: "skipped", reason: "niet ingesteld" };

  const fail = async (reason: string): Promise<CollectResult> => {
    await recordStatus(tool.id, "stats", false, reason);
    return { tool: tool.id, outcome: "failed", reason };
  };

  let response: Response;
  try {
    response = await fetch(env.statsUrl, {
      headers: { Authorization: `Bearer ${env.statsToken}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return fail("Het adres is niet bereikbaar");
  }
  if (!response.ok) return fail(statsFailureReason(response.status));

  const json: unknown = await response.json().catch(() => null);
  const parsed = parseStats(json, tool.id);
  if (!parsed.ok) return fail(parsed.error);

  await query(
    `insert into stats_snapshots (tool_id, day, fetched_at, payload) values ($1, $2, $3, $4)
     on conflict (tool_id, day) do update set fetched_at = excluded.fetched_at, payload = excluded.payload`,
    [tool.id, amsterdamDay(now), now, JSON.stringify(parsed.stats)]
  );
  await recordStatus(tool.id, "stats", true, null);
  return { tool: tool.id, outcome: "ok" };
}
