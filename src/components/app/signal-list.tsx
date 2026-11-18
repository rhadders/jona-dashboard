import { euro, relativeMoment } from "@/lib/format";
import { SIGNAL_LABELS, signalTone } from "@/lib/stripe/signals";
import type { SignalRow } from "@/lib/dashboard-types";
import { ToneDot } from "./status";

/** De laatste signalen: wat er gebeurde, bij welke tool, voor welk bedrag en wanneer. */
export function SignalList({ signals, showTool = true, emptyText }: { signals: readonly SignalRow[]; showTool?: boolean; emptyText: string }) {
  if (signals.length === 0) return <p className="border-y py-4 text-sm text-muted-foreground">{emptyText}</p>;
  return (
    <ul className="flex flex-col border-b">
      {signals.map((signal) => {
        const tone = signalTone(signal.kind);
        const details = [showTool ? signal.toolName : null, signal.amountCents !== null ? euro(signal.amountCents) : null, relativeMoment(signal.occurredAt)].filter(Boolean);
        return (
          <li key={signal.id} className="flex gap-3 border-t py-4">
            <ToneDot tone={tone === "good" ? "good" : tone} className="mt-2" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span>{SIGNAL_LABELS[signal.kind]}</span>
              <span className="text-sm text-muted-foreground">{details.join(" · ")}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
