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

variable "cognito_region" {
  description = "Region the Cognito user pool lives in — passed through explicitly to config.js so the frontend's silent token-refresh call (api/client.js, a direct fetch to cognito-idp.<region>.amazonaws.com) doesn't have to guess it. It used to parse this out of api_base's hostname, which broke the moment api_base became a custom domain (api.trackfarm.cc) instead of the raw *.execute-api.<region>.amazonaws.com URL."
  type        = string
}

variable "domain_name" {
  description = "Bare apex domain (e.g. trackfarm.cc) added as this distribution's CloudFront alias."
  type        = string
}

variable "acm_certificate_arn" {
  description = "ARN of the validated (ISSUED) us-east-1 ACM certificate for domain_name — see infra/acm.tf's aws_acm_certificate_validation.frontend."
  type        = string
}
