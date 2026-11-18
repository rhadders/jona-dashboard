import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * Geen harde kleuren en geen unicode als icoon (AGENTS.md "Vormgeving").
 * Kleuren komen uit de tokens in globals.css; pijlen, vinkjes en waarschuwingen
 * zijn Lucide-glyphs.
 */
const ROOT = resolve(__dirname, "../../..");

/*
 * Uitzonderingen: pad (vanaf de repo-root) met de reden. Houd deze lijst kort;
 * een nieuwe regel hoort in de PR uitgelegd te worden.
 */
const ALLOWED: Record<string, string> = {};

const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const UTILITY =
  "bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|outline|fill|stroke|from|via|to|divide|decoration|shadow|accent|caret|placeholder";
const PALETTE_CLASS = new RegExp(`(?<![\\w-])(?:${UTILITY})-(?:(?:${PALETTE})-\\d{2,3}|black|white)(?![\\w-])`, "g");

/** Tekens die als icoon dienen; daar zijn Lucide-glyphs voor. */
const FORBIDDEN_GLYPHS = ["▶", "◀", "←", "→", "↑", "↓", "⚠", "✓", "✔", "✗", "💬", "📊", "🌐", "———"];

function walk(dir: string, ext: RegExp): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path, ext);
    return ext.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

/** Commentaar mag uitleggen met een pijl; alleen code en tekst tellen. */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => (/^\s*\/\//.test(line) ? "" : line))
    .join("\n");
}

const componentFiles = [...walk(join(ROOT, "src/components"), /\.tsx$/), ...walk(join(ROOT, "src/app"), /\.tsx$/)].filter(
  (p) => !(relative(ROOT, p) in ALLOWED)
);

describe("geen harde stijlen", () => {
  it("vindt componenten om te controleren", () => {
    expect(componentFiles.length).toBeGreaterThan(15);
  });

  it("gebruikt geen kleurklassen uit het Tailwind-standaardpalet", () => {
    const hits = componentFiles.flatMap((path) => {
      const found = withoutComments(readFileSync(path, "utf8")).match(PALETTE_CLASS) ?? [];
      return found.map((cls) => `${relative(ROOT, path)}: ${cls}`);
    });
    expect(hits).toEqual([]);
  });

  it("gebruikt geen unicode of emoji als icoon", () => {
    const hits = componentFiles.flatMap((path) => {
      const source = withoutComments(readFileSync(path, "utf8"));
      return FORBIDDEN_GLYPHS.filter((g) => source.includes(g)).map((g) => `${relative(ROOT, path)}: ${g}`);
    });
    expect(hits).toEqual([]);
  });

  it("herkent een paletklasse en laat tokens door", () => {
    const sample = 'className="bg-amber-100/70 hover:text-green-700 bg-black/50 text-white bg-brand-soft text-warning-strong"';
    expect(sample.match(PALETTE_CLASS)).toEqual(["bg-amber-100", "text-green-700", "bg-black", "text-white"]);
  });
});
