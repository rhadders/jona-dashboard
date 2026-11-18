import { NextResponse } from "next/server";
import { queryOne } from "@/server/db";

// Healthcheck voor de container en voor de workflow die het image uitrolt:
// het Node-proces antwoordt, en uit welke commit het image komt. Met `?db=1`
// raakt de check ook de database; die variant is voor de uptime-meter, zodat
// een pagina die laadt terwijl de database plat ligt niet als gezond telt.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const commit = process.env.SOURCE_COMMIT?.slice(0, 7) ?? null;
  const headers = { "Cache-Control": "no-store" };
  if (new URL(request.url).searchParams.get("db") !== "1") {
    return NextResponse.json({ ok: true, commit }, { headers });
  }
  try {
    await queryOne("select 1");
    return NextResponse.json({ ok: true, commit, database: true }, { headers });
  } catch {
    return NextResponse.json({ ok: false, commit, database: false }, { status: 503, headers });
  }
}
