import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { countPasskeys } from "@/server/auth/passkeys";
import { hasSession } from "@/server/auth/session";

export const metadata: Metadata = { title: "Inloggen" };

export default async function LoginPage() {
  if (await hasSession()) redirect("/");
  // Nog geen enkele passkey: dan is dit de eerste ingebruikname.
  if ((await countPasskeys()) === 0) redirect("/setup");
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl">Inloggen</h1>
      <LoginForm />
    </div>
  );
}
