output "url" {
  description = "HTTPS URL for the v1 frontend, via CloudFront (free *.cloudfront.net certificate)."
  value       = "https://${aws_cloudfront_distribution.site.domain_name}"
}

output "s3_direct_url" {
  description = "Direct S3 website endpoint, HTTP only — kept for debugging origin issues, not for real users (mobile browsers can't load plain HTTP reliably, which is why aws_cloudfront_distribution.site exists)."
  value       = "http://${aws_s3_bucket_website_configuration.site.website_endpoint}"
}
