terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment after first apply to store state in S3
  # backend "s3" {
  #   bucket         = "imbobi-terraform-state"
  #   key            = "phase1/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region

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

# ────────────────────────────────────────────────────────
# RDS PostgreSQL (Free Tier: t2.micro, 750h/month)
# ────────────────────────────────────────────────────────
resource "aws_db_subnet_group" "imbobi" {
  name       = "imbobi-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "imbobi-db-subnet-group"
  }
}

resource "aws_security_group" "rds" {
  name        = "imbobi-rds-sg"
  description = "Security group for imbobi RDS PostgreSQL"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
    description     = "PostgreSQL from ECS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "imbobi-rds-sg"
  }
}

resource "aws_db_instance" "postgres" {
  identifier            = "imbobi-postgres"
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = "db.t2.micro" # Free tier eligible
  allocated_storage    = 20            # Free tier: 20 GB
  storage_type         = "gp2"
  storage_encrypted    = true
  skip_final_snapshot  = false
  final_snapshot_identifier = "imbobi-postgres-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name            = aws_db_subnet_group.imbobi.name
  vpc_security_group_ids          = [aws_security_group.rds.id]
  publicly_accessible             = false
  multi_az                        = false # Free tier: single AZ
  backup_retention_period         = 7
  backup_window                   = "03:00-04:00"
  maintenance_window              = "mon:04:00-mon:05:00"
  deletion_protection             = true
  enabled_cloudwatch_logs_exports = ["postgresql"]

  parameters {
    name  = "log_statement"
    value = "all"
  }

  tags = {
    Name = "imbobi-postgres"
  }

  depends_on = [aws_security_group.rds]
}

# ────────────────────────────────────────────────────────
# ElastiCache Redis (Free Tier: cache.t2.micro)
# ────────────────────────────────────────────────────────
resource "aws_elasticache_subnet_group" "imbobi" {
  name       = "imbobi-elasticache-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "imbobi-elasticache-subnet-group"
  }
}

resource "aws_security_group" "elasticache" {
  name        = "imbobi-elasticache-sg"
  description = "Security group for imbobi ElastiCache Redis"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
    description     = "Redis from ECS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "imbobi-elasticache-sg"
  }
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "imbobi-redis"
  engine               = "redis"
  node_type            = "cache.t2.micro" # Free tier eligible
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  engine_version       = "7.0"
  port                 = 6379

  subnet_group_name          = aws_elasticache_subnet_group.imbobi.name
  security_group_ids         = [aws_security_group.elasticache.id]
  automatic_failover_enabled = false # Free tier: no multi-AZ
  at_rest_encryption_enabled = true
  transit_encryption_enabled = false # Free tier limitation
  auth_token_enabled         = false # Free tier limitation

  maintenance_window = "sun:03:00-sun:04:00"
  notification_topic_arn = aws_sns_topic.elasticache_notifications.arn

  tags = {
    Name = "imbobi-redis"
  }

  depends_on = [aws_security_group.elasticache]
}

# SNS topic for ElastiCache notifications
resource "aws_sns_topic" "elasticache_notifications" {
  name = "imbobi-elasticache-notifications"

  tags = {
    Name = "imbobi-elasticache-notifications"
  }
}

# ────────────────────────────────────────────────────────
# SES (Simple Email Service) - Free: 50k emails/day
# ────────────────────────────────────────────────────────
resource "aws_sesv2_account_details" "imbobi" {
  mail_from_domain = var.ses_mail_from_domain
}

# Verify email identity for sending
resource "aws_sesv2_email_identity" "imbobi" {
  email_address = var.ses_from_email

  authentication_attributes {
    origin_signing_enabled = true
  }

  tags = {
    Name = "imbobi-sender"
  }
}

# Request production access quota (for emails beyond 50k/day in future)
resource "aws_ses_account_sending_limit_update" "imbobi" {
  max_send_rate       = 1
  max_24_hour_send    = 50000 # Free tier limit
}

# CloudWatch Alarms for SES bounce rates
resource "aws_cloudwatch_metric_alarm" "ses_bounce_rate" {
  alarm_name          = "imbobi-ses-bounce-rate-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "5"
  metric_name         = "Bounce"
  namespace           = "AWS/SES"
  period              = "300"
  statistic           = "Sum"
  threshold           = "100"
  alarm_actions       = [aws_sns_topic.ses_alerts.arn]
  alarm_description   = "Alert when SES bounce rate exceeds threshold"
}

resource "aws_sns_topic" "ses_alerts" {
  name = "imbobi-ses-alerts"

  tags = {
    Name = "imbobi-ses-alerts"
  }
}

# ────────────────────────────────────────────────────────
# VPC & Networking (Prerequisite for RDS & ElastiCache)
# ────────────────────────────────────────────────────────
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "imbobi-vpc"
  }
}

resource "aws_subnet" "private" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 2, count.index + 1)
  availability_zone       = data.aws_availability_zones.available.names[count.index % length(data.aws_availability_zones.available.names)]
  map_public_ip_on_launch = false

  tags = {
    Name = "imbobi-private-subnet-${count.index + 1}"
  }
}

resource "aws_security_group" "ecs" {
  name        = "imbobi-ecs-sg"
  description = "Security group for imbobi ECS tasks"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "imbobi-ecs-sg"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# ────────────────────────────────────────────────────────
# CloudWatch Logs
# ────────────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "imbobi" {
  name              = "/aws/imbobi/phase1"
  retention_in_days = 30

  tags = {
    Name = "imbobi-logs"
  }
}

# ────────────────────────────────────────────────────────
# Outputs for connection strings
# ────────────────────────────────────────────────────────
output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "rds_database_url" {
  description = "PostgreSQL connection URL (DATABASE_URL)"
  value       = "postgresql://${aws_db_instance.postgres.username}:****@${aws_db_instance.postgres.address}:5432/${aws_db_instance.postgres.db_name}"
  sensitive   = true
}

output "elasticache_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
}

output "elasticache_port" {
  description = "ElastiCache Redis port"
  value       = aws_elasticache_cluster.redis.port
}

output "elasticache_url" {
  description = "Redis connection URL (REDIS_URL)"
  value       = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.port}"
}

output "ses_from_email" {
  description = "SES verified email for sending"
  value       = aws_sesv2_email_identity.imbobi.email_address
}

output "ses_region" {
  description = "AWS region where SES is configured"
  value       = var.aws_region
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group for monitoring"
  value       = aws_cloudwatch_log_group.imbobi.name
}
