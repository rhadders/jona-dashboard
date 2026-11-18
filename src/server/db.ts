import { Pool, type QueryResultRow } from "pg";
import { databaseUrl } from "./env";

/*
 * Eén verbindingspool per proces. In ontwikkeling bewaart `globalThis` hem,
 * zodat hot reload geen verbindingen lekt.
 */

const globalForDb = globalThis as unknown as { jonaDashboardPool?: Pool };

export function pool(): Pool {
  if (!globalForDb.jonaDashboardPool) {
    const connectionString = databaseUrl();
    if (!connectionString) throw new Error("DATABASE_URL ontbreekt.");
    globalForDb.jonaDashboardPool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 30_000 });
  }
  return globalForDb.jonaDashboardPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: readonly unknown[] = []): Promise<T[]> {
  const result = await pool().query<T>(text, params as unknown[]);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(text: string, params: readonly unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
