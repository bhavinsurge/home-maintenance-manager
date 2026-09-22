import { Injectable } from "@nestjs/common";
import { HouseholdRole, Prisma } from "@homestead/database";
import { PrismaService } from "../database/prisma.service";
import { HouseholdRbacService } from "../auth/household-rbac.service";
import { badRequest, conflict, forbidden, notFound } from "../common/errors/app-error";
import { canAssignRole, canManageMembers } from "../lib/rbac";
import { cacheDel } from "../lib/redis";
import type { z } from "zod";
import type {
  householdCreateSchema,
  householdUpdateSchema,
  memberAddSchema,
  memberRoleSchema,
} from "../lib/schemas";

@Injectable()
export class HouseholdsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: HouseholdRbacService,
  ) {}

  async list(userId: string) {
    const memberships = await this.prisma.householdMember.findMany({
      where: { userId },
      include: { household: true },
      orderBy: { createdAt: "asc" },
    });
    return {
      items: memberships.map((m) => ({
        ...m.household,
        role: m.role,
        membershipId: m.id,
      })),
    };
  }

  async create(userId: string, body: z.infer<typeof householdCreateSchema>) {
    const household = await this.prisma.$transaction(async (tx) => {
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
          createdById: userId,
        },
      });
      await tx.householdMember.create({
        data: {
          householdId: createdHh.id,
          userId,
          role: HouseholdRole.OWNER,
        },
      });
      return createdHh;
    });

    await this.prisma.writeAudit({
      householdId: household.id,
      actorUserId: userId,
      action: "HOUSEHOLD_CREATED",
      entityType: "household",
      entityId: household.id,
      metadata: { name: household.name },
    });

    return { household, role: HouseholdRole.OWNER };
  }

  async get(userId: string, householdId: string) {
    const membership = await this.rbac.requireHouseholdMember(userId, householdId);
    const household = await this.prisma.household.findUnique({ where: { id: householdId } });
    if (!household) throw notFound("Household not found");
    return { household, role: membership.role };
  }

  async update(
    userId: string,
    householdId: string,
    body: z.infer<typeof householdUpdateSchema>,
  ) {
    await this.rbac.requireHouseholdMember(userId, householdId, HouseholdRole.MANAGER);
    const household = await this.prisma.household.update({
      where: { id: householdId },
      data: body,
    });
    await cacheDel(`dashboard:${householdId}`);
    await this.prisma.writeAudit({
      householdId,
      actorUserId: userId,
      action: "HOUSEHOLD_UPDATED",
      entityType: "household",
      entityId: householdId,
      metadata: body as Prisma.InputJsonValue,
    });
    return { household };
  }

  async remove(userId: string, householdId: string) {
    await this.rbac.requireHouseholdMember(userId, householdId, HouseholdRole.OWNER);
    await this.prisma.household.delete({ where: { id: householdId } });
    await this.prisma.writeAudit({
      actorUserId: userId,
      action: "HOUSEHOLD_DELETED",
      entityType: "household",
      entityId: householdId,
    });
    return { deleted: true };
  }

  async listMembers(userId: string, householdId: string) {
    await this.rbac.requireHouseholdMember(userId, householdId);
    const members = await this.prisma.householdMember.findMany({
      where: { householdId },
      include: { user: { select: { id: true, email: true, fullName: true } } },
      orderBy: { createdAt: "asc" },
    });
    return {
      items: members.map((m) => ({
        id: m.id,
        role: m.role,
        createdAt: m.createdAt,
        user: m.user,
      })),
    };
  }

  async addMember(
    userId: string,
    householdId: string,
    body: z.infer<typeof memberAddSchema>,
  ) {
    const actor = await this.rbac.requireHouseholdMember(
      userId,
      householdId,
      HouseholdRole.MANAGER,
    );
    if (!canAssignRole(actor.role, body.role)) {
      throw forbidden("You cannot assign this role");
    }
    const target = await this.prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (!target) throw notFound("No user exists with that email. They must register first.");

    try {
      const member = await this.prisma.householdMember.create({
        data: {
          householdId,
          userId: target.id,
          role: body.role,
        },
        include: { user: { select: { id: true, email: true, fullName: true } } },
      });
      await this.prisma.writeAudit({
        householdId,
        actorUserId: userId,
        action: "MEMBER_ADDED",
        entityType: "household_member",
        entityId: member.id,
        metadata: { email: target.email, role: body.role },
      });
      return {
        member: {
          id: member.id,
          role: member.role,
          createdAt: member.createdAt,
          user: member.user,
        },
      };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw conflict("User is already a member of this household");
      }
      throw err;
    }
  }

  async updateMemberRole(
    userId: string,
    householdId: string,
    memberId: string,
    body: z.infer<typeof memberRoleSchema>,
  ) {
    const actor = await this.rbac.requireHouseholdMember(
      userId,
      householdId,
      HouseholdRole.OWNER,
    );
    const member = await this.prisma.householdMember.findFirst({
      where: { id: memberId, householdId },
    });
    if (!member) throw notFound("Member not found");

    if (body.role === HouseholdRole.OWNER) {
      throw badRequest("Use ownership transfer flow; cannot set OWNER via role patch");
    }
    if (member.role === HouseholdRole.OWNER) {
      const ownerCount = await this.prisma.householdMember.count({
        where: { householdId, role: HouseholdRole.OWNER },
      });
      if (ownerCount <= 1) throw badRequest("Cannot demote the last OWNER");
    }
    if (!canAssignRole(actor.role, body.role)) throw forbidden();

    const updated = await this.prisma.householdMember.update({
      where: { id: member.id },
      data: { role: body.role },
      include: { user: { select: { id: true, email: true, fullName: true } } },
    });
    await this.prisma.writeAudit({
      householdId,
      actorUserId: userId,
      action: "MEMBER_ROLE_UPDATED",
      entityType: "household_member",
      entityId: member.id,
      metadata: { role: body.role },
    });
    return {
      member: {
        id: updated.id,
        role: updated.role,
        createdAt: updated.createdAt,
        user: updated.user,
      },
    };
  }

  async removeMember(userId: string, householdId: string, memberId: string) {
    const actor = await this.rbac.requireHouseholdMember(
      userId,
      householdId,
      HouseholdRole.MANAGER,
    );
    const member = await this.prisma.householdMember.findFirst({
      where: { id: memberId, householdId },
    });
    if (!member) throw notFound("Member not found");
    if (!canManageMembers(actor.role, member.role)) {
      throw forbidden("You cannot remove this member");
    }
    if (member.role === HouseholdRole.OWNER) {
      const ownerCount = await this.prisma.householdMember.count({
        where: { householdId, role: HouseholdRole.OWNER },
      });
      if (ownerCount <= 1) throw badRequest("Cannot remove the last OWNER");
    }
    await this.prisma.householdMember.delete({ where: { id: member.id } });
    await this.prisma.writeAudit({
      householdId,
      actorUserId: userId,
      action: "MEMBER_REMOVED",
      entityType: "household_member",
      entityId: member.id,
    });
    return { deleted: true };
  }
}
