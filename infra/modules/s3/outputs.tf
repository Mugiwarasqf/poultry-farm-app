output "attachments_bucket" {
  value = aws_s3_bucket.attachments.bucket
}

output "reports_bucket" {
  value = aws_s3_bucket.reports.bucket
}
