import { Controller, Get, Param, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodQuery } from '../common/pipes/zod-validation.pipe';
import { auditListQuerySchema } from '../lib/schemas';
import type { AuthUser } from '../auth/auth.types';
import type { z } from 'zod';

@Controller('households/:householdId/audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Param('householdId') householdId: string,
    @Query(ZodQuery(auditListQuerySchema))
    query: z.infer<typeof auditListQuerySchema>,
  ) {
    return this.audit.list(user.id, householdId, query);
  }
}
