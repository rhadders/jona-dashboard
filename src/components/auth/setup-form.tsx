"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { registerPasskey } from "./passkey-client";

/** De eerste passkey: het setup-token uit de omgeving van de container plus een naam voor dit apparaat. */
export function SetupForm() {
  const [setupToken, setSetupToken] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const problem = await registerPasskey({ setupToken: setupToken.trim(), label: label.trim() || "Passkey" });
    if (problem) {
      setError(problem);
      setBusy(false);
      return;
    }
    window.location.assign("/");
  }

  const field = "h-11 rounded-md border border-input bg-transparent px-3 text-base focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35";

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="setup-token" className="text-sm font-medium">
          Setup-token
        </label>
        <input id="setup-token" type="password" autoComplete="off" required value={setupToken} onChange={(event) => setSetupToken(event.target.value)} className={field} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="passkey-label" className="text-sm font-medium">
          Naam van dit apparaat
        </label>
        <input id="passkey-label" type="text" autoComplete="off" maxLength={60} placeholder="MacBook" value={label} onChange={(event) => setLabel(event.target.value)} className={field} />
      </div>
      <Button type="submit" size="lg" disabled={busy || setupToken.trim() === ""}>
        <KeyRound aria-hidden="true" />
        {busy ? "Wacht op je passkey" : "Maak je passkey aan"}
      </Button>
      {error ? (
        <p role="alert" className="rounded-lg bg-destructive-soft px-4 py-3 text-sm text-destructive-strong">
          {error}
        </p>
      ) : null}
    </form>
  );
}
