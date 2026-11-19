import { describe, expect, it } from "vitest";
import { accountState, adminUrl, filterAccounts, parseAccounts, stripeCustomerUrl, type AdminAccount } from "./contract";

const account = (over: Partial<AdminAccount> = {}): AdminAccount => ({
  ref: "org_1",
  name: "Stichting De Brug",
  created_at: "2026-11-13T09:00:00.000Z",
  members: 4,
  state: "trial",
  plan: null,
  status: null,
  trial_ends_at: "2026-11-27T09:00:00.000Z",
  renews_at: null,
  ends_at: null,
  stripe_customer: null,
  last_active_at: null,
  ...over,
});

const body = (accounts: unknown[], tool = "jona-bestuur") => ({ tool, generated_at: "2026-11-20T08:00:00.000Z", accounts });

describe("het beheercontract", () => {
  it("leest een geldig antwoord en negeert onbekende velden", () => {
    const parsed = parseAccounts(body([{ ...account(), toekomstig_veld: 1 }]), "jona-bestuur");
    expect(parsed.ok && parsed.accounts).toEqual([account()]);
  });

  it("weigert een antwoord van een andere tool", () => {
    expect(parseAccounts(body([account()], "jona-giften"), "jona-bestuur")).toEqual({ ok: false, error: 'Antwoord is van "jona-giften", verwacht "jona-bestuur"' });
  });

  it("noemt het veld dat niet klopt", () => {
    expect(parseAccounts(body([{ ...account(), members: -1 }]), "jona-bestuur")).toEqual({ ok: false, error: "Ongeldig veld: accounts.0.members" });
    expect(parseAccounts(body([{ ...account(), state: "iets" }]), "jona-bestuur")).toMatchObject({ ok: false });
    expect(parseAccounts(body([{ ...account(), stripe_customer: "geen klant-id" }]), "jona-bestuur")).toMatchObject({ ok: false });
    expect(parseAccounts(null, "jona-bestuur")).toEqual({ ok: false, error: "Ongeldig veld: antwoord" });
  });
});

describe("het beheeradres", () => {
  it("staat naast het stats-adres", () => {
    expect(adminUrl("https://jonabestuur.nl/api/internal/stats")).toBe("https://jonabestuur.nl/api/internal/organisaties");
    expect(adminUrl("https://giften.example.org:8443/api/internal/stats?x=1")).toBe("https://giften.example.org:8443/api/internal/organisaties");
  });

  it("is er niet bij een adres dat geen webadres is", () => {
    expect(adminUrl("geen adres")).toBeNull();
    expect(adminUrl("file:///etc/passwd")).toBeNull();
  });

  it("verwijst naar de klant in Stripe", () => {
    expect(stripeCustomerUrl("cus_abc12345")).toBe("https://dashboard.stripe.com/customers/cus_abc12345");
  });
});

describe("de stand van een account", () => {
  it("noemt bij een proef tot wanneer", () => {
    expect(accountState(account())).toEqual({ label: "Proef tot 27 november 2026", tone: "neutral" });
  });

  it("vraagt aandacht bij een verlopen proef en een gestopt abonnement", () => {
    expect(accountState(account({ state: "expired" }))).toEqual({ label: "Proef voorbij sinds 27 november 2026", tone: "attention" });
    expect(accountState(account({ state: "expired", status: "canceled", plan: "month" }))).toEqual({ label: "Abonnement gestopt", tone: "attention" });
  });

  it("beschrijft een abonnement met het plan en de datum die ertoe doet", () => {
    const sub = { state: "subscription", plan: "year", status: "active" } as const;
    expect(accountState(account({ ...sub, renews_at: "2027-11-20T09:00:00.000Z" }))).toEqual({ label: "Abonnement per jaar, verlengt op 20 november 2027", tone: "good" });
    expect(accountState(account({ ...sub, ends_at: "2027-01-05T09:00:00.000Z" }))).toEqual({ label: "Abonnement per jaar, stopt op 5 januari 2027", tone: "attention" });
    expect(accountState(account({ ...sub, plan: "month", status: "past_due" }))).toEqual({ label: "Abonnement per maand, betaling mislukt", tone: "attention" });
    expect(accountState(account({ ...sub, status: "trialing" }))).toEqual({ label: "Abonnement per jaar, eerste betaling op 27 november 2026", tone: "good" });
  });

  it("kent vrijgesteld en abonnementen uit", () => {
    expect(accountState(account({ state: "exempt" })).label).toBe("Vrijgesteld");
    expect(accountState(account({ state: "off" })).label).toBe("Abonnementen staan uit");
  });
});

describe("zoeken", () => {
  const accounts = [account(), account({ ref: "org_2", name: "Hervormde Gemeente Woudenberg" })];

  it("zoekt op naam en op verwijzing, zonder op hoofdletters te letten", () => {
    expect(filterAccounts(accounts, "woudenberg").map((a) => a.ref)).toEqual(["org_2"]);
    expect(filterAccounts(accounts, "ORG_1").map((a) => a.ref)).toEqual(["org_1"]);
    expect(filterAccounts(accounts, "bestaat niet")).toEqual([]);
  });

  it("geeft alles zonder zoekterm", () => {
    expect(filterAccounts(accounts, "  ")).toHaveLength(2);
    expect(filterAccounts(accounts, undefined)).toHaveLength(2);
  });
});
