# Email/OTP auth. **This reverses a deliberate earlier decision**:
# docs/CLAUDE.md originally documented "Cognito, phone-number/OTP auth,
# fits this audience better than email" — grounded in the
# low-digital-literacy survey findings, not a default. The switch to
# email (31/08/2026) was a pragmatic call after SNS SMS sending failed
# account-wide ("No origination entities available to send" in both
# eu-west-1 and us-east-1), not new user research contradicting the
# original finding. Flagged prominently in docs/CLAUDE.md too — worth
# reconsidering once/if the SNS issue gets resolved.
#
# Passwordless via Cognito's CUSTOM_AUTH challenge flow: the three
# auth_triggers module Lambdas generate, send, and verify the OTP
# ourselves via direct SES SendEmail — Cognito's own built-in
# email-sending (the email_configuration block, MFA,
# auto_verified_attributes) is deliberately unused, since this pool never
# sends a code itself.
#
# Security tradeoff flagged, not silently made: prevent_user_existence_errors
# is left at its default (LEGACY) rather than ENABLED, because
# backend/src/handlers/auth/otpRequest.ts relies on catching a distinct
# UserNotFoundException to auto-provision first-time email addresses with
# no separate signup screen (the low-digital-literacy findings in
# docs/CLAUDE.md are why onboarding needs to be one step). ENABLED mode
# would close the account-enumeration side-channel this trades away, at
# the cost of that auto-provisioning detection — revisit if that ever
# becomes the bigger risk.

resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-${var.environment}"

  username_attributes = ["email"]
  mfa_configuration   = "OFF"

  # AWS's CreateUserPool API supports an AuthSessionValidity setting to
  # bound how long a CUSTOM_AUTH session stays open, but the installed
  # AWS provider (hashicorp/aws 5.100.0) doesn't expose it on this
  # resource yet — so the only bound on an outstanding OTP right now is
  # defineAuthChallenge.ts's own 3-attempt cap. Revisit once the provider
  # catches up.

  schema {
    name                     = "farmId"
    attribute_data_type      = "String"
    mutable                  = true
    developer_only_attribute = false
    string_attribute_constraints {
      min_length = 1
      max_length = 64
    }
  }

  lambda_config {
    define_auth_challenge          = var.define_auth_challenge_arn
    create_auth_challenge          = var.create_auth_challenge_arn
    verify_auth_challenge_response = var.verify_auth_challenge_arn
  }
}

resource "aws_cognito_user_pool_client" "mobile" {
  name         = "${var.project_name}-${var.environment}-mobile"
  user_pool_id = aws_cognito_user_pool.main.id

  # Public client (the mobile app), so no client secret.
  generate_secret = false

  explicit_auth_flows = ["ALLOW_CUSTOM_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
}

# Cognito needs explicit permission to invoke each trigger — without these
# the pool's calls into the Lambdas fail with an access-denied error that
# only shows up at auth time, not at deploy time.
resource "aws_lambda_permission" "invoke_define_challenge" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.define_auth_challenge_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

resource "aws_lambda_permission" "invoke_create_challenge" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.create_auth_challenge_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

resource "aws_lambda_permission" "invoke_verify_challenge" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.verify_auth_challenge_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}
