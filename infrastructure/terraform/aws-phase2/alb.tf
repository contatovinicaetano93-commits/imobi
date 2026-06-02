# AWS Application Load Balancer (ALB) for imobi-api
# Distributes incoming traffic to ECS tasks

# Security Group for ALB
resource "aws_security_group" "alb" {
  name        = "imobi-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = data.aws_vpc.main.id

  # Allow HTTP
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTP from anywhere"
  }

  # Allow HTTPS (future use)
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTPS from anywhere"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name        = "imobi-alb-sg"
    Environment = var.environment
    Phase       = "Phase2"
  }
}

# Application Load Balancer
resource "aws_lb" "imobi_api" {
  name               = "imobi-api-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = data.aws_subnets.public.ids

  enable_deletion_protection = false
  enable_http2               = true
  enable_cross_zone_load_balancing = true

  tags = {
    Name        = "imobi-api-alb"
    Environment = var.environment
    Phase       = "Phase2"
  }
}

# Target Group for ECS Service
resource "aws_lb_target_group" "imobi_api" {
  name        = "imobi-api-tg"
  port        = var.api_port
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.main.id
  target_type = "ip"

  health_check {
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 10
    interval            = 30
    path                = "/api/v1/health"
    matcher             = "200"
    port                = tostring(var.api_port)
  }

  deregistration_delay = 30

  tags = {
    Name        = "imobi-api-tg"
    Environment = var.environment
    Phase       = "Phase2"
  }
}

# HTTP Listener (redirect to HTTPS in production)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.imobi_api.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.imobi_api.arn
  }
}

# HTTPS Listener (placeholder for future SSL certificate)
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.imobi_api.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = var.ssl_certificate_arn != "" ? var.ssl_certificate_arn : "arn:aws:iam::${data.aws_caller_identity.current.account_id}:server-certificate/imobi-api-self-signed"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.imobi_api.arn
  }
}

# CloudWatch Alarms for ALB
resource "aws_cloudwatch_metric_alarm" "alb_unhealthy_hosts" {
  alarm_name          = "imobi-api-unhealthy-hosts"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "2"
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Average"
  threshold           = "1"
  alarm_description   = "Alert when ALB has unhealthy targets"

  dimensions = {
    LoadBalancer = aws_lb.imobi_api.arn_suffix
    TargetGroup  = aws_lb_target_group.imobi_api.arn_suffix
  }

  tags = {
    Name        = "imobi-alb-unhealthy-hosts"
    Environment = var.environment
    Phase       = "Phase2"
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_target_response_time" {
  alarm_name          = "imobi-api-high-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Average"
  threshold           = "1"
  alarm_description   = "Alert when target response time exceeds 1 second"

  dimensions = {
    LoadBalancer = aws_lb.imobi_api.arn_suffix
  }

  tags = {
    Name        = "imobi-alb-response-time"
    Environment = var.environment
    Phase       = "Phase2"
  }
}

# Data source for public subnets
data "aws_subnets" "public" {
  filter {
    name   = "tag:Type"
    values = ["public"]
  }
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
}

output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.imobi_api.dns_name
}

output "alb_arn" {
  description = "ARN of the load balancer"
  value       = aws_lb.imobi_api.arn
}

output "target_group_arn" {
  description = "ARN of the target group"
  value       = aws_lb_target_group.imobi_api.arn
}
