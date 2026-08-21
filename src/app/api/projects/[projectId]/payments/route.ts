import { requireProjectEditor } from "@/server/auth";
import { createPaymentSchema } from "@/server/modules/payments/payments.schema";
import { addProjectPayment } from "@/server/modules/payments/payments.service";
import { withErrorHandling } from "@/server/shared/http";
import { serializePayment } from "@/server/shared/serializers/financial";
import { parseRequestBody } from "@/server/shared/validation";

type ProjectPaymentRouteContext = { params: Promise<{ projectId: string }> };

export const POST = withErrorHandling(async (request, context: ProjectPaymentRouteContext) => {
  const user = await requireProjectEditor();
  const { projectId } = await context.params;
  const input = await parseRequestBody(request, createPaymentSchema);
  const payment = await addProjectPayment(user.id, projectId, input);

  return Response.json({ payment: serializePayment(payment) }, { status: 201 });
});
