import { runMigrations } from "./server/migrations";

/*
 * De migraties lopen bij het starten van de container, zodat een nieuwe versie
 * zijn eigen schema meebrengt en er geen aparte stap vóór de deploy nodig is.
 * Zonder DATABASE_URL gebeurt er niets. Mislukt een migratie, dan start de
 * server niet: liever een zichtbare fout dan een dashboard op een half schema.
 */
export async function migrateOnStart(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.warn("[start] DATABASE_URL ontbreekt: migraties overgeslagen.");
    return;
  }
  try {
    const applied = await runMigrations();
    if (applied.length > 0) console.log(`[start] migraties toegepast: ${applied.join(", ")}`);
  } catch (error) {
    console.error("[start] migratie mislukt:", error instanceof Error ? error.message : "onbekende fout");
    throw error;
  }
}
