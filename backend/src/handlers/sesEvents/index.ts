import type { SNSHandler } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, tables } from "../../lib/dynamo";

// Subscribed to the ses module's SNS topic (infra/modules/ses/main.tf) —
// SES publishes one notification per Bounce/Complaint event for mail sent
// from the domain identity here. Suppresses on every Permanent bounce
// (not Transient — that can be a temporarily full mailbox rather than a
// dead address, and transient bounces are expected to resolve on their
// own) and every complaint, full stop — AWS requires honoring complaints
// regardless of mail type when reviewing a production sending request.
// See lib/suppression.ts for where this table gets read before every
// outbound send.
export const handler: SNSHandler = async (event) => {
  for (const record of event.Records) {
    const message = JSON.parse(record.Sns.Message);

    if (message.notificationType === "Bounce") {
      // Logged regardless of type/suppression outcome -- a Transient bounce
      // was previously invisible (the handler just silently did nothing for
      // it), which made "the send succeeded but nothing arrived" look like
      // a mystery instead of what it actually was: a real rejection SES
      // already knew about.
      console.log("Bounce", JSON.stringify({
        bounceType: message.bounce?.bounceType,
        bounceSubType: message.bounce?.bounceSubType,
        recipients: (message.bounce?.bouncedRecipients ?? []).map((r: any) => ({
          email: r.emailAddress,
          action: r.action,
          status: r.status,
          diagnosticCode: r.diagnosticCode,
        })),
      }));

      if (message.bounce?.bounceType === "Permanent") {
        for (const recipient of message.bounce.bouncedRecipients ?? []) {
          await suppress(recipient.emailAddress, "bounce");
        }
      }
    }

    if (message.notificationType === "Complaint") {
      console.log("Complaint", JSON.stringify({
        recipients: (message.complaint?.complainedRecipients ?? []).map((r: any) => r.emailAddress),
        feedbackType: message.complaint?.complaintFeedbackType,
      }));
      for (const recipient of message.complaint?.complainedRecipients ?? []) {
        await suppress(recipient.emailAddress, "complaint");
      }
    }
  }
};

async function suppress(email: string, reason: "bounce" | "complaint") {
  await ddb.send(
    new PutCommand({
      TableName: tables.suppressedEmails,
      Item: { email, reason, suppressedAt: new Date().toISOString() },
    })
  );
}
