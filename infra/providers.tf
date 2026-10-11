terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }

  # Bucket/table/region are per-account, passed via -backend-config at
  # init time (see infra/backend-configs/*.hcl) — can't be hardcoded here
  # since beta and prod are different AWS accounts.
  backend "s3" {
    key            = "infra/terraform.tfstate"
    dynamodb_table = "trackfarm-tfstate-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      project     = var.project_name
      environment = var.environment
      managed_by  = "terraform"
    }
  }
}

# CloudFront only accepts ACM certificates requested in us-east-1,
# regardless of which region the rest of this stack lives in (CloudFront
# itself is a global service) — see acm.tf's aws_acm_certificate.frontend.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      project     = var.project_name
      environment = var.environment
      managed_by  = "terraform"
    }
  }
}
