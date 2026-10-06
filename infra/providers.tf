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

  # Local state for now — deliberate, matches the beta stage. Move to an
  # S3 backend with DynamoDB locking before more than one person runs
  # `terraform apply` against this, so concurrent applies can't corrupt
  # state.
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      project     = "poultry-farm-app"
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
      project     = "poultry-farm-app"
      environment = var.environment
      managed_by  = "terraform"
    }
  }
}
