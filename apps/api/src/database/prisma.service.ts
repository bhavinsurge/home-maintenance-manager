import { Injectable } from '@nestjs/common';
import { Prisma, prisma as prismaSingleton } from '@homestead/database';
import type { PrismaClient } from '@homestead/database';

@Injectable()
export class PrismaService {
  readonly client: PrismaClient = prismaSingleton;

  get user() {
    return this.client.user;
  }
  get refreshToken() {
    return this.client.refreshToken;
  }
  get household() {
    return this.client.household;
  }
  get householdMember() {
    return this.client.householdMember;
  }
  get asset() {
    return this.client.asset;
  }
  get maintenanceSchedule() {
    return this.client.maintenanceSchedule;
  }
  get serviceRecord() {
    return this.client.serviceRecord;
  }
  get warranty() {
    return this.client.warranty;
  }
  get document() {
    return this.client.document;
  }
  get notification() {
    return this.client.notification;
  }
  get auditLog() {
    return this.client.auditLog;
  }

  $transaction: PrismaClient['$transaction'] = this.client.$transaction.bind(
    this.client,
  );

  async writeAudit(input: {
    householdId?: string | null;
    actorUserId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    await this.client.auditLog.create({
      data: {
        householdId: input.householdId ?? null,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: input.metadata ?? undefined,
      },
    });
  }
}
