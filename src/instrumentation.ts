/*
 * Draait één keer bij het starten van de server. Het eigenlijke werk staat in
 * `instrumentation-node.ts`: die import staat binnen de runtime-controle, zodat
 * de edge-bundel de database niet probeert mee te nemen.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { migrateOnStart } = await import("./instrumentation-node");
    await migrateOnStart();
  }
}
