/* De periode waarover het overzicht vergelijkt: 7 dagen, 30 dagen of 12 maanden. */

export type Period = 7 | 30 | 365;

export const PERIODS: readonly { days: Period; label: string }[] = [
  { days: 7, label: "7 dagen" },
  { days: 30, label: "30 dagen" },
  { days: 365, label: "12 maanden" },
];

/** Leest `?periode=` uit de URL; alles wat niet klopt wordt 30 dagen. */
export function parsePeriod(value: string | string[] | undefined): Period {
  const text = Array.isArray(value) ? value[0] : value;
  if (text === "7") return 7;
  if (text === "365") return 365;
  return 30;
}

/** "vorige week", "vorige maand" of "een jaar geleden": waar het verschil tegen afzet. */
export function periodReference(period: Period): string {
  if (period === 7) return "een week geleden";
  if (period === 365) return "een jaar geleden";
  return "een maand geleden";
}
