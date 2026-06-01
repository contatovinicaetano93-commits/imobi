# Staging Environment Configuration for imobi AWS Infrastructure

# ============================================================================
# Environment
# ============================================================================
environment  = "staging"
aws_region   = "us-east-1"
project_name = "imobi"

# ============================================================================
# Network Configuration
# ============================================================================
vpc_cidr             = "10.0.0.0/16"
public_subnet_cidrs  = ["10.0.10.0/24", "10.0.11.0/24"]
private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]

# ============================================================================
# RDS Database Configuration
# ============================================================================
postgres_version      = "15"
rds_instance_class    = "db.t3.micro"
rds_allocated_storage = 20
rds_backup_retention  = 7

# ============================================================================
# ElastiCache Redis Configuration
# ============================================================================
elasticache_node_type       = "cache.t3.micro"
elasticache_num_cache_nodes = 1

# ============================================================================
# ECS Configuration (if applicable)
# ============================================================================
ecs_api_task_cpu      = 256
ecs_api_task_memory   = 512
ecs_api_desired_count = 2

ecs_web_task_cpu      = 256
ecs_web_task_memory   = 512
ecs_web_desired_count = 2

# ============================================================================
# Domain Configuration
# ============================================================================
domain_name       = "staging.imobi.com"
certificate_email = "contato.vinicaetano93@gmail.com"

# ============================================================================
# Tags
# ============================================================================
tags = {
  Project     = "imobi"
  Environment = "staging"
  ManagedBy   = "terraform"
  Owner       = "DevOps"
}
