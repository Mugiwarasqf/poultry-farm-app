import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { CognitoIdentityProviderClient, ConfirmForgotPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";
import { badRequest, ok, serverError } from "../../lib/http";
import { logger } from "../../lib/logger";

const cognito = new CognitoIdentityProviderClient({});
const CLIENT_ID = process.env.COGNITO_CLIENT_ID!;

const PASSWORD_RE = /^(?=.*[a-z])(?=.*\d).{8,}$/;

// POST /auth/confirm-forgot-password -- the code from forgotPassword.ts's
// email, plus a new password.
export async function handler(event: APIGatewayProxyEventV2) {
  const body = JSON.parse(event.body ?? "{}");
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!email || !code) return badRequest("email and code are required");
  if (!PASSWORD_RE.test(newPassword)) {
    return badRequest("password must be at least 8 characters and include a letter and a number");
  }

  try {
    await cognito.send(
      new ConfirmForgotPasswordCommand({
        ClientId: CLIENT_ID,
        Username: email,
        ConfirmationCode: code,
        Password: newPassword,
      })
    );
  } catch (err: any) {
    if (err.name === "CodeMismatchException" || err.name === "ExpiredCodeException") {
      return badRequest("that code is incorrect or has expired");
    }
    logger.error("confirm_forgot_password_failed", { email, code: err.name, message: err.message });
    return serverError(err.message || "Failed to reset password", { code: err.name });
  }

  logger.info("password_reset_success", { email });
  return ok({ message: "Password updated. You can now log in." });
}
