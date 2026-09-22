import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
  requireUser,
} from "@/lib/auth/session";
import {
  generateRefreshToken,
  hashPassword,
  hashToken,
  refreshExpiresAt,
  signAccessToken,
  verifyPassword,
} from "@/lib/auth/tokens";
import { conflict, unauthorized, validationError } from "@/lib/errors/app-error";
import { clientIp, enforceRateLimit, getRequestId } from "@/lib/http/request";
import { created, handleRouteError, ok } from "@/lib/http/response";
import { loginSchema, registerSchema } from "@/lib/validation/schemas";
import { writeAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

async function issueSession(
  response: NextResponse,
  user: { id: string; email: string; fullName: string },
  request: NextRequest,
) {
  const accessToken = await signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiresAt(),
      userAgent: request.headers.get("user-agent"),
      ip: clientIp(request),
    },
  });
  response.cookies.set(ACCESS_COOKIE, accessToken, accessCookieOptions());
  response.cookies.set(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  return response;
}

export async function POST_register(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    await enforceRateLimit(`register:${clientIp(request)}`, 5, 15 * 60 * 1000);
    const body = registerSchema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) throw conflict("An account with this email already exists");

    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        fullName: body.fullName,
        passwordHash: await hashPassword(body.password),
      },
      select: { id: true, email: true, fullName: true, createdAt: true },
    });

    await writeAudit({
      actorUserId: user.id,
      action: "USER_REGISTERED",
      entityType: "user",
      entityId: user.id,
    });

    const response = created({ user });
    return issueSession(response, user, request);
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function POST_login(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    await enforceRateLimit(`login:${clientIp(request)}`, 10, 15 * 60 * 1000);
    const body = loginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw unauthorized("Invalid email or password");
    }

    const safe = { id: user.id, email: user.email, fullName: user.fullName };
    await writeAudit({
      actorUserId: user.id,
      action: "USER_LOGIN",
      entityType: "user",
      entityId: user.id,
    });
    const response = ok({ user: safe });
    return issueSession(response, safe, request);
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function POST_logout(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
    if (refresh) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(refresh), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    const response = ok({ loggedOut: true });
    response.cookies.set(ACCESS_COOKIE, "", { ...accessCookieOptions(0), maxAge: 0 });
    response.cookies.set(REFRESH_COOKIE, "", { ...refreshCookieOptions(0), maxAge: 0 });
    return response;
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function POST_refresh(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    await enforceRateLimit(`refresh:${clientIp(request)}`, 30, 15 * 60 * 1000);
    const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
    if (!refresh) throw unauthorized("Missing refresh token");

    const tokenHash = hashToken(refresh);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw unauthorized("Refresh token is invalid or expired");
    }

    const user = await prisma.user.findUnique({
      where: { id: stored.userId },
      select: { id: true, email: true, fullName: true },
    });
    if (!user) throw unauthorized();

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      }),
    ]);

    const response = ok({ user });
    return issueSession(response, user, request);
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function GET_me(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    const memberships = await prisma.householdMember.findMany({
      where: { userId: user.id },
      include: {
        household: {
          select: {
            id: true,
            name: true,
            city: true,
            region: true,
            country: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return ok({
      user,
      households: memberships.map((m) => ({
        id: m.household.id,
        name: m.household.name,
        role: m.role,
        city: m.household.city,
        region: m.household.region,
        country: m.household.country,
      })),
    });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export function parseJsonOrThrow(value: unknown) {
  if (value === null || value === undefined) throw validationError("Request body is required");
  return value;
}
