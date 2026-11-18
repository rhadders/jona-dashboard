import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * `src/server/**` draait alleen op de server: daar komen de database, de
 * sessies en de sleutels van de koppelingen. Niets daarvan mag in een
 * clientbundel belanden. Daarom importeert geen `"use client"`-bestand iets uit
 * `src/server`, en ook de code die de browser kan laden (`src/lib`,
 * `src/components`, `src/config`) niet. Geheimen uit de omgeving leest alleen
 * `src/server/env.ts`.
 */

const SRC = join(__dirname, "..");
const SERVER = join(SRC, "server");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

const sources = files(SRC).map((path) => ({
  path,
  rel: relative(SRC, path).split("\\").join("/"),
  text: readFileSync(path, "utf8"),
}));

/** De modules die een bestand importeert, als pad onder `src` (of de ruwe specifier). */
function importsOf(file: { path: string; text: string }): string[] {
  const specs = [...file.text.matchAll(/(?:import|export)[^"'`]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g)].map(
    (m) => m[1] ?? m[2] ?? ""
  );
  return specs.map((spec) => {
    if (spec.startsWith("@/")) return spec.slice(2);
    if (spec.startsWith(".")) return relative(SRC, resolve(dirname(file.path), spec)).split("\\").join("/");
    return spec;
  });
}

const importsServer = (file: { path: string; text: string }) => importsOf(file).some((m) => m === "server" || m.startsWith("server/"));

const isClient = (text: string) => /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']use client["']/.test(text);

/** Wat buiten `src/server` uit de omgeving gelezen mag worden: niets geheims. */
const PUBLIC_ENV = new Set(["NODE_ENV", "NEXT_RUNTIME", "DATABASE_URL", "SOURCE_COMMIT"]);

describe("src/server blijft op de server", () => {
  it("vindt de clientbestanden", () => {
    expect(sources.filter((f) => isClient(f.text)).length).toBeGreaterThan(3);
  });

  it('geen "use client"-bestand importeert iets uit src/server', () => {
    const offenders = sources.filter((f) => isClient(f.text) && importsServer(f)).map((f) => f.rel);
    expect(offenders).toEqual([]);
  });

  it("ook lib, components en config niet (die laadt de browser mee)", () => {
    const offenders = sources.filter((f) => /^(lib|components|config)\//.test(f.rel) && importsServer(f)).map((f) => f.rel);
    expect(offenders).toEqual([]);
  });

  it("geen bestand in src/server is zelf een clientbestand", () => {
    const offenders = sources.filter((f) => f.path.startsWith(SERVER) && isClient(f.text)).map((f) => f.rel);
    expect(offenders).toEqual([]);
  });

  it("buiten src/server leest niets een geheim uit de omgeving", () => {
    const offenders = sources
      .filter((f) => !f.rel.startsWith("server/"))
      .flatMap((f) => [...f.text.matchAll(/process\.env\.([A-Z0-9_]+)/g)].filter((m) => !PUBLIC_ENV.has(m[1]!)).map((m) => `${f.rel}: ${m[1]}`));
    expect(offenders).toEqual([]);
    const dynamic = sources.filter((f) => !f.rel.startsWith("server/") && /process\.env\[/.test(f.text)).map((f) => f.rel);
    expect(dynamic).toEqual([]);
  });

  it("de guard herkent een import, ook relatief", () => {
    const fake = { path: join(SRC, "components", "x.tsx"), text: '"use client";\nimport { a } from "../server/db";' };
    expect(isClient(fake.text)).toBe(true);
    expect(importsServer(fake)).toBe(true);
    expect(importsServer({ path: fake.path, text: 'import { b } from "@/server/jobs/tick";' })).toBe(true);
    expect(importsServer({ path: fake.path, text: 'import { c } from "@/lib/server-thing";' })).toBe(false);
  });
});
