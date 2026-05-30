# Terraform variables for imobi AWS infrastructure

variable "aws_region" {
  description = "AWS region for infrastructure"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either 'staging' or 'production'."
  }
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "imobi"
}

variable "tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default = {
    Project     = "imobi"
    ManagedBy   = "terraform"
  }
}

# ============================================================================
# Network Variables
# ============================================================================

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

# ============================================================================
# RDS Database Variables
# ============================================================================

variable "rds_instance_class" {
  description = "RDS instance type"
  type        = string
  default     = "db.t3.micro"

  validation {
    condition = contains([
      "db.t3.micro", "db.t3.small", "db.t3.medium", "db.t3.large",
      "db.m5.large", "db.m5.xlarge", "db.r5.large", "db.r5.xlarge"
    ], var.rds_instance_class)
    error_message = "Must be a valid RDS instance class."
  }
}

variable "rds_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 20

  validation {
    condition     = var.rds_allocated_storage >= 20
    error_message = "Allocated storage must be at least 20 GB."
  }
}

variable "rds_backup_retention" {
  description = "Number of days to retain RDS backups"
  type        = number
  default     = 7

  validation {
    condition     = var.rds_backup_retention >= 1 && var.rds_backup_retention <= 35
    error_message = "Backup retention must be between 1 and 35 days."
  }
}

variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "15"

  validation {
    condition = contains(["12", "13", "14", "15", "16"], var.postgres_version)
    error_message = "Must be a supported PostgreSQL version (12, 13, 14, 15, or 16)."
  }
}

# ============================================================================
# ElastiCache Redis Variables
# ============================================================================

variable "elasticache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"

  validation {
    condition = contains([
      "cache.t3.micro", "cache.t3.small", "cache.t3.medium",
      "cache.m5.large", "cache.m5.xlarge", "cache.r5.large"
    ], var.elasticache_node_type)
    error_message = "Must be a valid ElastiCache node type."
  }
}

variable "elasticache_num_cache_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 1

  validation {
    condition     = var.elasticache_num_cache_nodes >= 1
    error_message = "Must have at least 1 cache node."
  }
}

# ============================================================================
# ECS Variables
# ============================================================================

variable "ecs_api_task_cpu" {
  description = "CPU units for API task (256, 512, 1024, 2048, 4096)"
  type        = number
  default     = 256
}

variable "ecs_api_task_memory" {
  description = "Memory for API task in MB"
  type        = number
  default     = 512
}

variable "ecs_api_desired_count" {
  description = "Desired number of API tasks"
  type        = number
  default     = 2

  validation {
    condition     = var.ecs_api_desired_count >= 1
    error_message = "Must have at least 1 task."
  }
}

variable "ecs_web_task_cpu" {
  description = "CPU units for Web task (256, 512, 1024, 2048, 4096)"
  type        = number
  default     = 256
}

variable "ecs_web_task_memory" {
  description = "Memory for Web task in MB"
  type        = number
  default     = 512
}

variable "ecs_web_desired_count" {
  description = "Desired number of Web tasks"
  type        = number
  default     = 2

  validation {
    condition     = var.ecs_web_desired_count >= 1
    error_message = "Must have at least 1 task."
  }
}

# ============================================================================
# Domain and SSL Variables
# ============================================================================

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "staging.imobi.com"
}

variable "certificate_email" {
  description = "Email for SSL certificate renewal notifications"
  type        = string
  default     = "admin@imobi.com"
}

# ============================================================================
# Feature Flags
# ============================================================================

variable "enable_s3_versioning" {
  description = "Enable S3 versioning"
  type        = bool
  default     = true
}

variable "enable_rds_monitoring" {
  description = "Enable RDS enhanced monitoring"
  type        = bool
  default     = var.environment == "production"
}

variable "enable_multi_az" {
  description = "Enable Multi-AZ for RDS"
  type        = bool
  default     = var.environment == "production"
}

variable "enable_read_replica" {
  description = "Enable RDS read replica"
  type        = bool
  default     = var.environment == "production"
}
