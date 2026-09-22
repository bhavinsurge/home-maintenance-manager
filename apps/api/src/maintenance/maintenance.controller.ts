import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { MaintenanceService } from "./maintenance.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodBody } from "../common/pipes/zod-validation.pipe";
import {
  completeScheduleSchema,
  scheduleCreateSchema,
  scheduleUpdateSchema,
  serviceRecordCreateSchema,
  serviceRecordUpdateSchema,
  warrantyCreateSchema,
  warrantyUpdateSchema,
} from "../lib/schemas";
import type { AuthUser } from "../auth/auth.types";
import type { z } from "zod";

@Controller()
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Get("assets/:assetId/schedules")
  listSchedules(@CurrentUser() user: AuthUser, @Param("assetId") assetId: string) {
    return this.maintenance.listSchedules(user.id, assetId);
  }

  @Post("assets/:assetId/schedules")
  @HttpCode(201)
  createSchedule(
    @CurrentUser() user: AuthUser,
    @Param("assetId") assetId: string,
    @Body(ZodBody(scheduleCreateSchema)) body: z.infer<typeof scheduleCreateSchema>,
  ) {
    return this.maintenance.createSchedule(user.id, assetId, body);
  }

  @Patch("schedules/:id")
  updateSchedule(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(ZodBody(scheduleUpdateSchema)) body: z.infer<typeof scheduleUpdateSchema>,
  ) {
    return this.maintenance.updateSchedule(user.id, id, body);
  }

  @Post("schedules/:id/complete")
  @HttpCode(200)
  completeSchedule(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(ZodBody(completeScheduleSchema)) body: z.infer<typeof completeScheduleSchema>,
  ) {
    return this.maintenance.completeSchedule(user.id, id, body);
  }

  @Delete("schedules/:id")
  deactivateSchedule(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.maintenance.deactivateSchedule(user.id, id);
  }

  @Get("assets/:assetId/service-records")
  listServiceRecords(@CurrentUser() user: AuthUser, @Param("assetId") assetId: string) {
    return this.maintenance.listServiceRecords(user.id, assetId);
  }

  @Post("assets/:assetId/service-records")
  @HttpCode(201)
  createServiceRecord(
    @CurrentUser() user: AuthUser,
    @Param("assetId") assetId: string,
    @Body(ZodBody(serviceRecordCreateSchema)) body: z.infer<typeof serviceRecordCreateSchema>,
  ) {
    return this.maintenance.createServiceRecord(user.id, assetId, body);
  }

  @Patch("service-records/:id")
  updateServiceRecord(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(ZodBody(serviceRecordUpdateSchema)) body: z.infer<typeof serviceRecordUpdateSchema>,
  ) {
    return this.maintenance.updateServiceRecord(user.id, id, body);
  }

  @Delete("service-records/:id")
  deleteServiceRecord(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.maintenance.deleteServiceRecord(user.id, id);
  }

  @Get("assets/:assetId/warranties")
  listWarranties(@CurrentUser() user: AuthUser, @Param("assetId") assetId: string) {
    return this.maintenance.listWarranties(user.id, assetId);
  }

  @Post("assets/:assetId/warranties")
  @HttpCode(201)
  createWarranty(
    @CurrentUser() user: AuthUser,
    @Param("assetId") assetId: string,
    @Body(ZodBody(warrantyCreateSchema)) body: z.infer<typeof warrantyCreateSchema>,
  ) {
    return this.maintenance.createWarranty(user.id, assetId, body);
  }

  @Patch("warranties/:id")
  updateWarranty(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(ZodBody(warrantyUpdateSchema)) body: z.infer<typeof warrantyUpdateSchema>,
  ) {
    return this.maintenance.updateWarranty(user.id, id, body);
  }

  @Delete("warranties/:id")
  deleteWarranty(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.maintenance.deleteWarranty(user.id, id);
  }
}
