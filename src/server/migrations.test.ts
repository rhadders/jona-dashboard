import { describe, expect, it } from "vitest";
import { MIGRATIONS } from "./migrations";

describe("migraties", () => {
  it("zijn uniek en oplopend genummerd", () => {
    const ids = MIGRATIONS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(ids);
    for (const id of ids) expect(id).toMatch(/^\d{3}_[a-z_]+$/);
  });

  it("bewaren geen persoonsgegevens: geen kolom voor naam of e-mail", () => {
    const sql = MIGRATIONS.map((m) => m.sql).join("\n").toLowerCase();
    for (const word of ["email", "e_mail", " name ", "first_name", "last_name", "address", "phone"]) {
      expect(sql).not.toContain(word);
    }
  });
});
