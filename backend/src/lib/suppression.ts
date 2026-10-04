import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, tables } from "./dynamo";

// True if this address permanently bounced or complained — populated by
// backend/src/handlers/sesEvents/index.ts from SES's SNS notifications.
// Every outbound email call (createAuthChallenge, vaccinationReminders,
// entryNudges) checks this first and skips sending if true, to protect
// this domain's SES sending reputation — AWS reviews exactly this when
// deciding whether to grant production (out-of-sandbox) sending access.
export async function isSuppressed(email: string): Promise<boolean> {
  const result = await ddb.send(
    new GetCommand({ TableName: tables.suppressedEmails, Key: { email } })
  );
  return result.Item != null;
}
