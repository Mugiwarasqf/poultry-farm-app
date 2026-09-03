output "api_endpoint" {
  description = "Base URL the mobile app calls."
  value       = module.api_gateway.api_endpoint
}

output "cognito_user_pool_id" {
  value = module.cognito.user_pool_id
}

output "cognito_client_id" {
  value = module.cognito.client_id
}

output "attachments_bucket" {
  value = module.s3.attachments_bucket
}

output "reports_bucket" {
  value = module.s3.reports_bucket
}

output "frontend_url" {
  description = "The v1 frontend (simple/minimalistic, doubles as the API test console). See docs/10-build-plan.md §8, §10."
  value       = module.frontend.url
}

output "ses_sender_email" {
  description = "Check this inbox for SES's confirmation email after applying — it has to be clicked before OTP codes or notifications can send. See infra/modules/ses/main.tf."
  value       = module.ses.sender_email
}
