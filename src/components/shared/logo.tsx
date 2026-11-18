import Image from "next/image";
import { cn } from "@/lib/utils";

/*
 * Het beeldmerk is de duif (Jona design system). Het komt uit `public/jona-mark.svg` en wordt
 * nooit nagetekend, hertypt of herkleurd. Op een donker vlak staat het als
 * witte uitsparing (`brightness(0) invert(1)`), net als in Actualisatietool:
 * - `tone="auto"`: navy en teal op papier, wit in de donkere modus;
 * - `tone="inverse"`: altijd wit, voor een ink-vlak.
 *
 * `variant="full"` zet "Jona Dashboard" in Lora naast de duif; er is geen apart woordmerk.
 */
export function Logo({
  variant = "mark",
  tone = "auto",
  className,
  markClassName,
}: {
  variant?: "mark" | "full";
  tone?: "auto" | "inverse";
  className?: string;
  markClassName?: string;
}) {
  const mark = (
    <Image
      src="/jona-mark.svg"
      alt={variant === "mark" ? "Jona Dashboard" : ""}
      width={230}
      height={226}
      unoptimized
      className={cn(
        "h-8 w-auto shrink-0",
        tone === "inverse" ? "brightness-0 invert" : "dark:brightness-0 dark:invert",
        variant === "mark" && className,
        markClassName
      )}
    />
  );

  if (variant === "mark") return mark;

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
      {mark}
      <span
        className={cn(
          "truncate font-serif text-lg font-medium tracking-[-0.015em]",
          tone === "inverse" ? "text-ink-foreground" : "text-foreground"
        )}
      >
        Jona Dashboard
      </span>
    </span>
  );
}
