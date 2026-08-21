import { requireUser } from "@/server/auth";
import { updateProjectSchema } from "@/server/modules/projects/projects.schema";
import { getUserProject, updateProjectForUser } from "@/server/modules/projects/projects.service";
import { withErrorHandling } from "@/server/shared/http";
import { serializeExpense, serializeProject } from "@/server/shared/serializers/financial";
import { parseRequestBody } from "@/server/shared/validation";

type ProjectRouteContext = { params: Promise<{ projectId: string }> };

export const GET = withErrorHandling(async (_request, context: ProjectRouteContext) => {
  const user = await requireUser();
  const { projectId } = await context.params;
  const project = await getUserProject(user.id, projectId);

  return Response.json({
    project: serializeProject(project),
    expenses: project.expenses.map(serializeExpense),
  });
});

export const PATCH = withErrorHandling(async (request, context: ProjectRouteContext) => {
  const user = await requireUser();
  const { projectId } = await context.params;
  const input = await parseRequestBody(request, updateProjectSchema);
  const project = await updateProjectForUser(user.id, projectId, input);

  return Response.json({ project: serializeProject(project) });
});
