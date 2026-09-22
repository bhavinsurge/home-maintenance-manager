import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { HouseholdRbacService } from "./household-rbac.service";

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    HouseholdRbacService,
    AuthGuard,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AuthService, HouseholdRbacService, AuthGuard],
})
export class AuthModule {}
