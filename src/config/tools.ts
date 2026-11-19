/*
 * De tools die het dashboard volgt. Een tool toevoegen is een item erbij plus
 * de vier omgevingsvariabelen met zijn `envKey` (zie `.env.example`):
 * STATS_URL_<KEY>, STATS_TOKEN_<KEY>, STRIPE_API_KEY_<KEY> en
 * STRIPE_WEBHOOK_SECRET_<KEY>. Geen andere code. Een tool met
 * `revenueFrom: "stats"` heeft de twee van Stripe niet nodig.
 */

export type ToolConfig = {
  /** Vaste sleutel in de database en in de URL; verandert nooit meer. */
  id: string;
  name: string;
  /** Achtervoegsel van de omgevingsvariabelen, in hoofdletters. */
  envKey: string;
  /** Hoe een klant van deze tool heet. */
  customer: { singular: string; plural: string };
  /** Wat "actief" bij deze tool betekent; staat bij het cijfer op de detailpagina. */
  activeMeans: string;
  /** Labels bij de vrije tellers uit het stats-adres. Een teller zonder label toont zijn sleutel. */
  counters: Record<string, string>;
  /**
   * Het btw-percentage dat uit de maandomzet gaat als Stripe de prijs als
   * inclusief btw kent maar er geen tarief aan het abonnement hangt. Hangt er
   * wel een tarief aan, dan geldt dat. Zie `src/lib/stripe/mrr.ts`.
   */
  inclusiveVatPercent?: number;
  /**
   * Een vast deel van de maandomzet dat naar een partner gaat. Het percentage
   * is de standaard; PARTNER_SHARE_PERCENT_<KEY> in de omgeving gaat ervoor.
   */
  partnerShare?: { label: string; percent: number };
  /**
   * Waar de omzet vandaan komt. Standaard Stripe (abonnementen, MRR). Met
   * "stats" levert de tool zijn betaalde omzet zelf aan in het stats-adres
   * (`revenue`): voor een tool die per keer verkoopt, of die zijn
   * Stripe-account met andere producten deelt. Zo'n tool telt niet mee in de
   * MRR en hoeft niet aan Stripe gekoppeld te zijn.
   */
  revenueFrom?: "stats";
};

export const TOOLS: readonly ToolConfig[] = [
  {
    id: "jona-bestuur",
    name: "Jona Bestuur",
    envKey: "BESTUUR",
    customer: { singular: "organisatie", plural: "organisaties" },
    activeMeans: "Een vergadering gemaakt of geopend",
    counters: {
      vergaderingen_gemaakt: "Vergaderingen gemaakt",
      vergaderingen_geopend: "Vergaderingen geopend",
    },
    inclusiveVatPercent: 21,
  },
  {
    id: "jona-giften",
    name: "Jona Giften",
    envKey: "GIFTEN",
    customer: { singular: "organisatie", plural: "organisaties" },
    activeMeans: "Een gift ingevoerd of geïmporteerd",
    counters: {
      giften_geregistreerd: "Geregistreerde giften",
      giftenoverzichten_verstuurd: "Giftenoverzichten verstuurd",
      incassobatches: "Incassobatches",
    },
    inclusiveVatPercent: 21,
  },
  {
    id: "selaread",
    name: "Selaread",
    envKey: "SELAREAD",
    customer: { singular: "abonnee", plural: "abonnees" },
    activeMeans: "Een nummer geopend",
    counters: {
      nummers_gelezen: "Gelezen nummers",
      vouchers_ingewisseld: "Ingewisselde vouchers",
    },
    partnerShare: { label: "Uitgeversaandeel", percent: 70 },
  },
  {
    id: "actuelegegevens",
    name: "Actuelegegevens.nl",
    envKey: "ACTUELEGEGEVENS",
    customer: { singular: "organisatie", plural: "organisaties" },
    activeMeans: "Een campagne verstuurd of een reactie ontvangen",
    counters: {
      campagnes_verstuurd: "Verstuurde campagnes",
      contacten_aangeschreven: "Aangeschreven contacten",
      gegevens_bevestigd: "Gegevens bevestigd of bijgewerkt",
    },
    revenueFrom: "stats",
  },
];

export function findTool(id: string): ToolConfig | undefined {
  return TOOLS.find((tool) => tool.id === id);
}
