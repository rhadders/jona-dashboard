import { hasSession } from "@/server/auth/session";
import { apiError, apiOk, sameOrigin } from "@/server/http";
import { runTick } from "@/server/jobs/tick";

export const dynamic = "force-dynamic";

/** `POST /api/jobs/run`: "Nu ophalen" op Instellingen. Draait de tik meteen, met de volledige Stripe-controle. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError(403, "Dit verzoek komt niet van het dashboard.");
  if (!(await hasSession())) return apiError(401, "Log eerst in.");
  return apiOk(await runTick({ force: true }));
}
