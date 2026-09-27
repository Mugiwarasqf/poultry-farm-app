# Hosts frontend-react/'s built output (`npm run build` → dist/) — the
# real product frontend, built by a friend of the founder in React
# (Vite), replacing the plain HTML/CSS/JS console this project started
# with. That original console's module design carries over almost
# unchanged: same public S3 static website hosting, same
# config.js.tftpl-generated runtime config (frontend-react/src/config.js
# reads window.CONFIG exactly like the original did — the friend's own
# comment in frontend-react/public/config.js says as much). What's new is
# uploading an entire build directory dynamically instead of a fixed list
# of files, since Vite's output includes content-hashed filenames that
# change on every build, and adding an SPA fallback for react-router-dom's
# client-side routing.
#
# Public S3 static website hosting behind CloudFront (added 27/09/2026):
# the S3 website endpoint itself is HTTP-only and was unusable on mobile —
# browsers default to, or outright enforce, https:// even for a bare typed
# domain, and the S3 endpoint doesn't answer on 443 at all. CloudFront
# terminates HTTPS on its free *.cloudfront.net certificate and proxies to
# the S3 origin over plain HTTP internally (see aws_cloudfront_distribution
# below) — no custom domain or ACM certificate needed to fix this. The page
# itself holds no secrets either way — the Cognito client id is a public
# OAuth client identifier, not a credential, and every real data operation
# still requires an authenticated Cognito login (email/OTP) through the
# real API. A custom domain is still a separate, later step if wanted.
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
  # react-router-dom does client-side routing — a direct load or refresh
  # of e.g. /dashboard is not a real S3 object, so without this it 404s
  # instead of handing the request to the app. S3 website hosting has no
  # concept of a 200 SPA fallback, only this: the "error" response for any
  # missing key serves index.html's body (with a 404 status code) and the
  # router takes over from there once the app boots.
  error_document {
    key = "index.html"
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

locals {
  # Every file in the build output except config.js, which gets its own
  # resource below — Vite copies frontend-react/public/config.js (a dev
  # placeholder with real-looking but not-necessarily-current values)
  # into dist/ verbatim, and this makes sure the deployed one is always
  # this deploy's actual values instead of whatever was last committed.
  dist_files = { for f in fileset(var.site_dir, "**") : f => f if f != "config.js" }

  content_types = {
    html  = "text/html"
    css   = "text/css"
    js    = "application/javascript"
    mjs   = "application/javascript"
    json  = "application/json"
    map   = "application/json"
    svg   = "image/svg+xml"
    png   = "image/png"
    jpg   = "image/jpeg"
    jpeg  = "image/jpeg"
    gif   = "image/gif"
    webp  = "image/webp"
    ico   = "image/x-icon"
    woff  = "font/woff"
    woff2 = "font/woff2"
    ttf   = "font/ttf"
    txt   = "text/plain"
  }
}

resource "aws_s3_object" "dist" {
  for_each = local.dist_files

  bucket       = aws_s3_bucket.site.id
  key          = each.value
  source       = "${var.site_dir}/${each.value}"
  etag         = filemd5("${var.site_dir}/${each.value}")
  content_type = lookup(local.content_types, lower(element(split(".", each.value), length(split(".", each.value)) - 1)), "application/octet-stream")
}

# Not part of dist_files above — this one's content is generated from
# config.js.tftpl using this deploy's real API endpoint and Cognito
# client id, so the site never needs hand-editing after `terraform apply`.
resource "aws_s3_object" "config" {
  bucket       = aws_s3_bucket.site.id
  key          = "config.js"
  content_type = "application/javascript"
  content = templatefile(var.config_template, {
    api_base  = var.api_base
    client_id = var.cognito_client_id
  })
}

# CloudFront in front of the S3 website endpoint, added specifically to get
# free HTTPS on a *.cloudfront.net domain — no custom domain or ACM
# certificate needed. This exists because mobile browsers default to (or
# outright enforce) https:// even when a bare domain is typed, and the S3
# website endpoint above only ever answers on plain HTTP — real users on
# phones couldn't load the site at all without this. The origin has to be
# a "custom origin" (not an S3 origin) because S3 *website* endpoints are
# plain HTTP websites, not the S3 REST API CloudFront's native S3 origin
# type expects.
resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  comment             = "${var.project_name}-${var.environment} frontend"

  origin {
    origin_id   = "s3-website"
    domain_name = aws_s3_bucket_website_configuration.site.website_endpoint

    custom_origin_config {
      # The S3 website endpoint doesn't serve HTTPS at all (see the module
      # header comment) — CloudFront terminates HTTPS for viewers and
      # talks to the origin over plain HTTP internally.
      origin_protocol_policy = "http-only"
      http_port              = 80
      https_port             = 443
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "s3-website"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    # Managed-CachingOptimized — a long default TTL for static assets, fine
    # here since Vite's build output is content-hashed (a new deploy gets
    # new filenames, so stale caching of old assets isn't a risk; only
    # index.html/config.js risk being served stale for a while after a
    # deploy, which matches this stage's tolerance for eventual consistency).
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  # react-router-dom's client-side routes (e.g. /dashboard) aren't real S3
  # keys — the bucket's error_document already falls back to index.html for
  # these (see aws_s3_bucket_website_configuration.site above) but returns
  # it with a 404 status. Rewriting that to a clean 200 here means
  # CloudFront serves the app instead of passing a 404 through to the
  # viewer for what is, from the user's perspective, a normal page load.
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    # No custom domain yet — the free *.cloudfront.net certificate is
    # exactly what solves the mobile-HTTPS problem without needing a
    # registered domain or an ACM certificate request.
    cloudfront_default_certificate = true
  }
}
