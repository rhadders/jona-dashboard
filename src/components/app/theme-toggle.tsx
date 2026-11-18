"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

/** Wisselt tussen licht en donker. Zonder keuze volgt het dashboard het apparaat. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Tot de browser het thema kent, staat er een knop zonder richting: geen sprong na het laden.
  const dark = mounted && resolvedTheme === "dark";
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => setTheme(dark ? "light" : "dark")} aria-label={dark ? "Schakel naar licht" : "Schakel naar donker"}>
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      {dark ? "Licht" : "Donker"}
    </Button>
  );
}
