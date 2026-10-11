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

variable "domain_name" {
  description = "api.<this> becomes the backend's custom domain name. Null (the default) means this environment doesn't own the domain right now — see infra/variables.tf's deploy_custom_domain — and callers use api_endpoint (the raw AWS-generated URL) instead."
  type        = string
  default     = null
}

variable "acm_certificate_arn" {
  description = "ARN of the validated (ISSUED) regional (var.aws_region) ACM certificate for api.<domain_name> — see infra/acm.tf's aws_acm_certificate_validation.api. Must be regional, not the us-east-1 one used for CloudFront. Required if domain_name is set, ignored otherwise."
  type        = string
  default     = null
}
