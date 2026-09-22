import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { IS_PUBLIC_KEY } from "../common/decorators/public.decorator";
import { AppError, unauthorized } from "../common/errors/app-error";
import { PrismaService } from "../database/prisma.service";
import { ACCESS_COOKIE } from "../lib/cookies";
import { verifyAccessToken } from "../lib/tokens";
import type { AuthUser } from "./auth.types";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const token = request.cookies?.[ACCESS_COOKIE] as string | undefined;
    if (!token) throw unauthorized();

    try {
      const payload = await verifyAccessToken(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, fullName: true },
      });
      if (!user) throw unauthorized("User no longer exists");
      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw unauthorized("Invalid or expired session");
    }
  }
}
