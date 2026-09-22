import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient, HouseholdRole, ScheduleFrequency, AssetCategory } from "@prisma/client";
import { hashPassword } from "../../src/lib/auth/tokens";
import { computeNextDueDate } from "../../src/lib/schedules/recurrence";

const databaseUrl =
  process.env.DATABASE_URL_TEST ??
  process.env.DATABASE_URL ??
  "postgresql://hmm:hmm_dev_password@localhost:5433/home_maintenance_test?schema=public";

process.env.DATABASE_URL = databaseUrl;
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "test-access-secret";

const prisma = new PrismaClient();

describe("schedule completion transaction", () => {
  let userId = "";
  let scheduleId = "";

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.serviceRecord.deleteMany();
    await prisma.maintenanceSchedule.deleteMany();
    await prisma.asset.deleteMany();
    await prisma.householdMember.deleteMany();
    await prisma.household.deleteMany();
    await prisma.user.deleteMany();

    const user = await prisma.user.create({
      data: {
        email: `integration-${Date.now()}@example.com`,
        fullName: "Integration User",
        passwordHash: await hashPassword("Password123!"),
      },
    });
    userId = user.id;

    const household = await prisma.household.create({
      data: {
        name: "Integration Home",
        createdById: user.id,
        members: {
          create: { userId: user.id, role: HouseholdRole.OWNER },
        },
      },
    });

    const asset = await prisma.asset.create({
      data: {
        householdId: household.id,
        name: "Test Fridge",
        category: AssetCategory.APPLIANCE,
        createdById: user.id,
      },
    });

    const schedule = await prisma.maintenanceSchedule.create({
      data: {
        assetId: asset.id,
        title: "Coil clean",
        frequency: ScheduleFrequency.MONTHLY,
        nextDueAt: new Date(),
      },
    });
    scheduleId = schedule.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates service record and advances next due date", async () => {
    const performedAt = new Date("2026-03-01T10:00:00.000Z");
    const result = await prisma.$transaction(async (tx) => {
      const schedule = await tx.maintenanceSchedule.findUniqueOrThrow({
        where: { id: scheduleId },
      });
      const record = await tx.serviceRecord.create({
        data: {
          assetId: schedule.assetId,
          scheduleId: schedule.id,
          title: schedule.title,
          performedAt,
          createdById: userId,
        },
      });
      const nextDue = computeNextDueDate(schedule.frequency, performedAt, schedule.intervalDays);
      const updated = await tx.maintenanceSchedule.update({
        where: { id: schedule.id },
        data: {
          lastCompletedAt: performedAt,
          nextDueAt: nextDue!,
        },
      });
      return { record, updated };
    });

    expect(result.record.title).toBe("Coil clean");
    expect(result.updated.nextDueAt.toISOString()).toBe("2026-04-01T10:00:00.000Z");
  });
});
