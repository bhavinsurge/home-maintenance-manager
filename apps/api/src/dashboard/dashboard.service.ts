import { Injectable } from '@nestjs/common';
import { addDays } from 'date-fns';
import { PrismaService } from '../database/prisma.service';
import { HouseholdRbacService } from '../auth/household-rbac.service';
import { cacheGet, cacheSet } from '../lib/redis';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: HouseholdRbacService,
  ) {}

  async get(userId: string, householdId: string) {
    await this.rbac.requireHouseholdMember(userId, householdId);

    const cacheKey = `dashboard:${householdId}:${userId}`;
    const cached = await cacheGet<unknown>(cacheKey);
    if (cached) return cached;

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
      this.prisma.asset.count({
        where: { householdId, deletedAt: null },
      }),
      this.prisma.maintenanceSchedule.findMany({
        where: {
          isActive: true,
          nextDueAt: { lt: now },
          asset: { householdId, deletedAt: null },
        },
        include: { asset: { select: { id: true, name: true } } },
        orderBy: { nextDueAt: 'asc' },
        take: 10,
      }),
      this.prisma.maintenanceSchedule.count({
        where: {
          isActive: true,
          nextDueAt: { gte: now, lte: in7 },
          asset: { householdId, deletedAt: null },
        },
      }),
      this.prisma.maintenanceSchedule.findMany({
        where: {
          isActive: true,
          nextDueAt: { gte: now, lte: in30 },
          asset: { householdId, deletedAt: null },
        },
        include: { asset: { select: { id: true, name: true } } },
        orderBy: { nextDueAt: 'asc' },
        take: 10,
      }),
      this.prisma.warranty.findMany({
        where: {
          endsOn: { gte: now, lte: in30 },
          asset: { householdId, deletedAt: null },
        },
        include: { asset: { select: { id: true, name: true } } },
        orderBy: { endsOn: 'asc' },
        take: 10,
      }),
      this.prisma.serviceRecord.findMany({
        where: { asset: { householdId, deletedAt: null } },
        include: { asset: { select: { id: true, name: true } } },
        orderBy: { performedAt: 'desc' },
        take: 8,
      }),
      this.prisma.notification.count({
        where: { userId, householdId, readAt: null },
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
    return payload;
  }
}
