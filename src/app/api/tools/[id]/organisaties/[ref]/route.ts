import { findTool } from "@/config/tools";
import { accountRefSchema, adminActionSchema } from "@/lib/admin/actions";
import { runAdminAction } from "@/server/admin/actions";
import { hasSession } from "@/server/auth/session";
import { apiError, apiOk, sameOrigin } from "@/server/http";

export const dynamic = "force-dynamic";

/**
 * `POST /api/tools/<tool>/organisaties/<ref>`: één handeling van de
 * platformbeheerder op een account (vrijstellen, proef verlengen of de
 * Stripe-koppeling wissen). Het dashboard geeft haar door aan de tool.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string; ref: string }> }) {
  if (!sameOrigin(request)) return apiError(403, "Dit verzoek komt niet van het dashboard.");
  if (!(await hasSession())) return apiError(401, "Log eerst in.");

  const { id, ref } = await context.params;
  const tool = findTool(id);
  if (!tool) return apiError(404, "Onbekende tool.");
  if (!accountRefSchema.safeParse(ref).success) return apiError(404, "Onbekend account.");

  const action = adminActionSchema.safeParse(await request.json().catch(() => null));
  if (!action.success) return apiError(400, "Deze handeling bestaat niet of mist een gegeven.");

  const result = await runAdminAction(tool, ref, action.data);
  if (!result.ok) return apiError(result.status, result.reason);
  return apiOk({ account: result.account });
}
