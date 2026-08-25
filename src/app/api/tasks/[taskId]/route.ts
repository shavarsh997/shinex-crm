import { requireUser } from "@/server/auth";
import { updateTaskSchema } from "@/server/modules/tasks/tasks.schema";
import { deleteTaskForUser, updateTaskForUser } from "@/server/modules/tasks/tasks.service";
import { withErrorHandling } from "@/server/shared/http";
import { parseRequestBody } from "@/server/shared/validation";

type TaskRouteContext = { params: Promise<{ taskId: string }> };

export const PATCH = withErrorHandling(async (request, context: TaskRouteContext) => {
  const user = await requireUser();
  const { taskId } = await context.params;
  const input = await parseRequestBody(request, updateTaskSchema);
  const task = await updateTaskForUser(user.id, taskId, input, user.role === "ADMIN");

  return Response.json({ task });
});

export const DELETE = withErrorHandling(async (_request, context: TaskRouteContext) => {
  const user = await requireUser();
  const { taskId } = await context.params;
  await deleteTaskForUser(user.id, taskId, user.role === "ADMIN");

  return new Response(null, { status: 204 });
});
