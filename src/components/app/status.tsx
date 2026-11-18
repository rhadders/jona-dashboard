import type { Tone } from "@/lib/status/tool-status";
import { cn } from "@/lib/utils";

/*
 * De toon als stip. Wat aandacht vraagt is een oranje vierkantje, de rest een
 * rondje: het verschil zit dus ook in de vorm, niet alleen in de kleur.
 */
const TONE_CLASS: Record<Tone, string> = {
  good: "rounded-full bg-success",
  attention: "rounded-[2px] bg-warning",
  neutral: "rounded-full bg-muted-foreground/50",
};

export function ToneDot({ tone, className }: { tone: Tone; className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block size-2.5 shrink-0", TONE_CLASS[tone], className)} />;
}

export function StatusLine({ tone, label, className }: { tone: Tone; label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <ToneDot tone={tone} />
      {label}
    </span>
  );
}
