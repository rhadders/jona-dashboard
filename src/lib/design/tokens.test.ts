import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import tailwindConfig from "../../../tailwind.config";

/*
 * Bewaakt de tokenlaag van het Jona design system (uit TirgumAI): de vaste
 * merkwaarden, de hex-commentaren naast de HSL-triplets, en dat alles waar de
 * Tailwind-config naar verwijst in zowel de lichte als de donkere modus bestaat.
 */
const css = readFileSync(resolve(__dirname, "../../app/globals.css"), "utf8");

/** De declaraties binnen het eerste blok dat met `selector {` begint. */
function block(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Blok ${selector} niet gevonden`);
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}" && --depth === 0) return css.slice(start, i);
  }
  throw new Error(`Blok ${selector} niet afgesloten`);
}

function declarations(body: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) out.set(m[1], m[2].trim());
  return out;
}

const root = declarations(block(":root"));
const dark = declarations(block(".dark"));

function hslToHex(h: number, s: number, l: number): string {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Alle strings in de kleurenconfig, recursief. */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

function referencedTokens(): string[] {
  const extend = tailwindConfig.theme?.extend ?? {};
  const sources = [extend.colors, extend.ringColor, extend.ringOffsetColor];
  const names = new Set<string>();
  for (const s of sources.flatMap(strings)) {
    for (const m of s.matchAll(/var\(--([\w-]+)\)/g)) names.add(m[1]);
  }
  return [...names];
}

describe("Jona-tokens", () => {
  it("heeft navy-800 en teal-500 op de vaste merkwaarde", () => {
    expect(root.get("navy-800")).toBe("201.3 84.9% 18.2%");
    expect(root.get("teal-500")).toBe("181.6 63.4% 46.1%");
    expect(root.get("primary")).toBe("var(--navy-800)");
    expect(root.get("ring")).toBe("var(--teal-500)");
  });

  it("laat elke HSL-triplet overeenkomen met de hex in het commentaar ernaast", () => {
    const lines = css.matchAll(/--([\w-]+):\s*([\d.]+) ([\d.]+)% ([\d.]+)%;\s*\/\* (#[0-9a-f]{6}) \*\//g);
    let count = 0;
    for (const [, name, h, s, l, hex] of lines) {
      count++;
      expect(hslToHex(Number(h), Number(s), Number(l)), name).toBe(hex);
    }
    expect(count).toBeGreaterThan(30);
  });

  it("definieert elk token uit de config in :root en in .dark", () => {
    const tokens = referencedTokens();
    expect(tokens).toContain("primary");
    expect(tokens).toContain("sidebar-accent");
    for (const name of tokens) {
      expect(root.has(name), `--${name} in :root`).toBe(true);
      expect(dark.has(name), `--${name} in .dark`).toBe(true);
    }
  });

  it("laat elke var() in de tokenblokken naar een bestaande ramp wijzen", () => {
    for (const decls of [root, dark]) {
      for (const [name, value] of decls) {
        for (const m of value.matchAll(/var\(--([\w-]+)\)/g)) {
          expect(root.has(m[1]), `--${name} verwijst naar --${m[1]}`).toBe(true);
        }
      }
    }
  });

  it("heeft de tokens van de werkplek van TirgumAI niet meer", () => {
    for (const gone of ["word-highlight", "map-water", "verse-empty", "radius"]) {
      expect(root.has(gone), `--${gone}`).toBe(false);
    }
  });
});
