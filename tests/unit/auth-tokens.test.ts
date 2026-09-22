import { beforeAll, describe, expect, it } from "vitest";
import { hashPassword, signAccessToken, verifyAccessToken, verifyPassword } from "@/lib/auth/tokens";

describe("password + JWT", () => {
  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET =
      process.env.JWT_ACCESS_SECRET ?? "test-access-secret-please-change";
  });

  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("Password123!");
    expect(hash).not.toContain("Password123!");
    expect(await verifyPassword("Password123!", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("signs and verifies access tokens", async () => {
    const token = await signAccessToken({
      sub: "00000000-0000-0000-0000-000000000001",
      email: "alex@example.com",
    });
    const payload = await verifyAccessToken(token);
    expect(payload.email).toBe("alex@example.com");
    expect(payload.sub).toBe("00000000-0000-0000-0000-000000000001");
  });
});
