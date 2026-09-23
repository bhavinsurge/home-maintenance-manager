import * as Minio from 'minio';
import { randomUUID } from 'crypto';
import { mkdir, writeFile, readFile, unlink } from 'fs/promises';
import path from 'path';
import { Logger } from '@nestjs/common';
import {
  serviceUnavailable,
  validationError,
} from '../common/errors/app-error';

const logger = new Logger('MinIO');

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const MAX_BYTES = 10 * 1024 * 1024;

function localRoot() {
  return path.resolve(
    process.cwd(),
    process.env.STORAGE_LOCAL_ROOT ?? path.join('..', '..', '.data', 'uploads'),
  );
}

function isLocalFallback() {
  return (
    process.env.STORAGE_DRIVER === 'local' ||
    process.env.MINIO_DISABLED === 'true'
  );
}

function client() {
  const endPoint = process.env.MINIO_ENDPOINT ?? 'localhost';
  const port = Number(process.env.MINIO_PORT ?? 9010);
  const useSSL = process.env.MINIO_USE_SSL === 'true';
  const accessKey = process.env.MINIO_ACCESS_KEY ?? 'minioadmin';
  const secretKey = process.env.MINIO_SECRET_KEY ?? 'minioadmin';
  return new Minio.Client({ endPoint, port, useSSL, accessKey, secretKey });
}

export function bucketName() {
  return process.env.MINIO_BUCKET ?? 'home-maintenance';
}

export function assertAllowedUpload(contentType: string, sizeBytes: number) {
  if (!ALLOWED_MIME.has(contentType)) {
    throw validationError('File type is not allowed', { contentType });
  }
  if (sizeBytes <= 0 || sizeBytes > MAX_BYTES) {
    throw validationError(`File must be between 1 byte and ${MAX_BYTES} bytes`);
  }
}

async function ensureLocalRoot() {
  await mkdir(localRoot(), { recursive: true });
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
      await minio.makeBucket(bucket, 'us-east-1');
    }
  } catch (err) {
    logger.warn(
      `MinIO unavailable; enabling local filesystem storage fallback: ${String(err)}`,
    );
    process.env.STORAGE_DRIVER = 'local';
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
  const key = `${params.householdId}/${randomUUID()}-${params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  if (isLocalFallback()) {
    const fullPath = path.join(localRoot(), key);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, params.buffer);
    return key;
  }

  try {
    await client().putObject(
      bucketName(),
      key,
      params.buffer,
      params.buffer.byteLength,
      {
        'Content-Type': params.contentType,
      },
    );
    return key;
  } catch (err) {
    logger.warn(
      `MinIO putObject failed; falling back to local storage: ${String(err)}`,
    );
    process.env.STORAGE_DRIVER = 'local';
    const fullPath = path.join(localRoot(), key);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, params.buffer);
    return key;
  }
}

export async function getObjectStream(storageKey: string) {
  if (isLocalFallback()) {
    const buffer = await readFile(path.join(localRoot(), storageKey));
    const { Readable } = await import('stream');
    return Readable.from(buffer);
  }
  try {
    return await client().getObject(bucketName(), storageKey);
  } catch (err) {
    logger.error(`MinIO getObject failed: ${String(err)}`);
    try {
      const buffer = await readFile(path.join(localRoot(), storageKey));
      const { Readable } = await import('stream');
      return Readable.from(buffer);
    } catch {
      throw serviceUnavailable('Failed to retrieve document');
    }
  }
}

export async function removeObject(storageKey: string) {
  if (isLocalFallback()) {
    try {
      await unlink(path.join(localRoot(), storageKey));
    } catch {
      // ignore
    }
    return;
  }
  try {
    await client().removeObject(bucketName(), storageKey);
  } catch (err) {
    logger.warn(`MinIO removeObject failed: ${String(err)}`);
  }
}
