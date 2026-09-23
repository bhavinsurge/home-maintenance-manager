import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../database/prisma.service';
import { conflict, unauthorized } from '../common/errors/app-error';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
} from '../lib/cookies';
import {
  generateRefreshToken,
  hashPassword,
  hashToken,
  refreshExpiresAt,
  signAccessToken,
  verifyPassword,
} from '../lib/tokens';
import type { AuthUser } from './auth.types';
import type { z } from 'zod';
import type { loginSchema, registerSchema } from '../lib/schemas';

type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private async issueSession(
    res: Response,
    user: { id: string; email: string; fullName: string },
    meta: { userAgent?: string; ip?: string },
  ) {
    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
    });
    const refreshToken = generateRefreshToken();
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: refreshExpiresAt(),
        userAgent: meta.userAgent ?? null,
        ip: meta.ip ?? null,
      },
    });
    res.cookie(ACCESS_COOKIE, accessToken, accessCookieOptions());
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  }

  async register(
    body: RegisterInput,
    res: Response,
    meta: { userAgent?: string; ip?: string },
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (existing) throw conflict('An account with this email already exists');

    const user = await this.prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        fullName: body.fullName,
        passwordHash: await hashPassword(body.password),
      },
      select: { id: true, email: true, fullName: true, createdAt: true },
    });

    await this.prisma.writeAudit({
      actorUserId: user.id,
      action: 'USER_REGISTERED',
      entityType: 'user',
      entityId: user.id,
    });

    await this.issueSession(res, user, meta);
    return { user };
  }

  async login(
    body: LoginInput,
    res: Response,
    meta: { userAgent?: string; ip?: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw unauthorized('Invalid email or password');
    }

    const safe = { id: user.id, email: user.email, fullName: user.fullName };
    await this.prisma.writeAudit({
      actorUserId: user.id,
      action: 'USER_LOGIN',
      entityType: 'user',
      entityId: user.id,
    });
    await this.issueSession(res, safe, meta);
    return { user: safe };
  }

  async logout(refresh: string | undefined, res: Response) {
    if (refresh) {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(refresh), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    res.cookie(ACCESS_COOKIE, '', { ...accessCookieOptions(0), maxAge: 0 });
    res.cookie(REFRESH_COOKIE, '', { ...refreshCookieOptions(0), maxAge: 0 });
    return { loggedOut: true };
  }

  async refresh(
    refresh: string | undefined,
    res: Response,
    meta: { userAgent?: string; ip?: string },
  ) {
    if (!refresh) throw unauthorized('Missing refresh token');

    const tokenHash = hashToken(refresh);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw unauthorized('Refresh token is invalid or expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
      select: { id: true, email: true, fullName: true },
    });
    if (!user) throw unauthorized();

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    await this.issueSession(res, user, meta);
    return { user };
  }

  async me(user: AuthUser) {
    const memberships = await this.prisma.householdMember.findMany({
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
      orderBy: { createdAt: 'asc' },
    });

    return {
      user,
      households: memberships.map((m) => ({
        id: m.household.id,
        name: m.household.name,
        role: m.role,
        city: m.household.city,
        region: m.household.region,
        country: m.household.country,
      })),
    };
  }
}
