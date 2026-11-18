import Link from "next/link";
import { Settings } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "./logout-button";
import { ThemeToggle } from "./theme-toggle";

/** De enige vaste balk: het merk links, thema, instellingen en uitloggen rechts. */
export function TopBar() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center justify-between gap-4 px-5 md:px-8">
        <Link href="/" className="rounded-full" aria-label="Naar het overzicht">
          <Logo variant="mark" className="h-7 sm:hidden" />
          <Logo variant="full" markClassName="h-7" className="max-sm:hidden" />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="icon">
            <Link href="/instellingen" aria-label="Instellingen">
              <Settings aria-hidden="true" />
            </Link>
          </Button>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
