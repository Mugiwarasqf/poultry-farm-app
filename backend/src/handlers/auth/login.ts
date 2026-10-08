import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import { badRequest, ok } from "../../lib/http";
import { logger } from "../../lib/logger";

const cognito = new CognitoIdentityProviderClient({});
const CLIENT_ID = process.env.COGNITO_CLIENT_ID!;

// POST /auth/login -- email+password, replacing the old two-step OTP
// request/verify. See signup.ts's header comment for why this project
// moved off passwordless OTP.
export async function handler(event: APIGatewayProxyEventV2) {
  const body = JSON.parse(event.body ?? "{}");
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return badRequest("email and password are required");
  }

  try {
    const result = await cognito.send(
      new InitiateAuthCommand({
        ClientId: CLIENT_ID,
        AuthFlow: "USER_PASSWORD_AUTH",
        AuthParameters: { USERNAME: email, PASSWORD: password },
      })
    );

    const idToken = result.AuthenticationResult!.IdToken!;
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64").toString());
    const farmId = payload["custom:farmId"] as string | undefined;

    logger.info("login_success", { email, farmId });
    return ok({
      idToken,
      accessToken: result.AuthenticationResult!.AccessToken,
      refreshToken: result.AuthenticationResult!.RefreshToken,
      farmId,
    });
  } catch (err: any) {
    // Deliberately the same message whether the user doesn't exist or the
    // password's wrong (Cognito throws different exception names for
    // each) -- distinguishing them in the response would let someone
    // enumerate which emails have accounts.
    logger.warn("login_failed", { email, code: err.name });
    return badRequest("incorrect email or password");
  }
}
