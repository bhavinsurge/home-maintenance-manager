import { Injectable } from '@nestjs/common';
import {
  AssetCategory,
  AssetStatus,
  HouseholdRole,
  Prisma,
} from '@homestead/database';
import { PrismaService } from '../database/prisma.service';
import { HouseholdRbacService } from '../auth/household-rbac.service';
import { notFound } from '../common/errors/app-error';
import { cacheDel } from '../lib/redis';
import type { z } from 'zod';
import type { assetCreateSchema, assetUpdateSchema } from '../lib/schemas';

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: HouseholdRbacService,
  ) {}

  async loadAssetForUser(
    userId: string,
    assetId: string,
    minimum: HouseholdRole = HouseholdRole.MEMBER,
  ) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, deletedAt: null },
    });
    if (!asset) throw notFound('Asset not found');
    const membership = await this.rbac.requireHouseholdMember(
      userId,
      asset.householdId,
      minimum,
    );
    return { asset, membership };
  }

  async list(
    userId: string,
    householdId: string,
    query: {
      q?: string;
      category?: AssetCategory;
      status?: AssetStatus;
      page: number;
      pageSize: number;
    },
  ) {
    await this.rbac.requireHouseholdMember(userId, householdId);
    const where: Prisma.AssetWhereInput = {
      householdId,
      deletedAt: null,
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { manufacturer: { contains: query.q, mode: 'insensitive' } },
              { model: { contains: query.q, mode: 'insensitive' } },
              { serialNumber: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.asset.count({ where }),
      this.prisma.asset.findMany({
        where,
        orderBy: [{ name: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async create(
    userId: string,
    householdId: string,
    body: z.infer<typeof assetCreateSchema>,
  ) {
    await this.rbac.requireHouseholdMember(
      userId,
      householdId,
      HouseholdRole.MANAGER,
    );
    const asset = await this.prisma.asset.create({
      data: {
        householdId,
        name: body.name,
        category: body.category,
        status: body.status ?? AssetStatus.ACTIVE,
        manufacturer: body.manufacturer ?? null,
        model: body.model ?? null,
        serialNumber: body.serialNumber ?? null,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        purchasePrice: body.purchasePrice ?? null,
        locationNotes: body.locationNotes ?? null,
        notes: body.notes ?? null,
        createdById: userId,
      },
    });
    await cacheDel(`dashboard:${householdId}`);
    await this.prisma.writeAudit({
      householdId,
      actorUserId: userId,
      action: 'ASSET_CREATED',
      entityType: 'asset',
      entityId: asset.id,
      metadata: { name: asset.name },
    });
    return { asset };
  }

  async get(userId: string, assetId: string) {
    const { asset, membership } = await this.loadAssetForUser(userId, assetId);
    const [schedules, warranties, recentRecords, documents] = await Promise.all(
      [
        this.prisma.maintenanceSchedule.findMany({
          where: { assetId, isActive: true },
          orderBy: { nextDueAt: 'asc' },
        }),
        this.prisma.warranty.findMany({
          where: { assetId },
          orderBy: { endsOn: 'asc' },
        }),
        this.prisma.serviceRecord.findMany({
          where: { assetId },
          orderBy: { performedAt: 'desc' },
          take: 10,
        }),
        this.prisma.document.findMany({
          where: { assetId, deletedAt: null },
          orderBy: { createdAt: 'desc' },
        }),
      ],
    );
    return {
      asset,
      role: membership.role,
      schedules,
      warranties,
      recentRecords,
      documents,
    };
  }

  async update(
    userId: string,
    assetId: string,
    body: z.infer<typeof assetUpdateSchema>,
  ) {
    const { asset } = await this.loadAssetForUser(
      userId,
      assetId,
      HouseholdRole.MANAGER,
    );
    const updated = await this.prisma.asset.update({
      where: { id: asset.id },
      data: {
        ...body,
        purchaseDate:
          body.purchaseDate === undefined
            ? undefined
            : body.purchaseDate
              ? new Date(body.purchaseDate)
              : null,
      },
    });
    await cacheDel(`dashboard:${asset.householdId}`);
    await this.prisma.writeAudit({
      householdId: asset.householdId,
      actorUserId: userId,
      action: 'ASSET_UPDATED',
      entityType: 'asset',
      entityId: asset.id,
      metadata: body,
    });
    return { asset: updated };
  }

  async remove(userId: string, assetId: string) {
    const { asset } = await this.loadAssetForUser(
      userId,
      assetId,
      HouseholdRole.MANAGER,
    );
    await this.prisma.asset.update({
      where: { id: asset.id },
      data: { deletedAt: new Date(), status: AssetStatus.DISPOSED },
    });
    await cacheDel(`dashboard:${asset.householdId}`);
    await this.prisma.writeAudit({
      householdId: asset.householdId,
      actorUserId: userId,
      action: 'ASSET_DELETED',
      entityType: 'asset',
      entityId: asset.id,
    });
    return { deleted: true };
  }
}
