# Account-level IAM/OIDC setup for GitHub Actions -- applied once per AWS
# account, separately from infra/'s per-environment stack, since it isn't
# tied to project_name/environment and must never be duplicated by a
# second environment sharing the same account.

terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    key            = "bootstrap/terraform.tfstate"
    dynamodb_table = "trackfarm-tfstate-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}
