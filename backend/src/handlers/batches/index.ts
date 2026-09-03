import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, tables } from "../../lib/dynamo";
import { badRequest, created, farmIdFromEvent, notFound, ok } from "../../lib/http";
import { newId } from "../../lib/ids";
import type { Batch, BatchStatus, BatchType } from "../../lib/types";

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const farmId = farmIdFromEvent(event);
  const method = event.requestContext.http.method;
  const batchId = event.pathParameters?.id;

  if (method === "GET") {
    const result = await ddb.send(
      new QueryCommand({
        TableName: tables.batches,
        KeyConditionExpression: "farmId = :farmId",
        ExpressionAttributeValues: { ":farmId": farmId },
      })
    );
    return ok({ batches: result.Items ?? [] });
  }

  if (method === "POST") {
    const body = JSON.parse(event.body ?? "{}");
    if (!body.name || !body.type || !body.startDate || typeof body.birdCount !== "number") {
      return badRequest("name, type, startDate, and birdCount are required");
    }

    const batch: Batch = {
      farmId,
      batchId: newId(),
      name: body.name,
      type: body.type as BatchType,
      startDate: body.startDate,
      birdCount: body.birdCount,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    await ddb.send(new PutCommand({ TableName: tables.batches, Item: batch }));
    return created(batch);
  }

  if (method === "PATCH") {
    if (!batchId) return badRequest("batch id is required in the path");
    const body = JSON.parse(event.body ?? "{}");

    const allowed: Array<keyof Batch> = ["name", "birdCount", "status"];
    const updates = allowed.filter((key) => body[key] !== undefined);
    if (updates.length === 0) return badRequest("no updatable fields provided");

    const validStatuses: BatchStatus[] = ["active", "closed"];
    if (body.status && !validStatuses.includes(body.status)) {
      return badRequest(`status must be one of ${validStatuses.join(", ")}`);
    }

    await ddb.send(
      new UpdateCommand({
        TableName: tables.batches,
        Key: { farmId, batchId },
        UpdateExpression: `SET ${updates.map((k, i) => `#${k} = :v${i}`).join(", ")}`,
        ExpressionAttributeNames: Object.fromEntries(updates.map((k) => [`#${k}`, k])),
        ExpressionAttributeValues: Object.fromEntries(
          updates.map((k, i) => [`:v${i}`, body[k]])
        ),
        ConditionExpression: "attribute_exists(batchId)",
      })
    ).catch((err) => {
      if (err.name === "ConditionalCheckFailedException") return null;
      throw err;
    });

    return ok({ farmId, batchId, updated: updates });
  }

  return notFound(`unsupported method ${method} for /batches`);
}
