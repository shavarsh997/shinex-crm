import { cookies } from "next/headers";
import { z } from "zod";

import { requireUser } from "@/server/auth";
import { completeProjectForUser } from "@/server/modules/projects/projects.service";
import { ValidationError } from "@/server/shared/errors";
import { withErrorHandling } from "@/server/shared/http";
import { serializeProject } from "@/server/shared/serializers/financial";
import { parseRequestBody } from "@/server/shared/validation";

type ProjectRouteContext = { params: Promise<{ projectId: string }> };

const confirmationSchema = z.object({
  phrase: z.string().trim().min(1, "Введите код подтверждения.").max(100),
});

function challengeCookieName(projectId: string) {
  return `shinex_project_completion_${projectId}`;
}

export const POST = withErrorHandling(async (request, context: ProjectRouteContext) => {
  const user = await requireUser();
  const { projectId } = await context.params;
  const { phrase } = await parseRequestBody(request, confirmationSchema);
  const cookieStore = await cookies();
  const expectedPhrase = cookieStore.get(challengeCookieName(projectId))?.value;

  if (!expectedPhrase || phrase !== expectedPhrase) {
    throw new ValidationError([{ path: "phrase", message: "Код подтверждения не совпадает или уже истёк." }]);
  }

  const project = await completeProjectForUser(user.id, projectId);
  cookieStore.delete({ name: challengeCookieName(projectId), path: `/api/projects/${projectId}` });

  return Response.json({ project: serializeProject(project) });
});
