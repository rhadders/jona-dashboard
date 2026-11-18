import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SetupForm } from "@/components/auth/setup-form";
import { countPasskeys } from "@/server/auth/passkeys";
import { hasSession } from "@/server/auth/session";

export const metadata: Metadata = { title: "Eerste ingebruikname" };

export default async function SetupPage() {
  // Na de eerste passkey bestaat deze pagina niet meer: een nieuwe passkey voeg je toe op Instellingen.
  if ((await countPasskeys()) > 0) redirect((await hasSession()) ? "/instellingen" : "/login");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl">Eerste ingebruikname</h1>
        <p className="text-sm text-muted-foreground">Vul het setup-token uit de omgeving van de container in. Het werkt één keer.</p>
      </div>
      <SetupForm />
    </div>
  );
}
