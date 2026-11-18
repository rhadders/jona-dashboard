import { findTool } from "@/config/tools";
import { toolEnv } from "@/server/env";
import { apiError, apiOk } from "@/server/http";
import { stripeFor } from "@/server/stripe/client";
import { handleStripeEvent } from "@/server/stripe/events";

export const dynamic = "force-dynamic";

/**
 * `POST /api/webhooks/stripe/<tool>`: het webhook-adres van één Stripe-account.
 * Het bericht telt alleen als de handtekening klopt met het geheim van die
 * tool; de ruwe tekst wordt daarvoor ongewijzigd doorgegeven.
 */
export async function POST(request: Request, context: { params: Promise<{ tool: string }> }) {
  const { tool: toolId } = await context.params;
  const tool = findTool(toolId);
  if (!tool) return apiError(404, "Onbekende tool.");

  const stripe = stripeFor(tool);
  const secret = toolEnv(tool).stripeWebhookSecret;
  if (!stripe || !secret) return apiError(503, "Stripe is voor deze tool niet ingesteld.");

  const signature = request.headers.get("stripe-signature");
  if (!signature) return apiError(400, "De handtekening ontbreekt.");

  const payload = await request.text();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, secret);
  } catch {
    return apiError(400, "De handtekening klopt niet.");
  }

  const outcome = await handleStripeEvent(tool.id, event);
  return apiOk({ received: true, outcome });
}
