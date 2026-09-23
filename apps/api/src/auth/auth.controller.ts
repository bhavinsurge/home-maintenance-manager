import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodBody } from '../common/pipes/zod-validation.pipe';
import { loginSchema, registerSchema } from '../lib/schemas';
import { enforceRateLimit } from '../lib/redis';
import { REFRESH_COOKIE } from '../lib/cookies';
import type { AuthUser } from './auth.types';
import type { z } from 'zod';

function clientIp(req: Request) {
  return (
    req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
    req.headers['x-real-ip']?.toString() ||
    req.ip ||
    'unknown'
  );
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(201)
  async register(
    @Body(ZodBody(registerSchema)) body: z.infer<typeof registerSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await enforceRateLimit(`register:${clientIp(req)}`, 5, 15 * 60 * 1000);
    return this.auth.register(body, res, {
      userAgent: req.headers['user-agent'],
      ip: clientIp(req),
    });
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(ZodBody(loginSchema)) body: z.infer<typeof loginSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await enforceRateLimit(`login:${clientIp(req)}`, 10, 15 * 60 * 1000);
    return this.auth.login(body, res, {
      userAgent: req.headers['user-agent'],
      ip: clientIp(req),
    });
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refresh = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    return this.auth.logout(refresh, res);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await enforceRateLimit(`refresh:${clientIp(req)}`, 30, 15 * 60 * 1000);
    const refresh = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    return this.auth.refresh(refresh, res, {
      userAgent: req.headers['user-agent'],
      ip: clientIp(req),
    });
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user);
  }
}
