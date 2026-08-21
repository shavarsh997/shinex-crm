import { randomInt } from "node:crypto";
import { cookies } from "next/headers";

import { requireUser } from "@/server/auth";
import { requestProjectCompletion } from "@/server/modules/projects/projects.service";
import { withErrorHandling } from "@/server/shared/http";

type ProjectRouteContext = { params: Promise<{ projectId: string }> };

const words = ["МАЯК", "ОРБИТА", "КЕДР", "ВЕТЕР", "ГРАНИТ", "ПУЛЬС", "СЕВЕР", "КОМЕТА"];

function challengeCookieName(projectId: string) {
  return `shinex_project_completion_${projectId}`;
}

function createPhrase() {
  return `${words[randomInt(words.length)]}-${words[randomInt(words.length)]}-${randomInt(100, 1000)}`;
}

export const GET = withErrorHandling(async (_request, context: ProjectRouteContext) => {
  const user = await requireUser();
  const { projectId } = await context.params;
  await requestProjectCompletion(user.id, projectId);

  const phrase = createPhrase();
  (await cookies()).set(challengeCookieName(projectId), phrase, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: `/api/projects/${projectId}`,
    maxAge: 10 * 60,
  });

  return Response.json({ phrase });
});
