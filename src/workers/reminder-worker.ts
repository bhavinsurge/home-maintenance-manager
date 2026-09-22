import { addDays, format } from "date-fns";
import { NotificationType, prisma } from "@homestead/database";
import { logger } from "../lib/logger";

function dayKey(date = new Date()) {
  return format(date, "yyyy-MM-dd");
}

export async function dispatchReminders() {
  const now = new Date();
  const leadDays = Number(process.env.REMINDER_LEAD_DAYS ?? 7);
  const horizon = addDays(now, leadDays);
  const today = dayKey(now);

  const dueSchedules = await prisma.maintenanceSchedule.findMany({
    where: {
      isActive: true,
      nextDueAt: { lte: horizon },
      asset: { deletedAt: null },
    },
    include: {
      asset: {
        include: {
          household: {
            include: { members: true },
          },
        },
      },
    },
  });

  let created = 0;

  for (const schedule of dueSchedules) {
    const idempotencyKey = `schedule:${schedule.id}:${today}`;
    const existing = await prisma.reminderDispatch.findUnique({
      where: { idempotencyKey },
    });
    if (existing) continue;

    const isOverdue = schedule.nextDueAt < now;
    const title = isOverdue
      ? `Overdue: ${schedule.title}`
      : `Upcoming: ${schedule.title}`;
    const body = `${schedule.asset.name} — due ${schedule.nextDueAt.toISOString()}`;

    await prisma.$transaction(async (tx) => {
      await tx.reminderDispatch.create({
        data: {
          idempotencyKey,
          scheduleId: schedule.id,
        },
      });
      await tx.notification.createMany({
        data: schedule.asset.household.members.map((m) => ({
          userId: m.userId,
          householdId: schedule.asset.householdId,
          type: NotificationType.MAINTENANCE_DUE,
          title,
          body,
          linkPath: `/households/${schedule.asset.householdId}/assets/${schedule.assetId}`,
        })),
      });
    });
    created += schedule.asset.household.members.length;
  }

  const warranties = await prisma.warranty.findMany({
    where: {
      endsOn: { gte: now, lte: horizon },
      asset: { deletedAt: null },
    },
    include: {
      asset: {
        include: {
          household: { include: { members: true } },
        },
      },
    },
  });

  for (const warranty of warranties) {
    const idempotencyKey = `warranty:${warranty.id}:${today}`;
    const existing = await prisma.reminderDispatch.findUnique({
      where: { idempotencyKey },
    });
    if (existing) continue;

    await prisma.$transaction(async (tx) => {
      await tx.reminderDispatch.create({
        data: {
          idempotencyKey,
          warrantyId: warranty.id,
        },
      });
      await tx.notification.createMany({
        data: warranty.asset.household.members.map((m) => ({
          userId: m.userId,
          householdId: warranty.asset.householdId,
          type: NotificationType.WARRANTY_EXPIRING,
          title: `Warranty expiring: ${warranty.asset.name}`,
          body: `${warranty.provider} coverage ends ${warranty.endsOn.toISOString().slice(0, 10)}`,
          linkPath: `/households/${warranty.asset.householdId}/assets/${warranty.assetId}`,
        })),
      });
    });
    created += warranty.asset.household.members.length;
  }

  return { created };
}

async function main() {
  const intervalSec = Number(process.env.REMINDER_POLL_INTERVAL_SECONDS ?? 60);
  logger.info({ intervalSec }, "Reminder worker starting");

  const tick = async () => {
    try {
      const result = await dispatchReminders();
      logger.info(result, "Reminder tick complete");
    } catch (err) {
      logger.error({ err }, "Reminder tick failed");
    }
  };

  await tick();
  setInterval(tick, intervalSec * 1000);
}

main().catch((err) => {
  logger.error({ err }, "Worker crashed");
  process.exit(1);
});
