import type { Metadata } from "next";
import { AddPasskeyForm, RemovePasskeyButton, RunNowButton } from "@/components/app/settings-actions";
import { StatusLine } from "@/components/app/status";
import { relativeMoment } from "@/lib/format";
import type { IntegrationState, Tone } from "@/lib/status/tool-status";
import { listPasskeys } from "@/server/auth/passkeys";
import { appUrl, toolEnv } from "@/server/env";
import { getLastTick, getOverview } from "@/server/queries";

export const metadata: Metadata = { title: "Instellingen" };

function describe(state: IntegrationState & { checkedAt: Date | null }): { tone: Tone; label: string } {
  if (!state.configured) return { tone: "neutral", label: "Niet gekoppeld" };
  if (state.ok === null) return { tone: "neutral", label: "Wacht op de eerste ronde" };
  const when = state.checkedAt ? `, ${relativeMoment(state.checkedAt)}` : "";
  return state.ok ? { tone: "good", label: `In orde${when}` } : { tone: "attention", label: `${state.message ?? "Mislukt"}${when}` };
}

export default async function SettingsPage() {
  const [overview, lastTick, passkeys] = await Promise.all([getOverview(30), getLastTick(), listPasskeys()]);
  const base = appUrl();

  return (
    <div className="flex flex-col gap-14">
      <header className="flex flex-col gap-1.5">
        <span className="eyebrow">Jona dashboard</span>
        <h1 className="text-3xl">Instellingen</h1>
      </header>

      <section className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl">Koppelingen</h2>
            <p className="text-sm text-muted-foreground">
              {lastTick ? `Laatste ophaalronde: ${relativeMoment(lastTick.startedAt)}${lastTick.ok ? "" : ", niet alles lukte"}.` : "Er is nog geen ophaalronde geweest."}
            </p>
          </div>
          <RunNowButton />
        </div>

        <div className="flex flex-col border-b">
          {overview.tools.map((figures) => {
            const env = toolEnv(figures.tool);
            const stats = describe(figures.statsState);
            const stripe = describe(figures.stripeState);
            const showStripe = figures.tool.revenueFrom !== "stats" || figures.stripeState.configured;
            return (
              <div key={figures.tool.id} className="flex flex-col gap-4 border-t py-6">
                <h3 className="font-sans text-lg font-medium text-foreground">{figures.tool.name}</h3>
                <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-x-10 gap-y-4">
                  <div className="flex flex-col gap-1">
                    <dt className="text-sm text-muted-foreground">Stats-adres</dt>
                    <dd>
                      <StatusLine tone={stats.tone} label={stats.label} />
                    </dd>
                  </div>
                  {showStripe ? (
                    <>
                      <div className="flex flex-col gap-1">
                        <dt className="text-sm text-muted-foreground">Stripe</dt>
                        <dd>
                          <StatusLine tone={stripe.tone} label={stripe.label} />
                        </dd>
                      </div>
                      <div className="flex flex-col gap-1">
                        <dt className="text-sm text-muted-foreground">Webhook van Stripe</dt>
                        <dd>
                          <StatusLine tone={env.stripeWebhookSecret ? "good" : "neutral"} label={env.stripeWebhookSecret ? "Geheim ingesteld" : "Geheim ontbreekt"} />
                        </dd>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <dt className="text-sm text-muted-foreground">Omzet</dt>
                      <dd>
                        <StatusLine tone={figures.revenue ? "good" : "neutral"} label={figures.revenue ? "Komt uit het stats-adres" : "Het stats-adres levert nog geen omzet aan"} />
                      </dd>
                    </div>
                  )}
                </dl>
                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                  {showStripe ? (
                    <p>
                      Webhook-adres voor Stripe:{" "}
                      <code className="break-words font-mono text-xs text-foreground">
                        {base}/api/webhooks/stripe/{figures.tool.id}
                      </code>
                    </p>
                  ) : null}
                  <p>
                    Omgevingsvariabelen: <code className="font-mono text-xs">STATS_URL_{figures.tool.envKey}</code>,{" "}
                    <code className="font-mono text-xs">STATS_TOKEN_{figures.tool.envKey}</code>
                    {showStripe ? (
                      <>
                        , <code className="font-mono text-xs">STRIPE_API_KEY_{figures.tool.envKey}</code>,{" "}
                        <code className="font-mono text-xs">STRIPE_WEBHOOK_SECRET_{figures.tool.envKey}</code>
                      </>
                    ) : null}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-xl">Passkeys</h2>
        <ul className="flex flex-col border-b">
          {passkeys.map((passkey) => (
            <li key={passkey.credentialId} className="flex flex-wrap items-center justify-between gap-3 border-t py-3">
              <span className="flex flex-col">
                <span>{passkey.label}</span>
                <span className="text-sm text-muted-foreground">
                  Aangemaakt {relativeMoment(passkey.createdAt)}
                  {passkey.lastUsedAt ? `, laatst gebruikt ${relativeMoment(passkey.lastUsedAt)}` : ""}
                </span>
              </span>
              <RemovePasskeyButton credentialId={passkey.credentialId} label={passkey.label} />
            </li>
          ))}
        </ul>
        <AddPasskeyForm />
      </section>
    </div>
  );
}
