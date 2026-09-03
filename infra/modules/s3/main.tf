# docs/10-build-plan.md §3's "S3 — photos/attachments; also holds
# generated PDF reports" — two buckets, both fully private. Neither
# Lambda writes to these yet (no photo-attachment or PDF-export handler
# has been built), but the buckets exist so the IAM policies and env vars
# are ready when that work starts.

resource "aws_s3_bucket" "attachments" {
  bucket = "${var.project_name}-${var.environment}-attachments"
}

resource "aws_s3_bucket" "reports" {
  bucket = "${var.project_name}-${var.environment}-reports"
}

resource "aws_s3_bucket_public_access_block" "attachments" {
  bucket                  = aws_s3_bucket.attachments.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "reports" {
  bucket                  = aws_s3_bucket.reports.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "attachments" {
  bucket = aws_s3_bucket.attachments.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "reports" {
  bucket = aws_s3_bucket.reports.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
