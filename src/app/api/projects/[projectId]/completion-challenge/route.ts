import { requireUser } from "@/server/auth";
import { requestProjectCompletion } from "@/server/modules/projects/projects.service";
import { withErrorHandling } from "@/server/shared/http";
import { issueConfirmationCode } from "@/server/shared/security/confirmation";

type ProjectRouteContext = { params: Promise<{ projectId: string }> };

export const GET = withErrorHandling(async (_request, context: ProjectRouteContext) => {
  const user = await requireUser();
  const { projectId } = await context.params;
  await requestProjectCompletion(user.id, user.role, projectId);

  const phrase = await issueConfirmationCode(user.id, `shinex_project_completion_${projectId}`, `/api/projects/${projectId}`);

  return Response.json({ phrase });
});
