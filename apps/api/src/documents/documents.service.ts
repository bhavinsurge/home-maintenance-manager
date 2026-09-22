import { Injectable } from "@nestjs/common";
import { HouseholdRole } from "@homestead/database";
import { PrismaService } from "../database/prisma.service";
import { HouseholdRbacService } from "../auth/household-rbac.service";
import { notFound, validationError } from "../common/errors/app-error";
import { getObjectStream, putObject, removeObject } from "../lib/minio";
import { enforceRateLimit } from "../lib/redis";

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: HouseholdRbacService,
  ) {}

  async upload(
    userId: string,
    assetId: string,
    file: Express.Multer.File | undefined,
    serviceRecordId?: string | null,
  ) {
    await enforceRateLimit(`upload:${userId}`, 20, 60 * 60 * 1000);

    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, deletedAt: null },
    });
    if (!asset) throw notFound("Asset not found");
    await this.rbac.requireHouseholdMember(userId, asset.householdId);

    if (!file) throw validationError("file is required");

    const srId = serviceRecordId && serviceRecordId.length > 0 ? serviceRecordId : null;
    if (srId) {
      const record = await this.prisma.serviceRecord.findFirst({
        where: { id: srId, assetId },
      });
      if (!record) throw notFound("Service record not found for this asset");
    }

    const buffer = file.buffer;
    const storageKey = await putObject({
      householdId: asset.householdId,
      fileName: file.originalname,
      contentType: file.mimetype || "application/octet-stream",
      buffer,
    });

    try {
      const document = await this.prisma.document.create({
        data: {
          householdId: asset.householdId,
          assetId: asset.id,
          serviceRecordId: srId,
          fileName: file.originalname,
          contentType: file.mimetype || "application/octet-stream",
          sizeBytes: buffer.byteLength,
          storageKey,
          uploadedById: userId,
        },
      });
      await this.prisma.writeAudit({
        householdId: asset.householdId,
        actorUserId: userId,
        action: "DOCUMENT_UPLOADED",
        entityType: "document",
        entityId: document.id,
        metadata: { fileName: document.fileName, sizeBytes: document.sizeBytes },
      });
      return { document };
    } catch (err) {
      await removeObject(storageKey);
      throw err;
    }
  }

  async download(userId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, deletedAt: null },
    });
    if (!document) throw notFound("Document not found");
    await this.rbac.requireHouseholdMember(userId, document.householdId);

    const stream = await getObjectStream(document.storageKey);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return {
      body: Buffer.concat(chunks),
      contentType: document.contentType,
      fileName: document.fileName,
    };
  }

  async remove(userId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, deletedAt: null },
    });
    if (!document) throw notFound("Document not found");
    await this.rbac.requireHouseholdMember(
      userId,
      document.householdId,
      HouseholdRole.MANAGER,
    );
    await this.prisma.document.update({
      where: { id: document.id },
      data: { deletedAt: new Date() },
    });
    await this.prisma.writeAudit({
      householdId: document.householdId,
      actorUserId: userId,
      action: "DOCUMENT_DELETED",
      entityType: "document",
      entityId: document.id,
    });
    return { deleted: true };
  }
}
