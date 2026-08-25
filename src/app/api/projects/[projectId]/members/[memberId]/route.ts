import { requireUser } from "@/server/auth";
import { removeProjectMember } from "@/server/modules/projects/project-members.service";
import { withErrorHandling } from "@/server/shared/http";

type ProjectMemberRouteContext = { params: Promise<{ projectId: string; memberId: string }> };

export const DELETE = withErrorHandling(async (_request, context: ProjectMemberRouteContext) => {
  const user = await requireUser();
  const { projectId, memberId } = await context.params;
  await removeProjectMember(user.id, projectId, memberId, user.role === "ADMIN");

  return new Response(null, { status: 204 });
});
