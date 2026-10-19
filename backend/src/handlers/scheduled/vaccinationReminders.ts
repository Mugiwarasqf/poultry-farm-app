import type { ScheduledHandler } from "aws-lambda";
import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";
import { ddb, tables } from "../../lib/dynamo";
import { isSuppressed } from "../../lib/suppression";
import { logger } from "../../lib/logger";

const ses = new SESClient({});
const SENDER_EMAIL = process.env.SES_SENDER_EMAIL!;
const REMINDER_WINDOW_DAYS = 3;

// Runs daily via the EventBridge Schedule in infra/modules/notifications/.
// Implements the two-touch cadence Toluwase's follow-up confirmed
// (docs/09-interview-toluwase.txt: a heads-up a few days before, plus a
// same-day reminder) — a schedule item due in 3 days surfaces in 3
// consecutive daily runs until it's marked done, so both touches fall out
// of this one query without extra state to track "have we already warned
// about this one."
//
// Email, not SMS (31/08/2026) — see backend/src/handlers/auth/otpRequest.ts's
// header comment for why this switched, and the flag in docs/CLAUDE.md:
// Toluwase's confirmation was specifically about a *phone notification*,
// and this project's own research flagged SMS as what matters most if a
// no-smartphone segment turns out to be real. Switching the delivery
// channel to email doesn't just change infrastructure — it may weaken the
// exact validated finding this feature exists to serve. Revisit once the
// underlying SNS SMS account issue is resolved.
//
// Requires two GSIs beyond what docs/10-build-plan.md's data model lists
// (added in infra/modules/dynamodb/, flagged there too): VaccinationSchedules
// needs a status+dueDate index to find what's due without scanning every
// batch, and Batches needs a batchId-only index because a schedule item
// only carries batchId, not the farmId needed to look up an email address.
export const handler: ScheduledHandler = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const windowEnd = new Date(Date.now() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const dueSoon = await ddb.send(
    new QueryCommand({
      TableName: tables.vaccinationSchedules,
      IndexName: "StatusDueDateIndex",
      KeyConditionExpression: "#status = :upcoming AND dueDate BETWEEN :today AND :windowEnd",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":upcoming": "upcoming", ":today": today, ":windowEnd": windowEnd },
    })
  );

  let sent = 0;
  let skippedSuppressed = 0;
  let skippedNoFarmOrEmail = 0;
  let skippedDisabled = 0;

  for (const item of dueSoon.Items ?? []) {
    const batch = await ddb.send(
      new QueryCommand({
        TableName: tables.batches,
        IndexName: "BatchIdIndex",
        KeyConditionExpression: "batchId = :batchId",
        ExpressionAttributeValues: { ":batchId": item.batchId },
      })
    );
    const farmId = batch.Items?.[0]?.farmId;
    if (!farmId) {
      logger.warn("vaccination_reminder_skipped_no_farm", { batchId: item.batchId, scheduleId: item.scheduleId });
      skippedNoFarmOrEmail++;
      continue;
    }

    const farm = await ddb.send(new GetCommand({ TableName: tables.farms, Key: { farmId } }));
    const email = farm.Item?.ownerEmail;
    if (!email) {
      logger.warn("vaccination_reminder_skipped_no_email", { farmId, batchId: item.batchId });
      skippedNoFarmOrEmail++;
      continue;
    }

    const prefs = farm.Item?.notificationPrefs;
    if (prefs?.emailAlerts === false || prefs?.vaccinationReminders === false) {
      logger.info("vaccination_reminder_skipped_disabled", { farmId, email });
      skippedDisabled++;
      continue;
    }

    if (await isSuppressed(email)) {
      logger.warn("vaccination_reminder_skipped_suppressed", { email, batchId: item.batchId });
      skippedSuppressed++;
      continue;
    }

    const dueToday = item.dueDate === today;
    const message = dueToday
      ? `${item.vaccineName} is due today for one of your batches.`
      : `${item.vaccineName} is due on ${item.dueDate} — a few days away.`;

    await ses.send(
      new SendEmailCommand({
        Source: SENDER_EMAIL,
        Destination: { ToAddresses: [email] },
        Message: {
          Subject: { Data: "Vaccination reminder" },
          Body: { Text: { Data: message } },
        },
      })
    );
    sent++;
  }

  // The only way to confirm from CloudWatch alone that today's run actually
  // found and acted on something, without needing a failure to look at.
  logger.info("vaccination_reminders_run_complete", {
    due: dueSoon.Items?.length ?? 0,
    sent,
    skippedSuppressed,
    skippedNoFarmOrEmail,
    skippedDisabled,
  });
};
