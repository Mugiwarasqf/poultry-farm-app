import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, tables } from "../../lib/dynamo";
import { badRequest, created, farmIdFromEvent, ok } from "../../lib/http";
import { entryId } from "../../lib/ids";

// GET/POST /feed-stock — farm-level (farmId from the JWT, no {id} in the
// path, same pattern as /batches), matching frontend-react's
// api/feedStock.js and the exact fields FeedPurchaseModal.jsx submits.
// Records only the "bought" side — lib/feeds.js's computeFeedStock()
// combines these with each batch's existing FeedLog entries client-side
// to work out stock on hand, so there's no running balance to store here,
// same "derive, don't duplicate" principle as everywhere else a balance
// shows up in this API (see summary/index.ts).
export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const farmId = farmIdFromEvent(event);
  const method = event.requestContext.http.method;

  if (method === "GET") {
    const result = await ddb.send(
      new QueryCommand({
        TableName: tables.feedPurchases,
        KeyConditionExpression: "farmId = :farmId",
        ExpressionAttributeValues: { ":farmId": farmId },
        ScanIndexForward: false, // entryId is time-prefixed, newest first
      })
    );
    return ok({ purchases: result.Items ?? [] });
  }

  if (method === "POST") {
    const body = JSON.parse(event.body ?? "{}");
    if (!body.date || !body.feedType || typeof body.bags !== "number" || typeof body.bagSizeKg !== "number") {
      return badRequest("date, feedType, bags, and bagSizeKg are required");
    }

    const item = {
      farmId,
      entryId: entryId(),
      date: body.date,
      feedType: body.feedType,
      bags: body.bags,
      bagSizeKg: body.bagSizeKg,
      brand: body.brand,
      pricePerBagNaira: body.pricePerBagNaira,
      supplier: body.supplier,
      bestBefore: body.bestBefore,
      notes: body.notes,
      createdAt: new Date().toISOString(),
    };

    await ddb.send(new PutCommand({ TableName: tables.feedPurchases, Item: item }));
    return created(item);
  }

  return badRequest(`unsupported method ${method}`);
}
