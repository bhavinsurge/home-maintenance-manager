import { z } from "zod";
import {
  AssetCategory,
  AssetStatus,
  HouseholdRole,
  ScheduleFrequency,
} from "@homestead/database";

export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(128)
    .regex(/[A-Za-z]/, "Password must include a letter")
    .regex(/[0-9]/, "Password must include a number"),
  fullName: z.string().trim().min(2).max(120),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const householdCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  addressLine1: z.string().trim().max(200).optional().nullable(),
  addressLine2: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  region: z.string().trim().max(100).optional().nullable(),
  postalCode: z.string().trim().max(30).optional().nullable(),
  country: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const householdUpdateSchema = householdCreateSchema.partial();

export const memberAddSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(HouseholdRole).refine((r) => r !== HouseholdRole.OWNER, {
    message: "Cannot assign OWNER via invite; transfer ownership separately",
  }),
});

export const memberRoleSchema = z.object({
  role: z.nativeEnum(HouseholdRole),
});

export const assetCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  category: z.nativeEnum(AssetCategory),
  status: z.nativeEnum(AssetStatus).optional(),
  manufacturer: z.string().trim().max(120).optional().nullable(),
  model: z.string().trim().max(120).optional().nullable(),
  serialNumber: z.string().trim().max(120).optional().nullable(),
  purchaseDate: z.string().date().optional().nullable(),
  purchasePrice: z.number().nonnegative().max(1_000_000_000).optional().nullable(),
  locationNotes: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const assetUpdateSchema = assetCreateSchema.partial();

export const scheduleCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(2000).optional().nullable(),
    frequency: z.nativeEnum(ScheduleFrequency),
    intervalDays: z.number().int().min(1).max(3650).optional().nullable(),
    nextDueAt: z.string().datetime({ offset: true }),
    reminderDaysBefore: z.number().int().min(0).max(365).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.frequency === ScheduleFrequency.CUSTOM_DAYS && !val.intervalDays) {
      ctx.addIssue({
        code: "custom",
        message: "intervalDays is required for CUSTOM_DAYS",
        path: ["intervalDays"],
      });
    }
  });

export const scheduleUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    frequency: z.nativeEnum(ScheduleFrequency).optional(),
    intervalDays: z.number().int().min(1).max(3650).optional().nullable(),
    nextDueAt: z.string().datetime({ offset: true }).optional(),
    reminderDaysBefore: z.number().int().min(0).max(365).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.frequency === ScheduleFrequency.CUSTOM_DAYS && !val.intervalDays) {
      ctx.addIssue({
        code: "custom",
        message: "intervalDays is required for CUSTOM_DAYS",
        path: ["intervalDays"],
      });
    }
  });

export const completeScheduleSchema = z.object({
  performedAt: z.string().datetime({ offset: true }).optional(),
  cost: z.number().nonnegative().max(1_000_000_000).optional().nullable(),
  vendor: z.string().trim().max(160).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const serviceRecordCreateSchema = z.object({
  title: z.string().trim().min(1).max(160),
  performedAt: z.string().datetime({ offset: true }),
  cost: z.number().nonnegative().max(1_000_000_000).optional().nullable(),
  vendor: z.string().trim().max(160).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  scheduleId: z.string().uuid().optional().nullable(),
});

export const serviceRecordUpdateSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  performedAt: z.string().datetime({ offset: true }).optional(),
  cost: z.number().nonnegative().max(1_000_000_000).optional().nullable(),
  vendor: z.string().trim().max(160).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  scheduleId: z.string().uuid().optional().nullable(),
});

export const warrantyCreateSchema = z
  .object({
    provider: z.string().trim().min(1).max(160),
    coverageNotes: z.string().trim().max(2000).optional().nullable(),
    startsOn: z.string().date(),
    endsOn: z.string().date(),
  })
  .superRefine((val, ctx) => {
    if (val.endsOn < val.startsOn) {
      ctx.addIssue({
        code: "custom",
        message: "endsOn must be on or after startsOn",
        path: ["endsOn"],
      });
    }
  });

export const warrantyUpdateSchema = z
  .object({
    provider: z.string().trim().min(1).max(160).optional(),
    coverageNotes: z.string().trim().max(2000).optional().nullable(),
    startsOn: z.string().date().optional(),
    endsOn: z.string().date().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.startsOn && val.endsOn && val.endsOn < val.startsOn) {
      ctx.addIssue({
        code: "custom",
        message: "endsOn must be on or after startsOn",
        path: ["endsOn"],
      });
    }
  });

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
