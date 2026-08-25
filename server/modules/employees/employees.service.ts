import "server-only";

import { prisma } from "@/server/db/prisma";

import type { CreateEmployeeInput } from "./employees.schema";

export function getAllEmployees() {
  return prisma.employee.findMany({
    select: { id: true, fullName: true, profession: true, phone: true },
    orderBy: { fullName: "asc" },
  });
}

export function createEmployeeForUser(userId: string, input: CreateEmployeeInput) {
  return prisma.employee.create({
    data: { userId, ...input },
    select: { id: true, fullName: true, profession: true, phone: true },
  });
}

export async function getEmployeePayrollOverview(userId: string, isAdmin = false) {
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      fullName: true,
      profession: true,
      phone: true,
      expenses: {
        where: {
          type: "EMPLOYEE",
          deletedAt: null,
          project: {
            deletedAt: null,
            ...(isAdmin ? {} : { OR: [{ userId }, { members: { some: { userId, deletedAt: null } } }] }),
          },
        },
        select: { id: true, title: true, amount: true, date: true, project: { select: { id: true, title: true } } },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      },
    },
    orderBy: { fullName: "asc" },
  });

  return employees.map((employee) => ({
    ...employee,
    totalPaid: employee.expenses.reduce((total, expense) => total + expense.amount, 0n),
    projects: Object.values(employee.expenses.reduce<Record<string, { id: string; title: string; amount: bigint }>>((groups, expense) => {
      const current = groups[expense.project.id] ?? { id: expense.project.id, title: expense.project.title, amount: 0n };
      current.amount += expense.amount;
      groups[expense.project.id] = current;
      return groups;
    }, {})),
  }));
}
