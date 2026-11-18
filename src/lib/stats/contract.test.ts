import { describe, expect, it } from "vitest";
import { parseStats } from "./contract";

const valid = {
  tool: "jona-bestuur",
  generated_at: "2026-11-18T20:00:00Z",
  accounts: { total: 22, trial: 4 },
  signups: { last_24h: 1, last_30d: 8 },
  activated: { last_30d: 5 },
  active: { last_7d: 13, last_30d: 16 },
  counters: { vergaderingen_gemaakt: 46, vergaderingen_geopend: 312 },
  attention: [{ kind: "trial_ending", account_ref: "org_8f2k", days: 3 }],
};

describe("parseStats", () => {
  it("leest een volledig antwoord", () => {
    const result = parseStats(valid, "jona-bestuur");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.stats.active?.last_7d).toBe(13);
  });

  it("neemt genoegen met alleen de velden van fase 1", () => {
    const result = parseStats(
      { tool: "selaread", generated_at: "2026-11-18T20:00:00+01:00", accounts: { total: 0 }, signups: { last_24h: 0, last_30d: 0 } },
      "selaread"
    );
    expect(result.ok).toBe(true);
  });

  it("negeert velden die het dashboard nog niet kent", () => {
    const result = parseStats({ ...valid, nieuw_veld: { x: 1 } }, "jona-bestuur");
    expect(result.ok).toBe(true);
    if (result.ok) expect("nieuw_veld" in result.stats).toBe(false);
  });

  it("weigert een antwoord van een andere tool", () => {
    const result = parseStats(valid, "jona-giften");
    expect(result).toEqual({ ok: false, error: 'Antwoord is van "jona-bestuur", verwacht "jona-giften"' });
  });

  it("noemt het veld dat niet klopt, zonder de waarde", () => {
    const result = parseStats({ ...valid, signups: { last_24h: -1, last_30d: 8 } }, "jona-bestuur");
    expect(result).toEqual({ ok: false, error: "Ongeldig veld: signups.last_24h" });
  });

  it("weigert iets dat geen object is", () => {
    expect(parseStats("<html>", "jona-bestuur").ok).toBe(false);
    expect(parseStats(null, "jona-bestuur").ok).toBe(false);
  });
});
