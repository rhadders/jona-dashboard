import { describe, expect, it } from "vitest";
import type { ToolStats } from "@/lib/stats/contract";
import { monthBars, revenueSummary, revenueTrend, shiftMonth } from "./revenue";

const base: ToolStats = {
  tool: "actuelegegevens",
  generated_at: "2026-11-19T08:00:00Z",
  accounts: { total: 40 },
  signups: { last_24h: 0, last_30d: 3 },
};

describe("shiftMonth", () => {
  it("telt over de jaargrens heen", () => {
    expect(shiftMonth("2026-11", -1)).toBe("2026-10");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-11", -11)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
});

describe("revenueSummary", () => {
  it("geeft niets als de tool geen omzet aanlevert", () => {
    expect(revenueSummary(null, "2026-11-19")).toBeNull();
    expect(revenueSummary(base, "2026-11-19")).toBeNull();
  });

  it("zet twaalf maanden klaar tot en met de lopende, met nul waar niets is", () => {
    const summary = revenueSummary(
      {
        ...base,
        revenue: {
          last_30d_cents: 150000,
          months: [
            { month: "2025-10", cents: 999999 }, // ouder dan twaalf maanden
            { month: "2026-09", cents: 40000 },
            { month: "2026-10", cents: 120000 },
            { month: "2026-11", cents: 86000 },
          ],
        },
      },
      "2026-11-19"
    )!;
    expect(summary.months).toHaveLength(12);
    expect(summary.months[0]).toEqual({ month: "2025-12", cents: 0 });
    expect(summary.months.at(-1)).toEqual({ month: "2026-11", cents: 86000 });
    expect(summary.last30dCents).toBe(150000);
    expect(summary.thisMonthCents).toBe(86000);
    expect(summary.previousMonthCents).toBe(120000);
    expect(summary.yearCents).toBe(246000);
  });

  it("toont nul voor de lopende maand als het laatste antwoord van vorige maand is", () => {
    const summary = revenueSummary({ ...base, revenue: { last_30d_cents: 5000, months: [{ month: "2026-10", cents: 5000 }] } }, "2026-11-01")!;
    expect(summary.thisMonthCents).toBe(0);
    expect(summary.previousMonthCents).toBe(5000);
  });
});

describe("revenueTrend", () => {
  it("laat de lopende maand weg", () => {
    expect(
      revenueTrend([
        { month: "2026-09", cents: 1 },
        { month: "2026-10", cents: 2 },
        { month: "2026-11", cents: 3 },
      ])
    ).toEqual([
      { day: "2026-09-01", value: 1 },
      { day: "2026-10-01", value: 2 },
    ]);
  });
});

describe("monthBars", () => {
  it("verdeelt de staven over de breedte en schaalt op de hoogste maand", () => {
    const bars = monthBars(
      [
        { month: "2026-09", cents: 0 },
        { month: "2026-10", cents: 5000 },
        { month: "2026-11", cents: 10000 },
      ],
      320,
      120,
      10,
      10
    );
    // 320 breed, 10 rondom en twee tussenruimtes van 10: 280 voor drie staven
    for (const bar of bars) expect(bar.width).toBeCloseTo(280 / 3);
    expect(bars[0]).toMatchObject({ x: 10, height: 0, y: 110 });
    expect(bars[1]).toMatchObject({ height: 50, y: 60 });
    expect(bars[2]).toMatchObject({ height: 100, y: 10 });
    expect(bars[2]!.x + bars[2]!.width).toBeCloseTo(310);
  });

  it("geeft niets zonder maanden en deelt niet door nul als alles nul is", () => {
    expect(monthBars([], 320, 120)).toEqual([]);
    expect(monthBars([{ month: "2026-11", cents: 0 }], 320, 120)[0]).toMatchObject({ height: 0 });
  });
});
