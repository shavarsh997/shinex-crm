import { randomInt } from "node:crypto";
import { cookies } from "next/headers";

import { requireAdmin } from "@/server/auth";
import { requestProjectHardDeletion } from "@/server/modules/projects/projects.service";
import { withErrorHandling } from "@/server/shared/http";

type ProjectRouteContext = { params: Promise<{ projectId: string }> };

const words = ["МАЯК", "ОРБИТА", "КЕДР", "ВЕТЕР", "ГРАНИТ", "ПУЛЬС", "СЕВЕР", "КОМЕТА"];

function challengeCookieName(projectId: string) {
  return `shinex_project_hard_delete_${projectId}`;
}

function createPhrase() {
  return `${words[randomInt(words.length)]}-${words[randomInt(words.length)]}-${randomInt(100, 1000)}`;
}

export const GET = withErrorHandling(async (_request, context: ProjectRouteContext) => {
  const administrator = await requireAdmin();
  const { projectId } = await context.params;
  await requestProjectHardDeletion(projectId);

  const phrase = createPhrase();
  (await cookies()).set(challengeCookieName(projectId), JSON.stringify({ phrase, userId: administrator.id }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: `/api/projects/${projectId}`,
    maxAge: 10 * 60,
  });

  return Response.json({ phrase });
});
