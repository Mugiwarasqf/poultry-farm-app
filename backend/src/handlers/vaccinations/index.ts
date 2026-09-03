import { tables } from "../../lib/dynamo";
import { makeLogResourceHandler } from "../../lib/logResourceHandler";

// The backward-looking vaccination history — see docs/04-v1-feature-scope.md
// §4 for why this needs to exist separately from the forward-looking
// schedule in vaccinationSchedule/index.ts.
export const handler = makeLogResourceHandler({
  tableName: tables.vaccinationRecords,
  buildItem: (_batchId, body) => {
    if (!body.vaccineName || !body.dateAdministered) {
      return { error: "vaccineName and dateAdministered are required" };
    }
    return {
      vaccineName: body.vaccineName,
      dateAdministered: body.dateAdministered,
      costNaira: body.costNaira,
    };
  },
});
