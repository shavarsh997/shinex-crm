import { requireUser } from "@/server/auth";
import { restoreProjectExpense } from "@/server/modules/expenses/expenses.service";
import { withErrorHandling } from "@/server/shared/http";
import { requireConfirmation } from "@/server/shared/security/confirmation";
import { serializeExpense } from "@/server/shared/serializers/financial";

type ExpenseRouteContext = { params: Promise<{ expenseId: string }> };

export const POST = withErrorHandling(async (request, context: ExpenseRouteContext) => {
  const user = await requireUser();
  const { expenseId } = await context.params;
  await requireConfirmation(request, user.id, "expense-restore", expenseId);
  const expense = await restoreProjectExpense(user.id, expenseId, user.role === "ADMIN");
  return Response.json({ expense: serializeExpense(expense) });
});
