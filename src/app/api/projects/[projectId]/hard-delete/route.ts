import { cookies } from "next/headers";
import { z } from "zod";

import { requireAdmin } from "@/server/auth";
import { hardDeleteProjectForAdmin } from "@/server/modules/projects/projects.service";
import { ValidationError } from "@/server/shared/errors";
import { withErrorHandling } from "@/server/shared/http";
import { parseRequestBody } from "@/server/shared/validation";

type ProjectRouteContext = { params: Promise<{ projectId: string }> };

const confirmationSchema = z.object({
  phrase: z.string().trim().min(1, "Введите код подтверждения.").max(100),
});

function challengeCookieName(projectId: string) {
  return `shinex_project_hard_delete_${projectId}`;
}

export const POST = withErrorHandling(async (request, context: ProjectRouteContext) => {
  const administrator = await requireAdmin();
  const { projectId } = await context.params;
  const { phrase } = await parseRequestBody(request, confirmationSchema);
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(challengeCookieName(projectId))?.value;
  let challenge: { phrase?: string; userId?: string } | null = null;

  try {
    challenge = cookieValue ? JSON.parse(cookieValue) as { phrase?: string; userId?: string } : null;
  } catch {
    challenge = null;
  }

  if (!challenge?.phrase || phrase !== challenge.phrase || challenge.userId !== administrator.id) {
    throw new ValidationError([{ path: "phrase", message: "Код подтверждения не совпадает или уже истёк." }]);
  }

  await hardDeleteProjectForAdmin(projectId);
  cookieStore.delete({ name: challengeCookieName(projectId), path: `/api/projects/${projectId}` });

  return Response.json({ deletedProjectId: projectId });
});
