import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { hashPassword } from "../auth/password";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const seedAccounts = {
  administrator: {
    name: process.env.SEED_ADMIN_NAME ?? "Администратор Shinex",
    email: (process.env.SEED_ADMIN_EMAIL ?? "admin@shinex.local").toLowerCase(),
    password: process.env.SEED_ADMIN_PASSWORD ?? "AdminPass!2026",
    role: "ADMIN" as const,
  },
  member: {
    name: process.env.SEED_USER_NAME ?? "Сотрудник Shinex",
    email: (process.env.SEED_USER_EMAIL ?? "user@shinex.local").toLowerCase(),
    password: process.env.SEED_USER_PASSWORD ?? "UserPass!2026",
    role: "MEMBER" as const,
  },
};

async function ensureSeedUser(account: typeof seedAccounts.administrator | typeof seedAccounts.member) {
  const existingUser = await prisma.user.findUnique({
    where: { email: account.email },
    select: { passwordHash: true, approvedAt: true },
  });

  return prisma.user.upsert({
    where: { email: account.email },
    update: {
      name: account.name,
      // Seed credentials must stay usable after changing SEED_*_PASSWORD or
      // re-running the seed against an existing development database.
      passwordHash: await hashPassword(account.password),
      role: account.role,
      approvalStatus: "APPROVED",
      approvalNote: null,
      approvedAt: existingUser?.approvedAt ?? new Date(),
    },
    create: {
      name: account.name,
      email: account.email,
      passwordHash: await hashPassword(account.password),
      role: account.role,
      approvalStatus: "APPROVED",
      approvedAt: new Date(),
    },
    select: { id: true, email: true },
  });
}

const projects = [
  {
    id: "seed-project-komitas-42",
    title: "Квартира на Комитаса, 42",
    description: "Капитальный ремонт трёхкомнатной квартиры: демонтаж, инженерные сети, чистовая отделка и мебель.",
    ownerName: "Анна Григорян",
    ownerPhone: "+374 91 224 681",
    ownerEmail: "anna.grigoryan@example.com",
    ownerNotes: "Согласовывать все изменения сметы до закупки материалов.",
    estimatedAmount: 4_800_000n,
    receivedAmount: 2_050_000n,
    spentAmount: 1_033_000n,
  },
  {
    id: "seed-project-office-arshakunyats",
    title: "Офис на Аршакуняц",
    description: "Подготовка офиса на 120 м² к открытию: перегородки, освещение, вентиляция и зона ресепшена.",
    ownerName: "ООО «Арарат Логистикс»",
    ownerPhone: "+374 10 552 840",
    ownerEmail: "office@ararat-logistics.example",
    ownerNotes: "Работы выполнять поэтапно, чтобы склад продолжал работать.",
    estimatedAmount: 7_200_000n,
    receivedAmount: 2_400_000n,
    spentAmount: 1_410_000n,
  },
  {
    id: "seed-project-nor-nork-house",
    title: "Частный дом в Нор Норке",
    description: "Фасад, утепление, кровельные работы и благоустройство участка частного дома.",
    ownerName: "Ваан Саакян",
    ownerPhone: "+374 77 804 312",
    ownerEmail: "v.sahakyan@example.com",
    ownerNotes: "Клиенту нужен еженедельный отчёт с фотографиями.",
    estimatedAmount: 3_900_000n,
    receivedAmount: 1_350_000n,
    spentAmount: 1_100_000n,
  },
] as const;

const expenses = [
  { id: "seed-expense-komitas-materials", projectId: "seed-project-komitas-42", type: "MATERIAL", title: "Черновые материалы", description: "Штукатурка, грунтовка, гипсокартон и крепёж.", amount: 325_000n, date: new Date("2026-08-04"), vendorName: "СтройМаркет", notes: "Оплачено переводом" },
  { id: "seed-expense-komitas-team", projectId: "seed-project-komitas-42", type: "EMPLOYEE", title: "Аванс бригаде", amount: 410_000n, date: new Date("2026-08-05"), employeeName: "Гор Мартиросян", notes: "За демонтаж и электромонтаж" },
  { id: "seed-expense-komitas-fuel", projectId: "seed-project-komitas-42", type: "FUEL", title: "Топливо для доставки", amount: 58_000n, date: new Date("2026-08-06"), notes: "Три рейса" },
  { id: "seed-expense-komitas-transport", projectId: "seed-project-komitas-42", type: "TRANSPORT", title: "Доставка плитки", amount: 75_000n, date: new Date("2026-08-08"), vendorName: "Fast Cargo" },
  { id: "seed-expense-komitas-equipment", projectId: "seed-project-komitas-42", type: "EQUIPMENT", title: "Аренда штробореза", amount: 120_000n, date: new Date("2026-08-09"), vendorName: "Rent Pro" },
  { id: "seed-expense-komitas-service", projectId: "seed-project-komitas-42", type: "SERVICE", title: "Вывоз строительного мусора", amount: 45_000n, date: new Date("2026-08-10"), vendorName: "Clean City" },
  { id: "seed-expense-office-materials", projectId: "seed-project-office-arshakunyats", type: "MATERIAL", title: "Перегородки и акустические панели", amount: 720_000n, date: new Date("2026-08-03"), vendorName: "Acoustic Build" },
  { id: "seed-expense-office-team", projectId: "seed-project-office-arshakunyats", type: "EMPLOYEE", title: "Оплата монтажной бригаде", amount: 560_000n, date: new Date("2026-08-07"), employeeName: "Артур Хачатрян" },
  { id: "seed-expense-office-service", projectId: "seed-project-office-arshakunyats", type: "SERVICE", title: "Проект освещения", amount: 130_000n, date: new Date("2026-08-11"), vendorName: "Light Lab", notes: "Включая рабочую документацию" },
  { id: "seed-expense-house-materials", projectId: "seed-project-nor-nork-house", type: "MATERIAL", title: "Утеплитель и фасадная сетка", amount: 540_000n, date: new Date("2026-08-02"), vendorName: "Thermo House" },
  { id: "seed-expense-house-team", projectId: "seed-project-nor-nork-house", type: "EMPLOYEE", title: "Оплата фасадной бригаде", amount: 380_000n, date: new Date("2026-08-06"), employeeName: "Самвел Петросян" },
  { id: "seed-expense-house-fuel", projectId: "seed-project-nor-nork-house", type: "FUEL", title: "Топливо для подъёмника", amount: 70_000n, date: new Date("2026-08-09") },
  { id: "seed-expense-house-equipment", projectId: "seed-project-nor-nork-house", type: "EQUIPMENT", title: "Аренда строительных лесов", amount: 110_000n, date: new Date("2026-08-12"), vendorName: "Build Rent" },
] as const;

async function main() {
  const administrator = await ensureSeedUser(seedAccounts.administrator);
  const member = await ensureSeedUser(seedAccounts.member);

  await prisma.$transaction(async (transaction) => {
    await Promise.all(
      projects.map((project) => transaction.project.upsert({
        where: { id: project.id },
        update: { ...project, userId: administrator.id },
        create: { ...project, userId: administrator.id },
      })),
    );

    await Promise.all(
      expenses.map((expense) => transaction.expense.upsert({
        where: { id: expense.id },
        update: expense,
        create: expense,
      })),
    );
  });

  console.log(`Seeded ${projects.length} projects, ${expenses.length} expenses, administrator ${administrator.email}, and member ${member.email}.`);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
