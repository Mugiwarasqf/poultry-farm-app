import { tables } from "../../lib/dynamo";
import { makeLogResourceHandler } from "../../lib/logResourceHandler";

export const handler = makeLogResourceHandler({
  tableName: tables.mortalityLogs,
  buildItem: (_batchId, body) => {
    if (!body.date || typeof body.count !== "number") {
      return { error: "date and count are required" };
    }
    return { date: body.date, count: body.count, note: body.note };
  },
});
