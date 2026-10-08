# Email+password auth (changed 08/10/2026). The previous two approaches
# both hit real platform walls documented in docs/11-platform-obstacles.md:
# phone/SMS failed account-wide ("No origination entities available to
# send"), and the fallback, passwordless email/OTP, worked but then sat
# behind AWS SES's production-access denial plus Apple/iCloud outright
# rejecting mail from the new domain. Password auth needs no per-login
# message delivery at all, sidestepping both.
#
# This is a real UX tradeoff against this project's own validated
# research (low-digital-literacy segment, see docs/CLAUDE.md's key
# findings), not something to treat as a settled improvement -- a
# password is one more thing to create, remember, and eventually reset
# for an audience where that's a real cost. Mitigations: a loose password
# policy below (no required uppercase/symbol), a background welcome email
# at signup that feeds the bounce/suppression system so a mistyped
# address surfaces as Farm.emailBounced instead of a silent dead end
# (backend/src/handlers/auth/signup.ts, sesEvents/index.ts), and
# Cognito's own built-in forgot-password email (see the lack of an
# email_configuration block below -- that's what makes it default to
# COGNITO_DEFAULT instead of requiring this project's own SES setup).
#
# No Lambda triggers at all now -- the three CUSTOM_AUTH trigger Lambdas
# (defineAuthChallenge/createAuthChallenge/verifyAuthChallengeResponse)
# and their whole auth_triggers module are gone, along with the
# lambda_config block that used to wire them in here.

resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-${var.environment}"

  username_attributes = ["email"]
  mfa_configuration   = "OFF"

  # Verified so Cognito will actually treat email as a usable account
  # recovery channel below -- ForgotPassword requires a verified
  # mechanism, and signup.ts marks email_verified true itself (no
  # separate Cognito-sent verification code; see that file's comment on
  # the friction/safety tradeoff this is).
  auto_verified_attributes = ["email"]

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Deliberately loose: a minimum worth having, not maximum strength.
  # Typing complexity is itself friction for this audience -- no required
  # uppercase or symbol, just a lowercase letter and a number alongside
  # the length floor. backend/src/handlers/auth/signup.ts's PASSWORD_RE
  # mirrors this exactly so the client-rejected and server-rejected cases
  # match.
  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = false
    require_uppercase                = false
    temporary_password_validity_days = 7
  }

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
}

resource "aws_cognito_user_pool_client" "mobile" {
  name         = "${var.project_name}-${var.environment}-mobile"
  user_pool_id = aws_cognito_user_pool.main.id

  # Public client (the mobile app), so no client secret.
  generate_secret = false

  explicit_auth_flows = ["ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
}
