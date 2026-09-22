import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const ACCESS_TTL = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900);
const REFRESH_TTL = Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 60 * 60 * 24 * 30);

function accessSecret() {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

export type AccessTokenPayload = {
  sub: string;
  email: string;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function signAccessToken(payload: AccessTokenPayload) {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL}s`)
    .sign(accessSecret());
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, accessSecret());
  if (!payload.sub || typeof payload.email !== "string") {
    throw new Error("Invalid access token payload");
  }
  return { sub: payload.sub, email: payload.email } satisfies AccessTokenPayload;
}

export function generateRefreshToken() {
  return randomBytes(48).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function refreshExpiresAt() {
  return new Date(Date.now() + REFRESH_TTL * 1000);
}

export function accessTtlSeconds() {
  return ACCESS_TTL;
}

export function refreshTtlSeconds() {
  return REFRESH_TTL;
}
