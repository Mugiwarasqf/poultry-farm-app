output "url" {
  description = "HTTP (not HTTPS) URL for the v1 frontend."
  value       = "http://${aws_s3_bucket_website_configuration.site.website_endpoint}"
}
