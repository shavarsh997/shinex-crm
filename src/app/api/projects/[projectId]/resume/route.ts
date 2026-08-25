import { requireUser } from "@/server/auth";
import { resumeProjectForUser } from "@/server/modules/projects/projects.service";
import { withErrorHandling } from "@/server/shared/http";
import { requireConfirmation } from "@/server/shared/security/confirmation";
import { serializeProject } from "@/server/shared/serializers/financial";

type ProjectRouteContext = { params: Promise<{ projectId: string }> };

export const POST = withErrorHandling(async (request, context: ProjectRouteContext) => {
  const user = await requireUser();
  const { projectId } = await context.params;
  await requireConfirmation(request, user.id, "project-resume", projectId);
  const project = await resumeProjectForUser(user.id, user.role, projectId);

  return Response.json({ project: serializeProject(project) });
});
