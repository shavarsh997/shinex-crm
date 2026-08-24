import { requireProjectEditor, requireUser } from "@/server/auth";
import { createEmployeeSchema } from "@/server/modules/employees/employees.schema";
import { createEmployeeForUser, getAllEmployees } from "@/server/modules/employees/employees.service";
import { withErrorHandling } from "@/server/shared/http";
import { parseRequestBody } from "@/server/shared/validation";

export const GET = withErrorHandling(async () => {
  await requireUser();
  return Response.json({ employees: await getAllEmployees() });
});

export const POST = withErrorHandling(async (request) => {
  const user = await requireProjectEditor();
  const input = await parseRequestBody(request, createEmployeeSchema);
  return Response.json({ employee: await createEmployeeForUser(user.id, input) }, { status: 201 });
});
