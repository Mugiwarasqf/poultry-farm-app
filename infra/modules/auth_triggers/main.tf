# The three Cognito CUSTOM_AUTH Lambda triggers (backend/src/handlers/authTriggers/).
# Split into their own module — separate from api_lambdas — specifically
# to avoid a module dependency cycle: the cognito module needs these
# functions' ARNs to wire lambda_config, and api_lambdas needs the cognito
# module's pool ID for its own env vars. Keeping these three independent
# of cognito's outputs breaks that cycle: dynamodb/s3/ses/auth_triggers
# have no dependencies -> cognito depends on auth_triggers -> api_lambdas
# depends on cognito.
#
# None of the three call DynamoDB. Only create_auth_challenge calls an
# AWS API at all (SES SendEmail, to email the OTP — see that comment for
# why email and not SMS) — the other two are pure logic against the event
# Cognito hands them.

data "aws_iam_policy_document" "assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "ses_send_email" {
  statement {
    actions   = ["ses:SendEmail", "ses:SendRawEmail"]
    resources = [var.ses_identity_arn]
  }
}

data "aws_iam_policy_document" "read_suppressed_emails" {
  statement {
    actions   = ["dynamodb:GetItem"]
    resources = [var.suppressed_emails_table_arn]
  }
}

resource "aws_iam_role" "logs_only" {
  name               = "${var.project_name}-${var.environment}-auth-trigger-logs-only"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}
resource "aws_iam_role_policy_attachment" "logs_only_basic" {
  role       = aws_iam_role.logs_only.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role" "ses_only" {
  name               = "${var.project_name}-${var.environment}-auth-trigger-ses-only"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}
resource "aws_iam_role_policy_attachment" "ses_only_basic" {
  role       = aws_iam_role.ses_only.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
resource "aws_iam_role_policy" "ses_only_send" {
  role   = aws_iam_role.ses_only.name
  policy = data.aws_iam_policy_document.ses_send_email.json
}
resource "aws_iam_role_policy" "ses_only_read_suppressed" {
  role   = aws_iam_role.ses_only.name
  policy = data.aws_iam_policy_document.read_suppressed_emails.json
}

data "archive_file" "define_challenge" {
  type        = "zip"
  source_dir  = "${var.backend_dist}/auth-trigger-define-challenge"
  output_path = "${path.module}/.build/auth-trigger-define-challenge.zip"
}
data "archive_file" "create_challenge" {
  type        = "zip"
  source_dir  = "${var.backend_dist}/auth-trigger-create-challenge"
  output_path = "${path.module}/.build/auth-trigger-create-challenge.zip"
}
data "archive_file" "verify_challenge" {
  type        = "zip"
  source_dir  = "${var.backend_dist}/auth-trigger-verify-challenge"
  output_path = "${path.module}/.build/auth-trigger-verify-challenge.zip"
}

resource "aws_lambda_function" "define_challenge" {
  function_name    = "${var.project_name}-${var.environment}-auth-trigger-define-challenge"
  role             = aws_iam_role.logs_only.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 5
  filename         = data.archive_file.define_challenge.output_path
  source_code_hash = data.archive_file.define_challenge.output_base64sha256
}

resource "aws_lambda_function" "create_challenge" {
  function_name    = "${var.project_name}-${var.environment}-auth-trigger-create-challenge"
  role             = aws_iam_role.ses_only.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
  filename         = data.archive_file.create_challenge.output_path
  source_code_hash = data.archive_file.create_challenge.output_base64sha256
  environment {
    variables = {
      SES_SENDER_EMAIL        = var.ses_sender_email
      SUPPRESSED_EMAILS_TABLE = var.suppressed_emails_table_name
    }
  }
}

resource "aws_lambda_function" "verify_challenge" {
  function_name    = "${var.project_name}-${var.environment}-auth-trigger-verify-challenge"
  role             = aws_iam_role.logs_only.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 5
  filename         = data.archive_file.verify_challenge.output_path
  source_code_hash = data.archive_file.verify_challenge.output_base64sha256
}
