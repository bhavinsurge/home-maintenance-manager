import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { PrismaModule } from "./database/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { HouseholdsModule } from "./households/households.module";
import { AssetsModule } from "./assets/assets.module";
import { MaintenanceModule } from "./maintenance/maintenance.module";
import { DocumentsModule } from "./documents/documents.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { AuditModule } from "./audit/audit.module";
import { AppExceptionFilter } from "./common/filters/app-exception.filter";
import { ResponseEnvelopeInterceptor } from "./common/interceptors/response-envelope.interceptor";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"],
    }),
    PrismaModule,
    AuthModule,
    HouseholdsModule,
    AssetsModule,
    MaintenanceModule,
    DocumentsModule,
    DashboardModule,
    NotificationsModule,
    AuditModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AppExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
  ],
})
export class AppModule {}
