# ────────────────────────────────────────────────────────
# RDS PostgreSQL Outputs
# ────────────────────────────────────────────────────────
output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint (host:port)"
  value       = aws_db_instance.postgres.endpoint
}

output "rds_host" {
  description = "RDS PostgreSQL hostname only"
  value       = aws_db_instance.postgres.address
}

output "rds_port" {
  description = "RDS PostgreSQL port"
  value       = aws_db_instance.postgres.port
}

output "rds_database_name" {
  description = "Database name"
  value       = aws_db_instance.postgres.db_name
}

output "rds_username" {
  description = "Database master username"
  value       = aws_db_instance.postgres.username
  sensitive   = true
}

output "rds_database_url" {
  description = "Full PostgreSQL connection URL for DATABASE_URL env var"
  value       = "postgresql://${aws_db_instance.postgres.username}:PASSWORD_HERE@${aws_db_instance.postgres.address}:5432/${aws_db_instance.postgres.db_name}"
  sensitive   = true
}

output "rds_arn" {
  description = "ARN of the RDS instance"
  value       = aws_db_instance.postgres.arn
}

# ────────────────────────────────────────────────────────
# ElastiCache Redis Outputs
# ────────────────────────────────────────────────────────
output "elasticache_endpoint" {
  description = "ElastiCache Redis endpoint address"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
}

output "elasticache_port" {
  description = "ElastiCache Redis port"
  value       = aws_elasticache_cluster.redis.port
}

output "elasticache_url" {
  description = "Redis connection URL for REDIS_URL or REDIS_HOST:REDIS_PORT"
  value       = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.port}"
}

output "elasticache_cluster_id" {
  description = "ElastiCache cluster identifier"
  value       = aws_elasticache_cluster.redis.cluster_id
}

output "elasticache_arn" {
  description = "ARN of the ElastiCache cluster"
  value       = aws_elasticache_cluster.redis.arn
}

# ────────────────────────────────────────────────────────
# SES Outputs
# ────────────────────────────────────────────────────────
output "ses_from_email" {
  description = "SES verified email address for sending emails"
  value       = aws_sesv2_email_identity.imbobi.email_address
}

output "ses_region" {
  description = "AWS region where SES is configured"
  value       = var.aws_region
}

output "ses_max_send_rate" {
  description = "SES maximum sending rate (emails per second)"
  value       = aws_ses_account_sending_limit_update.imbobi.max_send_rate
}

output "ses_max_24_hour_send" {
  description = "SES maximum 24-hour sending quota (emails per day)"
  value       = aws_ses_account_sending_limit_update.imbobi.max_24_hour_send
}

# ────────────────────────────────────────────────────────
# VPC & Networking Outputs
# ────────────────────────────────────────────────────────
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = aws_vpc.main.cidr_block
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = aws_subnet.private[*].id
}

output "rds_security_group_id" {
  description = "RDS security group ID"
  value       = aws_security_group.rds.id
}

output "elasticache_security_group_id" {
  description = "ElastiCache security group ID"
  value       = aws_security_group.elasticache.id
}

# ────────────────────────────────────────────────────────
# Monitoring & Logging Outputs
# ────────────────────────────────────────────────────────
output "cloudwatch_log_group" {
  description = "CloudWatch log group for application logs"
  value       = aws_cloudwatch_log_group.imbobi.name
}

output "elasticache_notifications_topic" {
  description = "SNS topic for ElastiCache notifications"
  value       = aws_sns_topic.elasticache_notifications.arn
}

output "ses_alerts_topic" {
  description = "SNS topic for SES alerts"
  value       = aws_sns_topic.ses_alerts.arn
}

# ────────────────────────────────────────────────────────
# AWS Secrets Manager Outputs
# ────────────────────────────────────────────────────────
output "secrets_manager_production_secret_name" {
  description = "Production secrets name in AWS Secrets Manager"
  value       = aws_secretsmanager_secret.imbobi_production.name
}

output "secrets_manager_production_secret_arn" {
  description = "Production secrets ARN in AWS Secrets Manager"
  value       = aws_secretsmanager_secret.imbobi_production.arn
}

output "secrets_manager_staging_secret_name" {
  description = "Staging secrets name in AWS Secrets Manager"
  value       = aws_secretsmanager_secret.imbobi_staging.name
}

output "secrets_manager_staging_secret_arn" {
  description = "Staging secrets ARN in AWS Secrets Manager"
  value       = aws_secretsmanager_secret.imbobi_staging.arn
}

output "secrets_manager_policy_arn" {
  description = "IAM policy ARN for Secrets Manager access"
  value       = aws_iam_policy.secrets_manager_access.arn
}

output "secrets_audit_log_group" {
  description = "CloudWatch log group for Secrets Manager audit"
  value       = aws_cloudwatch_log_group.secrets_audit.name
}

# ────────────────────────────────────────────────────────
# Environment Summary
# ────────────────────────────────────────────────────────
output "environment_summary" {
  description = "Summary of deployed resources"
  value = {
    environment = var.environment
    region      = var.aws_region
    services = {
      rds_endpoint        = aws_db_instance.postgres.address
      redis_endpoint      = aws_elasticache_cluster.redis.cache_nodes[0].address
      ses_from_email      = aws_sesv2_email_identity.imbobi.email_address
      secrets_manager_arn = aws_secretsmanager_secret.imbobi_production.arn
    }
    free_tier_limits = {
      rds_monthly_hours     = 750
      rds_storage_gb        = 20
      elasticache_node_type = "cache.t2.micro"
      ses_daily_quota       = 50000
    }
  }
}
