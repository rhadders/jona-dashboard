/*
 * Reeksen per dag en de lijn die een grafiek ervan tekent. Puur, zodat de
 * componenten niet zelf rekenen.
 */

export type DayPoint = { day: string; value: number };

/** De waarde op die dag, of anders de laatste dag ervoor. `points` oplopend op dag. */
export function valueAtOrBefore(points: readonly DayPoint[], day: string): number | null {
  let found: number | null = null;
  for (const point of points) {
    if (point.day > day) break;
    found = point.value;
  }
  return found;
}

export type LinePath = { d: string; end: { x: number; y: number } };

/**
 * De lijn door de punten in een vlak van `width` bij `height`, met `pad` rondom.
 * De x volgt de datum, zodat een gat in de reeks ook een gat in de tijd is.
 * Minder dan twee punten geeft `null`: dan toont de grafiek een lege staat.
 */
export function linePath(points: readonly DayPoint[], width: number, height: number, pad = 6): LinePath | null {
  if (points.length < 2) return null;
  const time = (day: string) => Date.parse(`${day}T12:00:00Z`);
  const first = time(points[0]!.day);
  const last = time(points[points.length - 1]!.day);
  if (last <= first) return null;
  const max = Math.max(1, ...points.map((point) => point.value));
  const x = (day: string) => pad + ((time(day) - first) / (last - first)) * (width - pad * 2);
  const y = (value: number) => height - pad - (Math.max(0, value) / max) * (height - pad * 2);
  const coords = points.map((point) => ({ x: x(point.day), y: y(point.value) }));
  const d = coords.map((c, index) => `${index === 0 ? "M" : "L"}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  return { d, end: coords[coords.length - 1]! };
}

/** Telt reeksen van meerdere tools per dag op; een tool zonder punt die dag telt zijn laatste stand. */
export function sumSeries(series: readonly (readonly DayPoint[])[]): DayPoint[] {
  const days = [...new Set(series.flatMap((points) => points.map((point) => point.day)))].sort();
  return days.map((day) => ({
    day,
    value: series.reduce((sum, points) => sum + (valueAtOrBefore(points, day) ?? 0), 0),
  }));
}
