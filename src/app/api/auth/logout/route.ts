import { destroySession } from "@/server/auth/session";
import { apiError, apiOk, sameOrigin } from "@/server/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError(403, "Dit verzoek komt niet van het dashboard.");
  await destroySession();
  return apiOk({ ok: true });
}
