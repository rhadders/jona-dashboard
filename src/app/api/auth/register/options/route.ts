import { z } from "zod";
import { mayRegisterPasskey } from "@/server/auth/guard";
import { registrationOptions } from "@/server/auth/passkeys";
import { apiError, apiOk, sameOrigin } from "@/server/http";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ setupToken: z.string().max(200).optional() });

export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError(403, "Dit verzoek komt niet van het dashboard.");
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return apiError(400, "Ongeldige invoer.");
  if (!(await mayRegisterPasskey(body.data.setupToken))) return apiError(403, "Het setup-token klopt niet, of er bestaat al een passkey.");
  return apiOk({ options: await registrationOptions() });
}
