# AWS CloudWatch Monitoring and Logging for imobi-api
# Centralized logging, metrics, and alarms

# CloudWatch Log Group for ECS (already defined in ecs.tf, but extending here)
# This module provides additional monitoring and alarming

# CloudWatch Alarms for ECS Service
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_utilization" {
  alarm_name          = "imobi-api-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "Alert when ECS service CPU utilization is high"

  dimensions = {
    ClusterName = aws_ecs_cluster.imobi_prod.name
    ServiceName = aws_ecs_service.imobi_api.name
  }

  tags = {
    Name        = "imobi-ecs-cpu-alarm"
    Environment = var.environment
    Phase       = "Phase2"
  }
}

resource "aws_cloudwatch_metric_alarm" "ecs_memory_utilization" {
  alarm_name          = "imobi-api-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "Alert when ECS service memory utilization is high"

  dimensions = {
    ClusterName = aws_ecs_cluster.imobi_prod.name
    ServiceName = aws_ecs_service.imobi_api.name
  }

  tags = {
    Name        = "imobi-ecs-memory-alarm"
    Environment = var.environment
    Phase       = "Phase2"
  }
}

# CloudWatch Log Group for ALB Access Logs
resource "aws_cloudwatch_log_group" "alb_logs" {
  name              = "/aws/alb/imobi-api"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "alb-imobi-api-logs"
    Environment = var.environment
    Phase       = "Phase2"
  }
}

# Enable ALB access logs
resource "aws_lb" "imobi_api_with_logs" {
  depends_on = [aws_lb.imobi_api]

  # This is a workaround - we update the ALB after creation
  # In a real scenario, this would be set at creation time
}

# CloudWatch Dashboard for imobi-api monitoring
resource "aws_cloudwatch_dashboard" "imobi_api" {
  dashboard_name = "imobi-api-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", { stat = "Average" }],
            [".", "MemoryUtilization", { stat = "Average" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ECS Service Metrics"
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", { stat = "Average" }],
            [".", "RequestCount", { stat = "Sum" }],
            [".", "HTTPCode_Target_2XX_Count", { stat = "Sum" }],
            [".", "HTTPCode_Target_4XX_Count", { stat = "Sum" }],
            [".", "HTTPCode_Target_5XX_Count", { stat = "Sum" }]
          ]
          period = 60
          stat   = "Sum"
          region = var.aws_region
          title  = "ALB Metrics"
        }
      },
      {
        type = "log"
        properties = {
          query   = "fields @timestamp, @message | stats count() by @message | limit 20"
          region  = var.aws_region
          title   = "ECS Recent Logs"
          metrics = [
            [
              aws_cloudwatch_log_group.ecs_imobi_api.name,
              "count"
            ]
          ]
        }
      }
    ]
  })

  tags = {
    Name        = "imobi-api-dashboard"
    Environment = var.environment
    Phase       = "Phase2"
  }
}

# SNS Topic for Alarms
resource "aws_sns_topic" "imobi_api_alarms" {
  name = "imobi-api-alarms"

  tags = {
    Name        = "imobi-api-alarms"
    Environment = var.environment
    Phase       = "Phase2"
  }
}

# SNS Topic Subscription (email)
resource "aws_sns_topic_subscription" "imobi_api_alarms_email" {
  topic_arn = aws_sns_topic.imobi_api_alarms.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Update alarms to use SNS topic
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_utilization_with_sns" {
  alarm_name          = "imobi-api-high-cpu-sns"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "Alert when ECS service CPU utilization is high"
  alarm_actions       = [aws_sns_topic.imobi_api_alarms.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.imobi_prod.name
    ServiceName = aws_ecs_service.imobi_api.name
  }

  tags = {
    Name        = "imobi-ecs-cpu-alarm-sns"
    Environment = var.environment
    Phase       = "Phase2"
  }
}

# Log Insights Query - Errors
resource "aws_cloudwatch_log_group" "errors" {
  name              = "/aws/errors/imobi-api"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "imobi-api-errors"
    Environment = var.environment
    Phase       = "Phase2"
  }
}

# CloudWatch Log Filter for errors
resource "aws_cloudwatch_log_metric_filter" "ecs_errors" {
  name           = "imobi-api-errors"
  log_group_name = aws_cloudwatch_log_group.ecs_imobi_api.name
  filter_pattern = "[\"ERROR\", \"error\", \"Exception\", \"exception\", \"FATAL\"]"

  metric_transformation {
    name      = "ErrorCount"
    namespace = "imobi/ECS"
    value     = "1"
  }
}

# Alarm for error count
resource "aws_cloudwatch_metric_alarm" "ecs_error_count" {
  alarm_name          = "imobi-api-error-count"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "1"
  metric_name         = "ErrorCount"
  namespace           = "imobi/ECS"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "Alert when error count exceeds 10 in 5 minutes"
  alarm_actions       = [aws_sns_topic.imobi_api_alarms.arn]

  tags = {
    Name        = "imobi-ecs-error-alarm"
    Environment = var.environment
    Phase       = "Phase2"
  }
}

output "cloudwatch_dashboard_url" {
  description = "URL to CloudWatch dashboard"
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.imobi_api.dashboard_name}"
}

output "sns_topic_arn" {
  description = "ARN of SNS topic for alarms"
  value       = aws_sns_topic.imobi_api_alarms.arn
}
