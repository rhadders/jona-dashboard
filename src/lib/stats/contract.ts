import { z } from "zod";

/*
 * Het stats-contract: wat elke tool teruggeeft op `GET /api/internal/stats`.
 * Alleen aantallen en interne verwijzingen, nooit namen of andere
 * persoonsgegevens. De vaste velden betekenen bij elke tool hetzelfde;
 * `counters` is per tool vrij. Onbekende velden worden genegeerd, zodat een
 * tool vooruit kan lopen op het dashboard.
 */

const count = z.number().int().nonnegative();

export const statsSchema = z.object({
  tool: z.string().min(1).max(64),
  generated_at: z.string().datetime({ offset: true }),
  accounts: z.object({ total: count, trial: count.optional() }),
  signups: z.object({ last_24h: count, last_30d: count }),
  activated: z.object({ last_30d: count }).optional(),
  active: z.object({ last_7d: count, last_30d: count }).optional(),
  counters: z.record(z.string().max(64), count).optional(),
  attention: z
    .array(
      z.object({
        kind: z.string().min(1).max(64),
        account_ref: z.string().min(1).max(64),
        days: count.optional(),
      })
    )
    .max(50)
    .optional(),
});

export type ToolStats = z.infer<typeof statsSchema>;

export type ParsedStats = { ok: true; stats: ToolStats } | { ok: false; error: string };

/** Leest een antwoord van een stats-adres; `expectedTool` is het id uit de configuratie. */
export function parseStats(json: unknown, expectedTool: string): ParsedStats {
  const result = statsSchema.safeParse(json);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join(".") || "antwoord";
    return { ok: false, error: `Ongeldig veld: ${path}` };
  }
  if (result.data.tool !== expectedTool) {
    return { ok: false, error: `Antwoord is van "${result.data.tool}", verwacht "${expectedTool}"` };
  }
  return { ok: true, stats: result.data };
}
