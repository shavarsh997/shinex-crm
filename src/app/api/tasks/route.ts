import { requireUser } from "@/server/auth";
import { createTaskSchema } from "@/server/modules/tasks/tasks.schema";
import { createTaskForUser } from "@/server/modules/tasks/tasks.service";
import { withErrorHandling } from "@/server/shared/http";
import { parseRequestBody } from "@/server/shared/validation";

export const POST = withErrorHandling(async (request) => {
  const user = await requireUser();
  const input = await parseRequestBody(request, createTaskSchema);
  const task = await createTaskForUser(user.id, input);

  return Response.json({ task }, { status: 201 });
});
