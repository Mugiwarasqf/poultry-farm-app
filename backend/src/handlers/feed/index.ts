import { tables } from "../../lib/dynamo";
import { makeLogResourceHandler } from "../../lib/logResourceHandler";
import { pickOptional } from "../../lib/optionalFields";

// Feed a batch used. It draws down the farm's feed store (feedStock handler):
// stock on hand = purchases minus these entries, matched on feed type +
// brand + bag size.
export const handler = makeLogResourceHandler({
  tableName: tables.feedLogs,
  buildItem: (_batchId, body) => {
    if (!body.date || !body.feedType || typeof body.amountKg !== "number" || typeof body.costNaira !== "number") {
      return { error: "date, feedType, amountKg, and costNaira are required" };
    }
    // bags/bagSizeKg are what the farmer actually entered (feed is counted in
    // bags, not kg). amountKg stays required because the summary is built on it.
    return {
      date: body.date,
      feedType: body.feedType,
      amountKg: body.amountKg,
      costNaira: body.costNaira,
      ...pickOptional(body, {
        bags: "number",
        bagSizeKg: "number",
        brand: "string",
        notes: "string",
      }),
    };
  },
});
