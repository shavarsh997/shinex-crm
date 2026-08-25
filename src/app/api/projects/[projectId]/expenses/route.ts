import { requireUser } from "@/server/auth";
import { createExpenseSchema } from "@/server/modules/expenses/expenses.schema";
import { ExpenseType } from "@/server/generated/prisma/client";
import { addProjectExpense, expenseListSorts, getProjectExpensePage } from "@/server/modules/expenses/expenses.service";
import { withErrorHandling } from "@/server/shared/http";
import { cursorPaginationSchema } from "@/server/shared/pagination";
import { serializeExpense } from "@/server/shared/serializers/financial";
import { parseRequestBody, parseSearchParams } from "@/server/shared/validation";
import { z } from "zod";

type ProjectExpenseRouteContext = { params: Promise<{ projectId: string }> };

const expensePageSchema = cursorPaginationSchema.extend({
  type: z.enum(ExpenseType).optional(),
  sort: z.enum(expenseListSorts).default("newest"),
});

export const GET = withErrorHandling(async (request, context: ProjectExpenseRouteContext) => {
  const user = await requireUser();
  const { projectId } = await context.params;
  const { type, sort, ...pagination } = await parseSearchParams(request, expensePageSchema);
  const page = await getProjectExpensePage(user.id, projectId, pagination, type, sort, user.role === "ADMIN");

  return Response.json({
    expenses: page.data.map(serializeExpense),
    pageInfo: page.pageInfo,
    totalCount: page.totalCount,
  });
});

export const POST = withErrorHandling(async (request, context: ProjectExpenseRouteContext) => {
  const user = await requireUser();
  const { projectId } = await context.params;
  const input = await parseRequestBody(request, createExpenseSchema);
  const expense = await addProjectExpense(user.id, projectId, input, user.role === "ADMIN");

  return Response.json({ expense: serializeExpense(expense) }, { status: 201 });
});
