import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodBody, ZodQuery } from '../common/pipes/zod-validation.pipe';
import {
  assetCreateSchema,
  assetListQuerySchema,
  assetUpdateSchema,
} from '../lib/schemas';
import type { AuthUser } from '../auth/auth.types';
import type { z } from 'zod';

@Controller()
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get('households/:householdId/assets')
  list(
    @CurrentUser() user: AuthUser,
    @Param('householdId') householdId: string,
    @Query(ZodQuery(assetListQuerySchema))
    query: z.infer<typeof assetListQuerySchema>,
  ) {
    return this.assets.list(user.id, householdId, query);
  }

  @Post('households/:householdId/assets')
  @HttpCode(201)
  create(
    @CurrentUser() user: AuthUser,
    @Param('householdId') householdId: string,
    @Body(ZodBody(assetCreateSchema)) body: z.infer<typeof assetCreateSchema>,
  ) {
    return this.assets.create(user.id, householdId, body);
  }

  @Get('assets/:id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.assets.get(user.id, id);
  }

  @Patch('assets/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(ZodBody(assetUpdateSchema)) body: z.infer<typeof assetUpdateSchema>,
  ) {
    return this.assets.update(user.id, id, body);
  }

  @Delete('assets/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.assets.remove(user.id, id);
  }
}
