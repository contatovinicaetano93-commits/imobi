# ────────────────────────────────────────────────────────
# Terraform Backend Infrastructure Setup
# This file sets up S3 and DynamoDB for Terraform state management
# Run this file ONCE before deploying the main infrastructure
# ────────────────────────────────────────────────────────

# Only apply this when bootstrapping the backend
# Use: terraform apply -target=aws_s3_bucket.terraform_state -target=aws_dynamodb_table.terraform_locks

resource "aws_s3_bucket" "terraform_state" {
  bucket = "imobi-terraform-state-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "imobi-terraform-state"
    Purpose     = "Terraform state storage"
    Environment = "production"
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

resource "aws_dynamodb_table" "terraform_locks" {
  name             = "imobi-terraform-locks"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "LockID"
  skip_destroy     = false
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  attribute {
    name = "LockID"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name        = "imobi-terraform-locks"
    Purpose     = "Terraform state locking"
    Environment = "production"
  }
}

data "aws_caller_identity" "current" {}

output "terraform_state_bucket" {
  value       = aws_s3_bucket.terraform_state.id
  description = "Name of the S3 bucket for Terraform state"
}

output "terraform_locks_table" {
  value       = aws_dynamodb_table.terraform_locks.name
  description = "Name of the DynamoDB table for Terraform locks"
}
