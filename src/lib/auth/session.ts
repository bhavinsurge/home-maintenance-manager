import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { HouseholdRole } from "@homestead/database";
import { prisma } from "@/lib/db/prisma";
import { unauthorized, forbidden } from "@/lib/errors/app-error";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { roleAtLeast } from "@/lib/auth/rbac";

export { canAssignRole, canManageMembers, roleAtLeast } from "@/lib/auth/rbac";

export const ACCESS_COOKIE = "hmm_access";
export const REFRESH_COOKIE = "hmm_refresh";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
};

export function cookieSecure() {
  return process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";
}

export function accessCookieOptions(maxAge = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900)) {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function refreshCookieOptions(maxAge = Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 2592000)) {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function getAccessTokenFromRequest(request: NextRequest) {
  return request.cookies.get(ACCESS_COOKIE)?.value ?? null;
}

export async function requireUser(request: NextRequest): Promise<AuthUser> {
  const token = await getAccessTokenFromRequest(request);
  if (!token) throw unauthorized();

  try {
    const payload = await verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, fullName: true },
    });
    if (!user) throw unauthorized("User no longer exists");
    return user;
  } catch {
    throw unauthorized("Invalid or expired session");
  }
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = await verifyAccessToken(token);
    return prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, fullName: true },
    });
  } catch {
    return null;
  }
}

export async function requireHouseholdMember(
  userId: string,
  householdId: string,
  minimumRole: HouseholdRole = HouseholdRole.MEMBER,
) {
  const membership = await prisma.householdMember.findUnique({
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
