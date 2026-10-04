import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { DeleteCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, tables } from "../../lib/dynamo";
import { badRequest, created, farmIdFromEvent, notFound, ok } from "../../lib/http";
import { newId } from "../../lib/ids";
import { pickOptional } from "../../lib/optionalFields";
import type { Batch, BatchStatus } from "../../lib/types";

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

    // startDate stays farmer-declared, because a flock is often recorded days
    // or weeks after the birds actually arrived — forcing the server clock
    // would make it impossible to enter an existing flock honestly. But a
    // future date is never a legitimate entry, and it would make the batch's
    // age and every day-based figure derived from it meaningless.
    // createdAt below is the server's own record of when this was entered, so
    // a declared date far from it stays auditable.
    if (String(body.startDate) > new Date().toISOString().slice(0, 10)) {
      return badRequest("startDate cannot be in the future");
    }

    const batch: Batch = {
      farmId,
      batchId: newId(),
      name: body.name,
      type: String(body.type).trim().slice(0, 40),
      startDate: body.startDate,
      birdCount: body.birdCount,
      ...(body.breed ? { breed: body.breed } : {}),
      ...(body.housing ? { housing: body.housing } : {}),
      ...(body.initialAgeWeeks ? { initialAgeWeeks: Number(body.initialAgeWeeks) } : {}),
      ...(body.notes ? { notes: body.notes } : {}),
      ...pickOptional(body, {
        penId: "string",
        hatchery: "string",
        targetWeightKg: "number",
        purchaseCostNaira: "number",
      }),
      status: "active",
      createdAt: new Date().toISOString(),
    };

    await ddb.send(new PutCommand({ TableName: tables.batches, Item: batch }));
    return created(batch);
  }

  if (method === "PATCH") {
    if (!batchId) return badRequest("batch id is required in the path");
    const body = JSON.parse(event.body ?? "{}");

    // birdCount is deliberately NOT updatable. It records how many birds were
    // placed, which is the baseline every mortality and survival figure is
    // measured against. Allowing it to be edited after the fact let someone
    // quietly raise or lower the placed count to hide losses, with no record
    // that it had ever changed. Corrections now mean deleting and recreating
    // the batch, which leaves the old row's absence visible rather than
    // silently rewriting history. startDate is excluded for the same reason.
    const allowed: Array<keyof Batch> = [
      "name", "status", "breed", "housing", "penId", "notes",
      // Recorded when a batch is completed (sales are what meat-bird
      // performance is judged on), or filled in afterwards.
      "purchaseCostNaira", "birdsSold", "salesRevenueNaira", "completionNotes",
    ];
    const updates = allowed.filter((key) => body[key] !== undefined);
    if (updates.length === 0) return badRequest("no updatable fields provided");

    for (const key of ["purchaseCostNaira", "birdsSold", "salesRevenueNaira"] as const) {
      if (body[key] !== undefined && !(typeof body[key] === "number" && Number.isFinite(body[key]) && body[key] >= 0)) {
        return badRequest(`${key} must be a number of zero or more`);
      }
    }

    const validStatuses: BatchStatus[] = ["active", "closed"];
    if (body.status && !validStatuses.includes(body.status)) {
      return badRequest(`status must be one of ${validStatuses.join(", ")}`);
    }

    // closedAt is server-set only (see the Batch.closedAt comment in
    // lib/types.ts) — stamp it the moment a batch closes, and clear it if
    // a batch is ever reopened, rather than trusting anything the client
    // sends for it.
    const setValues: Record<string, unknown> = Object.fromEntries(
      updates.map((k) => [k, body[k]])
    );
    const removeKeys: string[] = [];
    if (body.status === "closed") {
      setValues.closedAt = new Date().toISOString();
    } else if (body.status === "active") {
      removeKeys.push("closedAt");
    }

    const setKeys = Object.keys(setValues);
    const expressionParts: string[] = [];
    if (setKeys.length > 0) {
      expressionParts.push(`SET ${setKeys.map((k, i) => `#${k} = :v${i}`).join(", ")}`);
    }
    if (removeKeys.length > 0) {
      expressionParts.push(`REMOVE ${removeKeys.map((k) => `#${k}`).join(", ")}`);
    }

    await ddb.send(
      new UpdateCommand({
        TableName: tables.batches,
        Key: { farmId, batchId },
        UpdateExpression: expressionParts.join(" "),
        ExpressionAttributeNames: Object.fromEntries(
          [...setKeys, ...removeKeys].map((k) => [`#${k}`, k])
        ),
        ...(setKeys.length > 0
          ? { ExpressionAttributeValues: Object.fromEntries(setKeys.map((k, i) => [`:v${i}`, setValues[k]])) }
          : {}),
        ConditionExpression: "attribute_exists(batchId)",
      })
    ).catch((err) => {
      if (err.name === "ConditionalCheckFailedException") return null;
      throw err;
    });

    return ok({ farmId, batchId, updated: [...setKeys, ...removeKeys] });
  }

  if (method === "DELETE") {
    if (!batchId) return badRequest("batch id is required in the path");
    await ddb.send(
      new DeleteCommand({
        TableName: tables.batches,
        Key: { farmId, batchId },
      })
    );
    return ok({ deleted: true, batchId });
  }

  return notFound(`unsupported method ${method} for /batches`);
}
