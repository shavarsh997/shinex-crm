import { requireUser } from "@/server/auth";
import { restoreProjectPayment } from "@/server/modules/payments/payments.service";
import { withErrorHandling } from "@/server/shared/http";
import { requireConfirmation } from "@/server/shared/security/confirmation";
import { serializePayment } from "@/server/shared/serializers/financial";

type PaymentRouteContext = { params: Promise<{ paymentId: string }> };

export const POST = withErrorHandling(async (request, context: PaymentRouteContext) => {
  const user = await requireUser();
  const { paymentId } = await context.params;
  await requireConfirmation(request, user.id, "payment-restore", paymentId);
  const payment = await restoreProjectPayment(user.id, paymentId, user.role === "ADMIN");
  return Response.json({ payment: serializePayment(payment) });
});
