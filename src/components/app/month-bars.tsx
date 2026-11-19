import { euro, monthLabel } from "@/lib/format";
import { monthBars, type RevenueMonth } from "@/lib/metrics/revenue";

/*
 * Bedragen per kalendermaand als rustige staven in eigen SVG met tokens, in
 * dezelfde maat als de lijngrafiek. De lopende maand is teal: die is nog niet
 * af. Zonder bedragen staat er een korte lege staat.
 */
export function MonthBars({ months, label, emptyText }: { months: readonly RevenueMonth[]; label: string; emptyText: string }) {
  const width = 580;
  const height = 170;

  if (months.every((entry) => entry.cents === 0)) {
    return (
      <p role="img" aria-label={`${label}: nog geen bedragen`} className="flex h-40 items-center justify-center rounded-xl bg-muted px-6 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    );
  }

  const bars = monthBars(months, width, height, 10, 10);
  const name = (month: string) => monthLabel(`${month}-01`);

  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="block h-auto w-full">
        <line x1="10" y1={height - 10} x2={width - 10} y2={height - 10} className="stroke-border" strokeWidth="1" />
        {bars.map((bar, index) => (
          <rect
            key={bar.month}
            x={bar.x.toFixed(1)}
            y={bar.y.toFixed(1)}
            width={bar.width.toFixed(1)}
            height={bar.height.toFixed(1)}
            rx="3"
            className={index === bars.length - 1 ? "fill-brand" : "fill-foreground"}
          >
            <title>{`${name(bar.month)}: ${euro(bar.cents)}`}</title>
          </rect>
        ))}
      </svg>
      <figcaption className="flex justify-between text-xs text-muted-foreground">
        <span>{name(months[0]!.month)}</span>
        <span>{name(months[months.length - 1]!.month)}, lopend</span>
      </figcaption>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {months.map((entry) => (
            <tr key={entry.month}>
              <th scope="row">{name(entry.month)}</th>
              <td>{euro(entry.cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
