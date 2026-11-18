import { afterEach, describe, expect, it } from "vitest";
import { bearerMatches, sameOrigin, secretsMatch } from "./http";

const request = (headers: Record<string, string>) => new Request("https://bi.example.org/api/x", { method: "POST", headers });

afterEach(() => {
  delete process.env.APP_URL;
});

describe("secretsMatch", () => {
  it("vergelijkt gelijk en ongelijk, ook bij een andere lengte", () => {
    expect(secretsMatch("abc", "abc")).toBe(true);
    expect(secretsMatch("abc", "abd")).toBe(false);
    expect(secretsMatch("abc", "abcd")).toBe(false);
  });
});

describe("bearerMatches", () => {
  it("leest het token uit de Authorization-kop", () => {
    expect(bearerMatches(request({ authorization: "Bearer geheim" }), "geheim")).toBe(true);
    expect(bearerMatches(request({ authorization: "bearer geheim" }), "geheim")).toBe(true);
  });

  it("weigert een ander token, een andere vorm of geen kop", () => {
    expect(bearerMatches(request({ authorization: "Bearer anders" }), "geheim")).toBe(false);
    expect(bearerMatches(request({ authorization: "Basic geheim" }), "geheim")).toBe(false);
    expect(bearerMatches(request({}), "geheim")).toBe(false);
  });
});

describe("sameOrigin", () => {
  it("laat alleen het eigen adres door", () => {
    process.env.APP_URL = "https://bi.example.org/";
    expect(sameOrigin(request({ origin: "https://bi.example.org" }))).toBe(true);
    expect(sameOrigin(request({ origin: "https://kwaad.example.org" }))).toBe(false);
    expect(sameOrigin(request({}))).toBe(false);
    expect(sameOrigin(request({ origin: "geen-url" }))).toBe(false);
  });
});
