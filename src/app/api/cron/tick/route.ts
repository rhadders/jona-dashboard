import { cronSecret } from "@/server/env";
import { apiError, apiOk, bearerMatches } from "@/server/http";
import { runTick } from "@/server/jobs/tick";

export const dynamic = "force-dynamic";

/**
 * `POST /api/cron/tick`: elk uur aangeroepen door het schedule in Dokploy met
 * `Authorization: Bearer $CRON_SECRET`. Geen `GET`.
 */
export async function POST(request: Request) {
  const secret = cronSecret();
  if (!secret) return apiError(503, "De tik is niet ingesteld: CRON_SECRET ontbreekt.");
  if (!bearerMatches(request, secret)) return apiError(401, "Onbekend token.");
  return apiOk(await runTick());
}
