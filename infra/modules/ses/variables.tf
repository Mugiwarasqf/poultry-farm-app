variable "sender_email" {
  description = "Email address to verify as the SES sender identity for OTP codes and notifications. Must be an inbox the founder can actually check — SES emails a confirmation link to it that has to be clicked before it can send."
  type        = string
}

variable "domain_name" {
  description = "Domain to verify as a second, domain-wide SES identity (e.g. trackfarm.cc) — see main.tf's header comment for why, alongside the single sender_email identity above."
  type        = string
}

variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}
