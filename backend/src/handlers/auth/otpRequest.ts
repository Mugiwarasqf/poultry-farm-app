import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { randomUUID } from "node:crypto";
import {
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  UserNotFoundException,
} from "@aws-sdk/client-cognito-identity-provider";
import { badRequest, ok, serverError } from "../../lib/http";
import { logger } from "../../lib/logger";

const cognito = new CognitoIdentityProviderClient({});
const CLIENT_ID = process.env.COGNITO_CLIENT_ID!;
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /auth/otp/request — docs/10-build-plan.md §3-4. Starts the Cognito
// CUSTOM_AUTH challenge (see infra/cognito.tf + handlers/authTriggers/);
// the actual OTP is generated and emailed from createAuthChallenge.ts,
// never touched here. First-time email addresses are provisioned as a
// Cognito user on the fly (no separate "sign up" step).
export async function handler(event: APIGatewayProxyEventV2) {
  const body = JSON.parse(event.body ?? "{}");
  const email = body.email;
  if (!email || !EMAIL_RE.test(email)) {
    return badRequest("email must be a valid email address");
  }

  try {
    return ok({ session: await startCustomAuth(email) });
  } catch (err: any) {
    if (err instanceof UserNotFoundException || err?.name === "UserNotFoundException") {
      try {
        await cognito.send(
          new AdminCreateUserCommand({
            UserPoolId: USER_POOL_ID,
            Username: email,
            UserAttributes: [
              { Name: "email", Value: email },
              { Name: "email_verified", Value: "true" },
            ],
            // Never used to sign in — CUSTOM_AUTH never issues a PASSWORD_VERIFIER
            // challenge, so this only needs to satisfy the user pool's "a user
            // has some password" bookkeeping.
            TemporaryPassword: randomUUID() + "Aa1!",
            MessageAction: "SUPPRESS",
          })
        );
        return ok({ session: await startCustomAuth(email) });
      } catch (createErr: any) {
        logger.error("otp_request_provision_failed", { email, code: createErr.name, message: createErr.message });
        return serverError(createErr.message || "Failed to provision Cognito user", {
          code: createErr.name,
        });
      }
    }

    logger.error("otp_request_failed", { email, code: err.name, message: err.message });
    return serverError(err.message || "Failed to start authentication challenge", {
      code: err.name,
    });
  }
}

async function startCustomAuth(email: string): Promise<string> {
  const result = await cognito.send(
    new InitiateAuthCommand({
      ClientId: CLIENT_ID,
      AuthFlow: "CUSTOM_AUTH",
      AuthParameters: { USERNAME: email },
    })
  );
  if (!result.Session) throw new Error("Cognito did not return a session");
  return result.Session;
}
