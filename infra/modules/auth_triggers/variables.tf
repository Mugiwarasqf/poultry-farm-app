variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "backend_dist" {
  description = "Path to backend/dist, where esbuild.config.js writes one directory per Lambda."
  type        = string
}

variable "ses_identity_arn" {
  description = "The ses module's verified sender identity ARN — scopes create_challenge's ses:SendEmail permission."
  type        = string
}

variable "ses_sender_email" {
  description = "The verified sender address itself, passed to create_challenge as SES_SENDER_EMAIL."
  type        = string
}
