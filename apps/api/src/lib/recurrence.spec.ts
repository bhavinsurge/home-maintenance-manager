import { ScheduleFrequency } from "@homestead/database";
import { computeNextDueDate } from "./recurrence";

describe("computeNextDueDate", () => {
  const from = new Date("2026-01-15T12:00:00.000Z");

  it("returns null for ONCE", () => {
    expect(computeNextDueDate(ScheduleFrequency.ONCE, from)).toBeNull();
  });

  it("advances weekly", () => {
    const next = computeNextDueDate(ScheduleFrequency.WEEKLY, from);
    expect(next?.toISOString()).toBe("2026-01-22T12:00:00.000Z");
  });

  it("uses custom days", () => {
    const next = computeNextDueDate(ScheduleFrequency.CUSTOM_DAYS, from, 10);
    expect(next?.toISOString()).toBe("2026-01-25T12:00:00.000Z");
  });
});
