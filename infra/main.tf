# Root module: wires the per-service modules together.
#
#   dynamodb, s3, ses, cognito  (no dependencies, can build in any order --
#                                 cognito has no Lambda triggers to wire in
#                                 since the move to email+password auth,
#                                 08/10/2026, see modules/cognito/main.tf)
#            |
#        api_lambdas     (needs dynamodb + cognito + ses outputs)
#          /      \                 \
#   api_gateway   notifications      frontend  (each needs api_lambdas/cognito/api_gateway outputs)

locals {
  backend_dist = "${path.module}/../backend/dist"
  # frontend-react's *built* output — run `npm run build` in
  # frontend-react/ before `terraform apply`, Terraform does not build it.
  frontend_dir    = "${path.module}/../frontend-react/dist"
  frontend_config = "${path.module}/../frontend-react/config.js.tftpl"
}

module "dynamodb" {
  source = "./modules/dynamodb"

  project_name = var.project_name
  environment  = var.environment
}

module "s3" {
  source = "./modules/s3"

  project_name = var.project_name
  environment  = var.environment
}

module "ses" {
  source = "./modules/ses"

  sender_email          = var.ses_sender_email
  test_recipient_emails = var.ses_test_recipient_emails
  domain_name           = var.domain_name
  project_name          = var.project_name
  environment           = var.environment
}

module "cognito" {
  source = "./modules/cognito"

  project_name = var.project_name
  environment  = var.environment
}

module "api_lambdas" {
  source = "./modules/api_lambdas"

  project_name = var.project_name
  environment  = var.environment
  backend_dist = local.backend_dist

  table_names = module.dynamodb.table_names
  table_arns  = module.dynamodb.table_arns

  cognito_user_pool_id  = module.cognito.user_pool_id
  cognito_user_pool_arn = module.cognito.user_pool_arn
  cognito_client_id     = module.cognito.client_id

  # Same reasoning as the auth_triggers module call above.
  ses_identity_arns    = module.ses.send_identity_arns
  ses_sender_email     = module.ses.sender_email
  ses_events_topic_arn = module.ses.events_topic_arn
}

module "api_gateway" {
  source = "./modules/api_gateway"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region

  functions = module.api_lambdas.functions

  cognito_user_pool_id = module.cognito.user_pool_id
  cognito_client_id    = module.cognito.client_id

  domain_name         = var.deploy_custom_domain ? var.domain_name : null
  acm_certificate_arn = var.deploy_custom_domain ? aws_acm_certificate_validation.api[0].certificate_arn : null
}

module "notifications" {
  source = "./modules/notifications"

  project_name = var.project_name
  environment  = var.environment

  vaccination_reminders_function_arn  = module.api_lambdas.functions["scheduled_vaccination_reminders"].arn
  vaccination_reminders_function_name = module.api_lambdas.functions["scheduled_vaccination_reminders"].name
  entry_nudges_function_arn           = module.api_lambdas.functions["scheduled_entry_nudges"].arn
  entry_nudges_function_name          = module.api_lambdas.functions["scheduled_entry_nudges"].name
}

module "frontend" {
  source = "./modules/frontend"

  project_name    = var.project_name
  environment     = var.environment
  site_dir        = local.frontend_dir
  config_template = local.frontend_config

  # The custom domain when this environment owns it (so a future infra
  # rebuild of *that* environment regenerates the backend behind
  # api.<domain_name> without needing a frontend rebuild/redeploy just to
  # point at a new URL) — otherwise the raw execute-api endpoint, so an
  # environment that doesn't own the domain (e.g. a beta account once a
  # separate prod account takes over DNS) doesn't bake in a hostname its
  # own traffic can't actually reach. See deploy_custom_domain in
  # infra/variables.tf.
  api_base          = var.deploy_custom_domain ? module.api_gateway.custom_domain_url : module.api_gateway.api_endpoint
  cognito_client_id = module.cognito.client_id
  cognito_region    = var.aws_region

  domain_name         = var.deploy_custom_domain ? var.domain_name : null
  acm_certificate_arn = var.deploy_custom_domain ? aws_acm_certificate_validation.frontend[0].certificate_arn : null
}
