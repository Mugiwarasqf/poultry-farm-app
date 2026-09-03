# The 12 Lambdas that aren't Cognito triggers (those live in the
# auth_triggers module — see that module's header comment for why they're
# split out). One function per backend/src/handlers/* entry point;
# dist/<name> directory names come from backend/esbuild.config.js.
#
# IAM is grouped by actual access pattern rather than fully bespoke
# per-function policies: every DynamoDB-touching function shares one
# "read/write on any of this app's tables" policy instead of a table-scoped
# one per function. Deliberate simplicity-for-beta tradeoff, not an
# oversight — tighten to per-table least privilege before this holds real
# user data at any scale.

locals {
  # Handed to every function, whether or not it uses every table/id —
  # harmless (dynamo.ts only reads the vars it needs) and far simpler
  # than a bespoke env-var set per function.
  common_env = {
    FARMS_TABLE                 = var.table_names["farms"]
    BATCHES_TABLE               = var.table_names["batches"]
    USERS_TABLE                 = var.table_names["users"]
    MORTALITY_LOGS_TABLE        = var.table_names["mortality_logs"]
    FEED_LOGS_TABLE             = var.table_names["feed_logs"]
    EGG_LOGS_TABLE              = var.table_names["egg_logs"]
    VACCINATION_RECORDS_TABLE   = var.table_names["vaccination_records"]
    VACCINATION_SCHEDULES_TABLE = var.table_names["vaccination_schedules"]
    COGNITO_USER_POOL_ID        = var.cognito_user_pool_id
    COGNITO_CLIENT_ID           = var.cognito_client_id
    SES_SENDER_EMAIL            = var.ses_sender_email
  }
}

data "aws_iam_policy_document" "assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "dynamo_rw" {
  statement {
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
      "dynamodb:Scan",
    ]
    resources = var.table_arns
  }
}

data "aws_iam_policy_document" "ses_send_email" {
  statement {
    actions   = ["ses:SendEmail", "ses:SendRawEmail"]
    resources = [var.ses_identity_arn]
  }
}

data "aws_iam_policy_document" "cognito_admin" {
  statement {
    actions = [
      "cognito-idp:AdminCreateUser",
      "cognito-idp:InitiateAuth",
      "cognito-idp:RespondToAuthChallenge",
      "cognito-idp:AdminUpdateUserAttributes",
    ]
    resources = [var.cognito_user_pool_arn]
  }
}

# ---- IAM roles, one per distinct access pattern ------------------------

resource "aws_iam_role" "dynamo" {
  name               = "${var.project_name}-${var.environment}-dynamo"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}
