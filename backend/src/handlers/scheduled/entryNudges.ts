import type { ScheduledHandler } from "aws-lambda";
import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";
import { ddb, tables } from "../../lib/dynamo";
import { isSuppressed } from "../../lib/suppression";
import { logger } from "../../lib/logger";

const ses = new SESClient({});
const SENDER_EMAIL = process.env.SES_SENDER_EMAIL!;
const NUDGE_AFTER_DAYS = 2;

// Runs daily via the EventBridge Schedule in infra/modules/notifications/
// — the "nothing logged today/this week" nudge from docs/04-v1-feature-scope.md
// §5. Elizabeth's totals broke because of missing entries, not bad math
// (docs/05-interview-elizabeth.txt), so this reuses the same SES
// notification path as vaccinationReminders.ts with a different trigger.
// Email, not SMS — see that file's header comment for the tradeoff this
// switch made.
//
// A full Scan of the Farms table is fine at beta scale (a handful of
// farms) and gets replaced with something targeted well before it isn't —
// same caveat as summary/index.ts's date FilterExpressions.
export const handler: ScheduledHandler = async () => {
  const cutoff = new Date(Date.now() - NUDGE_AFTER_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const farms = await ddb.send(new ScanCommand({ TableName: tables.farms }));

  let sent = 0;
  let skippedSuppressed = 0;
  let skippedUpToDate = 0;
  let skippedNoActiveBatches = 0;
  let skippedDisabled = 0;

  for (const farm of farms.Items ?? []) {
    const prefs = farm.notificationPrefs;
    if (prefs?.emailAlerts === false || prefs?.loggingNudges === false) {
      logger.info("entry_nudge_skipped_disabled", { farmId: farm.farmId });
      skippedDisabled++;
      continue;
    }

    const batches = await ddb.send(
      new QueryCommand({
        TableName: tables.batches,
        KeyConditionExpression: "farmId = :farmId",
        FilterExpression: "#status = :active",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":farmId": farm.farmId, ":active": "active" },
      })
    );
    if ((batches.Items?.length ?? 0) === 0) {
      skippedNoActiveBatches++;
      continue;
    }

    let mostRecentDate: string | null = null;
    for (const batch of batches.Items ?? []) {
      for (const table of [tables.mortalityLogs, tables.feedLogs, tables.eggLogs]) {
        const latest = await ddb.send(
          new QueryCommand({
            TableName: table,
            KeyConditionExpression: "batchId = :batchId",
            ExpressionAttributeValues: { ":batchId": batch.batchId },
            ScanIndexForward: false, // entryId is time-prefixed, newest first
            Limit: 1,
          })
        );
        const date = latest.Items?.[0]?.date as string | undefined;
        if (date && (!mostRecentDate || date > mostRecentDate)) mostRecentDate = date;
      }
    }

    if (!mostRecentDate || mostRecentDate < cutoff) {
      if (await isSuppressed(farm.ownerEmail)) {
        logger.warn("entry_nudge_skipped_suppressed", { email: farm.ownerEmail, farmId: farm.farmId });
        skippedSuppressed++;
        continue;
      }
      await ses.send(
        new SendEmailCommand({
          Source: SENDER_EMAIL,
          Destination: { ToAddresses: [farm.ownerEmail] },
          Message: {
            Subject: { Data: "Don't forget to log today" },
            Body: {
              Text: {
                Data: "You haven't logged anything in a couple of days. A quick update keeps your numbers right.",
              },
            },
          },
        })
      );
      sent++;
    } else {
      skippedUpToDate++;
    }
  }

  logger.info("entry_nudges_run_complete", {
    farmsScanned: farms.Items?.length ?? 0,
    sent,
    skippedSuppressed,
    skippedUpToDate,
    skippedNoActiveBatches,
    skippedDisabled,
  });
};
