import { describe, expect, it } from "vitest";
import { ScheduleFrequency } from "@homestead/database";
import { computeNextDueDate } from "@/lib/schedules/recurrence";
import { canAssignRole, canManageMembers, roleAtLeast } from "@/lib/auth/rbac";
import { HouseholdRole } from "@homestead/database";
import { AppError } from "@/lib/errors/app-error";

describe("computeNextDueDate", () => {
  const from = new Date("2026-01-15T12:00:00.000Z");

  it("returns null for ONCE", () => {
    expect(computeNextDueDate(ScheduleFrequency.ONCE, from)).toBeNull();
  });

  it("advances monthly", () => {
    const next = computeNextDueDate(ScheduleFrequency.MONTHLY, from);
    expect(next?.toISOString()).toBe("2026-02-15T12:00:00.000Z");
  });

  it("advances custom days", () => {
    const next = computeNextDueDate(ScheduleFrequency.CUSTOM_DAYS, from, 10);
    expect(next?.toISOString()).toBe("2026-01-25T12:00:00.000Z");
  });

  it("rejects invalid custom interval", () => {
    expect(() => computeNextDueDate(ScheduleFrequency.CUSTOM_DAYS, from, 0)).toThrow(
      AppError,
    );
  });
});

describe("RBAC helpers", () => {
  it("ranks roles", () => {
    expect(roleAtLeast(HouseholdRole.OWNER, HouseholdRole.MANAGER)).toBe(true);
    expect(roleAtLeast(HouseholdRole.MEMBER, HouseholdRole.MANAGER)).toBe(false);
  });

  it("restricts member management", () => {
    expect(canManageMembers(HouseholdRole.MANAGER, HouseholdRole.MEMBER)).toBe(true);
    expect(canManageMembers(HouseholdRole.MANAGER, HouseholdRole.OWNER)).toBe(false);
    expect(canAssignRole(HouseholdRole.OWNER, HouseholdRole.MANAGER)).toBe(true);
    expect(canAssignRole(HouseholdRole.OWNER, HouseholdRole.OWNER)).toBe(false);
  });
});
