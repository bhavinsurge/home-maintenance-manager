import * as Minio from "minio";
import { randomUUID } from "crypto";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import { serviceUnavailable, validationError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_BYTES = 10 * 1024 * 1024;
const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");

function isLocalFallback() {
  return process.env.STORAGE_DRIVER === "local" || process.env.MINIO_DISABLED === "true";
}

function client() {
  const endPoint = process.env.MINIO_ENDPOINT ?? "localhost";
  const port = Number(process.env.MINIO_PORT ?? 9010);
  const useSSL = process.env.MINIO_USE_SSL === "true";
  const accessKey = process.env.MINIO_ACCESS_KEY ?? "minioadmin";
  const secretKey = process.env.MINIO_SECRET_KEY ?? "minioadmin";
  return new Minio.Client({ endPoint, port, useSSL, accessKey, secretKey });
}

export function bucketName() {
  return process.env.MINIO_BUCKET ?? "home-maintenance";
}

export function assertAllowedUpload(contentType: string, sizeBytes: number) {
  if (!ALLOWED_MIME.has(contentType)) {
    throw validationError("File type is not allowed", { contentType });
  }
  if (sizeBytes <= 0 || sizeBytes > MAX_BYTES) {
    throw validationError(`File must be between 1 byte and ${MAX_BYTES} bytes`);
  }
}

async function ensureLocalRoot() {
  await mkdir(LOCAL_ROOT, { recursive: true });
}

export async function ensureBucket() {
  if (isLocalFallback()) {
    await ensureLocalRoot();
    return;
  }
  const minio = client();
  const bucket = bucketName();
  try {
    const exists = await minio.bucketExists(bucket);
    if (!exists) {
      await minio.makeBucket(bucket, "us-east-1");
    }
  } catch (err) {
    logger.warn({ err }, "MinIO unavailable; enabling local filesystem storage fallback");
    process.env.STORAGE_DRIVER = "local";
    await ensureLocalRoot();
  }
}

export async function putObject(params: {
  householdId: string;
  fileName: string;
  contentType: string;
  buffer: Buffer;
}) {
  assertAllowedUpload(params.contentType, params.buffer.byteLength);
  await ensureBucket();
  const key = `${params.householdId}/${randomUUID()}-${params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  if (isLocalFallback()) {
    const fullPath = path.join(LOCAL_ROOT, key);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, params.buffer);
    return key;
  }

  try {
    await client().putObject(bucketName(), key, params.buffer, params.buffer.byteLength, {
      "Content-Type": params.contentType,
    });
    return key;
  } catch (err) {
    logger.warn({ err }, "MinIO putObject failed; falling back to local storage");
    process.env.STORAGE_DRIVER = "local";
    const fullPath = path.join(LOCAL_ROOT, key);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, params.buffer);
    return key;
  }
}

export async function getObjectStream(storageKey: string) {
  if (isLocalFallback()) {
    const buffer = await readFile(path.join(LOCAL_ROOT, storageKey));
    const { Readable } = await import("stream");
    return Readable.from(buffer);
  }
  try {
    return await client().getObject(bucketName(), storageKey);
  } catch (err) {
    logger.error({ err, storageKey }, "MinIO getObject failed");
    // try local fallback for keys written locally
    try {
      const buffer = await readFile(path.join(LOCAL_ROOT, storageKey));
      const { Readable } = await import("stream");
      return Readable.from(buffer);
    } catch {
      throw serviceUnavailable("Failed to retrieve document");
    }
  }
}

export async function removeObject(storageKey: string) {
  if (isLocalFallback()) {
    try {
      await unlink(path.join(LOCAL_ROOT, storageKey));
    } catch {
      // ignore
    }
    return;
  }
  try {
    await client().removeObject(bucketName(), storageKey);
  } catch (err) {
    logger.warn({ err, storageKey }, "MinIO removeObject failed");
  }
}
