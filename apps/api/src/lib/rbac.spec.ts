import { HouseholdRole } from '@homestead/database';
import { canAssignRole, canManageMembers, roleAtLeast } from './rbac';

describe('rbac', () => {
  it('ranks roles correctly', () => {
    expect(roleAtLeast(HouseholdRole.OWNER, HouseholdRole.MANAGER)).toBe(true);
    expect(roleAtLeast(HouseholdRole.MEMBER, HouseholdRole.MANAGER)).toBe(
      false,
    );
  });

  it('restricts member management', () => {
    expect(canManageMembers(HouseholdRole.OWNER, HouseholdRole.MANAGER)).toBe(
      true,
    );
    expect(canManageMembers(HouseholdRole.MANAGER, HouseholdRole.MEMBER)).toBe(
      true,
    );
    expect(canManageMembers(HouseholdRole.MANAGER, HouseholdRole.OWNER)).toBe(
      false,
    );
  });

  it('blocks assigning OWNER', () => {
    expect(canAssignRole(HouseholdRole.OWNER, HouseholdRole.OWNER)).toBe(false);
    expect(canAssignRole(HouseholdRole.OWNER, HouseholdRole.MANAGER)).toBe(
      true,
    );
    expect(canAssignRole(HouseholdRole.MANAGER, HouseholdRole.MEMBER)).toBe(
      true,
    );
  });
});
