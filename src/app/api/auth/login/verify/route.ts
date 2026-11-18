import { z } from "zod";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { verifyLogin } from "@/server/auth/passkeys";
import { createSession } from "@/server/auth/session";
import { apiError, apiOk, sameOrigin } from "@/server/http";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ response: z.object({ id: z.string().min(1) }).passthrough() });

export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError(403, "Dit verzoek komt niet van het dashboard.");
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return apiError(400, "Ongeldige invoer.");
  const verified = await verifyLogin(body.data.response as unknown as AuthenticationResponseJSON);
  if (!verified) return apiError(401, "Inloggen is niet gelukt. Probeer het opnieuw.");
  await createSession();
  return apiOk({ ok: true });
}
