import { describe, expect, it } from "vitest";
import { parsePeriod, periodReference } from "./period";
import { linePath, sumSeries, valueAtOrBefore } from "./series";

describe("parsePeriod", () => {
  it("kent 7, 30 en 365 en valt terug op 30", () => {
    expect(parsePeriod("7")).toBe(7);
    expect(parsePeriod("365")).toBe(365);
    expect(parsePeriod("30")).toBe(30);
    expect(parsePeriod(undefined)).toBe(30);
    expect(parsePeriod("abc")).toBe(30);
    expect(parsePeriod(["7", "30"])).toBe(7);
  });

  it("benoemt waar het verschil tegen afzet", () => {
    expect(periodReference(7)).toBe("een week geleden");
    expect(periodReference(30)).toBe("een maand geleden");
    expect(periodReference(365)).toBe("een jaar geleden");
  });
});

describe("valueAtOrBefore", () => {
  const points = [
    { day: "2026-11-01", value: 100 },
    { day: "2026-11-10", value: 250 },
  ];

  it("neemt de dag zelf of de laatste ervoor", () => {
    expect(valueAtOrBefore(points, "2026-11-10")).toBe(250);
    expect(valueAtOrBefore(points, "2026-11-05")).toBe(100);
  });

  it("geeft niets voor de eerste meting", () => {
    expect(valueAtOrBefore(points, "2026-10-31")).toBeNull();
  });
});

describe("linePath", () => {
  it("tekent van linksonder naar rechtsboven bij een stijgende reeks", () => {
    const path = linePath(
      [
        { day: "2026-11-01", value: 0 },
        { day: "2026-11-11", value: 100 },
      ],
      100,
      50,
      0
    );
    expect(path?.d).toBe("M0.0 50.0 L100.0 0.0");
    expect(path?.end).toEqual({ x: 100, y: 0 });
  });

  it("zet de x op de datum, niet op de volgorde", () => {
    const path = linePath(
      [
        { day: "2026-11-01", value: 10 },
        { day: "2026-11-02", value: 10 },
        { day: "2026-11-11", value: 10 },
      ],
      100,
      50,
      0
    );
    expect(path?.d).toBe("M0.0 0.0 L10.0 0.0 L100.0 0.0");
  });

  it("heeft minstens twee punten nodig", () => {
    expect(linePath([{ day: "2026-11-01", value: 5 }], 100, 50)).toBeNull();
    expect(linePath([], 100, 50)).toBeNull();
  });
});

describe("sumSeries", () => {
  it("telt per dag op en houdt de laatste stand van een tool aan", () => {
    expect(
      sumSeries([
        [
          { day: "2026-11-01", value: 100 },
          { day: "2026-11-03", value: 200 },
        ],
        [{ day: "2026-11-02", value: 50 }],
      ])
    ).toEqual([
      { day: "2026-11-01", value: 100 },
      { day: "2026-11-02", value: 150 },
      { day: "2026-11-03", value: 250 },
    ]);
  });
});
