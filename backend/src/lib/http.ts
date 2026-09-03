import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

export function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

export const ok = (body: unknown) => json(200, body);
export const created = (body: unknown) => json(201, body);
export const badRequest = (message: string) => json(400, { error: message });
export const notFound = (message: string) => json(404, { error: message });

/**
 * The farmId comes from the authenticated user's Cognito claims, never from
 * a request body or path param — a farmer can only ever act on their own
 * farm. Depends on the "custom:farmId" attribute being set on the Cognito
 * user (see infra/cognito.tf) and populated at signup — that wiring is a
 * TODO tracked in docs/10-build-plan.md.
 */
export function farmIdFromEvent(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): string {
  const claims = event.requestContext.authorizer?.jwt?.claims ?? {};
  const farmId = claims["custom:farmId"];
  if (typeof farmId !== "string" || farmId.length === 0) {
    throw new Error("missing custom:farmId claim on authenticated request");
  }
  return farmId;
}
