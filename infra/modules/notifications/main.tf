# Daily schedules for the two notification Lambdas — docs/10-build-plan.md
# §5. Both run once a day; vaccinationReminders.ts's own comment explains
# how a single daily run produces the "few days before + day-of" two-touch
# cadence without extra state.

data "aws_iam_policy_document" "assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["scheduler.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "invoke_lambdas" {
  statement {
    actions = ["lambda:InvokeFunction"]
    resources = [
      var.vaccination_reminders_function_arn,
      var.entry_nudges_function_arn,
    ]
  }
}

resource "aws_iam_role" "scheduler_invoke" {
  name               = "${var.project_name}-${var.environment}-scheduler-invoke"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

resource "aws_iam_role_policy" "invoke_lambdas" {
  role   = aws_iam_role.scheduler_invoke.name
  policy = data.aws_iam_policy_document.invoke_lambdas.json
}

resource "aws_scheduler_schedule" "vaccination_reminders" {
  name       = "${var.project_name}-${var.environment}-vaccination-reminders"
  group_name = "default"

  flexible_time_window { mode = "OFF" }
  schedule_expression = "rate(1 day)"

  target {
    arn      = var.vaccination_reminders_function_arn
    role_arn = aws_iam_role.scheduler_invoke.arn
  }
}

resource "aws_scheduler_schedule" "entry_nudges" {
  name       = "${var.project_name}-${var.environment}-entry-nudges"
  group_name = "default"

  flexible_time_window { mode = "OFF" }
  schedule_expression = "rate(1 day)"

  target {
    arn      = var.entry_nudges_function_arn
    role_arn = aws_iam_role.scheduler_invoke.arn
  }
}
