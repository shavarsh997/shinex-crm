import { requireUser } from "@/server/auth";
import { updateExpenseSchema } from "@/server/modules/expenses/expenses.schema";
import { deleteProjectExpense, updateProjectExpense } from "@/server/modules/expenses/expenses.service";
import { withErrorHandling } from "@/server/shared/http";
import { requireConfirmation } from "@/server/shared/security/confirmation";
import { serializeExpense } from "@/server/shared/serializers/financial";
import { parseRequestBody } from "@/server/shared/validation";

type ExpenseRouteContext = { params: Promise<{ expenseId: string }> };

export const PATCH = withErrorHandling(async (request, context: ExpenseRouteContext) => {
  const user = await requireUser();
  const { expenseId } = await context.params;
  await requireConfirmation(request, user.id, "expense-update", expenseId);
  const input = await parseRequestBody(request, updateExpenseSchema);
  const expense = await updateProjectExpense(user.id, expenseId, input, user.role === "ADMIN");

  return Response.json({ expense: serializeExpense(expense) });
});

export const DELETE = withErrorHandling(async (request, context: ExpenseRouteContext) => {
  const user = await requireUser();
  const { expenseId } = await context.params;
  await requireConfirmation(request, user.id, "expense-delete", expenseId);
  await deleteProjectExpense(user.id, expenseId, user.role === "ADMIN");

  return new Response(null, { status: 204 });
});
