import { requireUser } from "@/server/auth";
import { restoreProjectPayment } from "@/server/modules/payments/payments.service";
import { withErrorHandling } from "@/server/shared/http";
import { serializePayment } from "@/server/shared/serializers/financial";

type PaymentRouteContext = { params: Promise<{ paymentId: string }> };

export const POST = withErrorHandling(async (_request, context: PaymentRouteContext) => {
  const user = await requireUser();
  const { paymentId } = await context.params;
  const payment = await restoreProjectPayment(user.id, paymentId, user.role === "ADMIN");
  return Response.json({ payment: serializePayment(payment) });
});
