import { randomUUID } from "node:crypto";

/**
 * Time-sortable entry id: a millisecond timestamp prefix means a plain
 * DynamoDB Query on a batch's log entries comes back in chronological
 * order for free, with a UUID suffix to stay unique under concurrent
 * writes in the same millisecond.
 */
export function entryId(date: Date = new Date()): string {
  return `${date.getTime()}-${randomUUID()}`;
}

export function newId(): string {
  return randomUUID();
}
