import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, tables } from "../../lib/dynamo";
import { farmIdFromEvent, ok } from "../../lib/http";

// GET /farms/{id}/summary?period=week|month — docs/10-build-plan.md §3 and §5.
// Elizabeth's interview (docs/05-interview-elizabeth.txt) is why this is a
// live rollup rather than a stored monthly total: it's computed fresh from
// the logs every call, so it reflects entries the moment they're saved.
//
// "week"/"month" are rolling windows (last 7 / last 30 days), not calendar
// boundaries — simplest correct thing for a beta; revisit if farmers expect
// calendar-week alignment once real usage comes in.
//
// Costs come straight off feedLogs/vaccinationRecords; sums use a
// FilterExpression on `date` rather than a range key, which is fine at
// beta scale (a handful of batches, each with a few hundred log rows) but
// would want a date GSI before this needs to run at real volume.

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  // farmId comes from the caller's own JWT claim, never the {id} in the
  // path — the path segment is kept for a RESTful URL shape but is
  // otherwise ignored. This was a real bug until now: trusting the path
  // parameter meant any authenticated user could read any OTHER farm's
  // financial summary just by changing the URL. See lib/http.ts's
  // farmIdFromEvent doc comment for the same principle applied everywhere
  // else in this API.
  const farmId = farmIdFromEvent(event);

  const period = event.queryStringParameters?.period === "month" ? "month" : "week";
  const days = period === "month" ? 30 : 7;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const endDate = new Date().toISOString().slice(0, 10);

  const batchesResult = await ddb.send(
    new QueryCommand({
      TableName: tables.batches,
      KeyConditionExpression: "farmId = :farmId",
      ExpressionAttributeValues: { ":farmId": farmId },
      ProjectionExpression: "batchId",
    })
  );
  const batchIds = (batchesResult.Items ?? []).map((item) => item.batchId as string);

  let feedCostNaira = 0;
  let drugCostNaira = 0;
  let eggRevenueNaira = 0;
  let birdsLost = 0;

  await Promise.all(
    batchIds.map(async (batchId) => {
      const dateFilter = {
        KeyConditionExpression: "batchId = :batchId",
        FilterExpression: "#date BETWEEN :start AND :end",
        ExpressionAttributeNames: { "#date": "date" },
        ExpressionAttributeValues: { ":batchId": batchId, ":start": startDate, ":end": endDate },
      };

      const [feed, eggs, vaccinations, mortality] = await Promise.all([
        ddb.send(new QueryCommand({ TableName: tables.feedLogs, ...dateFilter })),
        ddb.send(new QueryCommand({ TableName: tables.eggLogs, ...dateFilter })),
        ddb.send(
          new QueryCommand({
            TableName: tables.vaccinationRecords,
            KeyConditionExpression: "batchId = :batchId",
            FilterExpression: "dateAdministered BETWEEN :start AND :end",
            ExpressionAttributeValues: { ":batchId": batchId, ":start": startDate, ":end": endDate },
          })
        ),
        ddb.send(new QueryCommand({ TableName: tables.mortalityLogs, ...dateFilter })),
      ]);

      for (const item of feed.Items ?? []) feedCostNaira += item.costNaira ?? 0;
      for (const item of eggs.Items ?? []) eggRevenueNaira += item.revenueNaira ?? 0;
      for (const item of vaccinations.Items ?? []) drugCostNaira += item.costNaira ?? 0;
      for (const item of mortality.Items ?? []) birdsLost += item.count ?? 0;
    })
  );

  const netNaira = eggRevenueNaira - feedCostNaira - drugCostNaira;

  return ok({
    farmId,
    period,
    startDate,
    endDate,
    feedCostNaira,
    drugCostNaira,
    eggRevenueNaira,
    netNaira,
    birdsLost,
  });
}
