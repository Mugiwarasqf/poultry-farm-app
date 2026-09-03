variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "site_dir" {
  description = "Path to frontend/ — the plain HTML/CSS/JS v1 frontend."
  type        = string
}

variable "api_base" {
  description = "The deployed API Gateway endpoint, from the api_gateway module."
  type        = string
}

variable "cognito_client_id" {
  description = "Cognito app client ID, from the cognito module. Not a secret — it's a public OAuth client id."
  type        = string
}
