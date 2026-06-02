variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

# ────────────────────────────────────────────────────────
# RDS Configuration
# ────────────────────────────────────────────────────────
variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "imbobi_dev"
  sensitive   = false
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "imbobimaster"
  sensitive   = true
}

variable "db_password" {
  description = "PostgreSQL master password (min 8 chars, alphanumeric + special)"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.db_password) >= 8
    error_message = "Database password must be at least 8 characters long."
  }
}

# ────────────────────────────────────────────────────────
# SES Configuration
# ────────────────────────────────────────────────────────
variable "ses_from_email" {
  description = "Email address to use as sender (must be verified in SES)"
  type        = string
  default     = "noreply@imbobi.com.br"
}

variable "ses_mail_from_domain" {
  description = "Domain to use for MAIL FROM header (must match SES verified domain)"
  type        = string
  default     = "bounce.imbobi.com.br"
}

# ────────────────────────────────────────────────────────
# Secrets & Security
# ────────────────────────────────────────────────────────
variable "jwt_secret" {
  description = "JWT secret key (min 64 chars)"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.jwt_secret) >= 64
    error_message = "JWT secret must be at least 64 characters long."
  }
}

variable "encryption_key" {
  description = "AES-256-GCM encryption key (base64-encoded 32 bytes)"
  type        = string
  sensitive   = true
}

variable "aws_access_key_id" {
  description = "AWS Access Key ID"
  type        = string
  sensitive   = true
}

variable "aws_secret_access_key" {
  description = "AWS Secret Access Key"
  type        = string
  sensitive   = true
}

# ────────────────────────────────────────────────────────
# Application Configuration
# ────────────────────────────────────────────────────────
variable "s3_bucket_name" {
  description = "S3 bucket name for evidence storage"
  type        = string
  default     = "imbobi-evidencias-production"
}

variable "cors_origin" {
  description = "CORS allowed origin"
  type        = string
  default     = "https://app.imbobi.com.br"
}

variable "app_url" {
  description = "Application base URL"
  type        = string
  default     = "https://app.imbobi.com.br"
}

variable "api_url" {
  description = "API base URL"
  type        = string
  default     = "https://api.imbobi.com.br"
}

# ────────────────────────────────────────────────────────
# External APIs
# ────────────────────────────────────────────────────────
variable "unico_api_key" {
  description = "Unico API key for identity validation"
  type        = string
  sensitive   = true
  default     = ""
}

variable "serpro_token" {
  description = "SERPRO API token for government certificate queries"
  type        = string
  sensitive   = true
  default     = ""
}

# ────────────────────────────────────────────────────────
# Tags
# ────────────────────────────────────────────────────────
variable "tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "imbobi"
    Environment = "phase1"
  }
}
