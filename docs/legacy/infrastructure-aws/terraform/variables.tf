variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "sa-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "imobi"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for public subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "private_subnet_cidr" {
  description = "CIDR block for private subnet"
  type        = string
  default     = "10.0.2.0/24"
}

variable "db_instance_class" {
  description = "RDS instance class (t3.micro for free tier)"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_name" {
  description = "Initial database name"
  type        = string
  default     = "imobi_prod"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "postgres"
  sensitive   = true
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type (cache.t3.micro for free tier)"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

variable "redis_num_cache_nodes" {
  description = "Number of Redis cache nodes"
  type        = number
  default     = 1
}

variable "ec2_instance_type" {
  description = "EC2 instance type (t3.micro for free tier)"
  type        = string
  default     = "t3.micro"
}

variable "api_port" {
  description = "NestJS API port"
  type        = number
  default     = 3001
}

variable "web_port" {
  description = "Next.js web app port"
  type        = number
  default     = 3000
}

variable "rds_port" {
  description = "PostgreSQL port"
  type        = number
  default     = 5432
}

variable "redis_port" {
  description = "Redis port"
  type        = number
  default     = 6379
}

variable "enable_multi_az" {
  description = "Enable Multi-AZ for RDS (disabled for free tier)"
  type        = bool
  default     = false
}

variable "backup_retention_period" {
  description = "RDS backup retention period in days"
  type        = number
  default     = 7
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot on RDS deletion"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Project     = "imobi"
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}
