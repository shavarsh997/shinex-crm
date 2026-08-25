import { requireUser } from "@/server/auth";
import { updatePaymentSchema } from "@/server/modules/payments/payments.schema";
import { deleteProjectPayment, updateProjectPayment } from "@/server/modules/payments/payments.service";
import { withErrorHandling } from "@/server/shared/http";
import { requireConfirmation } from "@/server/shared/security/confirmation";
import { serializePayment } from "@/server/shared/serializers/financial";
import { parseRequestBody } from "@/server/shared/validation";

type PaymentRouteContext = { params: Promise<{ paymentId: string }> };

export const PATCH = withErrorHandling(async (request, context: PaymentRouteContext) => {
  const user = await requireUser();
  const { paymentId } = await context.params;
  await requireConfirmation(request, user.id, "payment-update", paymentId);
  const input = await parseRequestBody(request, updatePaymentSchema);
  const payment = await updateProjectPayment(user.id, paymentId, input, user.role === "ADMIN");

  return Response.json({ payment: serializePayment(payment) });
});

export const DELETE = withErrorHandling(async (request, context: PaymentRouteContext) => {
  const user = await requireUser();
  const { paymentId } = await context.params;
  await requireConfirmation(request, user.id, "payment-delete", paymentId);
  await deleteProjectPayment(user.id, paymentId, user.role === "ADMIN");

  return new Response(null, { status: 204 });
});
