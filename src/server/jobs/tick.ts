import { TOOLS } from "@/config/tools";
import { pool, query, queryOne } from "../db";
import { collectStats, type CollectResult } from "../stats/collect";
import { reconcileStripe, snapshotMrr, type ReconcileResult } from "../stripe/sync";
import { toolEnv } from "../env";

/*
 * De tik: het uurlijkse werk van het dashboard, aangeroepen door een schedule
 * in Dokploy (`POST /api/cron/tick`). Elke tik haalt de stats-adressen op en
 * legt de MRR van vandaag vast. De volledige controle van Stripe loopt hooguit
 * één keer per twintig uur per tool; `force` slaat die wachttijd over.
 */

const RECONCILE_EVERY_HOURS = 20;
const LOCK_KEY = 71_452_302;

export type TickResult = {
  ok: boolean;
  skipped?: "al bezig";
  stats: CollectResult[];
  stripe: ReconcileResult[];
};

async function reconcileIsDue(toolId: string): Promise<boolean> {
  const row = await queryOne<{ due: boolean }>(
    `select coalesce((select not ok or checked_at < now() - make_interval(hours => $2) from integration_status where tool_id = $1 and kind = 'stripe'), true) as due`,
    [toolId, RECONCILE_EVERY_HOURS]
  );
  return row?.due ?? true;
}

export async function runTick(options: { force?: boolean } = {}): Promise<TickResult> {
  const startedAt = new Date();
  const lock = await pool().connect();
  try {
    const locked = await lock.query<{ locked: boolean }>("select pg_try_advisory_lock($1) as locked", [LOCK_KEY]);
    if (!locked.rows[0]?.locked) return { ok: true, skipped: "al bezig", stats: [], stripe: [] };

    const stats = await Promise.all(
      TOOLS.map((tool) => collectStats(tool).catch((): CollectResult => ({ tool: tool.id, outcome: "failed", reason: "Onverwachte fout" })))
    );

    const stripe: ReconcileResult[] = [];
    for (const tool of TOOLS) {
      if (!toolEnv(tool).stripeApiKey) {
        stripe.push({ tool: tool.id, outcome: "skipped", reason: "niet ingesteld" });
        continue;
      }
      try {
        if (options.force || (await reconcileIsDue(tool.id))) {
          stripe.push(await reconcileStripe(tool));
        } else {
          await snapshotMrr(tool.id);
          stripe.push({ tool: tool.id, outcome: "skipped", reason: "nog niet aan de beurt" });
        }
      } catch {
        stripe.push({ tool: tool.id, outcome: "failed", reason: "Onverwachte fout" });
      }
    }

    await query("delete from sessions where expires_at < now()");
    await query("delete from webauthn_challenges where expires_at < now()");
    await query("delete from job_runs where started_at < now() - interval '90 days'");

    const ok = ![...stats, ...stripe].some((result) => result.outcome === "failed");
    await query("insert into job_runs (job, started_at, finished_at, ok, detail) values ('tick', $1, now(), $2, $3)", [
      startedAt,
      ok,
      JSON.stringify({ stats, stripe }),
    ]);
    return { ok, stats, stripe };
  } finally {
    await lock.query("select pg_advisory_unlock($1)", [LOCK_KEY]).catch(() => undefined);
    lock.release();
  }
}
