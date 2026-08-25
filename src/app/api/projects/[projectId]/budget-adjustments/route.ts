import { requireUser } from "@/server/auth";
import { createBudgetAdjustmentSchema } from "@/server/modules/budget/budget.schema";
import { addBudgetAdjustment, getProjectBudgetAdjustmentPage } from "@/server/modules/budget/budget.service";
import { withErrorHandling } from "@/server/shared/http";
import { requireConfirmation } from "@/server/shared/security/confirmation";
import { cursorPaginationSchema } from "@/server/shared/pagination";
import { parseRequestBody, parseSearchParams } from "@/server/shared/validation";

type BudgetAdjustmentRouteContext = { params: Promise<{ projectId: string }> };

export const GET = withErrorHandling(async (request, context: BudgetAdjustmentRouteContext) => {
  const user = await requireUser();
  const { projectId } = await context.params;
  await requireConfirmation(request, user.id, "budget-adjust", projectId);
  const pagination = await parseSearchParams(request, cursorPaginationSchema);
  const page = await getProjectBudgetAdjustmentPage(user.id, projectId, pagination, user.role === "ADMIN");

  return Response.json({
    adjustments: page.data.map((adjustment) => ({
      ...adjustment,
      amount: adjustment.amount.toString(),
      date: adjustment.date.toISOString(),
      createdAt: adjustment.createdAt.toISOString(),
    })),
    pageInfo: page.pageInfo,
    totalCount: page.totalCount,
  });
});

export const POST = withErrorHandling(async (request, context: BudgetAdjustmentRouteContext) => {
  const user = await requireUser();
  const { projectId } = await context.params;
  const input = await parseRequestBody(request, createBudgetAdjustmentSchema);
  const adjustment = await addBudgetAdjustment(user.id, projectId, input, user.role === "ADMIN");

  return Response.json({
    adjustment: {
      ...adjustment,
      amount: adjustment.amount.toString(),
      date: adjustment.date.toISOString(),
      createdAt: adjustment.createdAt.toISOString(),
    },
  }, { status: 201 });
});
