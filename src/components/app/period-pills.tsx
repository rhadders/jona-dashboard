import Link from "next/link";
import { PERIODS, type Period } from "@/lib/metrics/period";
import { cn } from "@/lib/utils";

/** De periode als drie pillen. Het is navigatie: de keuze staat in de URL (`?periode=`). */
export function PeriodPills({ basePath, period }: { basePath: string; period: Period }) {
  return (
    <nav aria-label="Periode" className="flex flex-wrap gap-2">
      {PERIODS.map((item) => {
        const active = item.days === period;
        return (
          <Link
            key={item.days}
            href={item.days === 30 ? basePath : `${basePath}?periode=${item.days}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-10 items-center rounded-full border px-5 text-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35",
              active ? "border-primary bg-primary text-primary-foreground" : "border-input hover:border-primary hover:bg-secondary-hover"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Houdt de gekozen periode vast in een link naar een andere pagina. */
export function withPeriod(path: string, period: Period): string {
  return period === 30 ? path : `${path}?periode=${period}`;
}
