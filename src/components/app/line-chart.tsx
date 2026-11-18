import { monthLabel } from "@/lib/format";
import { linePath, type DayPoint } from "@/lib/metrics/series";

/*
 * Het verloop als één rustige lijn in eigen SVG met tokens: geen
 * grafiekbibliotheek. Het eindpunt is teal. Met minder dan twee metingen staat
 * er een korte lege staat.
 */
export function LineChart({ points, label, emptyText }: { points: readonly DayPoint[]; label: string; emptyText: string }) {
  const width = 580;
  const height = 170;
  const path = linePath(points, width, height, 10);

  if (!path) {
    return (
      <p role="img" aria-label={`${label}: nog geen verloop`} className="flex h-40 items-center justify-center rounded-xl bg-muted px-6 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    );
  }

  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="block h-auto w-full">
        <line x1="10" y1={height - 10} x2={width - 10} y2={height - 10} className="stroke-border" strokeWidth="1" />
        <path d={path.d} className="fill-none stroke-foreground" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={path.end.x} cy={path.end.y} r="5" className="fill-brand" />
      </svg>
      <figcaption className="flex justify-between text-xs text-muted-foreground">
        <span>{monthLabel(points[0]!.day)}</span>
        <span>{monthLabel(points[points.length - 1]!.day)}</span>
      </figcaption>
    </figure>
  );
}

/** Het verloop van één tool in een tabelrij: alleen de lijn, geen assen. */
export function MiniTrend({ points }: { points: readonly DayPoint[] }) {
  const path = linePath(points.slice(-90), 96, 28, 3);
  if (!path) return <span className="block h-7 w-24" aria-hidden="true" />;
  return (
    <svg viewBox="0 0 96 28" aria-hidden="true" className="h-7 w-24">
      <path d={path.d} className="fill-none stroke-foreground" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
