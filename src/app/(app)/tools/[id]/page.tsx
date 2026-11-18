import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { DataList } from "@/components/app/data-list";
import { Figure } from "@/components/app/figure";
import { LineChart } from "@/components/app/line-chart";
import { PeriodPills, withPeriod } from "@/components/app/period-pills";
import { SignalList } from "@/components/app/signal-list";
import { StatusLine } from "@/components/app/status";
import { findTool } from "@/config/tools";
import { euro, euroChange, number, percent, relativeMoment, share } from "@/lib/format";
import { parsePeriod } from "@/lib/metrics/period";
import { partnerShareCents } from "@/lib/stripe/mrr";
import { toolStatus, type IntegrationState } from "@/lib/status/tool-status";
import { partnerSharePercent } from "@/server/env";
import { getToolDetail } from "@/server/queries";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ periode?: string | string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: findTool((await params).id)?.name ?? "Onbekende tool" };
}

function integrationText(state: IntegrationState & { checkedAt: Date | null }, missing: string): string {
  if (!state.configured) return missing;
  if (state.ok === null) return "Wacht op de eerste ronde";
  const when = state.checkedAt ? `, ${relativeMoment(state.checkedAt)}` : "";
  return state.ok ? `In orde${when}` : `${state.message ?? "Mislukt"}${when}`;
}

export default async function ToolPage({ params, searchParams }: Props) {
  const tool = findTool((await params).id);
  if (!tool) notFound();
  const period = parsePeriod((await searchParams).periode);
  const { figures, signals } = await getToolDetail(tool, period);
  const status = toolStatus({ stats: figures.statsState, stripe: figures.stripeState, failedPayments: figures.failedPayments });
  const stats = figures.stats;

  const changeStart = figures.mrrChangeCents === null ? null : figures.mrrCents - figures.mrrChangeCents;
  const changePct = figures.mrrChangeCents !== null && changeStart ? percent(figures.mrrChangeCents, changeStart) : null;
  const changeNote =
    figures.mrrChangeCents === null ? undefined : `${euroChange(figures.mrrChangeCents)}${changePct !== null && changePct !== 0 ? ` · ${Math.abs(changePct)}%` : ""}`;
  const canceledPct = figures.canceled > 0 && figures.payingAtStart ? percent(figures.canceled, figures.payingAtStart) : null;

  const partnerPercent = partnerSharePercent(tool);
  const partnerCents = partnerPercent === null ? 0 : partnerShareCents(figures.mrrCents, partnerPercent);

  const usageRows = stats
    ? [
        ...(stats.active ? [{ label: "Actief, 7 dagen", value: share(stats.active.last_7d, stats.accounts.total) }] : []),
        ...(stats.active ? [{ label: "Actief, 30 dagen", value: share(stats.active.last_30d, stats.accounts.total) }] : []),
        ...(stats.activated ? [{ label: "Geactiveerd, 30 dagen", value: share(stats.activated.last_30d, stats.signups.last_30d) }] : []),
        ...Object.entries(stats.counters ?? {}).map(([key, value]) => ({ label: tool.counters[key] ?? key, value: number(value) })),
      ]
    : [];

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-3">
        <Link
          href={withPeriod("/", period)}
          className="inline-flex min-h-10 items-center gap-1.5 self-start rounded-full text-sm text-primary underline decoration-brand/70 underline-offset-[3px] hover:text-brand-strong"
        >
          <ChevronLeft aria-hidden="true" className="size-[18px]" />
          Overzicht
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-3">
            <h1 className="text-3xl">{tool.name}</h1>
            <StatusLine tone={status.tone} label={status.label} />
          </div>
          <PeriodPills basePath={`/tools/${tool.id}`} period={period} />
        </div>
      </header>

      <section className="grid grid-cols-2 gap-8 md:grid-cols-4">
        <Figure size="lg" label="Maandomzet (MRR)" value={euro(figures.mrrCents)} note={changeNote} />
        <Figure size="lg" label={`Betalende ${tool.customer.plural}`} value={number(figures.paying)} />
        <Figure size="lg" label="In proefperiode" value={number(figures.trialing)} />
        <Figure size="lg" label="Opzeggingen" value={number(figures.canceled)} aside={canceledPct !== null ? `· ${canceledPct}%` : undefined} />
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] gap-x-16 gap-y-12">
        <div className="flex flex-col gap-5">
          <h2 className="text-xl">Maandomzet over de tijd</h2>
          <LineChart
            points={figures.mrrSeries}
            label={`Maandomzet van ${tool.name} over de tijd`}
            emptyText={figures.stripeState.configured ? "De grafiek vult zich vanaf de tweede dag met metingen." : "Stripe is voor deze tool nog niet gekoppeld."}
          />
        </div>

        <div className="flex flex-col gap-5">
          <h2 className="text-xl">Aanmeldingen</h2>
          {stats ? (
            <DataList
              rows={[
                { label: "Accounts", value: number(stats.accounts.total) },
                ...(stats.accounts.trial !== undefined ? [{ label: "Waarvan in proef", value: share(stats.accounts.trial, stats.accounts.total) }] : []),
                { label: "Nieuw, 24 uur", value: number(stats.signups.last_24h) },
                { label: "Nieuw, 30 dagen", value: number(stats.signups.last_30d) },
              ]}
            />
          ) : (
            <p className="border-y py-4 text-sm text-muted-foreground">
              {figures.statsState.configured ? "Er is nog geen geslaagde ophaalronde." : "Het stats-adres is voor deze tool nog niet gekoppeld."}
            </p>
          )}
        </div>

        {usageRows.length > 0 ? (
          <div className="flex flex-col gap-5">
            <h2 className="text-xl">Gebruik</h2>
            <DataList rows={usageRows} />
            <p className="text-sm text-muted-foreground">Actief: {tool.activeMeans.charAt(0).toLowerCase() + tool.activeMeans.slice(1)}.</p>
          </div>
        ) : null}

        {tool.partnerShare && partnerPercent !== null ? (
          <div className="flex flex-col gap-5">
            <h2 className="text-xl">Verdeling</h2>
            <DataList
              rows={[
                { label: `${tool.partnerShare.label}, ${partnerPercent}%`, value: euro(partnerCents) },
                { label: "Blijft over", value: `${euro(figures.mrrCents - partnerCents)} · ${100 - partnerPercent}%` },
              ]}
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-5">
          <h2 className="text-xl">Koppelingen</h2>
          <DataList
            rows={[
              { label: "Stats-adres", value: integrationText(figures.statsState, "Niet gekoppeld") },
              { label: "Stripe", value: integrationText(figures.stripeState, "Niet gekoppeld") },
              { label: "Webhook van Stripe", value: figures.stripeState.webhookConfigured ? "Geheim ingesteld" : "Geheim ontbreekt" },
            ]}
          />
        </div>

        <div className="flex flex-col gap-5">
          <h2 className="text-xl">Signalen</h2>
          <SignalList signals={signals} showTool={false} emptyText="Nog geen signalen voor deze tool." />
        </div>
      </section>
    </div>
  );
}
