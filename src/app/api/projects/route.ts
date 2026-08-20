import { requireUser } from "@/server/auth";
import { createProjectSchema } from "@/server/modules/projects/projects.schema";
import { createProjectForUser, getUserProjects } from "@/server/modules/projects/projects.service";
import { serializeProject } from "@/server/shared/serializers/financial";
import { withErrorHandling } from "@/server/shared/http";
import { parseRequestBody } from "@/server/shared/validation";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const projects = await getUserProjects(user.id);

  return Response.json({ projects: projects.map(serializeProject) });
});

export const POST = withErrorHandling(async (request) => {
  const user = await requireUser();
  const input = await parseRequestBody(request, createProjectSchema);
  const project = await createProjectForUser(user.id, input);

  return Response.json({ project: serializeProject(project) }, { status: 201 });
});
