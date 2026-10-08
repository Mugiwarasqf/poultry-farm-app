import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { CognitoIdentityProviderClient, ForgotPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";
import { badRequest, ok } from "../../lib/http";
import { logger } from "../../lib/logger";

const cognito = new CognitoIdentityProviderClient({});
const CLIENT_ID = process.env.COGNITO_CLIENT_ID!;

// POST /auth/forgot-password -- sends a reset code via Cognito's own
// built-in email sending (the pool has no email_configuration block, so
// it defaults to COGNITO_DEFAULT), not this project's own SES setup.
// Deliberate: password reset still works regardless of SES sandbox/
// production-access status, see docs/11-platform-obstacles.md.
export async function handler(event: APIGatewayProxyEventV2) {
  const body = JSON.parse(event.body ?? "{}");
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return badRequest("email is required");

  try {
    await cognito.send(new ForgotPasswordCommand({ ClientId: CLIENT_ID, Username: email }));
  } catch (err: any) {
    // Same address space either way, whether the account exists or not --
    // see login.ts's comment on not letting a response distinguish that.
    logger.warn("forgot_password_request_failed", { email, code: err.name });
  }

  return ok({ message: "If an account exists for this email, a reset code has been sent." });
}
