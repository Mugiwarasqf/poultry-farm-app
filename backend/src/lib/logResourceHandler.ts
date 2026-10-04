import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "./dynamo";
import { badRequest, created, ok } from "./http";
import { entryId } from "./ids";

/**
 * Mortality, feed, eggs, and vaccination-history all share the same shape:
 * a batch-scoped, append-only log with GET (list) / POST (create) on
 * /batches/{id}/<resource>. This factory is the shared route + DynamoDB
 * wiring; each resource only supplies its own field validation.
 */
export function makeLogResourceHandler<TExtra extends object>(opts: {
  tableName: string;
  buildItem: (batchId: string, body: any) => TExtra | { error: string };
}) {
  return async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
    const batchId = event.pathParameters?.id;
    if (!batchId) return badRequest("batch id is required in the path");
    const method = event.requestContext.http.method;

    if (method === "GET") {
      const result = await ddb.send(
        new QueryCommand({
          TableName: opts.tableName,
          KeyConditionExpression: "batchId = :batchId",
          ExpressionAttributeValues: { ":batchId": batchId },
          ScanIndexForward: false, // entryId is time-prefixed, so this is newest-first
        })
      );
      const items = result.Items ?? [];
      return ok({ entries: items, logs: items });
    }

    if (method === "POST") {
      const body = JSON.parse(event.body ?? "{}");
      const fields = opts.buildItem(batchId, body);
      if ("error" in fields) return badRequest(fields.error);

      const item = {
        batchId,
        entryId: entryId(),
        createdAt: new Date().toISOString(),
        ...fields,
      };

      await ddb.send(new PutCommand({ TableName: opts.tableName, Item: item }));
      return created(item);
    }

    return badRequest(`unsupported method ${method}`);
  };
}
