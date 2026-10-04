import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, tables } from "../../lib/dynamo";
import { badRequest, farmIdFromEvent, notFound, ok } from "../../lib/http";
import type { BirdPurpose, CustomBirdType, Farm, Pen } from "../../lib/types";

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
    const allowed: Array<keyof Farm> = [
      "name", "farmerName", "location", "phone", "birdType", "onboarded", "pens", "birdTypes",
    ];
    const updates = allowed.filter((key) => body[key] !== undefined);
    if (updates.length === 0) return badRequest("no updatable fields provided");

    // Lists are stored as given only after cleaning: known keys, trimmed
    // text, sane sizes. Anything malformed is a 400 rather than half-saved.
    const values: Record<string, unknown> = {};
    for (const key of updates) {
      if (key === "pens") {
        const pens = cleanPens(body.pens);
        if (!pens) return badRequest("pens must be a list of { id, name, capacity? } (max 200)");
        values.pens = pens;
      } else if (key === "birdTypes") {
        const types = cleanBirdTypes(body.birdTypes);
        if (!types) return badRequest("birdTypes must be a list of { id, label, purpose } (max 50)");
        values.birdTypes = types;
      } else if (key === "onboarded") {
        values.onboarded = Boolean(body.onboarded);
        if (body.onboarded === true) values.onboardedAt = new Date().toISOString();
      } else {
        values[key] = typeof body[key] === "string" ? body[key].trim().slice(0, 200) : body[key];
      }
    }
    const keys = Object.keys(values);

    await ddb.send(
      new UpdateCommand({
        TableName: tables.farms,
        Key: { farmId },
        UpdateExpression: `SET ${keys.map((k, i) => `#${k} = :v${i}`).join(", ")}`,
        ExpressionAttributeNames: Object.fromEntries(keys.map((k) => [`#${k}`, k])),
        ExpressionAttributeValues: Object.fromEntries(keys.map((k, i) => [`:v${i}`, values[k]])),
      })
    );

    return ok({ farmId, updated: keys });
  }

  return badRequest(`unsupported method ${method}`);
}

const PURPOSES: BirdPurpose[] = ["eggs", "meat", "dual", "other"];

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Returns the cleaned list, or null if it isn't a usable list of pens. */
function cleanPens(raw: unknown): Pen[] | null {
  if (!Array.isArray(raw) || raw.length > 200) return null;
  const pens: Pen[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const id = cleanText(item?.id, 60);
    const name = cleanText(item?.name, 60);
    if (!id || !name || seen.has(id)) return null;
    seen.add(id);
    const capacity = Number(item?.capacity);
    pens.push({ id, name, ...(Number.isFinite(capacity) && capacity > 0 ? { capacity: Math.round(capacity) } : {}) });
  }
  return pens;
}

/** Returns the cleaned list, or null if it isn't a usable list of bird types. */
function cleanBirdTypes(raw: unknown): CustomBirdType[] | null {
  if (!Array.isArray(raw) || raw.length > 50) return null;
  const types: CustomBirdType[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const id = cleanText(item?.id, 40).toLowerCase();
    const label = cleanText(item?.label, 40);
    const purpose = item?.purpose as BirdPurpose;
    if (!/^[a-z0-9_]+$/.test(id) || !label || !PURPOSES.includes(purpose) || seen.has(id)) return null;
    seen.add(id);
    types.push({ id, label, purpose });
  }
  return types;
}
