import { HouseholdRole } from '@homestead/database';

const ROLE_RANK: Record<HouseholdRole, number> = {
  MEMBER: 1,
  MANAGER: 2,
  OWNER: 3,
};

export function roleAtLeast(role: HouseholdRole, minimum: HouseholdRole) {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function canManageMembers(actor: HouseholdRole, target: HouseholdRole) {
  if (actor === HouseholdRole.OWNER) return true;
  if (actor === HouseholdRole.MANAGER && target === HouseholdRole.MEMBER)
    return true;
  return false;
}

export function canAssignRole(actor: HouseholdRole, newRole: HouseholdRole) {
  if (newRole === HouseholdRole.OWNER) return false;
  if (actor === HouseholdRole.OWNER) return true;
  if (actor === HouseholdRole.MANAGER && newRole === HouseholdRole.MEMBER)
    return true;
  return false;
}
