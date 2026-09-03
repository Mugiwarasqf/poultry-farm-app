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

variable "table_names" {
  description = "Map of logical table key to actual table name, from the dynamodb module — becomes every function's env vars."
  type        = map(string)
}

variable "table_arns" {
  description = "Every table + GSI ARN to grant read/write on, from the dynamodb module."
  type        = list(string)
}

variable "cognito_user_pool_id" {
  type = string
}

variable "cognito_user_pool_arn" {
  type = string
}

variable "cognito_client_id" {
  type = string
}

variable "ses_identity_arn" {
  description = "The ses module's verified sender identity ARN — scopes the notification Lambdas' ses:SendEmail permission."
  type        = string
}

variable "ses_sender_email" {
  description = "The verified sender address itself, passed to the notification Lambdas as SES_SENDER_EMAIL."
  type        = string
}
