/*
 * Opmaak in nl-NL. Componenten maken zelf geen bedragen, percentages of
 * datums op: ze roepen deze functies aan.
 */

const TIME_ZONE = "Europe/Amsterdam";

const euroFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const numberFormat = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });

/** Een bedrag in hele euro's: 306000 centen wordt "€ 3.060". */
export function euro(cents: number): string {
  return euroFormat.format(Math.round(cents / 100));
}

export function number(value: number): string {
  return numberFormat.format(value);
}

/** Een aandeel als heel percentage, of `null` als het geheel nul is. */
export function percent(part: number, whole: number): number | null {
  if (whole === 0) return null;
  return Math.round((part / whole) * 100);
}

/** "24 van 29 · 83%": het aantal en het percentage samen. */
export function share(part: number, whole: number): string {
  const pct = percent(part, whole);
  return pct === null ? number(part) : `${number(part)} van ${number(whole)} · ${pct}%`;
}

/** Een verschil in geld: "€ 240 erbij", "€ 30 eraf" of "gelijk". */
export function euroChange(cents: number): string {
  if (Math.round(cents / 100) === 0) return "gelijk";
  return cents > 0 ? `${euro(cents)} erbij` : `${euro(-cents)} eraf`;
}

/** De kalenderdag in Nederland als `YYYY-MM-DD`. */
export function amsterdamDay(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Een dag (`YYYY-MM-DD`) een aantal dagen terug of vooruit. */
export function shiftDay(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** "nov 2026" voor de assen van een grafiek. */
export function monthLabel(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("nl-NL", { month: "short", year: "numeric", timeZone: "UTC" }).replace(".", "");
}

/** "18 nov 20:02": een moment, kort. */
export function momentLabel(date: Date): string {
  return date
    .toLocaleString("nl-NL", { timeZone: TIME_ZONE, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    .replace(".", "")
    .replace(",", "");
}

/** "vandaag 20:02", "gisteren 18:47" of "16 nov 09:05". */
export function relativeMoment(date: Date, now: Date = new Date()): string {
  const day = amsterdamDay(date);
  const today = amsterdamDay(now);
  const time = date.toLocaleTimeString("nl-NL", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });
  if (day === today) return `vandaag ${time}`;
  if (day === shiftDay(today, -1)) return `gisteren ${time}`;
  return momentLabel(date);
}

/** "1 organisatie", "29 organisaties": het aantal met het juiste woord. */
export function counted(value: number, words: { singular: string; plural: string }): string {
  return `${number(value)} ${value === 1 ? words.singular : words.plural}`;
}
