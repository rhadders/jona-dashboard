import type { ToolConfig } from "@/config/tools";
import { adminUrl, parseAccounts, type AdminAccount } from "@/lib/admin/contract";
import { statsFailureReason } from "@/lib/stats/failure";
import { toolEnv } from "../env";

export type AccountsResult = { state: "unconfigured" } | { state: "failed"; reason: string } | { state: "ok"; accounts: AdminAccount[] };

/** Of het beheer van een tool is ingesteld: een stats-adres om het beheeradres uit af te leiden, en een beheertoken. */
export function adminConfigured(tool: ToolConfig): boolean {
  const env = toolEnv(tool);
  return Boolean(env.adminToken && env.statsUrl && adminUrl(env.statsUrl));
}

/**
 * Haalt de accounts van één tool op bij de tool zelf. Het antwoord gaat naar
 * de pagina en nergens anders: het dashboard bewaart geen namen.
 */
export async function fetchAccounts(tool: ToolConfig): Promise<AccountsResult> {
  const env = toolEnv(tool);
  const url = env.statsUrl ? adminUrl(env.statsUrl) : null;
  if (!env.adminToken || !url) return { state: "unconfigured" };

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${env.adminToken}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { state: "failed", reason: "Het adres is niet bereikbaar" };
  }
  if (!response.ok) return { state: "failed", reason: statsFailureReason(response.status) };

  const json: unknown = await response.json().catch(() => null);
  const parsed = parseAccounts(json, tool.id);
  return parsed.ok ? { state: "ok", accounts: parsed.accounts } : { state: "failed", reason: parsed.error };
}
