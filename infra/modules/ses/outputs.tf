output "identity_arn" {
  value = aws_ses_email_identity.sender.arn
}

output "sender_email" {
  value = aws_ses_email_identity.sender.email
}

output "domain_identity_arn" {
  description = "ARN covering any address @domain_name — use this (not identity_arn above) once sender_email is switched to a trackfarm.cc address."
  value       = aws_ses_domain_identity.domain.arn
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
