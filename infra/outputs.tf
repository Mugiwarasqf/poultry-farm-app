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

# --- Custom domain (trackfarm.cc, bought 04/10/2026) — see acm.tf's
# header comment for the two-step apply this requires with DNS kept on
# Namecheap instead of Route 53. ---

output "acm_validation_records" {
  description = "Phase 1: add each of these as a CNAME record in Namecheap, wait for DNS to propagate, then re-run terraform apply (no -target) to finish validation and create the custom domains below."
  value = {
    frontend = [for o in aws_acm_certificate.frontend.domain_validation_options : {
      name  = o.resource_record_name
      type  = o.resource_record_type
      value = o.resource_record_value
    }]
    api = [for o in aws_acm_certificate.api.domain_validation_options : {
      name  = o.resource_record_name
      type  = o.resource_record_type
      value = o.resource_record_value
    }]
  }
}

output "frontend_apex_alias_target" {
  description = "Phase 2: in Namecheap, add an ALIAS record for @ (the bare apex, trackfarm.cc) pointing at this value. Not a CNAME — apex domains can't use one."
  value       = module.frontend.cloudfront_domain_name
}

output "api_cname_target" {
  description = "Phase 2: in Namecheap, add a CNAME record for 'api' pointing at this value."
  value       = module.api_gateway.custom_domain_target
}

output "custom_domain_frontend_url" {
  value = module.frontend.custom_domain_url
}

output "custom_domain_api_url" {
  value = module.api_gateway.custom_domain_url
}

output "ses_sender_email" {
  description = "Check this inbox for SES's confirmation email after applying — it has to be clicked before OTP codes or notifications can send. See infra/modules/ses/main.tf."
  value       = module.ses.sender_email
}
