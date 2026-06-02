# AWS ECS (Elastic Container Service) - Fargate for imobi-api
# Serverless container orchestration platform

# ECS Cluster
resource "aws_ecs_cluster" "imobi_prod" {
  name = "imobi-prod"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "imobi-prod-cluster"
    Environment = var.environment
    Phase       = "Phase2"
  }
}

# CloudWatch Log Group for ECS
resource "aws_cloudwatch_log_group" "ecs_imobi_api" {
  name              = "/ecs/imobi-api"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "ecs-imobi-api-logs"
    Environment = var.environment
    Phase       = "Phase2"
  }
}

# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "imobi-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "imobi-ecs-task-execution-role"
    Environment = var.environment
    Phase       = "Phase2"
  }
}

# Attach ECS Task Execution Policy
resource "aws_iam_role_policy_attachment" "ecs_task_execution_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Allow ECS to read from Secrets Manager
resource "aws_iam_role_policy" "ecs_secrets_policy" {
  name = "imobi-ecs-secrets-policy"
  role = aws_iam_role.ecs_task_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:imobi/*"
      }
    ]
  })
}

# Allow ECS to push logs to CloudWatch
resource "aws_iam_role_policy" "ecs_logs_policy" {
  name = "imobi-ecs-logs-policy"
  role = aws_iam_role.ecs_task_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.ecs_imobi_api.arn}:*"
      }
    ]
  })
}

# IAM Role for ECS Task (application runtime permissions)
resource "aws_iam_role" "ecs_task_role" {
  name = "imobi-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "imobi-ecs-task-role"
    Environment = var.environment
    Phase       = "Phase2"
  }
}

# Allow application to access S3 (for file uploads)
resource "aws_iam_role_policy" "ecs_s3_policy" {
  name = "imobi-ecs-s3-policy"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = "${data.aws_s3_bucket.imobi_storage.arn}/*"
      }
    ]
  })
}

# Allow application to send emails via SES
resource "aws_iam_role_policy" "ecs_ses_policy" {
  name = "imobi-ecs-ses-policy"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
      }
    ]
  })
}

# ECS Task Definition
resource "aws_ecs_task_definition" "imobi_api" {
  family                   = "imobi-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_task_cpu
  memory                   = var.ecs_task_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "imobi-api"
      image     = "${aws_ecr_repository.imobi_api.repository_url}:latest"
      essential = true
      portMappings = [
        {
          containerPort = var.api_port
          hostPort      = var.api_port
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = tostring(var.api_port)
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "DATABASE_URL"
          value = "postgresql://${var.db_username}:${var.db_password}@${data.aws_db_instance.imobi_rds.endpoint}/${var.db_name}"
        },
        {
          name  = "REDIS_URL"
          value = "redis://${data.aws_elasticache_cluster.imobi_redis.cache_nodes[0].address}:${data.aws_elasticache_cluster.imobi_redis.port}"
        },
        {
          name  = "AWS_SECRETS_NAME"
          value = "imobi/${var.environment}"
        },
        {
          name  = "CORS_ORIGIN"
          value = var.cors_origin
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_imobi_api.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${var.api_port}/api/v1/health || exit 1"]
        interval    = 30
        timeout     = 10
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name        = "imobi-api-task"
    Environment = var.environment
    Phase       = "Phase2"
  }
}

# Security Group for ECS Tasks
resource "aws_security_group" "ecs_tasks" {
  name        = "imobi-ecs-tasks-sg"
  description = "Security group for ECS tasks running imobi-api"
  vpc_id      = data.aws_vpc.main.id

  ingress {
    from_port       = var.api_port
    to_port         = var.api_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "Allow traffic from ALB"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name        = "imobi-ecs-tasks-sg"
    Environment = var.environment
    Phase       = "Phase2"
  }
}

# ECS Service
resource "aws_ecs_service" "imobi_api" {
  name            = "imobi-api-service"
  cluster         = aws_ecs_cluster.imobi_prod.id
  task_definition = aws_ecs_task_definition.imobi_api.arn
  desired_count   = var.ecs_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.private.ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.imobi_api.arn
    container_name   = "imobi-api"
    container_port   = var.api_port
  }

  depends_on = [
    aws_lb_listener.http,
    aws_lb_listener.https,
    aws_iam_role_policy.ecs_secrets_policy,
    aws_iam_role_policy.ecs_logs_policy
  ]

  tags = {
    Name        = "imobi-api-service"
    Environment = var.environment
    Phase       = "Phase2"
  }
}

# Auto Scaling Target
resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = var.ecs_max_capacity
  min_capacity       = var.ecs_desired_count
  resource_id        = "service/${aws_ecs_cluster.imobi_prod.name}/${aws_ecs_service.imobi_api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Auto Scaling Policy - CPU
resource "aws_appautoscaling_policy" "ecs_policy_cpu" {
  name               = "imobi-api-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

# Auto Scaling Policy - Memory
resource "aws_appautoscaling_policy" "ecs_policy_memory" {
  name               = "imobi-api-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value = 80.0
  }
}

# Data source for existing RDS instance (from Phase 1)
data "aws_db_instance" "imobi_rds" {
  db_instance_identifier = "imobi-db"
}

# Data source for existing ElastiCache cluster (from Phase 1)
data "aws_elasticache_cluster" "imobi_redis" {
  cluster_id = "imobi-redis"
}

# Data source for existing S3 bucket (from Phase 1)
data "aws_s3_bucket" "imobi_storage" {
  bucket = "imobi-storage-${data.aws_caller_identity.current.account_id}"
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}

# Data source for VPC
data "aws_vpc" "main" {
  filter {
    name   = "tag:Name"
    values = ["imobi-vpc"]
  }
}

# Data source for private subnets
data "aws_subnets" "private" {
  filter {
    name   = "tag:Type"
    values = ["private"]
  }
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.imobi_prod.name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.imobi_api.name
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group for ECS"
  value       = aws_cloudwatch_log_group.ecs_imobi_api.name
}
