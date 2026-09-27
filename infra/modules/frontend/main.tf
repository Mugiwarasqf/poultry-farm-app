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
