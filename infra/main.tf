# Root module: wires the per-service modules together. Dependency order
# matters here specifically to avoid a module-level cycle — see
# modules/auth_triggers/main.tf's header comment for why the three
# Cognito trigger Lambdas are their own module instead of living in
# api_lambdas alongside the other 12:
#
#   dynamodb, s3, ses, auth_triggers  (no dependencies, can build in any order —
#            |                         auth_triggers needs ses's identity for
#            |                         create_challenge's IAM + env var)
#         cognito                     (needs auth_triggers' 3 function ARNs)
#            |
#        api_lambdas                  (needs dynamodb + cognito + ses outputs)
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

  sender_email = var.ses_sender_email
}

module "auth_triggers" {
  source = "./modules/auth_triggers"

  project_name = var.project_name
  environment  = var.environment
  backend_dist = local.backend_dist

  ses_identity_arn = module.ses.identity_arn
  ses_sender_email = module.ses.sender_email
}

module "cognito" {
  source = "./modules/cognito"

  project_name = var.project_name
  environment  = var.environment

  define_auth_challenge_arn  = module.auth_triggers.define_challenge_arn
  define_auth_challenge_name = module.auth_triggers.define_challenge_name
  create_auth_challenge_arn  = module.auth_triggers.create_challenge_arn
  create_auth_challenge_name = module.auth_triggers.create_challenge_name
  verify_auth_challenge_arn  = module.auth_triggers.verify_challenge_arn
  verify_auth_challenge_name = module.auth_triggers.verify_challenge_name
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

  ses_identity_arn = module.ses.identity_arn
  ses_sender_email = module.ses.sender_email
}

module "api_gateway" {
  source = "./modules/api_gateway"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region

  functions = module.api_lambdas.functions

  cognito_user_pool_id = module.cognito.user_pool_id
  cognito_client_id    = module.cognito.client_id
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

  api_base          = module.api_gateway.api_endpoint
  cognito_client_id = module.cognito.client_id
}
