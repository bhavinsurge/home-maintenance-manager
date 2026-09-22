import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  homesteadPrisma?: PrismaClient;
};

export function createPrismaClient(options?: ConstructorParameters<typeof PrismaClient>[0]) {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...options,
  });
}

/** Shared singleton for long-lived Node processes (API / worker / Next). */
export const prisma =
  globalForPrisma.homesteadPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.homesteadPrisma = prisma;
}

export * from "@prisma/client";
export { PrismaClient };
