import { NextRequest } from "next/server";
import { AssetStatus, HouseholdRole, Prisma } from "@homestead/database";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/audit";
import { requireHouseholdMember, requireUser } from "@/lib/auth/session";
import { notFound } from "@/lib/errors/app-error";
import { getRequestId } from "@/lib/http/request";
import { created, handleRouteError, ok } from "@/lib/http/response";
import { cacheDel } from "@/lib/cache/redis";
import {
  assetCreateSchema,
  assetUpdateSchema,
  paginationSchema,
} from "@/lib/validation/schemas";
import { AssetCategory } from "@homestead/database";
import { z } from "zod";

async function loadAssetForUser(userId: string, assetId: string, minimum: HouseholdRole = HouseholdRole.MEMBER) {
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, deletedAt: null },
  });
  if (!asset) throw notFound("Asset not found");
  const membership = await requireHouseholdMember(userId, asset.householdId, minimum);
  return { asset, membership };
}

export async function listAssets(request: NextRequest, householdId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    await requireHouseholdMember(user.id, householdId);
    const url = new URL(request.url);
    const pagination = paginationSchema.parse({
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });
    const q = url.searchParams.get("q")?.trim() || undefined;
    const category = url.searchParams.get("category") || undefined;
    const status = url.searchParams.get("status") || undefined;

    const where: Prisma.AssetWhereInput = {
      householdId,
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { manufacturer: { contains: q, mode: "insensitive" } },
              { model: { contains: q, mode: "insensitive" } },
              { serialNumber: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(category ? { category: category as AssetCategory } : {}),
      ...(status ? { status: status as AssetStatus } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.asset.count({ where }),
      prisma.asset.findMany({
        where,
        orderBy: [{ name: "asc" }],
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

export async function createAsset(request: NextRequest, householdId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    await requireHouseholdMember(user.id, householdId, HouseholdRole.MANAGER);
    const body = assetCreateSchema.parse(await request.json());
    const asset = await prisma.asset.create({
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
        createdById: user.id,
      },
    });
    await cacheDel(`dashboard:${householdId}`);
    await writeAudit({
      householdId,
      actorUserId: user.id,
      action: "ASSET_CREATED",
      entityType: "asset",
      entityId: asset.id,
      metadata: { name: asset.name },
    });
    return created({ asset });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function getAsset(request: NextRequest, assetId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    const { asset, membership } = await loadAssetForUser(user.id, assetId);
    const [schedules, warranties, recentRecords, documents] = await Promise.all([
      prisma.maintenanceSchedule.findMany({
        where: { assetId, isActive: true },
        orderBy: { nextDueAt: "asc" },
      }),
      prisma.warranty.findMany({ where: { assetId }, orderBy: { endsOn: "asc" } }),
      prisma.serviceRecord.findMany({
        where: { assetId },
        orderBy: { performedAt: "desc" },
        take: 10,
      }),
      prisma.document.findMany({
        where: { assetId, deletedAt: null },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return ok({
      asset,
      role: membership.role,
      schedules,
      warranties,
      recentRecords,
      documents,
    });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function updateAsset(request: NextRequest, assetId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    const { asset } = await loadAssetForUser(user.id, assetId, HouseholdRole.MANAGER);
    const body = assetUpdateSchema.parse(await request.json());
    const updated = await prisma.asset.update({
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
    await writeAudit({
      householdId: asset.householdId,
      actorUserId: user.id,
      action: "ASSET_UPDATED",
      entityType: "asset",
      entityId: asset.id,
      metadata: body as Prisma.InputJsonValue,
    });
    return ok({ asset: updated });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function deleteAsset(request: NextRequest, assetId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    const { asset } = await loadAssetForUser(user.id, assetId, HouseholdRole.MANAGER);
    await prisma.asset.update({
      where: { id: asset.id },
      data: { deletedAt: new Date(), status: AssetStatus.DISPOSED },
    });
    await cacheDel(`dashboard:${asset.householdId}`);
    await writeAudit({
      householdId: asset.householdId,
      actorUserId: user.id,
      action: "ASSET_DELETED",
      entityType: "asset",
      entityId: asset.id,
    });
    return ok({ deleted: true });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export const assetListQuerySchema = z.object({
  q: z.string().optional(),
  category: z.nativeEnum(AssetCategory).optional(),
  status: z.nativeEnum(AssetStatus).optional(),
});
