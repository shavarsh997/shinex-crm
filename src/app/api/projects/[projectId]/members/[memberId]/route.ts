import { requireUser } from "@/server/auth";
import { removeProjectMember } from "@/server/modules/projects/project-members.service";
import { withErrorHandling } from "@/server/shared/http";
import { requireConfirmation } from "@/server/shared/security/confirmation";

type ProjectMemberRouteContext = { params: Promise<{ projectId: string; memberId: string }> };

export const DELETE = withErrorHandling(async (request, context: ProjectMemberRouteContext) => {
  const user = await requireUser();
  const { projectId, memberId } = await context.params;
  await requireConfirmation(request, user.id, "project-member-remove", `${projectId}_${memberId}`);
  await removeProjectMember(user.id, projectId, memberId, user.role === "ADMIN");

  return new Response(null, { status: 204 });
});
