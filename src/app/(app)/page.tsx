import Link from "next/link";
import { Figure } from "@/components/app/figure";
import { LineChart, MiniTrend } from "@/components/app/line-chart";
import { PeriodPills, withPeriod } from "@/components/app/period-pills";
import { SignalList } from "@/components/app/signal-list";
import { StatusLine, ToneDot } from "@/components/app/status";
import { counted, euro, euroChange, number, percent } from "@/lib/format";
import { parsePeriod, periodReference } from "@/lib/metrics/period";
import { toolStatus } from "@/lib/status/tool-status";
import { getOverview } from "@/server/queries";

const ROW = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_96px_minmax(0,1.5fr)]";

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ periode?: string | string[] }> }) {
  const period = parsePeriod((await searchParams).periode);
  const overview = await getOverview(period);
  const stripeConnected = overview.tools.some((tool) => tool.stripeState.configured);

  const changeStart = overview.mrrChangeCents === null ? null : overview.mrrCents - overview.mrrChangeCents;
  const changePct = overview.mrrChangeCents !== null && changeStart ? percent(overview.mrrChangeCents, changeStart) : null;
  const canceledPct = overview.canceled > 0 && overview.payingAtStart ? percent(overview.canceled, overview.payingAtStart) : null;

  return (
    <div className="flex flex-col gap-14">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow">Jona dashboard</span>
          <h1 className="text-3xl">Overzicht</h1>
        </div>
        <PeriodPills basePath="/" period={period} />
      </header>

      <section className="flex flex-wrap gap-x-14 gap-y-10">
        <div className="flex min-w-0 flex-[2_1_520px] flex-col gap-5">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Maandomzet (MRR)</span>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="font-serif text-4xl font-medium tabular-nums tracking-[-0.015em] text-foreground md:text-[61px] md:leading-[1.12]">
                {euro(overview.mrrCents)}
              </span>
              {overview.mrrChangeCents !== null ? (
                <span className="font-medium text-brand-strong">
                  {euroChange(overview.mrrChangeCents)}
                  {changePct !== null && changePct !== 0 ? ` (${Math.abs(changePct)}%)` : ""} sinds {periodReference(period)}
                </span>
              ) : null}
            </div>
          </div>
          <LineChart
            points={overview.mrrSeries}
            label="Maandomzet over de tijd"
            emptyText={stripeConnected ? "De grafiek vult zich vanaf de tweede dag met metingen." : "Koppel Stripe op Instellingen om omzet te zien."}
          />
        </div>

        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          <h2 className="text-xl">Signalen</h2>
          <SignalList signals={overview.signals} emptyText="Nog geen signalen." />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-8 md:grid-cols-4">
        <Figure label="Betalende klanten" value={number(overview.paying)} />
        <Figure label="In proefperiode" value={number(overview.trialing)} />
        <Figure label="Opzeggingen" value={number(overview.canceled)} aside={canceledPct !== null ? `· ${canceledPct}%` : undefined} />
        <Figure label="Aanmeldingen, 30 dagen" value={overview.signups30d === null ? "–" : number(overview.signups30d)} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl">Tools</h2>
        <div className="flex flex-col border-b">
          <div className={`${ROW} hidden py-3 text-xs uppercase tracking-[0.14em] text-muted-foreground md:grid`} aria-hidden="true">
            <span>Tool</span>
            <span>MRR</span>
            <span>Klanten</span>
            <span>Aanmeldingen</span>
            <span>Verloop</span>
            <span>Status</span>
          </div>
          {overview.tools.map((figures) => {
            const status = toolStatus({ stats: figures.statsState, stripe: figures.stripeState, failedPayments: figures.failedPayments });
            return (
              <Link
                key={figures.tool.id}
                href={withPeriod(`/tools/${figures.tool.id}`, period)}
                className={`${ROW} min-h-[68px] border-t py-3 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35`}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-lg font-medium text-foreground">{figures.tool.name}</span>
                  <span className="text-sm text-muted-foreground md:hidden">{counted(figures.paying, figures.tool.customer)}</span>
                </span>
                <span className="tabular-nums max-md:hidden">{euro(figures.mrrCents)}</span>
                <span className="tabular-nums max-md:hidden">{counted(figures.paying, figures.tool.customer)}</span>
                <span className="tabular-nums max-md:hidden">
                  {figures.stats ? number(figures.stats.signups.last_30d) : <span className="text-muted-foreground">–</span>}
                </span>
                <span className="max-md:hidden">
                  <MiniTrend points={figures.mrrSeries} />
                </span>
                <StatusLine tone={status.tone} label={status.label} className="max-md:hidden" />
                <span className="flex items-center gap-3 tabular-nums md:hidden">
                  {euro(figures.mrrCents)}
                  <ToneDot tone={status.tone} />
                  <span className="sr-only">{status.label}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
