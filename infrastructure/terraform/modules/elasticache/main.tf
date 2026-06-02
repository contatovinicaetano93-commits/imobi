resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}-elasticache-subnet-group"
  subnet_ids = var.private_subnets

  tags = {
    Name = "${var.project_name}-elasticache-subnet-group"
  }
}

resource "aws_security_group" "elasticache" {
  name   = "${var.project_name}-elasticache-sg"
  vpc_id = var.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-elasticache-sg"
  }
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_description = "Redis cluster for ${var.project_name}"
  replication_group_id          = "${var.project_name}-redis"
  engine                        = "redis"
  engine_version                = "7.0"
  node_type                     = var.elasticache_instance_type
  num_cache_clusters            = 2
  automatic_failover_enabled    = true
  multi_az_enabled              = true

  parameter_group_name = aws_elasticache_parameter_group.main.name
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.elasticache.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth_token.result

  maintenance_window      = "mon:03:00-mon:04:00"
  automatic_minor_upgrade = true
  notification_topic_arn  = var.sns_topic_arn

  log_delivery_configuration {
    destination      = var.cloudwatch_log_group_name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  tags = {
    Name = "${var.project_name}-redis"
  }
}

resource "aws_elasticache_parameter_group" "main" {
  name        = "${var.project_name}-redis-params"
  family      = "redis7"
  description = "Parameter group for ${var.project_name}"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  tags = {
    Name = "${var.project_name}-redis-params"
  }
}

resource "random_password" "redis_auth_token" {
  length  = 32
  special = true
}
