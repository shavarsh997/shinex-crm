import { cookies } from "next/headers";
import { z } from "zod";

import { requireAdmin } from "@/server/auth";
import { hardDeleteProjectForAdmin } from "@/server/modules/projects/projects.service";
import { withErrorHandling } from "@/server/shared/http";
import { validateConfirmationCode } from "@/server/shared/security/confirmation";
import { parseRequestBody } from "@/server/shared/validation";

type ProjectRouteContext = { params: Promise<{ projectId: string }> };

const confirmationSchema = z.object({
  phrase: z.string().trim().regex(/^[1-9][0-9]{2}$/, "Введите трёхзначный код подтверждения."),
});

function challengeCookieName(projectId: string) {
  return `shinex_project_hard_delete_${projectId}`;
}

export const POST = withErrorHandling(async (request, context: ProjectRouteContext) => {
  const administrator = await requireAdmin();
  const { projectId } = await context.params;
  const { phrase } = await parseRequestBody(request, confirmationSchema);
  const cookieStore = await cookies();
  await validateConfirmationCode(phrase, administrator.id, challengeCookieName(projectId), "phrase");

  await hardDeleteProjectForAdmin(projectId);
  cookieStore.delete({ name: challengeCookieName(projectId), path: `/api/projects/${projectId}` });

  return Response.json({ deletedProjectId: projectId });
});
