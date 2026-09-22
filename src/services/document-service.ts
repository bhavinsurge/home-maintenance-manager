import { NextRequest } from "next/server";
import { HouseholdRole } from "@homestead/database";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/audit";
import { requireHouseholdMember, requireUser } from "@/lib/auth/session";
import { enforceRateLimit, getRequestId } from "@/lib/http/request";
import { created, handleRouteError, ok } from "@/lib/http/response";
import { notFound, validationError } from "@/lib/errors/app-error";
import { getObjectStream, putObject, removeObject } from "@/lib/storage/minio";

export async function uploadAssetDocument(request: NextRequest, assetId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    await enforceRateLimit(`upload:${user.id}`, 20, 60 * 60 * 1000);

    const asset = await prisma.asset.findFirst({ where: { id: assetId, deletedAt: null } });
    if (!asset) throw notFound("Asset not found");
    await requireHouseholdMember(user.id, asset.householdId);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw validationError("file is required");
    const serviceRecordId = form.get("serviceRecordId");
    const srId =
      typeof serviceRecordId === "string" && serviceRecordId.length > 0
        ? serviceRecordId
        : null;

    if (srId) {
      const record = await prisma.serviceRecord.findFirst({
        where: { id: srId, assetId },
      });
      if (!record) throw notFound("Service record not found for this asset");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storageKey = await putObject({
      householdId: asset.householdId,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      buffer,
    });

    try {
      const document = await prisma.document.create({
        data: {
          householdId: asset.householdId,
          assetId: asset.id,
          serviceRecordId: srId,
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          sizeBytes: buffer.byteLength,
          storageKey,
          uploadedById: user.id,
        },
      });
      await writeAudit({
        householdId: asset.householdId,
        actorUserId: user.id,
        action: "DOCUMENT_UPLOADED",
        entityType: "document",
        entityId: document.id,
        metadata: { fileName: document.fileName, sizeBytes: document.sizeBytes },
      });
      return created({ document });
    } catch (err) {
      await removeObject(storageKey);
      throw err;
    }
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function downloadDocument(request: NextRequest, documentId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    const document = await prisma.document.findFirst({
      where: { id: documentId, deletedAt: null },
    });
    if (!document) throw notFound("Document not found");
    await requireHouseholdMember(user.id, document.householdId);

    const stream = await getObjectStream(document.storageKey);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": document.contentType,
        "Content-Disposition": `attachment; filename="${document.fileName.replace(/"/g, "")}"`,
        "Content-Length": String(body.byteLength),
        "x-request-id": requestId,
      },
    });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function deleteDocument(request: NextRequest, documentId: string) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser(request);
    const document = await prisma.document.findFirst({
      where: { id: documentId, deletedAt: null },
    });
    if (!document) throw notFound("Document not found");
    await requireHouseholdMember(user.id, document.householdId, HouseholdRole.MANAGER);
    await prisma.document.update({
      where: { id: document.id },
      data: { deletedAt: new Date() },
    });
    await writeAudit({
      householdId: document.householdId,
      actorUserId: user.id,
      action: "DOCUMENT_DELETED",
      entityType: "document",
      entityId: document.id,
    });
    return ok({ deleted: true });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
