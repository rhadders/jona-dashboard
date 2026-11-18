import { removePasskey } from "@/server/auth/passkeys";
import { hasSession } from "@/server/auth/session";
import { apiError, apiOk, sameOrigin } from "@/server/http";

export const dynamic = "force-dynamic";

/** `DELETE /api/auth/passkeys/<id>`: verwijdert een passkey, behalve de laatste. */
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return apiError(403, "Dit verzoek komt niet van het dashboard.");
  if (!(await hasSession())) return apiError(401, "Log eerst in.");
  const { id } = await context.params;
  const outcome = await removePasskey(id);
  if (outcome === "last") return apiError(409, "Dit is je enige passkey. Voeg eerst een andere toe.");
  if (outcome === "missing") return apiError(404, "Deze passkey bestaat niet meer.");
  return apiOk({ ok: true });
}
