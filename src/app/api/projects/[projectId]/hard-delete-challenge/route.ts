import { requireAdmin } from "@/server/auth";
import { requestProjectHardDeletion } from "@/server/modules/projects/projects.service";
import { withErrorHandling } from "@/server/shared/http";
import { issueConfirmationCode } from "@/server/shared/security/confirmation";

type ProjectRouteContext = { params: Promise<{ projectId: string }> };

export const GET = withErrorHandling(async (_request, context: ProjectRouteContext) => {
  const administrator = await requireAdmin();
  const { projectId } = await context.params;
  await requestProjectHardDeletion(projectId);

  const phrase = await issueConfirmationCode(administrator.id, `shinex_project_hard_delete_${projectId}`, `/api/projects/${projectId}`);

  return Response.json({ phrase });
});
