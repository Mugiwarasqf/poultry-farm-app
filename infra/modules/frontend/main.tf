# Hosts frontend/ — a plain HTML/CSS/JS app: v1 of the product frontend
# itself (docs/10-build-plan.md §8), deliberately simple, minimalistic,
# and farm-themed, meant to be replaced by a more sophisticated design
# once a friend of the founder builds that. Also doubles as the technical
# test console for the scaffolded API right now (docs/10-build-plan.md
# §10) — its debug panel echoes every raw API request/response so
# backend issues surface before the polished version replaces it. No
# build step, no framework: three static files plus a Terraform-generated
# config.js.
#
# Public S3 static website hosting, not CloudFront: simplest thing that
# works for this stage, at the cost of being HTTP-only (no custom domain
# or HTTPS) and needing this bucket's public access allowed. The page
# itself holds no secrets — the Cognito client id is a public OAuth
# client identifier, not a credential, and every real data operation
# still requires a phone-verified Cognito login through the real API.
# Revisit (CloudFront + a custom domain) once this is public-facing
# rather than founder/friend-facing.
#
# CAVEAT: some AWS accounts have S3 Block Public Access enabled at the
# ACCOUNT level (default for accounts created since 2023), which this
# module does not touch — only this bucket's own public-access-block is
# opened here. If `terraform apply` fails on the bucket policy with an
# access-denied/block-public-access error, that account-level setting is
# why, and turning it off is a separate, deliberate call for whoever owns
# this AWS account to make (Settings → Block Public Access, per-account,
# affects every bucket) — not something to change from inside this module.

resource "aws_s3_bucket" "site" {
  bucket = "${var.project_name}-${var.environment}-frontend"
}

resource "aws_s3_bucket_website_configuration" "site" {
  bucket = aws_s3_bucket.site.id
  index_document {
    suffix = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadForWebsite"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.site.arn}/*"
    }]
  })
  depends_on = [aws_s3_bucket_public_access_block.site]
}

resource "aws_s3_object" "index" {
  bucket       = aws_s3_bucket.site.id
  key          = "index.html"
  source       = "${var.site_dir}/index.html"
  content_type = "text/html"
  etag         = filemd5("${var.site_dir}/index.html")
}

resource "aws_s3_object" "style" {
  bucket       = aws_s3_bucket.site.id
  key          = "style.css"
  source       = "${var.site_dir}/style.css"
  content_type = "text/css"
  etag         = filemd5("${var.site_dir}/style.css")
}

resource "aws_s3_object" "app" {
  bucket       = aws_s3_bucket.site.id
  key          = "app.js"
  source       = "${var.site_dir}/app.js"
  content_type = "application/javascript"
  etag         = filemd5("${var.site_dir}/app.js")
}

# Not `source` like the three above — this one's content is generated
# from config.js.tftpl using this deploy's real API endpoint and Cognito
# client id, so the site never needs hand-editing after `terraform apply`.
resource "aws_s3_object" "config" {
  bucket       = aws_s3_bucket.site.id
  key          = "config.js"
  content_type = "application/javascript"
  content = templatefile("${var.site_dir}/config.js.tftpl", {
    api_base  = var.api_base
    client_id = var.cognito_client_id
  })
}
