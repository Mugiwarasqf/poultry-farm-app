import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, tables } from "../../lib/dynamo";
import { badRequest, ok } from "../../lib/http";

// POST /sync/batch — docs/10-build-plan.md §6. The body is JSON Lines (one
// queued offline write per line), matching the on-device append-only queue
// format described there. Unlike the online create endpoints, the client
// supplies its own `entryId` (generated on-device while offline) so a
// retried sync — the phone re-sending a line it's not sure went through —
// is a safe no-op instead of a duplicate row.
//
// This intentionally does not go through logResourceHandler.ts: that
// factory always assigns entryId server-side, which is right for the
// online create endpoints but wrong here.

const RESOURCE_TABLES: Record<string, string> = {
  mortality: tables.mortalityLogs,
  feed: tables.feedLogs,
  eggs: tables.eggLogs,
  vaccinations: tables.vaccinationRecords,
};

interface SyncLine {
  resource: keyof typeof RESOURCE_TABLES;
  batchId: string;
  entryId: string;
  [field: string]: unknown;
}

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const body = event.body ?? "";
  const lines = body.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return badRequest("body must be one JSON object per line");

  const results = await Promise.all(
    lines.map(async (line, index) => {
      let parsed: SyncLine;
      try {
        parsed = JSON.parse(line);
      } catch {
        return { line: index, status: "error" as const, reason: "invalid JSON" };
      }

      const tableName = RESOURCE_TABLES[parsed.resource];
      if (!tableName || !parsed.batchId || !parsed.entryId) {
        return { line: index, status: "error" as const, reason: "missing resource/batchId/entryId" };
      }

      try {
        await ddb.send(
          new PutCommand({
            TableName: tableName,
            Item: { ...parsed, createdAt: new Date().toISOString() },
            ConditionExpression: "attribute_not_exists(entryId)",
          })
        );
        return { line: index, status: "applied" as const };
      } catch (err: any) {
        if (err.name === "ConditionalCheckFailedException") {
          return { line: index, status: "duplicate" as const };
        }
        return { line: index, status: "error" as const, reason: String(err.message ?? err) };
      }
    })
  );

  return ok({ results });
}
