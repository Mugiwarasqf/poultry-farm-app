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

# No default on purpose — this has to be an inbox whoever runs `apply`
# actually controls, since SES emails it a confirmation link to click
# before it can send anything (see infra/modules/ses/main.tf). Set it in
# terraform.tfvars (gitignored) rather than committing a real address here.
variable "ses_sender_email" {
  description = "Email address to verify as the SES sender identity for OTP codes and notifications."
  type        = string
}
