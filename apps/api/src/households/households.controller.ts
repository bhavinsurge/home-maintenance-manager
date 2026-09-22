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
import { HouseholdsService } from "./households.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodBody } from "../common/pipes/zod-validation.pipe";
import {
  householdCreateSchema,
  householdUpdateSchema,
  memberAddSchema,
  memberRoleSchema,
} from "../lib/schemas";
import type { AuthUser } from "../auth/auth.types";
import type { z } from "zod";

@Controller("households")
export class HouseholdsController {
  constructor(private readonly households: HouseholdsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.households.list(user.id);
  }

  @Post()
  @HttpCode(201)
  create(
    @CurrentUser() user: AuthUser,
    @Body(ZodBody(householdCreateSchema)) body: z.infer<typeof householdCreateSchema>,
  ) {
    return this.households.create(user.id, body);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.households.get(user.id, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(ZodBody(householdUpdateSchema)) body: z.infer<typeof householdUpdateSchema>,
  ) {
    return this.households.update(user.id, id, body);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.households.remove(user.id, id);
  }

  @Get(":id/members")
  listMembers(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.households.listMembers(user.id, id);
  }

  @Post(":id/members")
  @HttpCode(201)
  addMember(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(ZodBody(memberAddSchema)) body: z.infer<typeof memberAddSchema>,
  ) {
    return this.households.addMember(user.id, id, body);
  }

  @Patch(":id/members/:memberId")
  updateMember(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Param("memberId") memberId: string,
    @Body(ZodBody(memberRoleSchema)) body: z.infer<typeof memberRoleSchema>,
  ) {
    return this.households.updateMemberRole(user.id, id, memberId, body);
  }

  @Delete(":id/members/:memberId")
  removeMember(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Param("memberId") memberId: string,
  ) {
    return this.households.removeMember(user.id, id, memberId);
  }
}
