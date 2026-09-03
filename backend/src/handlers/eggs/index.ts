import { tables } from "../../lib/dynamo";
import { makeLogResourceHandler } from "../../lib/logResourceHandler";

export const handler = makeLogResourceHandler({
  tableName: tables.eggLogs,
  buildItem: (_batchId, body) => {
    if (typeof body.crates !== "number") {
      return { error: "crates is required" };
    }
    return {
      date: body.date ?? new Date().toISOString().slice(0, 10),
      crates: body.crates,
      looseEggs: body.looseEggs ?? 0,
      // No price-per-crate exists yet anywhere in the docs — omit rather
      // than guess a revenue figure. See lib/types.ts header note.
      revenueNaira: body.revenueNaira,
    };
  },
});
