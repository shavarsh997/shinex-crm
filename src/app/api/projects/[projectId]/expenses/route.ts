import { requireProjectEditor } from "@/server/auth";
import { createExpenseSchema } from "@/server/modules/expenses/expenses.schema";
import { addProjectExpense } from "@/server/modules/expenses/expenses.service";
import { withErrorHandling } from "@/server/shared/http";
import { serializeExpense } from "@/server/shared/serializers/financial";
import { parseRequestBody } from "@/server/shared/validation";

type ProjectExpenseRouteContext = { params: Promise<{ projectId: string }> };

export const POST = withErrorHandling(async (request, context: ProjectExpenseRouteContext) => {
  const user = await requireProjectEditor();
  const { projectId } = await context.params;
  const input = await parseRequestBody(request, createExpenseSchema);
  const expense = await addProjectExpense(user.id, projectId, input);

  return Response.json({ expense: serializeExpense(expense) }, { status: 201 });
});
