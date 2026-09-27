variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "site_dir" {
  description = "Path to frontend-react/dist — the built output of `npm run build`, not the source tree."
  type        = string
}

variable "config_template" {
  description = "Path to config.js.tftpl — lives at frontend-react/'s root, not inside dist/, since it's a Terraform input, not something Vite should copy into the build."
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
