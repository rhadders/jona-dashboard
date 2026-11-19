/*
 * Waarom het stats-adres van een tool niet antwoordde, in gewone woorden. De
 * tekst staat op Instellingen bij de koppeling.
 */

/** De melding bij een antwoord dat geen 2xx is. */
export function statsFailureReason(status: number): string {
  if (status === 401 || status === 403) return "Het token wordt geweigerd";
  // Een tool mag het adres verbergen voor wie het token niet kent: zonder geheim
  // of met een verkeerd token is het antwoord dan 404, net als bij een tikfout in het adres.
  if (status === 404) return "Het adres bestaat niet of het token klopt niet";
  return `Het adres antwoordt met ${status}`;
}
