import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { appUrl } from "./env";

/** Een foutantwoord met een Nederlandse tekst; nooit een ruwe foutmelding van een dienst. */
export function apiError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export function apiOk<T extends object>(body: T) {
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}

/** Vergelijkt twee geheimen in constante tijd. */
export function secretsMatch(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** `Authorization: Bearer <geheim>` klopt met het verwachte geheim. */
export function bearerMatches(request: Request, expected: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return false;
  return secretsMatch(header.slice(7).trim(), expected);
}

/**
 * Een mutatie uit de browser moet van het dashboard zelf komen. De browser
 * stuurt bij een POST altijd `Origin`; ontbreekt hij of wijst hij ergens anders
 * naar, dan weigert de route.
 */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(appUrl()).origin;
  } catch {
    return false;
  }
}
