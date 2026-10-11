output "url" {
  description = "HTTPS URL for the v1 frontend, via CloudFront's own *.cloudfront.net domain — stays valid regardless of custom-domain DNS state, useful as a fallback/debug URL."
  value       = "https://${aws_cloudfront_distribution.site.domain_name}"
}

output "custom_domain_url" {
  description = "The real, user-facing URL — null if this environment doesn't own domain_name right now (deploy_custom_domain = false), otherwise only resolves once the apex ALIAS record is added in Namecheap pointing at the CloudFront domain above (url output)."
  value       = var.domain_name != null ? "https://${var.domain_name}" : null
}

output "cloudfront_domain_name" {
  description = "Value to point var.domain_name's ALIAS record at in Namecheap (apex domains can't use a plain CNAME — see infra/CLAUDE.md or the handoff notes for why)."
  value       = aws_cloudfront_distribution.site.domain_name
}

output "s3_direct_url" {
  description = "Direct S3 website endpoint, HTTP only — kept for debugging origin issues, not for real users (mobile browsers can't load plain HTTP reliably, which is why aws_cloudfront_distribution.site exists)."
  value       = "http://${aws_s3_bucket_website_configuration.site.website_endpoint}"
}
