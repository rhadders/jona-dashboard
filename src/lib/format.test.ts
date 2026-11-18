import { describe, expect, it } from "vitest";
import { amsterdamDay, euro, euroChange, monthLabel, percent, relativeMoment, share, shiftDay } from "./format";

const plain = (text: string) => text.replace(/ /g, " ");

describe("bedragen", () => {
  it("schrijft hele euro's met een punt per duizend", () => {
    expect(plain(euro(306000))).toBe("€ 3.060");
    expect(plain(euro(0))).toBe("€ 0");
    expect(plain(euro(2949))).toBe("€ 29");
  });

  it("zegt in woorden of het erbij of eraf is", () => {
    expect(plain(euroChange(24000))).toBe("€ 240 erbij");
    expect(plain(euroChange(-3000))).toBe("€ 30 eraf");
    expect(euroChange(20)).toBe("gelijk");
  });
});

describe("percentages", () => {
  it("rondt af op hele procenten", () => {
    expect(percent(24, 29)).toBe(83);
    expect(percent(1, 3)).toBe(33);
  });

  it("geeft niets bij een leeg geheel", () => {
    expect(percent(0, 0)).toBeNull();
  });

  it("zet aantal en percentage naast elkaar", () => {
    expect(share(24, 29)).toBe("24 van 29 · 83%");
    expect(share(0, 0)).toBe("0");
  });
});

describe("dagen", () => {
  it("neemt de dag in Nederland, niet in UTC", () => {
    expect(amsterdamDay(new Date("2026-11-18T23:30:00Z"))).toBe("2026-11-19");
    expect(amsterdamDay(new Date("2026-07-01T21:59:00Z"))).toBe("2026-07-01");
  });

  it("schuift over een maandgrens", () => {
    expect(shiftDay("2026-11-18", -30)).toBe("2026-10-19");
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("maakt een maandlabel zonder punt", () => {
    expect(monthLabel("2026-11-18")).toBe("nov 2026");
  });

  it("zegt vandaag en gisteren", () => {
    const now = new Date("2026-11-18T20:14:00+01:00");
    expect(relativeMoment(new Date("2026-11-18T20:02:00+01:00"), now)).toBe("vandaag 20:02");
    expect(relativeMoment(new Date("2026-11-17T18:47:00+01:00"), now)).toBe("gisteren 18:47");
    expect(relativeMoment(new Date("2026-11-10T09:05:00+01:00"), now)).toBe("10 nov 09:05");
  });
});
