import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink, Search } from "lucide-react";
import { AccountActions } from "@/components/app/account-actions";
import { ToneDot } from "@/components/app/status";
import { findTool } from "@/config/tools";
import { ACTION_LABELS, trialDayRange } from "@/lib/admin/actions";
import { accountState, dayLabel, filterAccounts, stripeCustomerUrl } from "@/lib/admin/contract";
import { counted, relativeMoment } from "@/lib/format";
import { fetchAccounts } from "@/server/admin/accounts";
import { recentAdminActions } from "@/server/admin/actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ zoek?: string | string[] }> };

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tool = findTool((await params).id);
  return { title: tool ? `${capitalize(tool.customer.plural)} van ${tool.name}` : "Onbekende tool" };
}

/**
 * De accounts van één tool, live opgehaald bij de tool zelf. Hier staan namen
 * van organisaties; het dashboard toont ze en bewaart ze niet.
 */
export default async function AccountsPage({ params, searchParams }: Props) {
  const tool = findTool((await params).id);
  if (!tool) notFound();
  const raw = (await searchParams).zoek;
  const search = (Array.isArray(raw) ? raw[0] : raw)?.slice(0, 100);
  const result = await fetchAccounts(tool);
  const accounts = result.state === "ok" ? filterAccounts(result.accounts, search) : [];
  const plural = tool.customer.plural;
  const trialDays = trialDayRange();
  const log = result.state === "ok" ? await recentAdminActions(tool.id) : [];

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <Link
          href={`/tools/${tool.id}`}
          className="inline-flex min-h-10 items-center gap-1.5 self-start rounded-full text-sm text-primary underline decoration-brand/70 underline-offset-[3px] hover:text-brand-strong"
        >
          <ChevronLeft aria-hidden="true" className="size-[18px]" />
          {tool.name}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h1 className="text-3xl">{capitalize(plural)}</h1>
          {result.state === "ok" ? (
            <form className="flex min-h-10 items-center gap-2 rounded-full border bg-background px-4 focus-within:border-primary" role="search">
              <Search aria-hidden="true" className="size-[18px] text-muted-foreground" />
              <input
                type="search"
                name="zoek"
                defaultValue={search ?? ""}
                placeholder="Zoek op naam"
                aria-label={`Zoek in de ${plural}`}
                className="w-56 bg-transparent py-2 outline-none placeholder:text-muted-foreground"
              />
            </form>
          ) : null}
        </div>
      </header>

      {result.state === "unconfigured" ? (
        <p className="border-y py-4 text-sm text-muted-foreground">Het beheer is voor deze tool nog niet gekoppeld.</p>
      ) : result.state === "failed" ? (
        <p className="border-y py-4 text-sm text-muted-foreground">De lijst kon niet worden opgehaald: {result.reason.charAt(0).toLowerCase() + result.reason.slice(1)}.</p>
      ) : accounts.length === 0 ? (
        <p className="border-y py-4 text-sm text-muted-foreground">{search ? `Geen ${plural} gevonden voor "${search}".` : `Er zijn nog geen ${plural}.`}</p>
      ) : (
        <section className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {search ? `${counted(accounts.length, tool.customer)} van ${result.accounts.length}` : counted(accounts.length, tool.customer)}
          </p>
          <ul className="flex flex-col border-b">
            {accounts.map((account) => {
              const state = accountState(account);
              return (
                <li key={account.ref} className="flex flex-wrap items-start justify-between gap-x-8 gap-y-2 border-t py-4">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate">{account.name || "Zonder naam"}</span>
                    <span className="inline-flex items-center gap-2.5 text-sm">
                      <ToneDot tone={state.tone} />
                      {state.label}
                    </span>
                    <span className="truncate font-mono text-[13px] text-muted-foreground">{account.ref}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 text-sm text-muted-foreground sm:items-end">
                    <span>
                      {counted(account.members, { singular: "lid", plural: "leden" })} · sinds {dayLabel(account.created_at)}
                    </span>
                    <span>{account.last_active_at ? `Laatst actief ${relativeMoment(new Date(account.last_active_at))}` : "Nog niet gebruikt"}</span>
                    {account.stripe_customer ? (
                      <a
                        href={stripeCustomerUrl(account.stripe_customer)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-primary underline decoration-brand/70 underline-offset-[3px] hover:text-brand-strong"
                      >
                        Klant in Stripe
                        <ExternalLink aria-hidden="true" className="size-[15px]" />
                      </a>
                    ) : null}
                  </div>
                  <AccountActions
                    toolId={tool.id}
                    accountRef={account.ref}
                    exempt={account.state === "exempt"}
                    subscribed={account.state === "subscription"}
                    hasStripeLink={Boolean(account.stripe_customer || account.status)}
                    trialDays={trialDays}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {log.length > 0 ? (
        <section className="flex flex-col gap-5">
          <h2 className="text-xl">Laatste handelingen</h2>
          <ul className="flex flex-col border-b">
            {log.map((entry, index) => (
              <li key={`${entry.accountRef}-${entry.performedAt.getTime()}-${index}`} className="flex flex-wrap justify-between gap-x-8 gap-y-1 border-t py-3.5">
                <span>
                  {ACTION_LABELS[entry.kind] ?? entry.kind}
                  {typeof entry.detail.until === "string" ? ` tot en met ${dayLabel(`${entry.detail.until}T12:00:00Z`)}` : ""}
                </span>
                <span className="text-sm text-muted-foreground">
                  <span className="font-mono text-[13px]">{entry.accountRef}</span> · {relativeMoment(entry.performedAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
