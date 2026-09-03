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
