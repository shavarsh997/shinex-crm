import { requireUser } from "@/server/auth";
import { createBudgetAdjustmentSchema } from "@/server/modules/budget/budget.schema";
import { addBudgetAdjustment } from "@/server/modules/budget/budget.service";
import { withErrorHandling } from "@/server/shared/http";
import { parseRequestBody } from "@/server/shared/validation";

type BudgetAdjustmentRouteContext = { params: Promise<{ projectId: string }> };

export const POST = withErrorHandling(async (request, context: BudgetAdjustmentRouteContext) => {
  const user = await requireUser();
  const { projectId } = await context.params;
  const input = await parseRequestBody(request, createBudgetAdjustmentSchema);
  const adjustment = await addBudgetAdjustment(user.id, projectId, input);

  return Response.json({
    adjustment: {
      ...adjustment,
      amount: adjustment.amount.toString(),
      date: adjustment.date.toISOString(),
      createdAt: adjustment.createdAt.toISOString(),
    },
  }, { status: 201 });
});
