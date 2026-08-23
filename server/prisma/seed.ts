import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { hashPassword } from "../auth/password";
import { PrismaClient } from "../generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.");
}

const seedAdminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase() || "admin@shinex.local";
const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
const seedProjectRequestId = "d8c2d663-2f47-449c-99ba-3fe9e3cff921";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function seed() {
  const admin = await prisma.user.upsert({
    where: { email: seedAdminEmail },
    create: {
      name: "Администратор",
      email: seedAdminEmail,
      passwordHash: await hashPassword(seedAdminPassword),
      role: "ADMIN",
      approvalStatus: "APPROVED",
      approvedAt: new Date(),
    },
    update: {
      role: "ADMIN",
      approvalStatus: "APPROVED",
      approvedAt: new Date(),
    },
  });

  let project = await prisma.project.findUnique({
    where: { clientRequestId: seedProjectRequestId },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        clientRequestId: seedProjectRequestId,
        userId: admin.id,
        title: "Ремонт офиса на Северном проспекте",
        description: "Демонстрационный проект для проверки финансов и задач.",
        ownerName: "ООО «Север»",
        ownerPhone: "+7 999 123-45-67",
        ownerEmail: "client@example.com",
        estimatedAmount: 1_500_000n,
        receivedAmount: 500_000n,
        spentAmount: 350_000n,
      },
    });
  }

  await Promise.all([
    prisma.payment.upsert({
      where: { clientRequestId: "f3494f38-bff5-4be4-a3c6-fdd8b43f7483" },
      create: {
        clientRequestId: "f3494f38-bff5-4be4-a3c6-fdd8b43f7483",
        projectId: project.id,
        amount: 500_000n,
        date: new Date("2026-08-01T09:00:00.000Z"),
        notes: "Аванс по договору",
      },
      update: {},
    }),
    prisma.expense.upsert({
      where: { clientRequestId: "4e6ce4fa-e12b-4b26-9eb9-3b9efcbd1a59" },
      create: {
        clientRequestId: "4e6ce4fa-e12b-4b26-9eb9-3b9efcbd1a59",
        projectId: project.id,
        type: "MATERIAL",
        title: "Строительные материалы",
        amount: 125_000n,
        date: new Date("2026-08-03T09:00:00.000Z"),
        vendorName: "СтройМаркет",
      },
      update: {},
    }),
    prisma.expense.upsert({
      where: { clientRequestId: "681302e3-660b-47b7-a6d6-5b849c85ad50" },
      create: {
        clientRequestId: "681302e3-660b-47b7-a6d6-5b849c85ad50",
        projectId: project.id,
        type: "EMPLOYEE",
        title: "Оплата монтажных работ",
        amount: 95_000n,
        date: new Date("2026-08-05T09:00:00.000Z"),
        employeeName: "Иван Петров",
      },
      update: {},
    }),
    prisma.expense.upsert({
      where: { clientRequestId: "6e4adbf5-9ae4-4a5c-8472-a27c664ea7c4" },
      create: {
        clientRequestId: "6e4adbf5-9ae4-4a5c-8472-a27c664ea7c4",
        projectId: project.id,
        type: "TRANSPORT",
        title: "Доставка материалов",
        amount: 130_000n,
        date: new Date("2026-08-06T09:00:00.000Z"),
        vendorName: "Экспресс Доставка",
      },
      update: {},
    }),
  ]);

  const tasks = [
    ["Согласовать график работ", "IN_PROGRESS", null],
    ["Проверить поставку материалов", "TODO", null],
    ["Подготовить смету", "DONE", new Date("2026-08-02T12:00:00.000Z")],
  ] as const;

  await Promise.all(tasks.map(async ([title, status, completedAt]) => {
    const task = await prisma.task.findFirst({
      where: { createdById: admin.id, projectId: project.id, title },
      select: { id: true },
    });

    if (!task) {
      await prisma.task.create({
        data: { createdById: admin.id, projectId: project.id, title, status, completedAt },
      });
    }
  }));

  console.log(`Seed data is ready for ${seedAdminEmail}.`);
}

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
