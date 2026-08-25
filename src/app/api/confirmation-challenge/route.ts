import { z } from "zod";

import { confirmationActions, issueConfirmationChallenge } from "@/server/shared/security/confirmation";
import { requireUser } from "@/server/auth";
import { withErrorHandling } from "@/server/shared/http";
import { parseRequestBody } from "@/server/shared/validation";

const confirmationChallengeSchema = z.object({
  action: z.enum(confirmationActions),
  resourceId: z.string().trim().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/, "Некорректный идентификатор."),
});

export const POST = withErrorHandling(async (request) => {
  const user = await requireUser();
  const { action, resourceId } = await parseRequestBody(request, confirmationChallengeSchema);
  const phrase = await issueConfirmationChallenge(user.id, action, resourceId);

  return Response.json({ phrase });
});
