import { describe, expect, it } from "vitest";
import { statsFailureReason } from "./failure";

describe("statsFailureReason", () => {
  it("noemt een geweigerd token bij 401 en 403", () => {
    expect(statsFailureReason(401)).toBe("Het token wordt geweigerd");
    expect(statsFailureReason(403)).toBe("Het token wordt geweigerd");
  });

  it("noemt bij 404 allebei de oorzaken: een tool mag het adres verbergen", () => {
    expect(statsFailureReason(404)).toBe("Het adres bestaat niet of het token klopt niet");
  });

  it("geeft bij de rest de statuscode", () => {
    expect(statsFailureReason(500)).toBe("Het adres antwoordt met 500");
    expect(statsFailureReason(302)).toBe("Het adres antwoordt met 302");
  });
});
