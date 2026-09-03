variable "sender_email" {
  description = "Email address to verify as the SES sender identity for OTP codes and notifications. Must be an inbox the founder can actually check — SES emails a confirmation link to it that has to be clicked before it can send."
  type        = string
}
