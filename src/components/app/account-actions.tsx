"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { AdminAction } from "@/lib/admin/actions";

type Props = {
  toolId: string;
  accountRef: string;
  exempt: boolean;
  /** Er loopt een abonnement: de proef verlengen en de koppeling wissen kunnen dan niet. */
  subscribed: boolean;
  hasStripeLink: boolean;
  trialDays: { min: string; max: string };
};

type Pending = { action: AdminAction; question: string } | null;

/**
 * De handelingen bij één account: vrijstellen, de proef verlengen en de
 * Stripe-koppeling wissen. Elke handeling vraagt eerst om een bevestiging.
 */
export function AccountActions({ toolId, accountRef, exempt, subscribed, hasStripeLink, trialDays }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [until, setUntil] = useState("");
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function confirm() {
    if (!pending) return;
    setBusy(true);
    setNote(null);
    try {
      const response = await fetch(`/api/tools/${encodeURIComponent(toolId)}/organisaties/${encodeURIComponent(accountRef)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pending.action),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setNote(response.ok ? "Gedaan." : (data.error ?? "Dat is niet gelukt."));
      if (response.ok) setUntil("");
    } catch {
      setNote("Het dashboard is niet bereikbaar.");
    }
    setBusy(false);
    setPending(null);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" variant="link" size="sm" className="h-auto self-start px-0 sm:self-end" onClick={() => setOpen(true)}>
        Beheer
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3 border-t pt-3 text-sm">
      {pending ? (
        <div className="flex flex-wrap items-center gap-3">
          <span>{pending.question}</span>
          <Button type="button" size="sm" onClick={confirm} disabled={busy}>
            {busy ? "Bezig" : "Bevestig"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setPending(null)} disabled={busy}>
            Annuleer
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setPending({
                action: { action: "exemption", exempt: !exempt },
                question: exempt ? "De vrijstelling opheffen? De gewone proef of het abonnement geldt dan weer." : "Dit account vrijstellen van het abonnement?",
              })
            }
          >
            {exempt ? "Hef vrijstelling op" : "Stel vrij"}
          </Button>

          {!subscribed ? (
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">Proef tot en met</span>
                <input
                  type="date"
                  value={until}
                  min={trialDays.min}
                  max={trialDays.max}
                  onChange={(event) => setUntil(event.target.value)}
                  className="h-8 rounded-full border bg-background px-3 outline-none focus:border-primary pointer-coarse:h-10"
                />
              </label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!until}
                onClick={() => setPending({ action: { action: "trial", until }, question: "De proef verlengen tot en met deze dag?" })}
              >
                Verleng proef
              </Button>
            </div>
          ) : null}

          {hasStripeLink && !subscribed ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setPending({
                  action: { action: "stripe_link" },
                  question: "De koppeling met Stripe wissen? De klant en het oude abonnement staan daarna niet meer bij dit account.",
                })
              }
            >
              Wis Stripe-koppeling
            </Button>
          ) : null}

          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Sluit
          </Button>
        </div>
      )}
      {note ? (
        <span role="status" className="text-muted-foreground">
          {note}
        </span>
      ) : null}
    </div>
  );
}
