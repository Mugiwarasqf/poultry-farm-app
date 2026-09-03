output "functions" {
  description = "Keyed by logical function name — api_gateway builds integrations/routes/permissions from this, notifications builds the two EventBridge Schedule targets from it."
  value = {
    batches = {
      name       = aws_lambda_function.batches.function_name
      arn        = aws_lambda_function.batches.arn
      invoke_arn = aws_lambda_function.batches.invoke_arn
    }
    mortality = {
      name       = aws_lambda_function.mortality.function_name
      arn        = aws_lambda_function.mortality.arn
      invoke_arn = aws_lambda_function.mortality.invoke_arn
    }
    feed = {
      name       = aws_lambda_function.feed.function_name
      arn        = aws_lambda_function.feed.arn
      invoke_arn = aws_lambda_function.feed.invoke_arn
    }
    eggs = {
      name       = aws_lambda_function.eggs.function_name
      arn        = aws_lambda_function.eggs.arn
      invoke_arn = aws_lambda_function.eggs.invoke_arn
    }
    vaccinations = {
      name       = aws_lambda_function.vaccinations.function_name
      arn        = aws_lambda_function.vaccinations.arn
      invoke_arn = aws_lambda_function.vaccinations.invoke_arn
    }
    vaccination_schedule = {
      name       = aws_lambda_function.vaccination_schedule.function_name
      arn        = aws_lambda_function.vaccination_schedule.arn
      invoke_arn = aws_lambda_function.vaccination_schedule.invoke_arn
    }
    summary = {
      name       = aws_lambda_function.summary.function_name
      arn        = aws_lambda_function.summary.arn
      invoke_arn = aws_lambda_function.summary.invoke_arn
    }
    sync = {
      name       = aws_lambda_function.sync.function_name
      arn        = aws_lambda_function.sync.arn
      invoke_arn = aws_lambda_function.sync.invoke_arn
    }
    auth_otp_request = {
      name       = aws_lambda_function.auth_otp_request.function_name
      arn        = aws_lambda_function.auth_otp_request.arn
      invoke_arn = aws_lambda_function.auth_otp_request.invoke_arn
    }
    auth_otp_verify = {
      name       = aws_lambda_function.auth_otp_verify.function_name
      arn        = aws_lambda_function.auth_otp_verify.arn
      invoke_arn = aws_lambda_function.auth_otp_verify.invoke_arn
    }
    scheduled_vaccination_reminders = {
      name       = aws_lambda_function.scheduled_vaccination_reminders.function_name
      arn        = aws_lambda_function.scheduled_vaccination_reminders.arn
      invoke_arn = aws_lambda_function.scheduled_vaccination_reminders.invoke_arn
    }
    scheduled_entry_nudges = {
      name       = aws_lambda_function.scheduled_entry_nudges.function_name
      arn        = aws_lambda_function.scheduled_entry_nudges.arn
      invoke_arn = aws_lambda_function.scheduled_entry_nudges.invoke_arn
    }
  }
}
