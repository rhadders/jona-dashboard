import type { DayPoint } from "@/lib/metrics/series";
import type { ToolStats } from "@/lib/stats/contract";

/*
 * Omzet die een tool zelf aanlevert via het stats-adres, voor tools die per
 * keer verkopen in plaats van per abonnement. Puur, zodat de componenten niet
 * zelf rekenen. De bedragen zijn eurocenten zonder btw.
 */

export type RevenueMonth = { month: string; cents: number };

export type RevenueSummary = {
  last30dCents: number;
  thisMonthCents: number;
  previousMonthCents: number;
  /** De som van de twaalf maanden in `months`. */
  yearCents: number;
  /** Twaalf kalendermaanden, oplopend, de lopende als laatste. Een maand zonder cijfer staat op nul. */
  months: RevenueMonth[];
};

export const REVENUE_MONTHS = 12;

/** De maand (`YYYY-MM`) een aantal maanden terug of vooruit. */
export function shiftMonth(month: string, months: number): string {
  const [year, number] = month.split("-").map(Number) as [number, number];
  const index = year * 12 + (number - 1) + months;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/**
 * De omzet uit het laatste antwoord van het stats-adres, uitgelijnd op de
 * maand van vandaag (`today` als `YYYY-MM-DD`). `null` als de tool geen omzet
 * aanlevert.
 */
export function revenueSummary(stats: ToolStats | null, today: string): RevenueSummary | null {
  const revenue = stats?.revenue;
  if (!revenue) return null;
  const given = new Map(revenue.months.map((entry) => [entry.month, entry.cents]));
  const current = today.slice(0, 7);
  const months: RevenueMonth[] = [];
  for (let back = REVENUE_MONTHS - 1; back >= 0; back -= 1) {
    const month = shiftMonth(current, -back);
    months.push({ month, cents: given.get(month) ?? 0 });
  }
  return {
    last30dCents: revenue.last_30d_cents,
    thisMonthCents: months[months.length - 1]!.cents,
    previousMonthCents: months[months.length - 2]!.cents,
    yearCents: months.reduce((sum, entry) => sum + entry.cents, 0),
    months,
  };
}

/** De afgeronde maanden als reeks voor het kleine verloop; de lopende maand is nog niet af en doet niet mee. */
export function revenueTrend(months: readonly RevenueMonth[]): DayPoint[] {
  return months.slice(0, -1).map((entry) => ({ day: `${entry.month}-01`, value: entry.cents }));
}

export type MonthBar = { month: string; cents: number; x: number; y: number; width: number; height: number };

/**
 * De staven van een maandgrafiek in een vlak van `width` bij `height`, met
 * `pad` rondom en `gap` ertussen. De hoogste maand vult de hoogte.
 */
export function monthBars(months: readonly RevenueMonth[], width: number, height: number, pad = 10, gap = 10): MonthBar[] {
  if (months.length === 0) return [];
  const max = Math.max(1, ...months.map((entry) => entry.cents));
  const barWidth = (width - pad * 2 - gap * (months.length - 1)) / months.length;
  return months.map((entry, index) => {
    const barHeight = (Math.max(0, entry.cents) / max) * (height - pad * 2);
    return {
      month: entry.month,
      cents: entry.cents,
      x: pad + index * (barWidth + gap),
      y: height - pad - barHeight,
      width: barWidth,
      height: barHeight,
    };
  });
}
