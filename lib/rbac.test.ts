import { describe, it, expect } from "vitest";
import { getRequestIp } from "@/lib/rbac";

describe("rbac utilities", () => {
  it("extracts forwarded ip", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4,5.6.7.8" });
    expect(getRequestIp(headers)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const headers = new Headers({ "x-real-ip": "9.8.7.6" });
    expect(getRequestIp(headers)).toBe("9.8.7.6");
  });
});
