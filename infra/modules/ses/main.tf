# Verifies var.sender_email as the SES identity every OTP code and
# notification email in this project sends from — createAuthChallenge.ts,
# vaccinationReminders.ts, and entryNudges.ts (backend/src/handlers/) all
# read the resulting address via SES_SENDER_EMAIL.
#
# `apply` only requests verification: AWS emails var.sender_email a
# confirmation link that a human has to click before this identity can
# actually send anything — Terraform can't complete that step. Check
# `terraform output ses_sender_email` and that inbox after applying.
#
# SES starts every new account in a sandbox too, same shape as SNS's SMS
# sandbox: both the sender AND every recipient must be verified
# identities until the account is moved to production sending. See
# docs/10-build-plan.md §10 for the testing implications, and
# docs/CLAUDE.md for why this project ended up on email/SES instead of
# phone/SNS at all (a pragmatic call after SNS SMS sending failed
# account-wide, not new user research).

resource "aws_ses_email_identity" "sender" {
  email = var.sender_email
}

# Domain identity (added 04/10/2026, once trackfarm.cc was bought) — AWS's
# own guidance when reviewing a production-access request explicitly
# recommends a verified domain over a single verified address, and a
# domain identity authorizes sending from *any* address @that domain
# (noreply@, otp@, etc.) without separately verifying each one. var.sender_email
# should be switched to a trackfarm.cc address once this validates, but
# the single email identity above is left in place rather than deleted —
# harmless to keep, and avoids any risk to the working sandbox setup
# during the switch.
#
# DNS validation, same as the ACM certs in infra/acm.tf: this domain's DNS
# is kept on Namecheap rather than migrated to Route 53, so Terraform
# can't create the verification TXT record or the 3 DKIM CNAME records
# itself. See outputs.tf for what to hand-add there.
resource "aws_ses_domain_identity" "domain" {
  domain = var.domain_name
}

resource "aws_ses_domain_identity_verification" "domain" {
  domain = aws_ses_domain_identity.domain.id
}

resource "aws_ses_domain_dkim" "domain" {
  domain = aws_ses_domain_identity.domain.domain
}

# Where SES publishes Bounce/Complaint notifications for mail sent from
# the domain identity — backend/src/handlers/sesEvents/index.ts subscribes
# to this and writes to the suppressed_emails DynamoDB table so the three
# sending handlers stop emailing an address that permanently bounced or
# complained. Not wired to the single email identity above (var.sender_email)
# since that identity stops being used for real sending once var.sender_email
# is switched to a trackfarm.cc address.
resource "aws_sns_topic" "ses_events" {
  name = "${var.project_name}-${var.environment}-ses-events"
}

resource "aws_ses_identity_notification_topic" "bounce" {
  topic_arn                = aws_sns_topic.ses_events.arn
  notification_type        = "Bounce"
  identity                 = aws_ses_domain_identity.domain.domain
  include_original_headers = false
}

resource "aws_ses_identity_notification_topic" "complaint" {
  topic_arn                = aws_sns_topic.ses_events.arn
  notification_type        = "Complaint"
  identity                 = aws_ses_domain_identity.domain.domain
  include_original_headers = false
}
