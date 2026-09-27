import { tables } from "../../lib/dynamo";
import { makeLogResourceHandler } from "../../lib/logResourceHandler";

// GET/POST /batches/{id}/weight — periodic bird-weight samples, the input
// Feed Conversion Ratio needs and never had (see lib/types.ts's WeightLog
// header comment). Same shape as mortality/feed/eggs, so it reuses the
// same factory.
export const handler = makeLogResourceHandler({
  tableName: tables.weightLogs,
  buildItem: (_batchId, body) => {
    if (!body.date || typeof body.averageWeightKg !== "number") {
      return { error: "date and averageWeightKg are required" };
    }
    return { date: body.date, averageWeightKg: body.averageWeightKg, sampleSize: body.sampleSize };
  },
});
