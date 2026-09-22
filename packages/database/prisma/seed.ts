import {
  PrismaClient,
  AssetCategory,
  HouseholdRole,
  ScheduleFrequency,
} from "@prisma/client";
import { addDays, subDays } from "date-fns";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Homestead Keep…");

  await prisma.reminderDispatch.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.document.deleteMany();
  await prisma.serviceRecord.deleteMany();
  await prisma.warranty.deleteMany();
  await prisma.maintenanceSchedule.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.householdMember.deleteMany();
  await prisma.household.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Password123!", 12);

  const owner = await prisma.user.create({
    data: {
      email: "alex@example.com",
      fullName: "Alex Rivera",
      passwordHash,
    },
  });

  const member = await prisma.user.create({
    data: {
      email: "sam@example.com",
      fullName: "Sam Chen",
      passwordHash,
    },
  });

  const household = await prisma.household.create({
    data: {
      name: "Cedar Street Home",
      addressLine1: "142 Cedar Street",
      city: "Portland",
      region: "OR",
      postalCode: "97205",
      country: "US",
      notes: "Primary family residence",
      createdById: owner.id,
      members: {
        create: [
          { userId: owner.id, role: HouseholdRole.OWNER },
          { userId: member.id, role: HouseholdRole.MEMBER },
        ],
      },
    },
  });

  const furnace = await prisma.asset.create({
    data: {
      householdId: household.id,
      name: "Carrier Gas Furnace",
      category: AssetCategory.HVAC,
      manufacturer: "Carrier",
      model: "59SC5A",
      serialNumber: "HVAC-001-DEMO",
      purchaseDate: new Date("2021-09-15"),
      purchasePrice: 4200,
      locationNotes: "Basement utility room",
      createdById: owner.id,
    },
  });

  const washer = await prisma.asset.create({
    data: {
      householdId: household.id,
      name: "LG Front-Load Washer",
      category: AssetCategory.APPLIANCE,
      manufacturer: "LG",
      model: "WM4000HWA",
      serialNumber: "APL-77821",
      purchaseDate: new Date("2023-03-01"),
      purchasePrice: 980,
      locationNotes: "Laundry room",
      createdById: owner.id,
    },
  });

  await prisma.maintenanceSchedule.create({
    data: {
      assetId: furnace.id,
      title: "Annual furnace tune-up",
      description: "Filter, burners, and safety check",
      frequency: ScheduleFrequency.ANNUAL,
      nextDueAt: subDays(new Date(), 3),
      reminderDaysBefore: 14,
    },
  });

  await prisma.maintenanceSchedule.create({
    data: {
      assetId: washer.id,
      title: "Clean washer gasket & run tub clean",
      frequency: ScheduleFrequency.MONTHLY,
      nextDueAt: addDays(new Date(), 5),
      reminderDaysBefore: 3,
    },
  });

  await prisma.warranty.create({
    data: {
      assetId: washer.id,
      provider: "LG Manufacturer Warranty",
      coverageNotes: "Parts and labor",
      startsOn: new Date("2023-03-01"),
      endsOn: addDays(new Date(), 20),
    },
  });

  await prisma.serviceRecord.create({
    data: {
      assetId: furnace.id,
      title: "Replaced furnace filter",
      performedAt: subDays(new Date(), 40),
      cost: 28.5,
      vendor: "Self",
      notes: "MERV-11 filter",
      createdById: owner.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      householdId: household.id,
      actorUserId: owner.id,
      action: "SEED_COMPLETED",
      entityType: "household",
      entityId: household.id,
      metadata: { note: "Demo seed data loaded" },
    },
  });

  console.log("Seed complete.");
  console.log("Demo login: alex@example.com / Password123!");
  console.log("Member login: sam@example.com / Password123!");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
