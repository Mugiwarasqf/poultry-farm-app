# var.sender_email (e.g. noreply@trackfarm.cc) is just the literal From
# address the app sends with — createAuthChallenge.ts, vaccinationReminders.ts,
# and entryNudges.ts (backend/src/handlers/) all read it via SES_SENDER_EMAIL.
# It is NOT its own SES identity: sending authority comes entirely from the
# domain identity below (aws_ses_domain_identity.domain) once that's
# verified, since a verified domain covers every address @that domain.
#
# This file used to back a single aws_ses_email_identity resource directly
# with var.sender_email, before the domain identity existed — a bug, in
# hindsight: that resource's `email` argument forces a replace on change,
# so switching var.sender_email from a real inbox (bsundamife@icloud.com)
# to noreply@trackfarm.cc silently destroyed the real inbox's identity as
# a side effect, breaking sandbox testing for anyone logging in with it
# (SES sandbox requires every *recipient* to be a separately verified
# identity too, regardless of which verified identity sends). Fixed
# 04/10/2026 by splitting the two concerns: var.sender_email is now just a
# string, and var.test_recipient_email below is its own, independent
# identity that stays verified no matter what the app's sending address is.

resource "aws_ses_email_identity" "test_recipient" {
  email = var.test_recipient_email
}

# Domain identity (added 04/10/2026, once trackfarm.cc was bought) — AWS's
# own guidance when reviewing a production-access request explicitly
# recommends a verified domain over a single verified address, and a
# domain identity authorizes sending from *any* address @that domain
# (noreply@, otp@, etc.) without separately verifying each one.
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
# complained. Not wired to the test_recipient identity above since nothing
# is ever actually sent "to" it for real — it exists purely so its own
# inbox can receive OTPs/reminders during sandbox testing.
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
