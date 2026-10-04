variable "aws_region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "eu-west-1"
}

variable "environment" {
  description = "Deployment environment name (dev, beta, prod, ...)."
  type        = string
  default     = "beta"
}

variable "project_name" {
  description = "Short name used as a prefix on every resource this stack creates."
  type        = string
  default     = "poultry-farm-app"
}

# Placeholder trial length — docs/10-build-plan.md §7 is explicit that the
# real number comes from a second payment survey once the trial phase has
# traction, not from a guess made while scaffolding infra. Kept as a
# variable rather than hard-coded so it never needs a schema/code change
# to update.
variable "trial_length_days" {
  description = "Placeholder free trial length in days — see docs/10-build-plan.md §7. Not a validated number yet."
  type        = number
  default     = 30
}

# The app's actual From address (e.g. noreply@trackfarm.cc) — not its own
# SES identity, authorized by the domain identity (var.domain_name) once
# that's verified. Not an inbox anyone needs to check; see
# infra/modules/ses/main.tf's header comment for the bug this caused when
# it used to double as the one below's value too.
variable "ses_sender_email" {
  description = "Literal From address the app sends OTP codes/notifications with."
  type        = string
}

# Independent of ses_sender_email above — this one DOES need to be a real,
# checkable inbox, since it's verified as its own SES identity purely so
# it can receive mail while this AWS account is in the SES sandbox (every
# recipient needs a verified identity, regardless of which verified
# identity sent it). Set it in terraform.tfvars (gitignored) rather than
# committing a real address here.
variable "ses_test_recipient_email" {
  description = "A real inbox to verify as its own SES identity for sandbox testing — see infra/modules/ses/main.tf."
  type        = string
}

# Bought on Namecheap (04/10/2026), DNS kept there rather than migrated to
# Route 53 — see acm.tf's header comment for what that means for the
# apply workflow. The bare apex serves the app itself (not a separate
# marketing subdomain like app.<domain>) — deliberate, per this project's
# own validated low-digital-literacy finding: less for a farmer to type
# or get wrong than remembering an "app." prefix. api.<domain> serves the
# backend.
variable "domain_name" {
  description = "Registered domain (e.g. trackfarm.cc) — the bare apex serves the frontend, api.<domain_name> serves the backend. No default: only set this once the domain's ACM certificates are ready to be requested, see acm.tf."
  type        = string
}
