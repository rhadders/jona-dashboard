import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query, queryOne } from "../db";

/*
 * Sessies: een willekeurig token in een httpOnly-cookie, waarvan alleen de
 * hash in de database staat. Er is één account, dus een geldige sessie is
 * genoeg; er hangt geen gebruiker aan.
 */

export const SESSION_COOKIE = "jd_session";
const SESSION_DAYS = 30;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await query("insert into sessions (token_hash, expires_at) values ($1, $2)", [hash(token), expires]);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

/** Of dit verzoek een geldige sessie heeft. Eén keer per verzoek opgezocht. */
export const hasSession = cache(async (): Promise<boolean> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const row = await queryOne("select 1 from sessions where token_hash = $1 and expires_at > now()", [hash(token)]);
  return row !== null;
});

/** Voor pagina's: zonder sessie naar de inlogpagina. */
export async function requireSession(): Promise<void> {
  if (!(await hasSession())) redirect("/login");
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await query("delete from sessions where token_hash = $1", [hash(token)]);
  store.delete(SESSION_COOKIE);
}
