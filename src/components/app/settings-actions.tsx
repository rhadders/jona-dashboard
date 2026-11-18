"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { registerPasskey } from "@/components/auth/passkey-client";

/** "Nu ophalen": draait de tik meteen, met de volledige controle van Stripe. */
export function RunNowButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setNote(null);
    try {
      const response = await fetch("/api/jobs/run", { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; skipped?: string; error?: string };
      if (!response.ok) setNote(data.error ?? "Ophalen is niet gelukt.");
      else if (data.skipped) setNote("Er loopt al een ophaalronde.");
      else setNote(data.ok ? "Opgehaald." : "Opgehaald, maar niet alles lukte. Zie de koppelingen hieronder.");
    } catch {
      setNote("Het dashboard is niet bereikbaar.");
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="outline" onClick={run} disabled={busy}>
        <RefreshCw aria-hidden="true" className={busy ? "animate-spin" : undefined} />
        {busy ? "Bezig met ophalen" : "Haal nu op"}
      </Button>
      {note ? (
        <span role="status" className="text-sm text-muted-foreground">
          {note}
        </span>
      ) : null}
    </div>
  );
}

export function AddPasskeyForm() {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const problem = await registerPasskey({ label: label.trim() || "Passkey" });
    setBusy(false);
    if (problem) {
      setError(problem);
      return;
    }
    setLabel("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-passkey-label" className="text-sm font-medium">
            Naam van het apparaat
          </label>
          <input
            id="new-passkey-label"
            type="text"
            autoComplete="off"
            maxLength={60}
            placeholder="iPhone"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className="h-10 w-56 rounded-md border border-input bg-transparent px-3 text-base focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
          />
        </div>
        <Button type="submit" variant="outline" disabled={busy}>
          <KeyRound aria-hidden="true" />
          {busy ? "Wacht op je passkey" : "Voeg een passkey toe"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive-strong">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export function RemovePasskeyButton({ credentialId, label }: { credentialId: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/auth/passkeys/${encodeURIComponent(credentialId)}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      const data = (await response?.json().catch(() => ({}))) as { error?: string } | undefined;
      setError(data?.error ?? "Verwijderen is niet gelukt.");
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-3">
      {error ? (
        <span role="alert" className="text-sm text-destructive-strong">
          {error}
        </span>
      ) : null}
      <Button type="button" variant="ghost" size="icon" onClick={remove} disabled={busy} aria-label={`Verwijder passkey ${label}`}>
        <Trash2 aria-hidden="true" />
      </Button>
    </span>
  );
}
