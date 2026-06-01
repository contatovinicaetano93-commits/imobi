variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type    = string
  default = "production"
}

variable "project_name" {
  type    = string
  default = "imobi"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "rds_instance_class" {
  type    = string
  default = "db.r6i.xlarge"
}

variable "rds_allocated_storage" {
  type    = number
  default = 100
}

variable "rds_backup_retention_days" {
  type    = number
  default = 30
}

variable "elasticache_instance_type" {
  type    = string
  default = "cache.r6g.xlarge"
}

variable "ecs_api_cpu" {
  type    = number
  default = 4096
}

variable "ecs_api_memory" {
  type    = number
  default = 8192
}

variable "ecs_api_desired_count" {
  type    = number
  default = 2
}

variable "ecs_web_cpu" {
  type    = number
  default = 1024
}

variable "ecs_web_memory" {
  type    = number
  default = 2048
}

variable "ecs_web_desired_count" {
  type    = number
  default = 2
}

variable "ecs_worker_cpu" {
  type    = number
  default = 2048
}

variable "ecs_worker_memory" {
  type    = number
  default = 4096
}

variable "ecs_worker_desired_count" {
  type    = number
  default = 1
}

variable "s3_bucket_name" {
  type    = string
  default = "imobi-obras-production"
}

variable "enable_cloudfront" {
  type    = bool
  default = true
}

variable "enable_waf" {
  type    = bool
  default = true
}

variable "tags" {
  type = map(string)
  default = {
    Team       = "DevOps"
    CostCenter = "Infrastructure"
  }
}
