import { tables } from "../../lib/dynamo";
import { makeLogResourceHandler } from "../../lib/logResourceHandler";

export const handler = makeLogResourceHandler({
  tableName: tables.feedLogs,
  buildItem: (_batchId, body) => {
    if (!body.date || !body.feedType || typeof body.amountKg !== "number" || typeof body.costNaira !== "number") {
      return { error: "date, feedType, amountKg, and costNaira are required" };
    }
    return {
      date: body.date,
      feedType: body.feedType,
      amountKg: body.amountKg,
      costNaira: body.costNaira,
    };
  },
});
