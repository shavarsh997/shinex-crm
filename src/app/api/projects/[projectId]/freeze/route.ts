import { requireUser } from "@/server/auth";
import { freezeProjectForUser } from "@/server/modules/projects/projects.service";
import { withErrorHandling } from "@/server/shared/http";
import { serializeProject } from "@/server/shared/serializers/financial";

type ProjectRouteContext = { params: Promise<{ projectId: string }> };

export const POST = withErrorHandling(async (_request, context: ProjectRouteContext) => {
  const user = await requireUser();
  const { projectId } = await context.params;
  const project = await freezeProjectForUser(user.id, user.role, projectId);

  return Response.json({ project: serializeProject(project) });
});
