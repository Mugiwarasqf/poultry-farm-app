import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, tables } from "../../lib/dynamo";
import { badRequest, created, ok } from "../../lib/http";
import { newId } from "../../lib/ids";
import type { VaccinationSchedule, VaccinationScheduleStatus } from "../../lib/types";
import { pickOptional } from "../../lib/optionalFields";

// The forward-looking half of vaccination reminders (docs/04-v1-feature-scope.md
// §4) — due dates the scheduled Lambda in handlers/scheduled/vaccinationReminders.ts
// scans to send SNS reminders. PATCH isn't in docs/10-build-plan.md's API list
// but the Vaccination mockup screen has a "Mark as Done" action, so it's added
// here to make that screen's flow actually work.
export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const batchId = event.pathParameters?.id;
  if (!batchId) return badRequest("batch id is required in the path");
  const method = event.requestContext.http.method;

  if (method === "GET") {
    const result = await ddb.send(
      new QueryCommand({
        TableName: tables.vaccinationSchedules,
        KeyConditionExpression: "batchId = :batchId",
        ExpressionAttributeValues: { ":batchId": batchId },
      })
    );
    return ok({ schedule: result.Items ?? [] });
  }

  if (method === "POST") {
    const body = JSON.parse(event.body ?? "{}");
    if (!body.vaccineName || !body.dueDate) {
      return badRequest("vaccineName and dueDate are required");
    }

    const item: VaccinationSchedule = {
      batchId,
      scheduleId: newId(),
      vaccineName: body.vaccineName,
      dueDate: body.dueDate,
      status: "upcoming",
      createdAt: new Date().toISOString(),
      // Planning detail shown back in the app; the reminder job ignores it.
      ...pickOptional(body, {
        route: "string",
        doseNumber: "string",
        birdsToVaccinate: "number",
        dosesPerVial: "number",
        notes: "string",
      }),
    };

    await ddb.send(new PutCommand({ TableName: tables.vaccinationSchedules, Item: item }));
    return created(item);
  }

  if (method === "PATCH") {
    const scheduleId = event.pathParameters?.scheduleId;
    if (!scheduleId) return badRequest("schedule id is required in the path");

    const body = JSON.parse(event.body ?? "{}");
    const validStatuses: VaccinationScheduleStatus[] = ["upcoming", "done", "missed"];
    if (!validStatuses.includes(body.status)) {
      return badRequest(`status must be one of ${validStatuses.join(", ")}`);
    }

    await ddb.send(
      new UpdateCommand({
        TableName: tables.vaccinationSchedules,
        Key: { batchId, scheduleId },
        UpdateExpression: "SET #status = :status",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":status": body.status },
        ConditionExpression: "attribute_exists(scheduleId)",
      })
    );
    return ok({ batchId, scheduleId, status: body.status });
  }

  return badRequest(`unsupported method ${method}`);
}
