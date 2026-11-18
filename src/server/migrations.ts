import { pool } from "./db";

/*
 * Het schema, als genummerde stappen die bij het starten van de container
 * draaien (src/instrumentation.ts). Een wijziging is een nieuwe stap onderaan;
 * een bestaande stap verandert nooit meer. Elke stap draait in een transactie
 * en precies één keer; een advisory lock voorkomt dat twee processen tegelijk
 * migreren.
 *
 * Het dashboard bewaart alleen aantallen, bedragen en verwijzingen: geen
 * namen, geen e-mailadressen, geen inhoud uit de tools.
 */

export type Migration = { id: string; sql: string };

export const MIGRATIONS: readonly Migration[] = [
  {
    id: "001_auth",
    sql: `
      create table passkeys (
        credential_id text primary key,
        public_key bytea not null,
        counter bigint not null default 0,
        transports text[] not null default '{}',
        label text not null default 'Passkey',
        created_at timestamptz not null default now(),
        last_used_at timestamptz
      );
      create table webauthn_challenges (
        id uuid primary key,
        challenge text not null,
        purpose text not null check (purpose in ('register', 'login')),
        expires_at timestamptz not null
      );
      create table sessions (
        token_hash text primary key,
        created_at timestamptz not null default now(),
        expires_at timestamptz not null
      );
    `,
  },
  {
    id: "002_stats",
    sql: `
      create table stats_snapshots (
        tool_id text not null,
        day date not null,
        fetched_at timestamptz not null,
        payload jsonb not null,
        primary key (tool_id, day)
      );
      create table integration_status (
        tool_id text not null,
        kind text not null check (kind in ('stats', 'stripe')),
        ok boolean not null,
        checked_at timestamptz not null,
        message text,
        primary key (tool_id, kind)
      );
      create table job_runs (
        id bigserial primary key,
        job text not null,
        started_at timestamptz not null,
        finished_at timestamptz not null,
        ok boolean not null,
        detail jsonb not null default '{}'
      );
      create index job_runs_job_started on job_runs (job, started_at desc);
    `,
  },
  {
    id: "003_stripe",
    sql: `
      create table stripe_subscriptions (
        tool_id text not null,
        id text not null,
        customer_ref text not null,
        status text not null,
        currency text not null,
        mrr_cents integer not null,
        created_at timestamptz not null,
        trial_end timestamptz,
        canceled_at timestamptz,
        ended_at timestamptz,
        synced_at timestamptz not null default now(),
        primary key (tool_id, id)
      );
      create table stripe_events (
        tool_id text not null,
        id text not null,
        type text not null,
        occurred_at timestamptz not null,
        received_at timestamptz not null default now(),
        primary key (tool_id, id)
      );
      create table mrr_daily (
        tool_id text not null,
        day date not null,
        mrr_cents integer not null,
        paying integer not null,
        trialing integer not null,
        primary key (tool_id, day)
      );
      create table signals (
        id bigserial primary key,
        tool_id text not null,
        kind text not null,
        amount_cents integer,
        occurred_at timestamptz not null,
        source_ref text not null,
        unique (tool_id, source_ref, kind)
      );
      create index signals_occurred on signals (occurred_at desc);
    `,
  },
];

/** Een willekeurig maar vast getal voor de advisory lock van dit schema. */
const LOCK_KEY = 71_452_301;

export async function runMigrations(): Promise<string[]> {
  const client = await pool().connect();
  const applied: string[] = [];
  try {
    await client.query("select pg_advisory_lock($1)", [LOCK_KEY]);
    await client.query("create table if not exists schema_migrations (id text primary key, applied_at timestamptz not null default now())");
    const done = new Set((await client.query<{ id: string }>("select id from schema_migrations")).rows.map((row) => row.id));
    for (const migration of MIGRATIONS) {
      if (done.has(migration.id)) continue;
      await client.query("begin");
      try {
        await client.query(migration.sql);
        await client.query("insert into schema_migrations (id) values ($1)", [migration.id]);
        await client.query("commit");
        applied.push(migration.id);
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
  } finally {
    await client.query("select pg_advisory_unlock($1)", [LOCK_KEY]).catch(() => undefined);
    client.release();
  }
  return applied;
}
