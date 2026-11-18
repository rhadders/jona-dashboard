"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loginWithPasskey } from "./passkey-client";

export function LoginForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login() {
    setBusy(true);
    setError(null);
    const problem = await loginWithPasskey();
    if (problem) {
      setError(problem);
      setBusy(false);
      return;
    }
    window.location.assign("/");
  }

  return (
    <div className="flex flex-col gap-4">
      <Button type="button" size="lg" onClick={login} disabled={busy}>
        <KeyRound aria-hidden="true" />
        {busy ? "Wacht op je passkey" : "Log in met je passkey"}
      </Button>
      {error ? (
        <p role="alert" className="rounded-lg bg-destructive-soft px-4 py-3 text-sm text-destructive-strong">
          {error}
        </p>
      ) : null}
    </div>
  );
}
