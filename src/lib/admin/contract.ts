import { z } from "zod";

/*
 * Het beheercontract: wat een tool teruggeeft op `GET /api/internal/organisaties`.
 * Anders dan het stats-contract staat hier de naam van elk account in. Het
 * dashboard toont dit antwoord en bewaart het niet: er komt geen naam in de
 * database. Over de mensen achter een account staat er niets in, alleen hun
 * aantal. Onbekende velden worden genegeerd.
 */

const moment = z.string().datetime({ offset: true });

export const ACCOUNT_STATES = ["off", "exempt", "trial", "subscription", "expired"] as const;

export const accountSchema = z.object({
  ref: z.string().min(1).max(64),
  name: z.string().max(200),
  created_at: moment,
  members: z.number().int().nonnegative(),
  state: z.enum(ACCOUNT_STATES),
  plan: z.enum(["year", "month"]).nullable(),
  status: z.string().max(64).nullable(),
  trial_ends_at: moment.nullable(),
  renews_at: moment.nullable(),
  ends_at: moment.nullable(),
  stripe_customer: z
    .string()
    .regex(/^cus_[A-Za-z0-9]{8,80}$/)
    .nullable(),
  last_active_at: moment.nullable(),
});

export const accountsSchema = z.object({
  tool: z.string().min(1).max(64),
  generated_at: moment,
  accounts: z.array(accountSchema).max(5000),
});

export type AdminAccount = z.infer<typeof accountSchema>;

export type ParsedAccounts = { ok: true; accounts: AdminAccount[] } | { ok: false; error: string };

/** Leest een antwoord van een beheeradres; `expectedTool` is het id uit de configuratie. */
export function parseAccounts(json: unknown, expectedTool: string): ParsedAccounts {
  const result = accountsSchema.safeParse(json);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join(".") || "antwoord";
    return { ok: false, error: `Ongeldig veld: ${path}` };
  }
  if (result.data.tool !== expectedTool) {
    return { ok: false, error: `Antwoord is van "${result.data.tool}", verwacht "${expectedTool}"` };
  }
  return { ok: true, accounts: result.data.accounts };
}

/**
 * Het beheeradres van een tool: hetzelfde adres als het stats-adres, met een
 * ander pad. Zo is er per tool geen extra adres in te stellen.
 */
export function adminUrl(statsUrl: string): string | null {
  try {
    const url = new URL(statsUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return new URL("/api/internal/organisaties", url.origin).toString();
  } catch {
    return null;
  }
}

/** De pagina van een klant in het Stripe-dashboard. */
export function stripeCustomerUrl(customer: string): string {
  return `https://dashboard.stripe.com/customers/${encodeURIComponent(customer)}`;
}

const day = (iso: string) => new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Amsterdam" }).format(new Date(iso));

/** De dag van een moment, in gewone woorden: "27 november 2026". */
export const dayLabel = day;

export type StateTone = "good" | "attention" | "neutral";

/** De stand van een account in één regel, met de datum die er dan toe doet. */
export function accountState(account: AdminAccount): { label: string; tone: StateTone } {
  switch (account.state) {
    case "off":
      return { label: "Abonnementen staan uit", tone: "neutral" };
    case "exempt":
      return { label: "Vrijgesteld", tone: "neutral" };
    case "trial":
      return { label: account.trial_ends_at ? `Proef tot ${day(account.trial_ends_at)}` : "Proef", tone: "neutral" };
    case "expired":
      return { label: account.status ? "Abonnement gestopt" : account.trial_ends_at ? `Proef voorbij sinds ${day(account.trial_ends_at)}` : "Proef voorbij", tone: "attention" };
    case "subscription": {
      const plan = account.plan === "year" ? "per jaar" : account.plan === "month" ? "per maand" : "";
      const base = `Abonnement ${plan}`.trim();
      if (account.status === "past_due") return { label: `${base}, betaling mislukt`, tone: "attention" };
      if (account.ends_at) return { label: `${base}, stopt op ${day(account.ends_at)}`, tone: "attention" };
      if (account.status === "trialing" && account.trial_ends_at) return { label: `${base}, eerste betaling op ${day(account.trial_ends_at)}`, tone: "good" };
      if (account.renews_at) return { label: `${base}, verlengt op ${day(account.renews_at)}`, tone: "good" };
      return { label: base, tone: "good" };
    }
  }
}

/** Zoekt op naam of op de interne verwijzing, zonder op hoofdletters te letten. */
export function filterAccounts(accounts: readonly AdminAccount[], search: string | undefined): AdminAccount[] {
  const needle = (search ?? "").trim().toLowerCase();
  if (!needle) return [...accounts];
  return accounts.filter((account) => account.name.toLowerCase().includes(needle) || account.ref.toLowerCase().includes(needle));
}
