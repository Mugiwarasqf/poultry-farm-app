output "test_recipient_identity_arns" {
  description = "Keyed by email. Also required for the app's SendEmail IAM permission (see send_identity_arns below) — SES checks resource-level authorization against the *destination* address too whenever that address is itself a registered identity in the same account, not just the sender."
  value       = { for email, identity in aws_ses_email_identity.test_recipient : email => identity.arn }
}

output "sender_email" {
  description = "Plain pass-through of var.sender_email — the app's From address, authorized by domain_identity_arn below, not by its own identity resource."
  value       = var.sender_email
}

output "domain_identity_arn" {
  description = "ARN covering any address @domain_name, for sending FROM it."
  value       = aws_ses_domain_identity.domain.arn
}

output "send_identity_arns" {
  description = "Every identity ARN the app's SendEmail IAM policy needs: the domain identity (for the From address) plus every test recipient identity (for sending TO them during sandbox testing — see test_recipient_identity_arns' description for why that's required too). Pass this whole list to auth_triggers/api_lambdas' ses_identity_arns, not domain_identity_arn alone."
  value       = concat([aws_ses_domain_identity.domain.arn], values({ for email, identity in aws_ses_email_identity.test_recipient : email => identity.arn }))
}

output "domain_verification_record" {
  description = "Phase 1: add as a TXT record in Namecheap — name '_amazonses.<domain_name>' (or just '_amazonses' if Namecheap wants the host without the domain suffix), value below."
  value = {
    name  = "_amazonses.${aws_ses_domain_identity.domain.domain}"
    type  = "TXT"
    value = aws_ses_domain_identity.domain.verification_token
  }
}

output "dkim_records" {
  description = "Phase 1: add each as a CNAME record in Namecheap alongside the TXT record above — same two-step apply as acm.tf, this module's aws_ses_domain_identity_verification/aws_ses_domain_dkim resources poll AWS until these are visible in DNS."
  value = [
    for token in aws_ses_domain_dkim.domain.dkim_tokens : {
      name  = "${token}._domainkey.${aws_ses_domain_identity.domain.domain}"
      type  = "CNAME"
      value = "${token}.dkim.amazonses.com"
    }
  ]
}

output "events_topic_arn" {
  description = "SNS topic SES publishes Bounce/Complaint notifications to — subscribed by backend/src/handlers/sesEvents/index.ts."
  value       = aws_sns_topic.ses_events.arn
}
