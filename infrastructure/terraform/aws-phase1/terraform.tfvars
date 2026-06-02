# ────────────────────────────────────────────────────────
# imbobi Phase 1 AWS Terraform Configuration
# Generated: 2026-06-02 - Deployment Phase 1 Execution

aws_region  = "us-east-1"
environment = "staging"
vpc_cidr    = "10.0.0.0/16"

# ────────────────────────────────────────────────────────
# RDS PostgreSQL (Free Tier)
# ────────────────────────────────────────────────────────
db_name     = "imbobi_staging"
db_username = "imbobimaster"
db_password = "tr0/wC/wvV+2uwr8xFI5drmXHMoBri/P"

# ────────────────────────────────────────────────────────
# SES Email Configuration
# Note: Email must be verified in AWS SES console before deployment
# ────────────────────────────────────────────────────────
ses_from_email       = "noreply@imbobi.com.br"
ses_mail_from_domain = "bounce.imbobi.com.br"

# ────────────────────────────────────────────────────────
# Common Tags
# ────────────────────────────────────────────────────────
tags = {
  Project     = "imbobi"
  Environment = "staging"
  Team        = "backend"
  ManagedBy   = "Terraform"
  Phase       = "phase1"
  DeployedAt  = "2026-06-02"
}
