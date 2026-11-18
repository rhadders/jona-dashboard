import { startAuthentication, startRegistration } from "@simplewebauthn/browser";

/*
 * De twee passkey-stromen in de browser. Elke functie geeft `null` terug als
 * het gelukt is, en anders een Nederlandse melding voor op het scherm.
 */

async function post(path: string, body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: response.ok, data };
  } catch {
    return { ok: false, data: { error: "Het dashboard is niet bereikbaar. Probeer het opnieuw." } };
  }
}

const message = (data: Record<string, unknown>, fallback: string) => (typeof data.error === "string" ? data.error : fallback);

/** De gebruiker brak de vraag van de browser af of het apparaat weigerde. */
function browserError(error: unknown, fallback: string): string {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "AbortError") return "Je hebt de passkey-vraag afgebroken.";
  if (name === "InvalidStateError") return "Deze passkey is hier al vastgelegd.";
  if (name === "NotSupportedError" || name === "SecurityError") return "Deze browser of dit adres ondersteunt geen passkeys.";
  return fallback;
}

export async function loginWithPasskey(): Promise<string | null> {
  const options = await post("/api/auth/login/options", {});
  if (!options.ok) return message(options.data, "Inloggen is niet gelukt.");
  let response;
  try {
    response = await startAuthentication({ optionsJSON: options.data.options as Parameters<typeof startAuthentication>[0]["optionsJSON"] });
  } catch (error) {
    return browserError(error, "Inloggen is niet gelukt.");
  }
  const verified = await post("/api/auth/login/verify", { response });
  return verified.ok ? null : message(verified.data, "Inloggen is niet gelukt.");
}

export async function registerPasskey(input: { setupToken?: string; label: string }): Promise<string | null> {
  const options = await post("/api/auth/register/options", { setupToken: input.setupToken });
  if (!options.ok) return message(options.data, "De passkey kon niet worden aangemaakt.");
  let response;
  try {
    response = await startRegistration({ optionsJSON: options.data.options as Parameters<typeof startRegistration>[0]["optionsJSON"] });
  } catch (error) {
    return browserError(error, "De passkey kon niet worden aangemaakt.");
  }
  const verified = await post("/api/auth/register/verify", { setupToken: input.setupToken, label: input.label, response });
  return verified.ok ? null : message(verified.data, "De passkey kon niet worden vastgelegd.");
}
