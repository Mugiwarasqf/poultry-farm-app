import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, tables } from "../../lib/dynamo";
import { badRequest, created, notFound, ok } from "../../lib/http";
import { entryId } from "../../lib/ids";
import { pickOptional } from "../../lib/optionalFields";
import { checkRecordDate } from "../../lib/dates";
import type { SickBayCase } from "../../lib/types";

// GET/POST /batches/{id}/sick-bay, PATCH /batches/{id}/sick-bay/{caseId}.
//
// Sick birds taken out of a batch into isolation. A case opens with how
// many birds and what's wrong; while open its treatment/notes can be
// updated; it closes with how many recovered and how many died. Same
// batch-scoped shape as the vaccination schedule (which also needs PATCH),
// so it doesn't use the append-only logResourceHandler factory.
//
// Deaths here are mirrored into MortalityLog by the app, not by this
// handler, so the farmer sees the mortality entry they'd expect and the
// existing mortality figures stay the single source of bird losses.
export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const batchId = event.pathParameters?.id;
  if (!batchId) return badRequest("batch id is required in the path");
  const method = event.requestContext.http.method;

  if (method === "GET") {
    const result = await ddb.send(
      new QueryCommand({
        TableName: tables.sickBay,
        KeyConditionExpression: "batchId = :batchId",
        ExpressionAttributeValues: { ":batchId": batchId },
        ScanIndexForward: false, // caseId is time-prefixed: newest first
      })
    );
    return ok({ cases: result.Items ?? [] });
  }

  if (method === "POST") {
    const body = JSON.parse(event.body ?? "{}");
    const birdCount = Number(body.birdCount);
    if (!body.dateIsolated || !(Number.isInteger(birdCount) && birdCount > 0)) {
      return badRequest("dateIsolated and a whole birdCount above zero are required");
    }
    const dateError = checkRecordDate(body.dateIsolated, "dateIsolated");
    if (dateError) return badRequest(dateError);

    const item: SickBayCase = {
      batchId,
      caseId: entryId(),
      dateIsolated: body.dateIsolated,
      birdCount,
      ...(Array.isArray(body.symptoms)
        ? { symptoms: body.symptoms.filter((s: unknown) => typeof s === "string" && s.trim()).map((s: string) => s.trim().slice(0, 60)).slice(0, 20) }
        : {}),
      ...pickOptional(body, { suspectedCause: "string", treatment: "string", notes: "string" }),
      status: "open",
      createdAt: new Date().toISOString(),
    };

    await ddb.send(new PutCommand({ TableName: tables.sickBay, Item: item }));
    return created(item);
  }

  if (method === "PATCH") {
    const caseId = event.pathParameters?.caseId;
    if (!caseId) return badRequest("case id is required in the path");
    const body = JSON.parse(event.body ?? "{}");

    const existing = await ddb.send(new GetCommand({ TableName: tables.sickBay, Key: { batchId, caseId } }));
    const current = existing.Item as SickBayCase | undefined;
    if (!current) return notFound("sick bay case not found");

    const values: Record<string, unknown> = pickOptional(body, {
      treatment: "string",
      notes: "string",
      outcomeNotes: "string",
    });

    if (body.status === "closed") {
      const recovered = Number(body.recoveredCount ?? 0);
      const died = Number(body.diedCount ?? 0);
      if (!Number.isInteger(recovered) || !Number.isInteger(died) || recovered < 0 || died < 0) {
        return badRequest("recoveredCount and diedCount must be whole numbers of zero or more");
      }
      if (recovered + died > current.birdCount) {
        return badRequest(`recovered and died can't add up to more than the ${current.birdCount} birds isolated`);
      }
      Object.assign(values, {
        status: "closed",
        recoveredCount: recovered,
        diedCount: died,
        closedAt: new Date().toISOString(),
      });
    } else if (body.status !== undefined) {
      return badRequest('status can only be set to "closed"');
    }

    const keys = Object.keys(values);
    if (keys.length === 0) return badRequest("no updatable fields provided");

    await ddb.send(
      new UpdateCommand({
        TableName: tables.sickBay,
        Key: { batchId, caseId },
        UpdateExpression: `SET ${keys.map((k, i) => `#${k} = :v${i}`).join(", ")}`,
        ExpressionAttributeNames: Object.fromEntries(keys.map((k) => [`#${k}`, k])),
        ExpressionAttributeValues: Object.fromEntries(keys.map((k, i) => [`:v${i}`, values[k]])),
      })
    );
    return ok({ ...current, ...values });
  }

  return badRequest(`unsupported method ${method}`);
}
