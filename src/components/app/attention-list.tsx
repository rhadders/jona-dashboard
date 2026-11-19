import type { AttentionRow } from "@/lib/metrics/usage";
import { ToneDot } from "./status";

/** Accounts die aandacht vragen: wat er speelt, bij welke tool, en de interne verwijzing om het account op te zoeken. */
export function AttentionList({ rows, showTool = true, emptyText }: { rows: readonly AttentionRow[]; showTool?: boolean; emptyText: string }) {
  if (rows.length === 0) return <p className="border-y py-4 text-sm text-muted-foreground">{emptyText}</p>;
  return (
    <ul className="flex flex-col border-b">
      {rows.map((row) => (
        <li key={row.key} className="flex gap-3 border-t py-4">
          <ToneDot tone="attention" className="mt-2" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span>{row.label}</span>
            <span className="truncate text-sm text-muted-foreground">
              {showTool ? `${row.toolName} · ` : ""}
              <span className="font-mono text-[13px]">{row.ref}</span>
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
