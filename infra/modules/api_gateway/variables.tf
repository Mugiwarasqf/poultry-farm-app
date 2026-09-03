variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "functions" {
  description = "The api_lambdas module's `functions` output — only the API-facing keys are used here (not the two scheduled_* ones)."
  type = map(object({
    name       = string
    arn        = string
    invoke_arn = string
  }))
}

variable "cognito_user_pool_id" {
  type = string
}

variable "cognito_client_id" {
  type = string
}
