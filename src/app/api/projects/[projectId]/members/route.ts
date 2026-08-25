import { requireUser } from "@/server/auth";
import { addProjectMemberSchema } from "@/server/modules/projects/project-members.schema";
import { addProjectMember } from "@/server/modules/projects/project-members.service";
import { withErrorHandling } from "@/server/shared/http";
import { requireConfirmation } from "@/server/shared/security/confirmation";
import { parseRequestBody } from "@/server/shared/validation";

type ProjectMemberRouteContext = { params: Promise<{ projectId: string }> };

export const POST = withErrorHandling(async (request, context: ProjectMemberRouteContext) => {
  const user = await requireUser();
  const { projectId } = await context.params;
  await requireConfirmation(request, user.id, "project-member-add", projectId);
  const input = await parseRequestBody(request, addProjectMemberSchema);
  const member = await addProjectMember(user.id, projectId, input, user.role === "ADMIN");

  return Response.json({ member }, { status: 201 });
});
