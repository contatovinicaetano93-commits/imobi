variable "vpc_id" {
  type = string
}

variable "private_subnets" {
  type = list(string)
}

variable "project_name" {
  type = string
}

variable "elasticache_instance_type" {
  type = string
}

variable "sns_topic_arn" {
  type = string
}

variable "cloudwatch_log_group_name" {
  type = string
}
