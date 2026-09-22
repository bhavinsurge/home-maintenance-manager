import { NextRequest } from "next/server";
import { HouseholdRole, Prisma, ScheduleFrequency } from "@homestead/database";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/audit";
import { requireHouseholdMember, requireUser } from "@/lib/auth/session";
import { notFound } from "@/lib/errors/app-error";
import { getRequestId } from "@/lib/http/request";
import { created, handleRouteError, ok } from "@/lib/http/response";
import { cacheDel } from "@/lib/cache/redis";
import { computeNextDueDate } from "@/lib/schedules/recurrence";
import {
  completeScheduleSchema,
  scheduleCreateSchema,
  scheduleUpdateSchema,
  serviceRecordCreateSchema,
  serviceRecordUpdateSchema,
  warrantyCreateSchema,
  warrantyUpdateSchema,
} from "@/lib/validation/schemas";

async function assetMembership(userId: string, assetId: string, min: HouseholdRole = HouseholdRole.MEMBER) {
  const asset = await prisma.asset.findFirst({ where: { id: assetId, deletedAt: null } });
  if (!asset) throw notFound("Asset not found");
  const membership = await requireHouseholdMember(userId, asset.householdId, min);
  return { asset, membership };
}

export async function listSchedules(request: NextRequest, assetId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    await assetMembership(user.id, assetId);
    const items = await prisma.maintenanceSchedule.findMany({
      where: { assetId },
      orderBy: [{ isActive: "desc" }, { nextDueAt: "asc" }],
    });
    return ok({ items });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function createSchedule(request: NextRequest, assetId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    const { asset } = await assetMembership(user.id, assetId, HouseholdRole.MANAGER);
    const body = scheduleCreateSchema.parse(await request.json());
    const schedule = await prisma.maintenanceSchedule.create({
      data: {
        assetId,
        title: body.title,
        description: body.description ?? null,
        frequency: body.frequency,
        intervalDays: body.frequency === ScheduleFrequency.CUSTOM_DAYS ? body.intervalDays : null,
        nextDueAt: new Date(body.nextDueAt),
        reminderDaysBefore: body.reminderDaysBefore ?? 7,
      },
    });
    await cacheDel(`dashboard:${asset.householdId}`);
    await writeAudit({
      householdId: asset.householdId,
      actorUserId: user.id,
      action: "SCHEDULE_CREATED",
      entityType: "maintenance_schedule",
      entityId: schedule.id,
    });
    return created({ schedule });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function updateSchedule(request: NextRequest, scheduleId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    const schedule = await prisma.maintenanceSchedule.findUnique({
      where: { id: scheduleId },
      include: { asset: true },
    });
    if (!schedule || schedule.asset.deletedAt) throw notFound("Schedule not found");
    await requireHouseholdMember(user.id, schedule.asset.householdId, HouseholdRole.MANAGER);
    const body = scheduleUpdateSchema.parse(await request.json());
    const updated = await prisma.maintenanceSchedule.update({
      where: { id: scheduleId },
      data: {
        ...body,
        nextDueAt: body.nextDueAt ? new Date(body.nextDueAt) : undefined,
        intervalDays:
          body.frequency === ScheduleFrequency.CUSTOM_DAYS || body.intervalDays !== undefined
            ? body.intervalDays
            : undefined,
      },
    });
    await cacheDel(`dashboard:${schedule.asset.householdId}`);
    return ok({ schedule: updated });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function deactivateSchedule(request: NextRequest, scheduleId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    const schedule = await prisma.maintenanceSchedule.findUnique({
      where: { id: scheduleId },
      include: { asset: true },
    });
    if (!schedule || schedule.asset.deletedAt) throw notFound("Schedule not found");
    await requireHouseholdMember(user.id, schedule.asset.householdId, HouseholdRole.MANAGER);
    const updated = await prisma.maintenanceSchedule.update({
      where: { id: scheduleId },
      data: { isActive: false },
    });
    await cacheDel(`dashboard:${schedule.asset.householdId}`);
    return ok({ schedule: updated });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function completeSchedule(request: NextRequest, scheduleId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    const body = completeScheduleSchema.parse(await request.json().catch(() => ({})));
    const performedAt = body.performedAt ? new Date(body.performedAt) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const schedule = await tx.maintenanceSchedule.findUnique({
        where: { id: scheduleId },
        include: { asset: true },
      });
      if (!schedule || schedule.asset.deletedAt) throw notFound("Schedule not found");

      const membership = await tx.householdMember.findUnique({
        where: {
          householdId_userId: {
            householdId: schedule.asset.householdId,
            userId: user.id,
          },
        },
      });
      if (!membership) throw notFound("Schedule not found");

      const serviceRecord = await tx.serviceRecord.create({
        data: {
          assetId: schedule.assetId,
          scheduleId: schedule.id,
          title: schedule.title,
          performedAt,
          cost: body.cost ?? null,
          vendor: body.vendor ?? null,
          notes: body.notes ?? null,
          createdById: user.id,
        },
      });

      const nextDue = computeNextDueDate(schedule.frequency, performedAt, schedule.intervalDays);
      const updatedSchedule = await tx.maintenanceSchedule.update({
        where: { id: schedule.id },
        data: {
          lastCompletedAt: performedAt,
          nextDueAt: nextDue ?? schedule.nextDueAt,
          isActive: nextDue !== null ? schedule.isActive : false,
        },
      });

      return {
        serviceRecord,
        schedule: updatedSchedule,
        householdId: schedule.asset.householdId,
      };
    });

    await cacheDel(`dashboard:${result.householdId}`);
    await writeAudit({
      householdId: result.householdId,
      actorUserId: user.id,
      action: "SCHEDULE_COMPLETED",
      entityType: "maintenance_schedule",
      entityId: scheduleId,
      metadata: { serviceRecordId: result.serviceRecord.id },
    });

    return ok({
      serviceRecord: result.serviceRecord,
      schedule: result.schedule,
    });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function listServiceRecords(request: NextRequest, assetId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    await assetMembership(user.id, assetId);
    const items = await prisma.serviceRecord.findMany({
      where: { assetId },
      orderBy: { performedAt: "desc" },
    });
    return ok({ items });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function createServiceRecord(request: NextRequest, assetId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    const { asset } = await assetMembership(user.id, assetId);
    const body = serviceRecordCreateSchema.parse(await request.json());
    const record = await prisma.serviceRecord.create({
      data: {
        assetId,
        scheduleId: body.scheduleId ?? null,
        title: body.title,
        performedAt: new Date(body.performedAt),
        cost: body.cost ?? null,
        vendor: body.vendor ?? null,
        notes: body.notes ?? null,
        createdById: user.id,
      },
    });
    await cacheDel(`dashboard:${asset.householdId}`);
    await writeAudit({
      householdId: asset.householdId,
      actorUserId: user.id,
      action: "SERVICE_RECORD_CREATED",
      entityType: "service_record",
      entityId: record.id,
    });
    return created({ serviceRecord: record });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function updateServiceRecord(request: NextRequest, recordId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    const record = await prisma.serviceRecord.findUnique({
      where: { id: recordId },
      include: { asset: true },
    });
    if (!record || record.asset.deletedAt) throw notFound("Service record not found");
    const membership = await requireHouseholdMember(user.id, record.asset.householdId);
    const isManager =
      membership.role === HouseholdRole.OWNER || membership.role === HouseholdRole.MANAGER;
    if (!isManager && record.createdById !== user.id) {
      throw notFound("Service record not found");
    }
    const body = serviceRecordUpdateSchema.parse(await request.json());
    const updated = await prisma.serviceRecord.update({
      where: { id: recordId },
      data: {
        ...body,
        performedAt: body.performedAt ? new Date(body.performedAt) : undefined,
      },
    });
    return ok({ serviceRecord: updated });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function deleteServiceRecord(request: NextRequest, recordId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    const record = await prisma.serviceRecord.findUnique({
      where: { id: recordId },
      include: { asset: true },
    });
    if (!record || record.asset.deletedAt) throw notFound("Service record not found");
    await requireHouseholdMember(user.id, record.asset.householdId, HouseholdRole.MANAGER);
    await prisma.serviceRecord.delete({ where: { id: recordId } });
    await cacheDel(`dashboard:${record.asset.householdId}`);
    return ok({ deleted: true });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function listWarranties(request: NextRequest, assetId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    await assetMembership(user.id, assetId);
    const items = await prisma.warranty.findMany({
      where: { assetId },
      orderBy: { endsOn: "asc" },
    });
    return ok({ items });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function createWarranty(request: NextRequest, assetId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    const { asset } = await assetMembership(user.id, assetId, HouseholdRole.MANAGER);
    const body = warrantyCreateSchema.parse(await request.json());
    const warranty = await prisma.warranty.create({
      data: {
        assetId,
        provider: body.provider,
        coverageNotes: body.coverageNotes ?? null,
        startsOn: new Date(body.startsOn),
        endsOn: new Date(body.endsOn),
      },
    });
    await cacheDel(`dashboard:${asset.householdId}`);
    await writeAudit({
      householdId: asset.householdId,
      actorUserId: user.id,
      action: "WARRANTY_CREATED",
      entityType: "warranty",
      entityId: warranty.id,
    });
    return created({ warranty });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function updateWarranty(request: NextRequest, warrantyId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    const warranty = await prisma.warranty.findUnique({
      where: { id: warrantyId },
      include: { asset: true },
    });
    if (!warranty || warranty.asset.deletedAt) throw notFound("Warranty not found");
    await requireHouseholdMember(user.id, warranty.asset.householdId, HouseholdRole.MANAGER);
    const body = warrantyUpdateSchema.parse(await request.json());
    const updated = await prisma.warranty.update({
      where: { id: warrantyId },
      data: {
        ...body,
        startsOn: body.startsOn ? new Date(body.startsOn) : undefined,
        endsOn: body.endsOn ? new Date(body.endsOn) : undefined,
      },
    });
    await cacheDel(`dashboard:${warranty.asset.householdId}`);
    return ok({ warranty: updated });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function deleteWarranty(request: NextRequest, warrantyId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    const warranty = await prisma.warranty.findUnique({
      where: { id: warrantyId },
      include: { asset: true },
    });
    if (!warranty || warranty.asset.deletedAt) throw notFound("Warranty not found");
    await requireHouseholdMember(user.id, warranty.asset.householdId, HouseholdRole.MANAGER);
    await prisma.warranty.delete({ where: { id: warrantyId } });
    await cacheDel(`dashboard:${warranty.asset.householdId}`);
    return ok({ deleted: true });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export type JsonMeta = Prisma.InputJsonValue;
