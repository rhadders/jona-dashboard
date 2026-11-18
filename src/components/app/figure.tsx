import { cn } from "@/lib/utils";

/** Eén cijfer met zijn label erboven, en eventueel een toevoeging erachter of eronder. */
export function Figure({
  label,
  value,
  aside,
  note,
  size = "md",
}: {
  label: string;
  value: string;
  /** Kleiner achter het cijfer, zoals "· 1%". */
  aside?: string;
  /** Een regel onder het cijfer, zoals "€ 90 erbij". */
  note?: string;
  size?: "md" | "lg";
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("font-serif font-medium tabular-nums leading-tight text-foreground", size === "lg" ? "text-3xl" : "text-2xl")}>
        {value}
        {aside ? <span className="font-sans text-base font-normal text-muted-foreground"> {aside}</span> : null}
      </span>
      {note ? <span className="text-sm font-medium text-brand-strong">{note}</span> : null}
    </div>
  );
}
