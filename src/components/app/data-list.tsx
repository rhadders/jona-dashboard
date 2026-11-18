/** Een rustige lijst van label en waarde, met haarlijnen ertussen. Een lange waarde breekt af, het label niet. */
export function DataList({ rows }: { rows: readonly { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="flex flex-col border-b">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-6 border-t py-3.5">
          <dt className="shrink-0">{row.label}</dt>
          <dd className="min-w-0 text-right tabular-nums">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
