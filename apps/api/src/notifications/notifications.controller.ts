import { Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodQuery } from "../common/pipes/zod-validation.pipe";
import { notificationListQuerySchema } from "../lib/schemas";
import type { AuthUser } from "../auth/auth.types";
import type { z } from "zod";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query(ZodQuery(notificationListQuerySchema))
    query: z.infer<typeof notificationListQuerySchema>,
  ) {
    return this.notifications.list(user.id, query);
  }

  @Post("read-all")
  @HttpCode(200)
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.id);
  }

  @Post(":id/read")
  @HttpCode(200)
  markRead(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.notifications.markRead(user.id, id);
  }
}
