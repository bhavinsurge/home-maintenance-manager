import { NextRequest } from "next/server";
import { HouseholdRole, Prisma } from "@homestead/database";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/audit";
import {
  canAssignRole,
  canManageMembers,
  requireHouseholdMember,
  requireUser,
} from "@/lib/auth/session";
import { badRequest, conflict, forbidden, notFound } from "@/lib/errors/app-error";
import { getRequestId } from "@/lib/http/request";
import { created, handleRouteError, ok } from "@/lib/http/response";
import { cacheDel } from "@/lib/cache/redis";
import {
  householdCreateSchema,
  householdUpdateSchema,
  memberAddSchema,
  memberRoleSchema,
} from "@/lib/validation/schemas";

export async function listHouseholds(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    const memberships = await prisma.householdMember.findMany({
      where: { userId: user.id },
      include: { household: true },
      orderBy: { createdAt: "asc" },
    });
    return ok({
      items: memberships.map((m) => ({
        ...m.household,
        role: m.role,
        membershipId: m.id,
      })),
    });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function createHousehold(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    const body = householdCreateSchema.parse(await request.json());
    const household = await prisma.$transaction(async (tx) => {
      const createdHh = await tx.household.create({
        data: {
          name: body.name,
          addressLine1: body.addressLine1 ?? null,
          addressLine2: body.addressLine2 ?? null,
          city: body.city ?? null,
          region: body.region ?? null,
          postalCode: body.postalCode ?? null,
          country: body.country ?? null,
          notes: body.notes ?? null,
          createdById: user.id,
        },
      });
      await tx.householdMember.create({
        data: {
          householdId: createdHh.id,
          userId: user.id,
          role: HouseholdRole.OWNER,
        },
      });
      return createdHh;
    });

    await writeAudit({
      householdId: household.id,
      actorUserId: user.id,
      action: "HOUSEHOLD_CREATED",
      entityType: "household",
      entityId: household.id,
      metadata: { name: household.name },
    });

    return created({ household, role: HouseholdRole.OWNER });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function getHousehold(request: NextRequest, householdId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    const membership = await requireHouseholdMember(user.id, householdId);
    const household = await prisma.household.findUnique({ where: { id: householdId } });
    if (!household) throw notFound("Household not found");
    return ok({ household, role: membership.role });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function updateHousehold(request: NextRequest, householdId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    await requireHouseholdMember(user.id, householdId, HouseholdRole.MANAGER);
    const body = householdUpdateSchema.parse(await request.json());
    const household = await prisma.household.update({
      where: { id: householdId },
      data: body,
    });
    await cacheDel(`dashboard:${householdId}`);
    await writeAudit({
      householdId,
      actorUserId: user.id,
      action: "HOUSEHOLD_UPDATED",
      entityType: "household",
      entityId: householdId,
      metadata: body as Prisma.InputJsonValue,
    });
    return ok({ household });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function deleteHousehold(request: NextRequest, householdId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    await requireHouseholdMember(user.id, householdId, HouseholdRole.OWNER);
    await prisma.household.delete({ where: { id: householdId } });
    await writeAudit({
      actorUserId: user.id,
      action: "HOUSEHOLD_DELETED",
      entityType: "household",
      entityId: householdId,
    });
    return ok({ deleted: true });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function listMembers(request: NextRequest, householdId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    await requireHouseholdMember(user.id, householdId);
    const members = await prisma.householdMember.findMany({
      where: { householdId },
      include: { user: { select: { id: true, email: true, fullName: true } } },
      orderBy: { createdAt: "asc" },
    });
    return ok({
      items: members.map((m) => ({
        id: m.id,
        role: m.role,
        createdAt: m.createdAt,
        user: m.user,
      })),
    });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function addMember(request: NextRequest, householdId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    const actor = await requireHouseholdMember(user.id, householdId, HouseholdRole.MANAGER);
    const body = memberAddSchema.parse(await request.json());
    if (!canAssignRole(actor.role, body.role)) {
      throw forbidden("You cannot assign this role");
    }
    const target = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!target) throw notFound("No user exists with that email. They must register first.");

    try {
      const member = await prisma.householdMember.create({
        data: {
          householdId,
          userId: target.id,
          role: body.role,
        },
        include: { user: { select: { id: true, email: true, fullName: true } } },
      });
      await writeAudit({
        householdId,
        actorUserId: user.id,
        action: "MEMBER_ADDED",
        entityType: "household_member",
        entityId: member.id,
        metadata: { email: target.email, role: body.role },
      });
      return created({
        member: {
          id: member.id,
          role: member.role,
          createdAt: member.createdAt,
          user: member.user,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw conflict("User is already a member of this household");
      }
      throw err;
    }
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function updateMemberRole(
  request: NextRequest,
  householdId: string,
  memberId: string,
) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    const actor = await requireHouseholdMember(user.id, householdId, HouseholdRole.OWNER);
    const body = memberRoleSchema.parse(await request.json());
    const member = await prisma.householdMember.findFirst({
      where: { id: memberId, householdId },
    });
    if (!member) throw notFound("Member not found");

    if (body.role === HouseholdRole.OWNER) {
      throw badRequest("Use ownership transfer flow; cannot set OWNER via role patch");
    }
    if (member.role === HouseholdRole.OWNER) {
      const ownerCount = await prisma.householdMember.count({
        where: { householdId, role: HouseholdRole.OWNER },
      });
      if (ownerCount <= 1) throw badRequest("Cannot demote the last OWNER");
    }
    if (!canAssignRole(actor.role, body.role)) throw forbidden();

    const updated = await prisma.householdMember.update({
      where: { id: member.id },
      data: { role: body.role },
      include: { user: { select: { id: true, email: true, fullName: true } } },
    });
    await writeAudit({
      householdId,
      actorUserId: user.id,
      action: "MEMBER_ROLE_UPDATED",
      entityType: "household_member",
      entityId: member.id,
      metadata: { role: body.role },
    });
    return ok({
      member: {
        id: updated.id,
        role: updated.role,
        createdAt: updated.createdAt,
        user: updated.user,
      },
    });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function removeMember(
  request: NextRequest,
  householdId: string,
  memberId: string,
) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    const actor = await requireHouseholdMember(user.id, householdId, HouseholdRole.MANAGER);
    const member = await prisma.householdMember.findFirst({
      where: { id: memberId, householdId },
    });
    if (!member) throw notFound("Member not found");
    if (!canManageMembers(actor.role, member.role)) {
      throw forbidden("You cannot remove this member");
    }
    if (member.role === HouseholdRole.OWNER) {
      const ownerCount = await prisma.householdMember.count({
        where: { householdId, role: HouseholdRole.OWNER },
      });
      if (ownerCount <= 1) throw badRequest("Cannot remove the last OWNER");
    }
    await prisma.householdMember.delete({ where: { id: member.id } });
    await writeAudit({
      householdId,
      actorUserId: user.id,
      action: "MEMBER_REMOVED",
      entityType: "household_member",
      entityId: member.id,
    });
    return ok({ deleted: true });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
