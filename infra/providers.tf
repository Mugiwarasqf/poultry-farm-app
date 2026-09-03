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
