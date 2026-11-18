import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "./csp";

describe("CSP", () => {
  it("staat in productie alleen de eigen origin toe en geen eval", () => {
    const csp = buildContentSecurityPolicy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("connect-src 'self';");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toContain("https:");
  });

  it("staat eval alleen in ontwikkeling toe", () => {
    expect(buildContentSecurityPolicy({ dev: true })).toContain("'unsafe-eval'");
  });
});
