import { requireUser } from "@/server/auth";
import { restoreProjectExpense } from "@/server/modules/expenses/expenses.service";
import { withErrorHandling } from "@/server/shared/http";
import { serializeExpense } from "@/server/shared/serializers/financial";

type ExpenseRouteContext = { params: Promise<{ expenseId: string }> };

export const POST = withErrorHandling(async (_request, context: ExpenseRouteContext) => {
  const user = await requireUser();
  const { expenseId } = await context.params;
  const expense = await restoreProjectExpense(user.id, expenseId, user.role === "ADMIN");
  return Response.json({ expense: serializeExpense(expense) });
});
