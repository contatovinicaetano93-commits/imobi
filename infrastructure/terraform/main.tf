module "vpc" {
  source = "./modules/vpc"

  vpc_cidr     = var.vpc_cidr
  project_name = var.project_name
}

module "rds" {
  source = "./modules/rds"

  vpc_id                    = module.vpc.vpc_id
  private_subnets           = module.vpc.private_subnets
  project_name              = var.project_name
  rds_instance_class        = var.rds_instance_class
  rds_backup_retention_days = var.rds_backup_retention_days
  rds_master_password       = random_password.rds_password.result

  depends_on = [module.vpc]
}

module "elasticache" {
  source = "./modules/elasticache"

  vpc_id                    = module.vpc.vpc_id
  private_subnets           = module.vpc.private_subnets
  project_name              = var.project_name
  elasticache_instance_type = var.elasticache_instance_type
  sns_topic_arn             = aws_sns_topic.alerts.arn
  cloudwatch_log_group_name = aws_cloudwatch_log_group.elasticache.name

  depends_on = [module.vpc]
}

resource "random_password" "rds_password" {
  length  = 32
  special = true
}

resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-alerts"

  tags = {
    Name = "${var.project_name}-alerts"
  }
}

resource "aws_cloudwatch_log_group" "elasticache" {
  name              = "/aws/elasticache/${var.project_name}/slow-log"
  retention_in_days = 30

  tags = {
    Name = "${var.project_name}-elasticache-logs"
  }
}

resource "aws_cloudwatch_log_group" "rds" {
  name              = "/aws/rds/${var.project_name}"
  retention_in_days = 30

  tags = {
    Name = "${var.project_name}-rds-logs"
  }
}

resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.project_name}"
  retention_in_days = 30

  tags = {
    Name = "${var.project_name}-ecs-logs"
  }
}
