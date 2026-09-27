import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, tables } from "../../lib/dynamo";
import { badRequest, farmIdFromEvent, notFound, ok } from "../../lib/http";
import type { Farm } from "../../lib/types";

// GET/PATCH /farms/{id} — didn't exist until now (a frontend PATCH to this
// route was 404ing). farmId always comes from the caller's own JWT claim
// (farmIdFromEvent), never from the {id} in the path — the path segment
// is kept only for a RESTful URL shape. Same principle, and same bug
// class, as the one just fixed in summary/index.ts: trusting the path
// would let any authenticated user read or edit any OTHER farm's details
// just by changing the URL.
export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const farmId = farmIdFromEvent(event);
  const method = event.requestContext.http.method;

  if (method === "GET") {
    const result = await ddb.send(new GetCommand({ TableName: tables.farms, Key: { farmId } }));
    if (!result.Item) return notFound("farm not found");
    return ok(result.Item);
  }

  if (method === "PATCH") {
    const body = JSON.parse(event.body ?? "{}");
    const allowed: Array<keyof Farm> = ["name", "farmerName", "location"];
    const updates = allowed.filter((key) => body[key] !== undefined);
    if (updates.length === 0) return badRequest("no updatable fields provided");

    await ddb.send(
      new UpdateCommand({
        TableName: tables.farms,
        Key: { farmId },
        UpdateExpression: `SET ${updates.map((k, i) => `#${k} = :v${i}`).join(", ")}`,
        ExpressionAttributeNames: Object.fromEntries(updates.map((k) => [`#${k}`, k])),
        ExpressionAttributeValues: Object.fromEntries(updates.map((k, i) => [`:v${i}`, body[k]])),
      })
    );

    return ok({ farmId, updated: updates });
  }

  return badRequest(`unsupported method ${method}`);
}
