import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});

// removeUndefinedValues: log entries often have optional fields (a note,
// a cost) that come through as undefined rather than omitted.
export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

export const tables = {
  farms: process.env.FARMS_TABLE!,
  batches: process.env.BATCHES_TABLE!,
  users: process.env.USERS_TABLE!,
  mortalityLogs: process.env.MORTALITY_LOGS_TABLE!,
  feedLogs: process.env.FEED_LOGS_TABLE!,
  eggLogs: process.env.EGG_LOGS_TABLE!,
  vaccinationRecords: process.env.VACCINATION_RECORDS_TABLE!,
  vaccinationSchedules: process.env.VACCINATION_SCHEDULES_TABLE!,
};
