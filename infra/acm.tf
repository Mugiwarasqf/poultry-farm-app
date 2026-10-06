# Two ACM certificates, in two different regions, for two different
# reasons:
#   - aws_acm_certificate.frontend (us-east-1, via the aliased provider in
#     providers.tf): CloudFront only ever accepts certs from us-east-1,
#     regardless of where the distribution's origin or the rest of this
#     stack actually lives.
#   - aws_acm_certificate.api (var.aws_region, the default provider):
#     API Gateway's REGIONAL custom domain names validate certs in their
#     own region instead — a us-east-1 cert wouldn't be accepted here.
#
# Both use DNS validation. There's no Route 53 hosted zone for this
# domain — it was bought on Namecheap (04/10/2026) and DNS is being kept
# there rather than migrated, so Terraform can't create the validation
# CNAME records itself the way it could with a Route53 zone in this same
# state. That makes `terraform apply` a two-step process the first time:
#
#   1. terraform apply -target=aws_acm_certificate.frontend -target=aws_acm_certificate.api
#      (fast — just requests the certs, doesn't wait on anything)
#   2. terraform output acm_validation_records
#      Add each one as a CNAME record in Namecheap's dashboard, wait a
#      few minutes for DNS to propagate.
#   3. terraform apply (no -target this time)
#      aws_acm_certificate_validation polls ACM until it sees the records
#      and marks the cert ISSUED, then the CloudFront alias and API
#      Gateway custom domain (which depend on the validated cert ARNs)
#      get created in the same apply.
#
# Skipping straight to step 3 on a fresh cert request works too, but
# aws_acm_certificate_validation will sit there polling for up to its
# timeout (45 min) before failing if the CNAME records aren't live yet —
# doing step 1 first just makes the wait predictable instead of a guess.

resource "aws_acm_certificate" "frontend" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_acm_certificate_validation" "frontend" {
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.frontend.arn
  validation_record_fqdns = [
    for o in aws_acm_certificate.frontend.domain_validation_options : o.resource_record_name
  ]
}

resource "aws_acm_certificate" "api" {
  domain_name       = "api.${var.domain_name}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn = aws_acm_certificate.api.arn
  validation_record_fqdns = [
    for o in aws_acm_certificate.api.domain_validation_options : o.resource_record_name
  ]
}
