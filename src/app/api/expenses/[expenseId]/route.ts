import { requireProjectEditor } from "@/server/auth";
import { updateExpenseSchema } from "@/server/modules/expenses/expenses.schema";
import { deleteProjectExpense, updateProjectExpense } from "@/server/modules/expenses/expenses.service";
import { withErrorHandling } from "@/server/shared/http";
import { serializeExpense } from "@/server/shared/serializers/financial";
import { parseRequestBody } from "@/server/shared/validation";

type ExpenseRouteContext = { params: Promise<{ expenseId: string }> };

export const PATCH = withErrorHandling(async (request, context: ExpenseRouteContext) => {
  const user = await requireProjectEditor();
  const { expenseId } = await context.params;
  const input = await parseRequestBody(request, updateExpenseSchema);
  const expense = await updateProjectExpense(user.id, expenseId, input);

  return Response.json({ expense: serializeExpense(expense) });
});

export const DELETE = withErrorHandling(async (_request, context: ExpenseRouteContext) => {
  const user = await requireProjectEditor();
  const { expenseId } = await context.params;
  await deleteProjectExpense(user.id, expenseId);

  return new Response(null, { status: 204 });
});
