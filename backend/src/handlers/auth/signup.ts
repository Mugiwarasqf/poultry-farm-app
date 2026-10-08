import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  AdminConfirmSignUpCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  UsernameExistsException,
} from "@aws-sdk/client-cognito-identity-provider";
import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, tables } from "../../lib/dynamo";
import { badRequest, ok, serverError } from "../../lib/http";
import { newId } from "../../lib/ids";
import { logger } from "../../lib/logger";
import { isSuppressed } from "../../lib/suppression";

const cognito = new CognitoIdentityProviderClient({});
const ses = new SESClient({});
const CLIENT_ID = process.env.COGNITO_CLIENT_ID!;
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;
const SENDER_EMAIL = process.env.SES_SENDER_EMAIL!;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Matches the Cognito password_policy in infra/modules/cognito/main.tf
// (min length 8, lowercase + a number) -- deliberately no required
// uppercase/symbol. Typing complexity is itself friction for this
// audience, not just an inconvenience to tolerate.
const PASSWORD_RE = /^(?=.*[a-z])(?=.*\d).{8,}$/;

// POST /auth/signup -- replaces the old OTP request/verify pair
// (otpRequest.ts/otpVerify.ts, both removed) now that this project uses
// email+password auth instead of passwordless OTP. See
// docs/11-platform-obstacles.md for why: both the email channel (SES
// production access denied) and the original SMS plan hit real platform
// walls, and password auth needs no per-login message delivery at all.
//
// Auto-confirms immediately (AdminConfirmSignUp) instead of requiring a
// Cognito-sent verification code first -- a deliberate friction/safety
// tradeoff for a low-digital-literacy audience: one less step, at the
// cost of not knowing up front whether the email is real. That risk is
// mitigated, not solved, by the fire-and-forget welcome email below --
// signup succeeds either way, but a bounce feeds the same suppression
// system sesEvents/index.ts already builds on, which flags
// Farm.emailBounced so the app can tell the farmer their email didn't
// actually work, instead of a silent, permanent dead end.
export async function handler(event: APIGatewayProxyEventV2) {
  const body = JSON.parse(event.body ?? "{}");
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !EMAIL_RE.test(email)) {
    return badRequest("email must be a valid email address");
  }
  if (!PASSWORD_RE.test(password)) {
    return badRequest("password must be at least 8 characters and include a letter and a number");
  }

  let userId: string;
  try {
    const signUp = await cognito.send(
      new SignUpCommand({
        ClientId: CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [{ Name: "email", Value: email }],
      })
    );
    userId = signUp.UserSub!;
  } catch (err: any) {
    if (err instanceof UsernameExistsException || err?.name === "UsernameExistsException") {
      return badRequest("an account with this email already exists");
    }
    logger.error("signup_failed", { email, code: err.name, message: err.message });
    return serverError(err.message || "Failed to create account", { code: err.name });
  }

  const farmId = newId();
  logger.info("new_user_provisioned", { userId, email, farmId });

  await ddb.send(
    new PutCommand({
      TableName: tables.farms,
      Item: { farmId, ownerEmail: email, name: "My Farm", createdAt: new Date().toISOString() },
    })
  );
  await ddb.send(
    new PutCommand({
      TableName: tables.users,
      Item: { userId, email, farmId, trialStatus: "trial", trialStartedAt: new Date().toISOString() },
    })
  );

  await cognito.send(new AdminConfirmSignUpCommand({ UserPoolId: USER_POOL_ID, Username: email }));
  await cognito.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: "custom:farmId", Value: farmId },
        // Not actually verified (no code was sent/clicked) -- marked true
        // anyway so Cognito's own ForgotPassword flow (which requires a
        // verified recovery channel) works. The welcome email below is
        // this signup's real, independent check on whether the address
        // actually works.
        { Name: "email_verified", Value: "true" },
      ],
    })
  );

  // Awaited, not truly backgrounded: the account is already fully usable
  // below regardless of whether this send succeeds, and a failure here is
  // swallowed rather than surfaced to the client, but Lambda's execution
  // environment can freeze right after the response is returned, so it
  // still has to run to completion now rather than being left unresolved.
  if (!(await isSuppressed(email))) {
    try {
      await ses.send(
        new SendEmailCommand({
          Source: SENDER_EMAIL,
          Destination: { ToAddresses: [email] },
          Message: {
            Subject: { Data: "Welcome to TrackFarm" },
            Body: {
              Text: { Data: "Your TrackFarm account is ready. Log in any time to start tracking your farm." },
            },
          },
        })
      );
    } catch (err: any) {
      logger.warn("welcome_email_failed", { email, message: err.message });
    }
  }

  const auth = await cognito.send(
    new InitiateAuthCommand({
      ClientId: CLIENT_ID,
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: { USERNAME: email, PASSWORD: password },
    })
  );

  logger.info("signup_success", { userId, email, farmId });
  return ok({
    idToken: auth.AuthenticationResult!.IdToken,
    accessToken: auth.AuthenticationResult!.AccessToken,
    refreshToken: auth.AuthenticationResult!.RefreshToken,
    farmId,
  });
}
