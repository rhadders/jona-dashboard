import { describe, expect, it } from "vitest";
import type { ToolStats } from "@/lib/stats/contract";
import { attentionLabel, attentionRows, funnelRows, usageWindow } from "./usage";

const base: ToolStats = {
  tool: "jona-giften",
  generated_at: "2026-11-18T20:00:00.000Z",
  accounts: { total: 22, trial: 4 },
  signups: { last_24h: 1, last_30d: 8 },
};

describe("funnelRows", () => {
  it("toont aangemeld, geactiveerd en betalend geworden met aantal en percentage", () => {
    expect(funnelRows({ ...base, activated: { last_30d: 5 } }, 2)).toEqual([
      { label: "Aangemeld", value: "8" },
      { label: "Geactiveerd", value: "5 van 8 · 63%" },
      { label: "Betalend geworden", value: "2 van 8 · 25%" },
    ]);
  });

  it("laat het percentage weg als het deel groter is dan het aantal aanmeldingen", () => {
    expect(funnelRows({ ...base, signups: { last_24h: 0, last_30d: 2 }, activated: { last_30d: 3 } }, 4)).toEqual([
      { label: "Aangemeld", value: "2" },
      { label: "Geactiveerd", value: "3" },
      { label: "Betalend geworden", value: "4" },
    ]);
  });

  it("laat weg wat nog niet bekend is", () => {
    expect(funnelRows(base, null)).toEqual([{ label: "Aangemeld", value: "8" }]);
    expect(funnelRows(null, 3)).toEqual([{ label: "Betalend geworden", value: "3" }]);
    expect(funnelRows(null, null)).toEqual([]);
  });

  it("toont nul aanmeldingen zonder percentage", () => {
    expect(funnelRows({ ...base, signups: { last_24h: 0, last_30d: 0 }, activated: { last_30d: 0 } }, 0)).toEqual([
      { label: "Aangemeld", value: "0" },
      { label: "Geactiveerd", value: "0" },
      { label: "Betalend geworden", value: "0" },
    ]);
  });
});

describe("attentionLabel", () => {
  it("zegt wanneer een proef afloopt", () => {
    expect(attentionLabel({ kind: "trial_ending", account_ref: "org_1", days: 3 })).toBe("Proef loopt af over 3 dagen");
    expect(attentionLabel({ kind: "trial_ending", account_ref: "org_1", days: 1 })).toBe("Proef loopt af over 1 dag");
    expect(attentionLabel({ kind: "trial_ending", account_ref: "org_1", days: 0 })).toBe("Proef loopt vandaag af");
    expect(attentionLabel({ kind: "trial_ending", account_ref: "org_1" })).toBe("Proef loopt bijna af");
  });

  it("zegt hoe lang een account stil is", () => {
    expect(attentionLabel({ kind: "inactive", account_ref: "org_1", days: 50 })).toBe("50 dagen niets gedaan");
    expect(attentionLabel({ kind: "inactive", account_ref: "org_1" })).toBe("Nog nooit gebruikt");
  });

  it("toont een onbekende soort als gewone woorden", () => {
    expect(attentionLabel({ kind: "storage_full", account_ref: "org_1" })).toBe("storage full");
  });
});

describe("attentionRows", () => {
  const tools = [
    { id: "jona-bestuur", name: "Jona Bestuur", stats: { ...base, attention: [{ kind: "trial_ending", account_ref: "org_a", days: 2 }] } },
    { id: "selaread", name: "Selaread", stats: null },
    {
      id: "jona-giften",
      name: "Jona Giften",
      stats: {
        ...base,
        attention: [
          { kind: "inactive", account_ref: "org_b" },
          { kind: "inactive", account_ref: "org_c", days: 40 },
        ],
      },
    },
  ];

  it("zet de punten van alle tools achter elkaar, met de naam van de tool", () => {
    expect(attentionRows(tools, 10).map((row) => [row.toolName, row.label, row.ref])).toEqual([
      ["Jona Bestuur", "Proef loopt af over 2 dagen", "org_a"],
      ["Jona Giften", "Nog nooit gebruikt", "org_b"],
      ["Jona Giften", "40 dagen niets gedaan", "org_c"],
    ]);
  });

  it("houdt zich aan de grens en geeft elke rij een eigen sleutel", () => {
    const rows = attentionRows(tools, 2);
    expect(rows).toHaveLength(2);
    expect(new Set(attentionRows(tools, 10).map((row) => row.key)).size).toBe(3);
  });
});

describe("usageWindow", () => {
  it("kijkt per week, en over 12 maanden per maand", () => {
    expect(usageWindow(7)).toBe("week");
    expect(usageWindow(30)).toBe("week");
    expect(usageWindow(365)).toBe("month");
  });
});
