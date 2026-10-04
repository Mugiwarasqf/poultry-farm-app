import { tables } from "../../lib/dynamo";
import { makeLogResourceHandler } from "../../lib/logResourceHandler";
import { pickOptional } from "../../lib/optionalFields";

// The backward-looking vaccination history — see docs/04-v1-feature-scope.md
// §4 for why this needs to exist separately from the forward-looking
// schedule in vaccinationSchedule/index.ts.
//
// Beyond name + date, a record can carry what a standard vaccination record
// card holds: route (drinking water / eye drop / injection / wing web), dose
// number, birds vaccinated, vials used, the vaccine's lot number, and who gave
// it. scheduleId links a record to the schedule entry it fulfilled.
export const handler = makeLogResourceHandler({
  tableName: tables.vaccinationRecords,
  buildItem: (_batchId, body) => {
    if (!body.vaccineName || !body.dateAdministered) {
      return { error: "vaccineName and dateAdministered are required" };
    }
    return {
      vaccineName: body.vaccineName,
      dateAdministered: body.dateAdministered,
      ...pickOptional(body, {
        costNaira: "number",
        route: "string",
        doseNumber: "string",
        birdsVaccinated: "number",
        dosesPerVial: "number",
        vialsUsed: "number",
        lotNumber: "string",
        administeredBy: "string",
        notes: "string",
        scheduleId: "string",
      }),
    };
  },
});
