import { Injectable } from "@nestjs/common";
import { HouseholdRole } from "@homestead/database";
import { PrismaService } from "../database/prisma.service";
import { forbidden } from "../common/errors/app-error";
import { roleAtLeast } from "../lib/rbac";

@Injectable()
export class HouseholdRbacService {
  constructor(private readonly prisma: PrismaService) {}

  async requireHouseholdMember(
    userId: string,
    householdId: string,
    minimumRole: HouseholdRole = HouseholdRole.MEMBER,
  ) {
    const membership = await this.prisma.householdMember.findUnique({
      where: {
        householdId_userId: { householdId, userId },
      },
    });
    if (!membership) throw forbidden("You are not a member of this household");
    if (!roleAtLeast(membership.role, minimumRole)) {
      throw forbidden("Insufficient household permissions");
    }
    return membership;
  }
}
