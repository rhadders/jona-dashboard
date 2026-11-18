import Stripe from "stripe";
import type { ToolConfig } from "@/config/tools";
import { toolEnv } from "../env";

/** De Stripe-client van één tool (elk heeft een eigen account), of `null` als de sleutel ontbreekt. */
export function stripeFor(tool: ToolConfig): Stripe | null {
  const key = toolEnv(tool).stripeApiKey;
  if (!key) return null;
  return new Stripe(key, { maxNetworkRetries: 2, timeout: 20_000 });
}
