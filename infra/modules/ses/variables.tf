variable "sender_email" {
  description = "The literal From address the app sends OTP codes/notifications with (e.g. noreply@trackfarm.cc). Not its own SES identity — authorized entirely by the verified domain_name identity below. See main.tf's header comment."
  type        = string
}

variable "test_recipient_email" {
  description = "A real inbox, separate from sender_email, verified as its own SES identity purely so it can receive mail while this account is in the SES sandbox (every recipient needs a verified identity until production access is granted) — independent of whatever sender_email is set to. Must be an inbox someone can actually check — SES emails it a confirmation link that has to be clicked."
  type        = string
}

variable "domain_name" {
  description = "Domain to verify as a domain-wide SES identity (e.g. trackfarm.cc) — see main.tf's header comment for why, alongside the independent test_recipient_email identity above."
  type        = string
}

variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}
