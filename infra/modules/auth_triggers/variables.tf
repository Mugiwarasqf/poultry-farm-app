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

variable "suppressed_emails_table_name" {
  description = "The dynamodb module's suppressed_emails table name, passed to create_challenge so it can skip sending an OTP to an address that permanently bounced or complained."
  type        = string
}

variable "suppressed_emails_table_arn" {
  description = "ARN of the table above — scopes create_challenge's dynamodb:GetItem permission to just this one table, not the general dynamo_rw policy the rest of the stack uses."
  type        = string
}
