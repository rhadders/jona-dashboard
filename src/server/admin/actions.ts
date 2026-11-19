import type { ToolConfig } from "@/config/tools";
import { actionLog, toolRequest, type AdminAction } from "@/lib/admin/actions";
import { accountSchema, adminUrl, type AdminAccount } from "@/lib/admin/contract";
import { statsFailureReason } from "@/lib/stats/failure";
import { query } from "../db";
import { toolEnv } from "../env";

export type ActionResult = { ok: true; account: AdminAccount } | { ok: false; status: number; reason: string };

/**
 * Voert één handeling uit bij de tool en legt haar daarna vast in het
 * logboek van het dashboard. De tool beslist of het mag en legt het zelf ook
 * vast; weigert de tool, dan komt zijn uitleg terug.
 */
export async function runAdminAction(tool: ToolConfig, ref: string, action: AdminAction): Promise<ActionResult> {
  const env = toolEnv(tool);
  const base = env.statsUrl ? adminUrl(env.statsUrl) : null;
  if (!env.adminToken || !base) return { ok: false, status: 503, reason: "Het beheer is voor deze tool niet gekoppeld." };

  const { path, body } = toolRequest(action);
  let response: Response;
  try {
    response = await fetch(`${base}/${encodeURIComponent(ref)}/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.adminToken}`, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { ok: false, status: 502, reason: "De tool is niet bereikbaar." };
  }

  const json = (await response.json().catch(() => null)) as { account?: unknown; fout?: unknown } | null;
  if (!response.ok) {
    // Bij een weigering of ongeldige invoer legt de tool zelf uit waarom, in gewone woorden.
    const told = (response.status === 400 || response.status === 409) && typeof json?.fout === "string" ? json.fout.slice(0, 300) : null;
    return { ok: false, status: response.status === 400 || response.status === 409 ? response.status : 502, reason: told ?? `${statsFailureReason(response.status)}.` };
  }
  const account = accountSchema.safeParse(json?.account);
  if (!account.success) return { ok: false, status: 502, reason: "De tool gaf een antwoord dat het dashboard niet begrijpt." };

  const log = actionLog(action);
  await query("insert into admin_actions (tool_id, account_ref, kind, detail) values ($1, $2, $3, $4)", [tool.id, ref, log.kind, JSON.stringify(log.detail)]);
  return { ok: true, account: account.data };
}

export type LoggedAction = { accountRef: string; kind: string; detail: Record<string, unknown>; performedAt: Date };

/** De laatste handelingen vanaf het dashboard bij één tool. */
export async function recentAdminActions(toolId: string, limit = 20): Promise<LoggedAction[]> {
  const rows = await query<{ account_ref: string; kind: string; detail: Record<string, unknown>; performed_at: Date }>(
    "select account_ref, kind, detail, performed_at from admin_actions where tool_id = $1 order by performed_at desc, id desc limit $2",
    [toolId, limit]
  );
  return rows.map((row) => ({ accountRef: row.account_ref, kind: row.kind, detail: row.detail, performedAt: row.performed_at }));
}
