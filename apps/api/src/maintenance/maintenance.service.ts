import { Injectable } from '@nestjs/common';
import { HouseholdRole, ScheduleFrequency } from '@homestead/database';
import { PrismaService } from '../database/prisma.service';
import { HouseholdRbacService } from '../auth/household-rbac.service';
import { notFound } from '../common/errors/app-error';
import { cacheDel } from '../lib/redis';
import { computeNextDueDate } from '../lib/recurrence';
import type { z } from 'zod';
import type {
  completeScheduleSchema,
  scheduleCreateSchema,
  scheduleUpdateSchema,
  serviceRecordCreateSchema,
  serviceRecordUpdateSchema,
  warrantyCreateSchema,
  warrantyUpdateSchema,
} from '../lib/schemas';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: HouseholdRbacService,
  ) {}

  private async assetMembership(
    userId: string,
    assetId: string,
    min: HouseholdRole = HouseholdRole.MEMBER,
  ) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, deletedAt: null },
    });
    if (!asset) throw notFound('Asset not found');
    const membership = await this.rbac.requireHouseholdMember(
      userId,
      asset.householdId,
      min,
    );
    return { asset, membership };
  }

  async listSchedules(userId: string, assetId: string) {
    await this.assetMembership(userId, assetId);
    const items = await this.prisma.maintenanceSchedule.findMany({
      where: { assetId },
      orderBy: [{ isActive: 'desc' }, { nextDueAt: 'asc' }],
    });
    return { items };
  }

  async createSchedule(
    userId: string,
    assetId: string,
    body: z.infer<typeof scheduleCreateSchema>,
  ) {
    const { asset } = await this.assetMembership(
      userId,
      assetId,
      HouseholdRole.MANAGER,
    );
    const schedule = await this.prisma.maintenanceSchedule.create({
      data: {
        assetId,
        title: body.title,
        description: body.description ?? null,
        frequency: body.frequency,
        intervalDays:
          body.frequency === ScheduleFrequency.CUSTOM_DAYS
            ? body.intervalDays
            : null,
        nextDueAt: new Date(body.nextDueAt),
        reminderDaysBefore: body.reminderDaysBefore ?? 7,
      },
    });
    await cacheDel(`dashboard:${asset.householdId}`);
    await this.prisma.writeAudit({
      householdId: asset.householdId,
      actorUserId: userId,
      action: 'SCHEDULE_CREATED',
      entityType: 'maintenance_schedule',
      entityId: schedule.id,
    });
    return { schedule };
  }

  async updateSchedule(
    userId: string,
    scheduleId: string,
    body: z.infer<typeof scheduleUpdateSchema>,
  ) {
    const schedule = await this.prisma.maintenanceSchedule.findUnique({
      where: { id: scheduleId },
      include: { asset: true },
    });
    if (!schedule || schedule.asset.deletedAt)
      throw notFound('Schedule not found');
    await this.rbac.requireHouseholdMember(
      userId,
      schedule.asset.householdId,
      HouseholdRole.MANAGER,
    );
    const updated = await this.prisma.maintenanceSchedule.update({
      where: { id: scheduleId },
      data: {
        ...body,
        nextDueAt: body.nextDueAt ? new Date(body.nextDueAt) : undefined,
        intervalDays:
          body.frequency === ScheduleFrequency.CUSTOM_DAYS ||
          body.intervalDays !== undefined
            ? body.intervalDays
            : undefined,
      },
    });
    await cacheDel(`dashboard:${schedule.asset.householdId}`);
    return { schedule: updated };
  }

  async deactivateSchedule(userId: string, scheduleId: string) {
    const schedule = await this.prisma.maintenanceSchedule.findUnique({
      where: { id: scheduleId },
      include: { asset: true },
    });
    if (!schedule || schedule.asset.deletedAt)
      throw notFound('Schedule not found');
    await this.rbac.requireHouseholdMember(
      userId,
      schedule.asset.householdId,
      HouseholdRole.MANAGER,
    );
    const updated = await this.prisma.maintenanceSchedule.update({
      where: { id: scheduleId },
      data: { isActive: false },
    });
    await cacheDel(`dashboard:${schedule.asset.householdId}`);
    return { schedule: updated };
  }

  async completeSchedule(
    userId: string,
    scheduleId: string,
    body: z.infer<typeof completeScheduleSchema>,
  ) {
    const performedAt = body.performedAt
      ? new Date(body.performedAt)
      : new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const schedule = await tx.maintenanceSchedule.findUnique({
        where: { id: scheduleId },
        include: { asset: true },
      });
      if (!schedule || schedule.asset.deletedAt)
        throw notFound('Schedule not found');

      const membership = await tx.householdMember.findUnique({
        where: {
          householdId_userId: {
            householdId: schedule.asset.householdId,
            userId,
          },
        },
      });
      if (!membership) throw notFound('Schedule not found');

      const serviceRecord = await tx.serviceRecord.create({
        data: {
          assetId: schedule.assetId,
          scheduleId: schedule.id,
          title: schedule.title,
          performedAt,
          cost: body.cost ?? null,
          vendor: body.vendor ?? null,
          notes: body.notes ?? null,
          createdById: userId,
        },
      });

      const nextDue = computeNextDueDate(
        schedule.frequency,
        performedAt,
        schedule.intervalDays,
      );
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
    await this.prisma.writeAudit({
      householdId: result.householdId,
      actorUserId: userId,
      action: 'SCHEDULE_COMPLETED',
      entityType: 'maintenance_schedule',
      entityId: scheduleId,
      metadata: { serviceRecordId: result.serviceRecord.id },
    });

    return {
      serviceRecord: result.serviceRecord,
      schedule: result.schedule,
    };
  }

  async listServiceRecords(userId: string, assetId: string) {
    await this.assetMembership(userId, assetId);
    const items = await this.prisma.serviceRecord.findMany({
      where: { assetId },
      orderBy: { performedAt: 'desc' },
    });
    return { items };
  }

  async createServiceRecord(
    userId: string,
    assetId: string,
    body: z.infer<typeof serviceRecordCreateSchema>,
  ) {
    const { asset } = await this.assetMembership(userId, assetId);
    const record = await this.prisma.serviceRecord.create({
      data: {
        assetId,
        scheduleId: body.scheduleId ?? null,
        title: body.title,
        performedAt: new Date(body.performedAt),
        cost: body.cost ?? null,
        vendor: body.vendor ?? null,
        notes: body.notes ?? null,
        createdById: userId,
      },
    });
    await cacheDel(`dashboard:${asset.householdId}`);
    await this.prisma.writeAudit({
      householdId: asset.householdId,
      actorUserId: userId,
      action: 'SERVICE_RECORD_CREATED',
      entityType: 'service_record',
      entityId: record.id,
    });
    return { serviceRecord: record };
  }

  async updateServiceRecord(
    userId: string,
    recordId: string,
    body: z.infer<typeof serviceRecordUpdateSchema>,
  ) {
    const record = await this.prisma.serviceRecord.findUnique({
      where: { id: recordId },
      include: { asset: true },
    });
    if (!record || record.asset.deletedAt)
      throw notFound('Service record not found');
    const membership = await this.rbac.requireHouseholdMember(
      userId,
      record.asset.householdId,
    );
    const isManager =
      membership.role === HouseholdRole.OWNER ||
      membership.role === HouseholdRole.MANAGER;
    if (!isManager && record.createdById !== userId) {
      throw notFound('Service record not found');
    }
    const updated = await this.prisma.serviceRecord.update({
      where: { id: recordId },
      data: {
        ...body,
        performedAt: body.performedAt ? new Date(body.performedAt) : undefined,
      },
    });
    return { serviceRecord: updated };
  }

  async deleteServiceRecord(userId: string, recordId: string) {
    const record = await this.prisma.serviceRecord.findUnique({
      where: { id: recordId },
      include: { asset: true },
    });
    if (!record || record.asset.deletedAt)
      throw notFound('Service record not found');
    await this.rbac.requireHouseholdMember(
      userId,
      record.asset.householdId,
      HouseholdRole.MANAGER,
    );
    await this.prisma.serviceRecord.delete({ where: { id: recordId } });
    await cacheDel(`dashboard:${record.asset.householdId}`);
    return { deleted: true };
  }

  async listWarranties(userId: string, assetId: string) {
    await this.assetMembership(userId, assetId);
    const items = await this.prisma.warranty.findMany({
      where: { assetId },
      orderBy: { endsOn: 'asc' },
    });
    return { items };
  }

  async createWarranty(
    userId: string,
    assetId: string,
    body: z.infer<typeof warrantyCreateSchema>,
  ) {
    const { asset } = await this.assetMembership(
      userId,
      assetId,
      HouseholdRole.MANAGER,
    );
    const warranty = await this.prisma.warranty.create({
      data: {
        assetId,
        provider: body.provider,
        coverageNotes: body.coverageNotes ?? null,
        startsOn: new Date(body.startsOn),
        endsOn: new Date(body.endsOn),
      },
    });
    await cacheDel(`dashboard:${asset.householdId}`);
    await this.prisma.writeAudit({
      householdId: asset.householdId,
      actorUserId: userId,
      action: 'WARRANTY_CREATED',
      entityType: 'warranty',
      entityId: warranty.id,
    });
    return { warranty };
  }

  async updateWarranty(
    userId: string,
    warrantyId: string,
    body: z.infer<typeof warrantyUpdateSchema>,
  ) {
    const warranty = await this.prisma.warranty.findUnique({
      where: { id: warrantyId },
      include: { asset: true },
    });
    if (!warranty || warranty.asset.deletedAt)
      throw notFound('Warranty not found');
    await this.rbac.requireHouseholdMember(
      userId,
      warranty.asset.householdId,
      HouseholdRole.MANAGER,
    );
    const updated = await this.prisma.warranty.update({
      where: { id: warrantyId },
      data: {
        ...body,
        startsOn: body.startsOn ? new Date(body.startsOn) : undefined,
        endsOn: body.endsOn ? new Date(body.endsOn) : undefined,
      },
    });
    await cacheDel(`dashboard:${warranty.asset.householdId}`);
    return { warranty: updated };
  }

  async deleteWarranty(userId: string, warrantyId: string) {
    const warranty = await this.prisma.warranty.findUnique({
      where: { id: warrantyId },
      include: { asset: true },
    });
    if (!warranty || warranty.asset.deletedAt)
      throw notFound('Warranty not found');
    await this.rbac.requireHouseholdMember(
      userId,
      warranty.asset.householdId,
      HouseholdRole.MANAGER,
    );
    await this.prisma.warranty.delete({ where: { id: warrantyId } });
    await cacheDel(`dashboard:${warranty.asset.householdId}`);
    return { deleted: true };
  }
}
