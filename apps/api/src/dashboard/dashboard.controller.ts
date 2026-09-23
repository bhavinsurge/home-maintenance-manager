import { Controller, Get, Param } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';

@Controller('households/:householdId/dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  get(
    @CurrentUser() user: AuthUser,
    @Param('householdId') householdId: string,
  ) {
    return this.dashboard.get(user.id, householdId);
  }
}
