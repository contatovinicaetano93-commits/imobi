terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Backend configuration for state management
  # IMPORTANT: Uncomment after first successful apply
  # This stores your Terraform state in S3 (recommended for production)
  # backend "s3" {
  #   bucket         = "imbobi-terraform-state"
  #   key            = "phase1/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-locks"
  # }

  # For now, state is stored locally in terraform.tfstate
  # WARNING: Never commit terraform.tfstate to git!
  # Add to .gitignore if not already present
}

provider "aws" {
  region = var.aws_region

  # Default tags applied to all resources
  default_tags {
    tags = {
      Environment = var.environment
      Project     = "imbobi"
      Phase       = "phase1"
      ManagedBy   = "Terraform"
      CreatedAt   = formatdate("YYYY-MM-DD", timestamp())
    }
  }
}
