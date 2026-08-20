import { requireAdmin } from "@/server/auth";
import { getUsersForAccessManagement } from "@/server/modules/users/users.service";
import { withErrorHandling } from "@/server/shared/http";

export const GET = withErrorHandling(async () => {
  await requireAdmin();
  const users = await getUsersForAccessManagement();

  return Response.json({ users });
});
