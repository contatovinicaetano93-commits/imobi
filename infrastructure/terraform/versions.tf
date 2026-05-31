terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }

  # Backend S3 will be configured after initial setup
  # backend "s3" {
  #   bucket         = "imobi-terraform-state"
  #   key            = "production/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "imobi-terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "imobi"
      ManagedBy   = "terraform"
      CreatedAt   = timestamp()
    }
  }
}
