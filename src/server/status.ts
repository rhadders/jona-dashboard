import { query } from "./db";

export type IntegrationKind = "stats" | "stripe";

/** Legt vast of een koppeling bij de laatste poging werkte. `message` is een korte Nederlandse reden, nooit een ruwe fout. */
export async function recordStatus(toolId: string, kind: IntegrationKind, ok: boolean, message: string | null): Promise<void> {
  await query(
    `insert into integration_status (tool_id, kind, ok, checked_at, message) values ($1, $2, $3, now(), $4)
     on conflict (tool_id, kind) do update set ok = excluded.ok, checked_at = excluded.checked_at, message = excluded.message`,
    [toolId, kind, ok, message]
  );
}
