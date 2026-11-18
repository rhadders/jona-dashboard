import { describe, expect, it } from "vitest";
import { TOOLS, findTool } from "./tools";

describe("tools", () => {
  it("heeft unieke id's en env-sleutels", () => {
    expect(new Set(TOOLS.map((t) => t.id)).size).toBe(TOOLS.length);
    expect(new Set(TOOLS.map((t) => t.envKey)).size).toBe(TOOLS.length);
  });

  it("gebruikt id's die in een URL passen en env-sleutels in hoofdletters", () => {
    for (const tool of TOOLS) {
      expect(tool.id).toMatch(/^[a-z0-9-]+$/);
      expect(tool.envKey).toMatch(/^[A-Z0-9_]+$/);
    }
  });

  it("vindt een tool op id", () => {
    expect(findTool("selaread")?.name).toBe("Selaread");
    expect(findTool("bestaat-niet")).toBeUndefined();
  });
});
