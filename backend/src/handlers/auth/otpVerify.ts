import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, tables } from "../../lib/dynamo";
import { badRequest, json, ok } from "../../lib/http";
import { newId } from "../../lib/ids";

const cognito = new CognitoIdentityProviderClient({});
const CLIENT_ID = process.env.COGNITO_CLIENT_ID!;
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;

// POST /auth/otp/verify — completes the CUSTOM_AUTH challenge started by
// otpRequest.ts. On a brand-new email address this also provisions the
// Farm + User rows (see docs/10-build-plan.md §2), since there's no
// separate signup step. Email, not phone — see otpRequest.ts's header
// comment for why, and the flag in docs/CLAUDE.md.
export async function handler(event: APIGatewayProxyEventV2) {
  const body = JSON.parse(event.body ?? "{}");
  const { email, session, code } = body;
  if (!email || !session || !code) {
    return badRequest("email, session, and code are required");
  }

  const result = await cognito.send(
    new RespondToAuthChallengeCommand({
      ClientId: CLIENT_ID,
      ChallengeName: "CUSTOM_CHALLENGE",
      Session: session,
      ChallengeResponses: { USERNAME: email, ANSWER: code },
    })
  );

  if (!result.AuthenticationResult) {
    // Wrong code: Cognito issues a fresh session for the retry rather than
    // just erroring — the *old* session is no longer valid at all, so it
    // has to be handed back to the client here, or the next attempt fails
    // with "Invalid session for the user" regardless of whether the code
    // entered that time is correct. (This was a real bug, not a comment
    // ahead of the code: the session was documented but never returned.)
    return json(400, { error: "incorrect code", session: result.Session });
  }

  let idToken = result.AuthenticationResult.IdToken!;
  const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64").toString());
  const userId = payload.sub as string;

  const existing = await ddb.send(new GetCommand({ TableName: tables.users, Key: { userId } }));
  let farmId = existing.Item?.farmId as string | undefined;

  if (!existing.Item) {
    farmId = newId();
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
    await cognito.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        UserAttributes: [{ Name: "custom:farmId", Value: farmId }],
      })
    );

    // The idToken above was signed before custom:farmId existed on the
    // user, so it will never carry that claim — Cognito doesn't
    // retroactively amend an already-issued token. A refresh-token
    // exchange re-reads the user's current attributes at issuance time,
    // so this gets a second idToken that actually has the claim
    // farmIdFromEvent() (backend/src/lib/http.ts) requires on every other
    // route. Without this, a brand-new user's first session could never
    // successfully call anything past /auth/otp/verify.
    const refreshed = await cognito.send(
      new InitiateAuthCommand({
        ClientId: CLIENT_ID,
        AuthFlow: "REFRESH_TOKEN_AUTH",
        AuthParameters: { REFRESH_TOKEN: result.AuthenticationResult.RefreshToken! },
      })
    );
    idToken = refreshed.AuthenticationResult!.IdToken!;
  }

  return ok({
    idToken,
    accessToken: result.AuthenticationResult.AccessToken,
    refreshToken: result.AuthenticationResult.RefreshToken,
    farmId,
  });
}
