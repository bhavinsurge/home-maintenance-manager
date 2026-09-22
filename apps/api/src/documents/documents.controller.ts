import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
  Body,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { DocumentsService } from "./documents.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../auth/auth.types";

@Controller()
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post("assets/:assetId/documents")
  @HttpCode(201)
  @UseInterceptors(FileInterceptor("file"))
  upload(
    @CurrentUser() user: AuthUser,
    @Param("assetId") assetId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("serviceRecordId") serviceRecordId?: string,
  ) {
    return this.documents.upload(user.id, assetId, file, serviceRecordId);
  }

  @Get("documents/:id/download")
  async download(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    const file = await this.documents.download(user.id, id);
    res.setHeader("Content-Type", file.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.fileName.replace(/"/g, "")}"`,
    );
    res.setHeader("Content-Length", String(file.body.byteLength));
    res.send(file.body);
  }

  @Delete("documents/:id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.documents.remove(user.id, id);
  }
}
