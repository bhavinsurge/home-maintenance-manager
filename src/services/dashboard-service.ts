import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireHouseholdMember, requireUser } from "@/lib/auth/session";
import { getRequestId } from "@/lib/http/request";
import { handleRouteError, ok } from "@/lib/http/response";
import { cacheGet, cacheSet } from "@/lib/cache/redis";
import { addDays } from "date-fns";
import { HouseholdRole } from "@homestead/database";
import { paginationSchema } from "@/lib/validation/schemas";

export async function getDashboard(request: NextRequest, householdId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    await requireHouseholdMember(user.id, householdId);

    const cacheKey = `dashboard:${householdId}:${user.id}`;
    const cached = await cacheGet<unknown>(cacheKey);
    if (cached) return ok(cached);

    const now = new Date();
    const in7 = addDays(now, 7);
    const in30 = addDays(now, 30);

    const [
      assetCount,
      overdueSchedules,
      due7,
      due30,
      expiringWarranties,
      recentRecords,
      unreadNotifications,
    ] = await Promise.all([
      prisma.asset.count({
        where: { householdId, deletedAt: null },
      }),
      prisma.maintenanceSchedule.findMany({
        where: {
          isActive: true,
          nextDueAt: { lt: now },
          asset: { householdId, deletedAt: null },
        },
        include: { asset: { select: { id: true, name: true } } },
        orderBy: { nextDueAt: "asc" },
        take: 10,
      }),
      prisma.maintenanceSchedule.count({
        where: {
          isActive: true,
          nextDueAt: { gte: now, lte: in7 },
          asset: { householdId, deletedAt: null },
        },
      }),
      prisma.maintenanceSchedule.findMany({
        where: {
          isActive: true,
          nextDueAt: { gte: now, lte: in30 },
          asset: { householdId, deletedAt: null },
        },
        include: { asset: { select: { id: true, name: true } } },
        orderBy: { nextDueAt: "asc" },
        take: 10,
      }),
      prisma.warranty.findMany({
        where: {
          endsOn: { gte: now, lte: in30 },
          asset: { householdId, deletedAt: null },
        },
        include: { asset: { select: { id: true, name: true } } },
        orderBy: { endsOn: "asc" },
        take: 10,
      }),
      prisma.serviceRecord.findMany({
        where: { asset: { householdId, deletedAt: null } },
        include: { asset: { select: { id: true, name: true } } },
        orderBy: { performedAt: "desc" },
        take: 8,
      }),
      prisma.notification.count({
        where: { userId: user.id, householdId, readAt: null },
      }),
    ]);

    const payload = {
      summary: {
        assetCount,
        overdueCount: overdueSchedules.length,
        dueIn7Days: due7,
        expiringWarrantyCount: expiringWarranties.length,
        unreadNotifications,
      },
      overdueSchedules,
      upcomingSchedules: due30,
      expiringWarranties,
      recentRecords,
    };

    await cacheSet(cacheKey, payload, 30);
    return ok(payload);
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function listAuditLogs(request: NextRequest, householdId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    await requireHouseholdMember(user.id, householdId, HouseholdRole.MANAGER);
    const url = new URL(request.url);
    const pagination = paginationSchema.parse({
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });
    const entityType = url.searchParams.get("entityType") || undefined;
    const where = {
      householdId,
      ...(entityType ? { entityType } : {}),
    };
    const [total, items] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          actor: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
    ]);
    return ok({
      items,
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.ceil(total / pagination.pageSize),
    });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function listNotifications(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    const url = new URL(request.url);
    const pagination = paginationSchema.parse({
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });
    const unreadOnly = url.searchParams.get("unreadOnly") === "true";
    const where = {
      userId: user.id,
      ...(unreadOnly ? { readAt: null } : {}),
    };
    const [total, items] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
    ]);
    return ok({
      items,
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.ceil(total / pagination.pageSize),
    });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function markNotificationRead(request: NextRequest, id: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    await prisma.notification.updateMany({
      where: { id, userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return ok({ read: true });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function markAllNotificationsRead(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return ok({ read: true });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
