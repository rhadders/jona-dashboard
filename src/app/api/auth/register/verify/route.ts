import { z } from "zod";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { mayRegisterPasskey } from "@/server/auth/guard";
import { verifyRegistration } from "@/server/auth/passkeys";
import { createSession, hasSession } from "@/server/auth/session";
import { apiError, apiOk, sameOrigin } from "@/server/http";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  setupToken: z.string().max(200).optional(),
  label: z.string().trim().min(1).max(60).default("Passkey"),
  response: z.object({ id: z.string().min(1) }).passthrough(),
});

export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError(403, "Dit verzoek komt niet van het dashboard.");
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return apiError(400, "Ongeldige invoer.");
  if (!(await mayRegisterPasskey(body.data.setupToken))) return apiError(403, "Het setup-token klopt niet, of er bestaat al een passkey.");

  const verified = await verifyRegistration(body.data.response as unknown as RegistrationResponseJSON, body.data.label);
  if (!verified) return apiError(400, "De passkey kon niet worden vastgelegd. Probeer het opnieuw.");
  if (!(await hasSession())) await createSession();
  return apiOk({ ok: true });
}
