# HTTP API implementing the route list in docs/10-build-plan.md §3, plus
# the vaccination-schedule PATCH added in backend/src/handlers/vaccinationSchedule/index.ts
# for the mockup's "Mark as Done" action. Every route except the two auth
# ones requires a valid Cognito ID token (via the JWT authorizer below) —
# farmId is then read out of its custom:farmId claim, never trusted from
# the request itself (see backend/src/lib/http.ts farmIdFromEvent).

locals {
  # One integration + one invoke permission per API-facing Lambda — kept
  # as a for_each since that part really is uniform. Routes stay
  # explicit below since path/method/auth vary per route and several
  # routes share one integration (batches has 3, vaccination_schedule
  # has 3).
  api_lambda_keys = [
    "batches", "farms", "mortality", "feed", "eggs", "vaccinations",
    "vaccination_schedule", "summary", "sync",
    "auth_otp_request", "auth_otp_verify",
  ]
}

resource "aws_apigatewayv2_api" "main" {
  name          = "${var.project_name}-${var.environment}"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"] # tighten to the real app's origin(s) once the frontend framework is picked
    allow_methods = ["GET", "POST", "PATCH", "OPTIONS"]
    allow_headers = ["content-type", "authorization"]
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.main.id
  name             = "cognito-jwt"
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]

  jwt_configuration {
    audience = [var.cognito_client_id]
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${var.cognito_user_pool_id}"
  }
}

resource "aws_apigatewayv2_integration" "this" {
  for_each               = toset(local.api_lambda_keys)
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.functions[each.key].invoke_arn
  payload_format_version = "2.0"
}

resource "aws_lambda_permission" "apigw" {
  for_each      = toset(local.api_lambda_keys)
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.functions[each.key].name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# ---- Routes ---------------------------------------------------------------

resource "aws_apigatewayv2_route" "auth_otp_request" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /auth/otp/request"
  target    = "integrations/${aws_apigatewayv2_integration.this["auth_otp_request"].id}"
}
resource "aws_apigatewayv2_route" "auth_otp_verify" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /auth/otp/verify"
  target    = "integrations/${aws_apigatewayv2_integration.this["auth_otp_verify"].id}"
}

resource "aws_apigatewayv2_route" "batches_list" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /batches"
  target             = "integrations/${aws_apigatewayv2_integration.this["batches"].id}"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}
resource "aws_apigatewayv2_route" "batches_create" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /batches"
  target             = "integrations/${aws_apigatewayv2_integration.this["batches"].id}"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}
resource "aws_apigatewayv2_route" "batches_update" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "PATCH /batches/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.this["batches"].id}"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}

resource "aws_apigatewayv2_route" "farms_get" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /farms/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.this["farms"].id}"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}
resource "aws_apigatewayv2_route" "farms_update" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "PATCH /farms/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.this["farms"].id}"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}

resource "aws_apigatewayv2_route" "mortality_list" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /batches/{id}/mortality"
  target             = "integrations/${aws_apigatewayv2_integration.this["mortality"].id}"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}
resource "aws_apigatewayv2_route" "mortality_create" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /batches/{id}/mortality"
  target             = "integrations/${aws_apigatewayv2_integration.this["mortality"].id}"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}

resource "aws_apigatewayv2_route" "feed_list" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /batches/{id}/feed"
  target             = "integrations/${aws_apigatewayv2_integration.this["feed"].id}"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}
resource "aws_apigatewayv2_route" "feed_create" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /batches/{id}/feed"
  target             = "integrations/${aws_apigatewayv2_integration.this["feed"].id}"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}

resource "aws_apigatewayv2_route" "eggs_list" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /batches/{id}/eggs"
  target             = "integrations/${aws_apigatewayv2_integration.this["eggs"].id}"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}
resource "aws_apigatewayv2_route" "eggs_create" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /batches/{id}/eggs"
  target             = "integrations/${aws_apigatewayv2_integration.this["eggs"].id}"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}

resource "aws_apigatewayv2_route" "vaccinations_list" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /batches/{id}/vaccinations"
  target             = "integrations/${aws_apigatewayv2_integration.this["vaccinations"].id}"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}
resource "aws_apigatewayv2_route" "vaccinations_create" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /batches/{id}/vaccinations"
  target             = "integrations/${aws_apigatewayv2_integration.this["vaccinations"].id}"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}

resource "aws_apigatewayv2_route" "vaccination_schedule_list" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /batches/{id}/vaccination-schedule"
  target             = "integrations/${aws_apigatewayv2_integration.this["vaccination_schedule"].id}"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}
resource "aws_apigatewayv2_route" "vaccination_schedule_create" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /batches/{id}/vaccination-schedule"
  target             = "integrations/${aws_apigatewayv2_integration.this["vaccination_schedule"].id}"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}
resource "aws_apigatewayv2_route" "vaccination_schedule_update" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "PATCH /batches/{id}/vaccination-schedule/{scheduleId}"
  target             = "integrations/${aws_apigatewayv2_integration.this["vaccination_schedule"].id}"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}

resource "aws_apigatewayv2_route" "summary_get" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /farms/{id}/summary"
  target             = "integrations/${aws_apigatewayv2_integration.this["summary"].id}"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}

resource "aws_apigatewayv2_route" "sync_batch" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /sync/batch"
  target             = "integrations/${aws_apigatewayv2_integration.this["sync"].id}"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}
