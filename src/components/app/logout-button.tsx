"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.assign("/login");
  }

  return (
    <Button type="button" variant="ghost" size="icon" onClick={logout} disabled={busy} aria-label="Log uit">
      <LogOut aria-hidden="true" />
    </Button>
  );
}