resource "aws_iam_role_policy_attachment" "dynamo_basic" {
  role       = aws_iam_role.dynamo.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
resource "aws_iam_role_policy" "dynamo_rw" {
  role   = aws_iam_role.dynamo.name
  policy = data.aws_iam_policy_document.dynamo_rw.json
}

resource "aws_iam_role" "dynamo_ses" {
  name               = "${var.project_name}-${var.environment}-dynamo-ses"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}
resource "aws_iam_role_policy_attachment" "dynamo_ses_basic" {
  role       = aws_iam_role.dynamo_ses.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
resource "aws_iam_role_policy" "dynamo_ses_dynamo" {
  role   = aws_iam_role.dynamo_ses.name
  policy = data.aws_iam_policy_document.dynamo_rw.json
}
resource "aws_iam_role_policy" "dynamo_ses_ses" {
  role   = aws_iam_role.dynamo_ses.name
  policy = data.aws_iam_policy_document.ses_send_email.json
}

resource "aws_iam_role" "cognito_only" {
  name               = "${var.project_name}-${var.environment}-cognito-only"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}
resource "aws_iam_role_policy_attachment" "cognito_only_basic" {
  role       = aws_iam_role.cognito_only.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
resource "aws_iam_role_policy" "cognito_only_admin" {
  role   = aws_iam_role.cognito_only.name
  policy = data.aws_iam_policy_document.cognito_admin.json
}

resource "aws_iam_role" "cognito_dynamo" {
  name               = "${var.project_name}-${var.environment}-cognito-dynamo"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}
resource "aws_iam_role_policy_attachment" "cognito_dynamo_basic" {
  role       = aws_iam_role.cognito_dynamo.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
resource "aws_iam_role_policy" "cognito_dynamo_cognito" {
  role   = aws_iam_role.cognito_dynamo.name
  policy = data.aws_iam_policy_document.cognito_admin.json
}
resource "aws_iam_role_policy" "cognito_dynamo_dynamo" {
  role   = aws_iam_role.cognito_dynamo.name
  policy = data.aws_iam_policy_document.dynamo_rw.json
}

# ---- Zips ---------------------------------------------------------------

data "archive_file" "batches" {
  type        = "zip"
  source_dir  = "${var.backend_dist}/batches"
  output_path = "${path.module}/.build/batches.zip"
}
data "archive_file" "mortality" {
  type        = "zip"
  source_dir  = "${var.backend_dist}/mortality"
  output_path = "${path.module}/.build/mortality.zip"
}
data "archive_file" "feed" {
  type        = "zip"
  source_dir  = "${var.backend_dist}/feed"
  output_path = "${path.module}/.build/feed.zip"
}
data "archive_file" "eggs" {
  type        = "zip"
  source_dir  = "${var.backend_dist}/eggs"
  output_path = "${path.module}/.build/eggs.zip"
}
data "archive_file" "vaccinations" {
  type        = "zip"
  source_dir  = "${var.backend_dist}/vaccinations"
  output_path = "${path.module}/.build/vaccinations.zip"
}
data "archive_file" "vaccination_schedule" {
  type        = "zip"
  source_dir  = "${var.backend_dist}/vaccination-schedule"
  output_path = "${path.module}/.build/vaccination-schedule.zip"
}
data "archive_file" "summary" {
  type        = "zip"
  source_dir  = "${var.backend_dist}/summary"
  output_path = "${path.module}/.build/summary.zip"
}
data "archive_file" "sync" {
  type        = "zip"
  source_dir  = "${var.backend_dist}/sync"
  output_path = "${path.module}/.build/sync.zip"
}
data "archive_file" "auth_otp_request" {
  type        = "zip"
  source_dir  = "${var.backend_dist}/auth-otp-request"
  output_path = "${path.module}/.build/auth-otp-request.zip"
}
data "archive_file" "auth_otp_verify" {
  type        = "zip"
  source_dir  = "${var.backend_dist}/auth-otp-verify"
  output_path = "${path.module}/.build/auth-otp-verify.zip"
}
data "archive_file" "scheduled_vaccination_reminders" {
  type        = "zip"
  source_dir  = "${var.backend_dist}/scheduled-vaccination-reminders"
  output_path = "${path.module}/.build/scheduled-vaccination-reminders.zip"
}
data "archive_file" "scheduled_entry_nudges" {
  type        = "zip"
  source_dir  = "${var.backend_dist}/scheduled-entry-nudges"
  output_path = "${path.module}/.build/scheduled-entry-nudges.zip"
}

# ---- Functions ------------------------------------------------------------

resource "aws_lambda_function" "batches" {
  function_name    = "${var.project_name}-${var.environment}-batches"
  role             = aws_iam_role.dynamo.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
  filename         = data.archive_file.batches.output_path
  source_code_hash = data.archive_file.batches.output_base64sha256
  environment { variables = local.common_env }
}

resource "aws_lambda_function" "mortality" {
  function_name    = "${var.project_name}-${var.environment}-mortality"
  role             = aws_iam_role.dynamo.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
  filename         = data.archive_file.mortality.output_path
  source_code_hash = data.archive_file.mortality.output_base64sha256
  environment { variables = local.common_env }
}

resource "aws_lambda_function" "feed" {
  function_name    = "${var.project_name}-${var.environment}-feed"
  role             = aws_iam_role.dynamo.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
  filename         = data.archive_file.feed.output_path
  source_code_hash = data.archive_file.feed.output_base64sha256
  environment { variables = local.common_env }
}

resource "aws_lambda_function" "eggs" {
  function_name    = "${var.project_name}-${var.environment}-eggs"
  role             = aws_iam_role.dynamo.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
  filename         = data.archive_file.eggs.output_path
  source_code_hash = data.archive_file.eggs.output_base64sha256
  environment { variables = local.common_env }
}

resource "aws_lambda_function" "vaccinations" {
  function_name    = "${var.project_name}-${var.environment}-vaccinations"
  role             = aws_iam_role.dynamo.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
  filename         = data.archive_file.vaccinations.output_path
  source_code_hash = data.archive_file.vaccinations.output_base64sha256
  environment { variables = local.common_env }
}

resource "aws_lambda_function" "vaccination_schedule" {
  function_name    = "${var.project_name}-${var.environment}-vaccination-schedule"
  role             = aws_iam_role.dynamo.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
  filename         = data.archive_file.vaccination_schedule.output_path
  source_code_hash = data.archive_file.vaccination_schedule.output_base64sha256
  environment { variables = local.common_env }
}

resource "aws_lambda_function" "summary" {
  function_name    = "${var.project_name}-${var.environment}-summary"
  role             = aws_iam_role.dynamo.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30 # fans out across every batch's logs — see backend note
  filename         = data.archive_file.summary.output_path
  source_code_hash = data.archive_file.summary.output_base64sha256
  environment { variables = local.common_env }
}

resource "aws_lambda_function" "sync" {
  function_name    = "${var.project_name}-${var.environment}-sync"
  role             = aws_iam_role.dynamo.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30 # one write per queued offline line
  filename         = data.archive_file.sync.output_path
  source_code_hash = data.archive_file.sync.output_base64sha256
  environment { variables = local.common_env }
}

resource "aws_lambda_function" "auth_otp_request" {
  function_name    = "${var.project_name}-${var.environment}-auth-otp-request"
  role             = aws_iam_role.cognito_only.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
  filename         = data.archive_file.auth_otp_request.output_path
  source_code_hash = data.archive_file.auth_otp_request.output_base64sha256
  environment { variables = local.common_env }
}

resource "aws_lambda_function" "auth_otp_verify" {
  function_name    = "${var.project_name}-${var.environment}-auth-otp-verify"
  role             = aws_iam_role.cognito_dynamo.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
  filename         = data.archive_file.auth_otp_verify.output_path
  source_code_hash = data.archive_file.auth_otp_verify.output_base64sha256
  environment { variables = local.common_env }
}

resource "aws_lambda_function" "scheduled_vaccination_reminders" {
  function_name    = "${var.project_name}-${var.environment}-scheduled-vaccination-reminders"
  role             = aws_iam_role.dynamo_ses.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 60
  filename         = data.archive_file.scheduled_vaccination_reminders.output_path
  source_code_hash = data.archive_file.scheduled_vaccination_reminders.output_base64sha256
  environment { variables = local.common_env }
}

resource "aws_lambda_function" "scheduled_entry_nudges" {
  function_name    = "${var.project_name}-${var.environment}-scheduled-entry-nudges"
  role             = aws_iam_role.dynamo_ses.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 60
  filename         = data.archive_file.scheduled_entry_nudges.output_path
  source_code_hash = data.archive_file.scheduled_entry_nudges.output_base64sha256
  environment { variables = local.common_env }
}
