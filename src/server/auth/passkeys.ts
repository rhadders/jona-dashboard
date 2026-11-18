import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { query, queryOne } from "../db";
import { appUrl } from "../env";

/*
 * Inloggen met een passkey (WebAuthn). Er is één account: elke geregistreerde
 * passkey geeft toegang. De eerste passkey vraagt het eenmalige SETUP_TOKEN;
 * daarna kan alleen iemand die al is ingelogd er een toevoegen.
 */

const CHALLENGE_COOKIE = "jd_challenge";
const CHALLENGE_MINUTES = 5;

function relyingParty() {
  const url = new URL(appUrl());
  return { id: url.hostname, origin: url.origin, name: "Jona Dashboard" };
}

export type PasskeySummary = { credentialId: string; label: string; createdAt: Date; lastUsedAt: Date | null };

export async function listPasskeys(): Promise<PasskeySummary[]> {
  const rows = await query<{ credential_id: string; label: string; created_at: Date; last_used_at: Date | null }>(
    "select credential_id, label, created_at, last_used_at from passkeys order by created_at"
  );
  return rows.map((row) => ({ credentialId: row.credential_id, label: row.label, createdAt: row.created_at, lastUsedAt: row.last_used_at }));
}

export async function countPasskeys(): Promise<number> {
  const row = await queryOne<{ count: string }>("select count(*) as count from passkeys");
  return Number(row?.count ?? 0);
}

async function rememberChallenge(challenge: string, purpose: "register" | "login"): Promise<void> {
  const id = randomUUID();
  const expires = new Date(Date.now() + CHALLENGE_MINUTES * 60 * 1000);
  await query("insert into webauthn_challenges (id, challenge, purpose, expires_at) values ($1, $2, $3, $4)", [id, challenge, purpose, expires]);
  (await cookies()).set(CHALLENGE_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
    expires,
  });
}

/** Haalt de uitdaging van dit verzoek op en verbruikt hem: hij geldt één keer. */
async function takeChallenge(purpose: "register" | "login"): Promise<string | null> {
  const store = await cookies();
  const id = store.get(CHALLENGE_COOKIE)?.value;
  store.delete({ name: CHALLENGE_COOKIE, path: "/api/auth" });
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const row = await queryOne<{ challenge: string }>(
    "delete from webauthn_challenges where id = $1 and purpose = $2 and expires_at > now() returning challenge",
    [id, purpose]
  );
  return row?.challenge ?? null;
}

export async function registrationOptions() {
  const rp = relyingParty();
  const existing = await query<{ credential_id: string; transports: string[] }>("select credential_id, transports from passkeys");
  const options = await generateRegistrationOptions({
    rpName: rp.name,
    rpID: rp.id,
    userName: "eigenaar",
    userDisplayName: "Jona Dashboard",
    attestationType: "none",
    excludeCredentials: existing.map((row) => ({ id: row.credential_id, transports: row.transports as AuthenticatorTransportFuture[] })),
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
  });
  await rememberChallenge(options.challenge, "register");
  return options;
}

export async function verifyRegistration(response: RegistrationResponseJSON, label: string): Promise<boolean> {
  const rp = relyingParty();
  const challenge = await takeChallenge("register");
  if (!challenge) return false;
  let result;
  try {
    result = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.id,
      requireUserVerification: true,
    });
  } catch {
    return false;
  }
  if (!result.verified) return false;
  const { credential } = result.registrationInfo;
  await query(
    "insert into passkeys (credential_id, public_key, counter, transports, label) values ($1, $2, $3, $4, $5) on conflict (credential_id) do nothing",
    [credential.id, Buffer.from(credential.publicKey), credential.counter, credential.transports ?? [], label]
  );
  return true;
}

export async function loginOptions() {
  const rp = relyingParty();
  // Geen lijst met sleutels: de passkey is vindbaar (resident), en zo geeft een
  // anonieme aanvraag ook niets prijs over welke sleutels er bestaan.
  const options = await generateAuthenticationOptions({ rpID: rp.id, userVerification: "required" });
  await rememberChallenge(options.challenge, "login");
  return options;
}

export async function verifyLogin(response: AuthenticationResponseJSON): Promise<boolean> {
  const rp = relyingParty();
  const challenge = await takeChallenge("login");
  if (!challenge) return false;
  const row = await queryOne<{ credential_id: string; public_key: Buffer; counter: string; transports: string[] }>(
    "select credential_id, public_key, counter, transports from passkeys where credential_id = $1",
    [response.id]
  );
  if (!row) return false;
  let result;
  try {
    result = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.id,
      requireUserVerification: true,
      credential: {
        id: row.credential_id,
        publicKey: new Uint8Array(row.public_key),
        counter: Number(row.counter),
        transports: row.transports as AuthenticatorTransportFuture[],
      },
    });
  } catch {
    return false;
  }
  if (!result.verified) return false;
  await query("update passkeys set counter = $2, last_used_at = now() where credential_id = $1", [row.credential_id, result.authenticationInfo.newCounter]);
  return true;
}

export async function removePasskey(credentialId: string): Promise<"removed" | "last" | "missing"> {
  if ((await countPasskeys()) <= 1) return "last";
  const rows = await query("delete from passkeys where credential_id = $1 returning credential_id", [credentialId]);
  return rows.length > 0 ? "removed" : "missing";
}
