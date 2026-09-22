import { Injectable } from "@nestjs/common";
import { HouseholdRole } from "@homestead/database";
import { PrismaService } from "../database/prisma.service";
import { HouseholdRbacService } from "../auth/household-rbac.service";

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: HouseholdRbacService,
  ) {}

  async list(
    userId: string,
    householdId: string,
    query: { page: number; pageSize: number; entityType?: string },
  ) {
    await this.rbac.requireHouseholdMember(userId, householdId, HouseholdRole.MANAGER);
    const where = {
      householdId,
      ...(query.entityType ? { entityType: query.entityType } : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: {
          actor: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
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
}
