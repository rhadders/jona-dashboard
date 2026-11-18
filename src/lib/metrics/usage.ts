import { number, share } from "@/lib/format";
import type { Period } from "@/lib/metrics/period";
import type { ToolStats } from "@/lib/stats/contract";

/*
 * Gebruik: de funnel van aanmelding naar betalend, de aandachtspunten uit het
 * stats-adres en welke reeks de grafiek toont. Puur, zodat de componenten niet
 * zelf rekenen.
 */

export type FunnelRow = { label: string; value: string };

/** "5 van 8 · 63%", of alleen het aantal als het deel groter is dan het geheel of het geheel nul is. */
function part(value: number, whole: number): string {
  return value <= whole ? share(value, whole) : number(value);
}

/**
 * De funnel over de laatste 30 dagen: aangemeld, geactiveerd en betalend
 * geworden. Het zijn drie tellingen over dezelfde periode, geen vaste groep:
 * wie zich eerder aanmeldde en nu pas betaalt, telt bij betalend mee. Daarom
 * staat er alleen een percentage als het deel in het geheel past.
 */
export function funnelRows(stats: ToolStats | null, newPaying: number | null): FunnelRow[] {
  const rows: FunnelRow[] = [];
  const signups = stats?.signups.last_30d ?? null;
  if (signups !== null) rows.push({ label: "Aangemeld", value: number(signups) });
  if (stats?.activated && signups !== null) rows.push({ label: "Geactiveerd", value: part(stats.activated.last_30d, signups) });
  if (newPaying !== null) rows.push({ label: "Betalend geworden", value: signups !== null ? part(newPaying, signups) : number(newPaying) });
  return rows;
}

export type AttentionItem = NonNullable<ToolStats["attention"]>[number];

/** Wat er aan de hand is, in gewone woorden. Een soort die het dashboard niet kent, toont zijn sleutel. */
export function attentionLabel(item: AttentionItem): string {
  if (item.kind === "trial_ending") {
    if (item.days === undefined) return "Proef loopt bijna af";
    if (item.days <= 0) return "Proef loopt vandaag af";
    return item.days === 1 ? "Proef loopt af over 1 dag" : `Proef loopt af over ${number(item.days)} dagen`;
  }
  if (item.kind === "inactive") {
    return item.days === undefined ? "Nog nooit gebruikt" : `${number(item.days)} dagen niets gedaan`;
  }
  return item.kind.replaceAll("_", " ");
}

export type AttentionRow = { key: string; toolId: string; toolName: string; label: string; ref: string };

/** De aandachtspunten van meerdere tools achter elkaar, in de volgorde waarin de tools ze gaven. */
export function attentionRows(tools: readonly { id: string; name: string; stats: ToolStats | null }[], limit: number): AttentionRow[] {
  return tools
    .flatMap((tool) =>
      (tool.stats?.attention ?? []).map((item, index) => ({
        key: `${tool.id}:${index}:${item.account_ref}`,
        toolId: tool.id,
        toolName: tool.name,
        label: attentionLabel(item),
        ref: item.account_ref,
      }))
    )
    .slice(0, limit);
}

/** Over 12 maanden toont de grafiek wie per maand actief was, anders wie per week. */
export function usageWindow(period: Period): "week" | "month" {
  return period === 365 ? "month" : "week";
}
